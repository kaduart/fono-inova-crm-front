/* eslint-disable @typescript-eslint/no-explicit-any -- testes: respostas e erros simulados */
// (ambiente jsdom: o axios usa XHR com CORS de verdade, então o preflight do
// cabeçalho Idempotency-Key também é exercitado contra o servidor isolado)
//
// Front + back de verdade: os serviços do front (receivePayment, createPaymentV2)
// contra o servidor ISOLADO do back (scripts/e2e/servidor-pagamentos-isolado.mjs),
// com Mongo e Redis descartáveis e o worker de pagamentos rodando.
// Só roda com E2E_API_BASE, E2E_TOKEN e E2E_PATIENT (impressos pelo servidor).
import { describe, it, expect, vi, beforeAll } from 'vitest';
import axios from 'axios';

const BASE = process.env.E2E_API_BASE;
const TOKEN = process.env.E2E_TOKEN;
const PATIENT = process.env.E2E_PATIENT as string;
const enabled = !!(BASE && TOKEN && PATIENT);
if (BASE && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(BASE)) throw new Error('E2E_API_BASE precisa ser loopback');

vi.mock('../api', async () => {
  const ax = (await import('axios')).default;
  return { default: ax.create({ baseURL: process.env.E2E_API_BASE, timeout: 4000, headers: { Authorization: `Bearer ${process.env.E2E_TOKEN}` } }) };
});

const root = () => (BASE as string).replace(/\/api$/, '');
const caos = (path: string, body: object) => axios.post(`${root()}/__caos/${path}`, body);
const estado = async () => (await axios.get(`${root()}/__estado/${PATIENT}`)).data;
const until = async (pred: (e: any) => boolean, ms = 15000) => {
  const t0 = Date.now();
  for (;;) {
    const e = await estado();
    if (pred(e)) return e;
    if (Date.now() - t0 > ms) return e;
    await new Promise((r) => setTimeout(r, 200));
  }
};

