// src/services/idempotency.ts
//
// Idempotency-Key para as escritas financeiras.
//
// REGRA
//   - Uma OPERAÇÃO = (escopo, conteúdo financeiro). Ex.: "receber R$ 220 em pix
//     do paciente X". A chave nasce na primeira tentativa dessa operação.
//   - Retentativas da MESMA operação reaproveitam a mesma chave: clique duplo,
//     reenvio depois de timeout, erro de rede, 5xx, recarregar a página
//     (a chave fica no sessionStorage da aba).
//   - A chave muda só numa NOVA operação intencional:
//       * a anterior foi confirmada pelo servidor (2xx), ou
//       * o servidor recusou de forma definitiva (4xx de validação), ou
//       * o conteúdo financeiro mudou (outro valor, método, débitos...).
//   - Nunca gera chave nova a cada tentativa HTTP.
//
// O QUE ISTO NÃO GARANTE
//   Se a resposta se perde, o front não sabe se o servidor aplicou. Ele repete
//   com a mesma chave e o servidor devolve o resultado gravado. Duas abas
//   diferentes têm chaves diferentes (sessionStorage é por aba).

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const STORAGE_PREFIX = 'idem:v1:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface KeyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredOperation {
  key: string;
  fingerprint: string;
  createdAt: number;
}

/** Erro com a marca de resultado incerto (o servidor pode ter aplicado). */
export interface IdempotentError extends Error {
  idempotencyOutcome?: 'uncertain' | 'rejected';
  idempotencyKey?: string;
}

function memoryStorage(): KeyStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
}

function defaultStorage(): KeyStorage {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const probe = '__idem_probe__';
      window.sessionStorage.setItem(probe, '1');
      window.sessionStorage.removeItem(probe);
      return window.sessionStorage;
    }
  } catch {
    // modo privado / storage bloqueado: cai para memória (vale até recarregar)
  }
  return memoryStorage();
}

function defaultNewKey(): string {
  const c: Crypto | undefined = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** JSON com chaves ordenadas: o mesmo conteúdo sempre gera a mesma impressão. */
export function canonicalFingerprint(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return Object.keys(o).sort().reduce<Record<string, unknown>>((acc, k) => {
        if (o[k] !== undefined) acc[k] = norm(o[k]);
        return acc;
      }, {});
    }
    if (typeof v === 'number') return Math.round(v * 100) / 100;
    return v;
  };
  return JSON.stringify(norm(value));
}

/** Status que provam que o servidor NÃO aplicou e não vai aplicar com esta chave. */
interface HttpLikeError {
  response?: { status?: number; data?: { code?: string; error?: { code?: string } } };
}

function isDefinitiveRejection(err: unknown): boolean {
  const status = (err as HttpLikeError)?.response?.status;
  if (!status) return false;                 // sem resposta: incerto
  if (status >= 500) return false;           // erro do servidor: pode ter gravado
  if (status === 408 || status === 425 || status === 429) return false;
  const data = (err as HttpLikeError)?.response?.data;
  const code = data?.code ?? data?.error?.code;
  if (status === 409 && code === 'RECEIVE_IN_PROGRESS') return false; // outra tentativa em andamento
  return status >= 400 && status < 500;
}

export interface IdempotentSenderOptions {
  storage?: KeyStorage;
  newKey?: () => string;
  now?: () => number;
  ttlMs?: number;
}

export function createIdempotentSender(opts: IdempotentSenderOptions = {}) {
  const storage = opts.storage ?? defaultStorage();
  const newKey = opts.newKey ?? defaultNewKey;
  const now = opts.now ?? (() => Date.now());
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const inFlight = new Map<string, Promise<unknown>>();

  // Espelho em memória: o storage só serve para sobreviver a um recarregamento.
  // Se ele falhar ou descartar dados em silêncio, a aba atual continua correta.
  const mirror = new Map<string, StoredOperation>();
  const read = (scope: string): StoredOperation | null => {
    const m = mirror.get(scope);
    if (m) return m;
    try {
      const raw = storage.getItem(STORAGE_PREFIX + scope);
      const op = raw ? (JSON.parse(raw) as StoredOperation) : null;
      if (op && typeof op.key === 'string' && typeof op.fingerprint === 'string') {
        mirror.set(scope, op);
        return op;
      }
    } catch {
      /* storage indisponível */
    }
    return null;
  };
  const write = (scope: string, op: StoredOperation) => {
    mirror.set(scope, op);
    try { storage.setItem(STORAGE_PREFIX + scope, JSON.stringify(op)); } catch { /* segue só em memória */ }
  };
  const clear = (scope: string, key: string) => {
    const cur = read(scope);
    if (cur && cur.key === key) {
      mirror.delete(scope);
      try { storage.removeItem(STORAGE_PREFIX + scope); } catch { /* ignore */ }
    }
  };

  /** Chave da operação (escopo + conteúdo). Reaproveita a pendente se o conteúdo é o mesmo. */
  function keyFor(scope: string, financialContent: unknown): string {
    const fingerprint = canonicalFingerprint(financialContent);
    const cur = read(scope);
    if (cur && cur.fingerprint === fingerprint && now() - cur.createdAt < ttlMs) return cur.key;
    const op = { key: newKey(), fingerprint, createdAt: now() };
    write(scope, op);
    return op.key;
  }

  /**
   * Executa `send(key)` com a chave da operação.
   * Clique duplo enquanto a primeira está em voo devolve a MESMA promessa
   * (não sai uma segunda requisição).
   */
  async function run<T>(scope: string, financialContent: unknown, send: (key: string) => Promise<T>): Promise<T> {
    const key = keyFor(scope, financialContent);
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const p = (async () => {
      try {
        const out = await send(key);
        clear(scope, key); // confirmada: a próxima é uma nova operação
        return out;
      } catch (err: unknown) {
        const e = err as IdempotentError;
        if (isDefinitiveRejection(err)) {
          clear(scope, key);
          e.idempotencyOutcome = 'rejected';
        } else {
          e.idempotencyOutcome = 'uncertain'; // mantém a chave para a retentativa
        }
        e.idempotencyKey = key;
        throw e;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, p);
    return p;
  }

  /** Descarta a operação pendente (ex.: o usuário confirmou que quer lançar de novo). */
  function discard(scope: string) {
    mirror.delete(scope);
    try { storage.removeItem(STORAGE_PREFIX + scope); } catch { /* ignore */ }
  }

  return { run, keyFor, discard };
}

/** Instância do app (sessionStorage da aba). */
export const financialIdempotency = createIdempotentSender();

/** Mensagem para o usuário quando o resultado é incerto. */
export function isUncertainOutcome(err: unknown): boolean {
  return (err as IdempotentError)?.idempotencyOutcome === 'uncertain';
}
