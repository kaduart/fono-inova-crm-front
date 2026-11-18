/* eslint-disable @typescript-eslint/no-explicit-any -- testes: respostas e erros simulados */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
vi.mock('../api', () => ({ default: { post: (...a: any[]) => post(...a), get: vi.fn(), patch: vi.fn() } }));

import { receivePayment } from '../financialSummaryService';
import { createPaymentV2, addBalancePaymentMultiV2, createSyncPayment, bulkSettlePayments } from '../paymentService';

const timeout = () => Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' });
const headerOf = (call: any[]) => call[2]?.headers?.['Idempotency-Key'];

beforeEach(() => { post.mockReset(); sessionStorage.clear(); });

describe('serviços financeiros enviam Idempotency-Key', () => {
  it('receivePayment: timeout e retentativa usam a mesma chave (cabeçalho e metadata)', async () => {
    post.mockRejectedValueOnce(timeout()).mockResolvedValueOnce({ data: { success: true } });
    const req = { patientId: 'pac-ficticio', amount: 220, method: 'pix', mode: 'auto' };
    await expect(receivePayment(req)).rejects.toThrow();
    await receivePayment(req);
    const [c1, c2] = post.mock.calls;
    expect(c1[0]).toBe('/v2/financial/receive');
    expect(headerOf(c1)).toBeTruthy();
    expect(headerOf(c1)).toBe(headerOf(c2));
    expect(c1[1].metadata.idempotencyKey).toBe(headerOf(c1));
  });

  it('receivePayment: depois do sucesso, novo recebimento igual ganha outra chave', async () => {
    post.mockResolvedValue({ data: { success: true } });
    const req = { patientId: 'pac-ficticio', amount: 220, method: 'pix' };
    await receivePayment(req);
    await receivePayment(req);
    expect(headerOf(post.mock.calls[0])).not.toBe(headerOf(post.mock.calls[1]));
  });

  it('createPaymentV2: a observação diferente não cria outra operação', async () => {
    post.mockRejectedValueOnce(timeout()).mockResolvedValueOnce({ data: { success: true, data: { eventId: 'e1' } } });
    await expect(createPaymentV2({ patientId: 'pac', amount: 180, paymentMethod: 'pix', notes: 'a' })).rejects.toThrow();
    await createPaymentV2({ patientId: 'pac', amount: 180, paymentMethod: 'pix', notes: 'b' });
    expect(post.mock.calls[0][0]).toBe('/v2/payments/request');
    expect(headerOf(post.mock.calls[0])).toBe(headerOf(post.mock.calls[1]));
  });

  it('addBalancePaymentMultiV2: clique duplo sai uma vez', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const data = { payments: [{ amount: 100, paymentMethod: 'pix' }], totalAmount: 100, debitIds: ['d2', 'd1'] };
    const a = addBalancePaymentMultiV2('pac', data);
    const b = addBalancePaymentMultiV2('pac', data);
    resolve({ data: { success: true, data: { eventId: 'e' } } });
    await Promise.all([a, b]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(headerOf(post.mock.calls[0])).toBeTruthy();
  });

  it('createSyncPayment (marcar sessão avulsa como paga): timeout e retentativa usam a mesma chave', async () => {
    post.mockRejectedValueOnce(timeout()).mockResolvedValueOnce({ data: { success: true, data: { _id: 'p1' } } });
    const req = { patientId: 'pac', appointmentId: 'ag1', amount: 220, paymentMethod: 'pix', status: 'paid', notes: 'a' };
    await expect(createSyncPayment(req)).rejects.toThrow();
    await createSyncPayment({ ...req, notes: 'b' });
    expect(post.mock.calls[0][0]).toBe('/v2/payments/create-sync');
    expect(headerOf(post.mock.calls[0])).toBeTruthy();
    expect(headerOf(post.mock.calls[0])).toBe(headerOf(post.mock.calls[1]));
  });

  it('createSyncPayment: outro agendamento é outra operação (outra chave)', async () => {
    post.mockResolvedValue({ data: { success: true, data: { _id: 'p' } } });
    await createSyncPayment({ patientId: 'pac', appointmentId: 'ag1', amount: 220, status: 'paid' });
    await createSyncPayment({ patientId: 'pac', appointmentId: 'ag2', amount: 220, status: 'paid' });
    expect(headerOf(post.mock.calls[0])).not.toBe(headerOf(post.mock.calls[1]));
  });

  it('bulkSettlePayments: clique duplo sai uma vez, com chave, mantendo o timeout', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const payload = { paymentIds: ['b', 'a'], paymentMethod: 'pix', totalAmount: 440 };
    const x = bulkSettlePayments(payload, { timeout: 60000 });
    const y = bulkSettlePayments({ ...payload, paymentIds: ['a', 'b'] }, { timeout: 60000 });
    resolve({ data: { success: true, data: { receiptId: 'r' } } });
    await Promise.all([x, y]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/v2/payments/bulk-settle');
    expect(post.mock.calls[0][2].timeout).toBe(60000);
    expect(headerOf(post.mock.calls[0])).toBeTruthy();
  });
});