describe.skipIf(!enabled)('front + back: Idempotency-Key ponta a ponta', { timeout: 30000 }, () => {
  let receivePayment: typeof import('../financialSummaryService').receivePayment;
  let createPaymentV2: typeof import('../paymentService').createPaymentV2;
  let isUncertainOutcome: typeof import('../idempotency').isUncertainOutcome;
  beforeAll(async () => {
    ({ receivePayment } = await import('../financialSummaryService'));
    ({ createPaymentV2 } = await import('../paymentService'));
    ({ isUncertainOutcome } = await import('../idempotency'));
    await caos('atraso', { ms: 0 });
    await caos('perder-respostas', { n: 0 });
  });

  it('recebimento: resposta perdida depois de gravar; o novo clique não credita de novo', async () => {
    const antes = await estado();
    await caos('perder-respostas', { n: 1 });
    const err = await receivePayment({ patientId: PATIENT, amount: 123.45, method: 'pix' }).catch((e) => e);
    expect(isUncertainOutcome(err)).toBe(true);
    const meio = await estado();
    expect(meio.creditado - antes.creditado).toBeCloseTo(123.45); // o servidor GRAVOU
    const ok = await receivePayment({ patientId: PATIENT, amount: 123.45, method: 'pix' });
    expect((ok as any).idempotent).toBe(true);
    const depois = await estado();
    expect(depois.creditado - antes.creditado).toBeCloseTo(123.45);
    expect(depois.operacoes - antes.operacoes).toBe(1);
  });

  it('recebimento: clique duplo com servidor lento sai uma requisição e aplica uma vez', async () => {
    const antes = await estado();
    await caos('atraso', { ms: 700 });
    const r = await Promise.all([1, 2, 3].map(() => receivePayment({ patientId: PATIENT, amount: 50, method: 'dinheiro' })));
    await caos('atraso', { ms: 0 });
    expect(new Set(r.map((x: any) => String(x.amount))).size).toBe(1);
    const depois = await estado();
    expect(depois.creditado - antes.creditado).toBeCloseTo(50);
  });

  it('recebimento: novo recebimento igual, depois de confirmado o anterior, é outra operação', async () => {
    const antes = await estado();
    await receivePayment({ patientId: PATIENT, amount: 10, method: 'pix' });
    await receivePayment({ patientId: PATIENT, amount: 10, method: 'pix' });
    const depois = await estado();
    expect(depois.creditado - antes.creditado).toBeCloseTo(20);
  });

  it('pagamento avulso pela fila + worker: resposta perdida e reenvio geram um Payment só', async () => {
    const antes = await estado();
    await caos('perder-respostas', { n: 1 });
    const err = await createPaymentV2({ patientId: PATIENT, amount: 220, paymentMethod: 'pix', type: 'standalone' } as any).catch((e) => e);
    expect(isUncertainOutcome(err)).toBe(true);
    const again = await createPaymentV2({ patientId: PATIENT, amount: 220, paymentMethod: 'pix', type: 'standalone' } as any);
    expect(again.success).toBe(true);
    const depois = await until((e) => e.payments - antes.payments >= 1 && e.operacoes - antes.operacoes >= 1);
    await new Promise((r) => setTimeout(r, 1500)); // dá tempo de um eventual segundo job aparecer
    const final = await estado();
    expect(final.payments - antes.payments).toBe(1);
    expect(final.operacoes - antes.operacoes).toBe(1);
    expect(depois.payments).toBe(final.payments);
  });

  it('pagamento avulso: 5 envios simultâneos da mesma operação aplicam uma vez', async () => {
    const antes = await estado();
    await caos('atraso', { ms: 400 });
    await Promise.all([1, 2, 3, 4, 5].map(() => createPaymentV2({ patientId: PATIENT, amount: 77, paymentMethod: 'pix', type: 'standalone' } as any)));
    await caos('atraso', { ms: 0 });
    await until((e) => e.payments - antes.payments >= 1);
    await new Promise((r) => setTimeout(r, 1500));
    const final = await estado();
    expect(final.payments - antes.payments).toBe(1);
  });

  it('dois pagamentos avulsos DIFERENTES do mesmo paciente em sequência rápida: os dois entram (antes o segundo sumia no debounce)', async () => {
    const antes = await estado();
    await createPaymentV2({ patientId: PATIENT, amount: 101, paymentMethod: 'pix', type: 'standalone' } as any);
    await createPaymentV2({ patientId: PATIENT, amount: 102, paymentMethod: 'pix', type: 'standalone' } as any);
    const depois = await until((e) => e.payments - antes.payments >= 2);
    expect(depois.payments - antes.payments).toBe(2);
  });

  it('mesma chave com outro valor (cliente com defeito): 409 e nada novo', async () => {
    const antes = await estado();
    const key = `chave-fixa-ficticia-${Date.now()}`;
    const ax = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${TOKEN}`, 'Idempotency-Key': key } });
    await ax.post('/v2/financial/receive', { patientId: PATIENT, amount: 30, method: 'pix' });
    const err = await ax.post('/v2/financial/receive', { patientId: PATIENT, amount: 31, method: 'pix' }).catch((e) => e);
    expect(err.response?.status).toBe(409);
    expect(err.response?.data?.code ?? err.response?.data?.error?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    const depois = await estado();
    expect(depois.creditado - antes.creditado).toBeCloseTo(30);
  });

  it.skipIf(!process.env.E2E_RESTART)('queda do servidor (API + worker) depois de aceitar o pagamento: reenvio após o reinício gera um Payment só', async () => {
    const antes = await estado();
    await caos('perder-respostas', { n: 1 });
    const err = await createPaymentV2({ patientId: PATIENT, amount: 333, paymentMethod: 'pix', type: 'standalone' } as any).catch((e) => e);
    expect(isUncertainOutcome(err)).toBe(true);
    const pidAntes = (await axios.get(`${root()}/__saude`)).data.pid;
    await caos('derrubar', {}).catch(() => {});
    const t0 = Date.now();
    for (;;) {
      try {
        const r = await axios.get(`${root()}/__saude`, { timeout: 500 });
        if (r.data.pid !== pidAntes) break; // outro processo: reiniciou
      } catch { /* reiniciando */ }
      if (Date.now() - t0 > 30000) throw new Error('servidor não voltou');
      await new Promise((r) => setTimeout(r, 300));
    }
    await createPaymentV2({ patientId: PATIENT, amount: 333, paymentMethod: 'pix', type: 'standalone' } as any);
    await until((e) => e.payments - antes.payments >= 1, 20000);
    await new Promise((r) => setTimeout(r, 2000));
    const final = await estado();
    expect(final.payments - antes.payments).toBe(1);
  });
});
