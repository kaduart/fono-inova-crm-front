/* eslint-disable @typescript-eslint/no-explicit-any -- testes: respostas e erros simulados */
import { describe, it, expect, vi } from 'vitest';
import { createIdempotentSender, canonicalFingerprint, isUncertainOutcome, KeyStorage } from '../idempotency';

const mem = (): KeyStorage & { dump: () => Record<string, string> } => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m),
  };
};
let seq = 0;
const sender = (storage = mem()) => ({ storage, s: createIdempotentSender({ storage, newKey: () => `k-${++seq}-ficticia` }) });
const httpErr = (status?: number, code?: string) => Object.assign(new Error(`http ${status ?? 'rede'}`), status ? { response: { status, data: { code } } } : { code: 'ECONNABORTED' });
const op = { patientId: 'p1', amount: 220, method: 'pix' };

describe('Idempotency-Key das escritas financeiras', () => {
  it('retentativa após timeout reaproveita a mesma chave', async () => {
    const { s } = sender();
    const keys: string[] = [];
    await expect(s.run('receive:p1', op, async (k) => { keys.push(k); throw httpErr(); })).rejects.toThrow();
    await s.run('receive:p1', op, async (k) => { keys.push(k); return 'ok'; });
    expect(keys[0]).toBe(keys[1]);
  });

  it('erro 5xx e 409 RECEIVE_IN_PROGRESS mantêm a chave (resultado incerto)', async () => {
    const { s } = sender();
    const keys: string[] = [];
    for (const e of [httpErr(500), httpErr(502), httpErr(409, 'RECEIVE_IN_PROGRESS'), httpErr(429)]) {
      const err = await s.run('receive:p1', op, async (k) => { keys.push(k); throw e; }).catch((x) => x);
      expect(isUncertainOutcome(err)).toBe(true);
    }
    expect(new Set(keys).size).toBe(1);
  });

  it('depois da confirmação (2xx), a próxima operação igual é nova e ganha outra chave', async () => {
    const { s } = sender();
    const k1 = await s.run('receive:p1', op, async (k) => k);
    const k2 = await s.run('receive:p1', op, async (k) => k);
    expect(k1).not.toBe(k2);
  });

  it('recusa definitiva (400/422/409 de conflito) libera a chave', async () => {
    const { s } = sender();
    const keys: string[] = [];
    for (const e of [httpErr(400), httpErr(422), httpErr(409, 'IDEMPOTENCY_KEY_CONFLICT')]) {
      const err = await s.run('receive:p1', op, async (k) => { keys.push(k); throw e; }).catch((x) => x);
      expect(err.idempotencyOutcome).toBe('rejected');
    }
    expect(new Set(keys).size).toBe(3);
  });

  it('conteúdo financeiro diferente é outra operação (nova chave), mesmo com a anterior incerta', async () => {
    const { s } = sender();
    const keys: string[] = [];
    await s.run('receive:p1', op, async (k) => { keys.push(k); throw httpErr(); }).catch(() => {});
    await s.run('receive:p1', { ...op, amount: 300 }, async (k) => { keys.push(k); return 1; });
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('ordem das chaves e casas decimais não mudam a operação', () => {
    expect(canonicalFingerprint({ a: 1, b: 220.0 })).toBe(canonicalFingerprint({ b: 220, a: 1 }));
    expect(canonicalFingerprint({ amount: 0.1 + 0.2 })).toBe(canonicalFingerprint({ amount: 0.3 }));
  });

  it('clique duplo com a primeira em voo: uma só requisição e a mesma resposta', async () => {
    const { s } = sender();
    let calls = 0;
    let release!: (v: string) => void;
    const send = vi.fn((k: string) => { calls++; return new Promise<string>((r) => { release = () => r(k); }); });
    const a = s.run('receive:p1', op, send);
    const b = s.run('receive:p1', op, send);
    release('x');
    const [ra, rb] = await Promise.all([a, b]);
    expect(calls).toBe(1);
    expect(ra).toBe(rb);
  });

  it('recarregar a página (novo sender, mesmo storage) reaproveita a chave pendente', async () => {
    const storage = mem();
    const first = createIdempotentSender({ storage, newKey: () => 'chave-antes-do-reload' });
    await first.run('receive:p1', op, async () => { throw httpErr(); }).catch(() => {});
    const afterReload = createIdempotentSender({ storage, newKey: () => 'chave-nova-indevida' });
    const used = await afterReload.run('receive:p1', op, async (k) => k);
    expect(used).toBe('chave-antes-do-reload');
  });

  it('chave pendente expira (24h) e a operação volta a ser nova', async () => {
    const storage = mem();
    let t = 0;
    const s = createIdempotentSender({ storage, now: () => t, newKey: () => `k${t}` });
    await s.run('receive:p1', op, async () => { throw httpErr(); }).catch(() => {});
    t = 24 * 60 * 60 * 1000 + 1;
    expect(await s.run('receive:p1', op, async (k) => k)).toBe(`k${t}`);
  });

  it('escopos diferentes (pacientes diferentes) não compartilham chave', async () => {
    const { s } = sender();
    const a = await s.run('receive:p1', op, async (k) => k);
    const b = await s.run('receive:p2', { ...op, patientId: 'p2' }, async (k) => k);
    expect(a).not.toBe(b);
  });

  it('storage indisponível não impede o envio', async () => {
    const broken: KeyStorage = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const s = createIdempotentSender({ storage: broken, newKey: () => 'k-memoria' });
    expect(await s.run('receive:p1', op, async (k) => k)).toBe('k-memoria');
  });
});
