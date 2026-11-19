/* eslint-disable @typescript-eslint/no-explicit-any -- testes: respostas e erros simulados */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
vi.mock('../api', () => ({ default: { post: (...a: any[]) => post(...a), get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import { sendWhatsAppText, sendWhatsAppMedia, whatsappService } from '../whatsappService';

const timeout = () => Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' });
const httpErr = (status: number, data: any) => Object.assign(new Error(`status ${status}`), { response: { status, data } });
const headerOf = (call: any[]) => call[2]?.headers?.['Idempotency-Key'];
const PHONE = '62900000000'; // fictício

beforeEach(() => { post.mockReset(); sessionStorage.clear(); });

describe('envio manual de WhatsApp com Idempotency-Key', () => {
  it('timeout e retentativa da mesma mensagem usam a mesma chave', async () => {
    post.mockRejectedValueOnce(timeout()).mockResolvedValueOnce({ data: { success: true, duplicated: true, messageId: 'wamid.SIM' } });
    await expect(sendWhatsAppText(PHONE, 'Olá')).rejects.toThrow();
    const out = await sendWhatsAppText(PHONE, 'Olá');
    expect(out.duplicated).toBe(true);
    expect(headerOf(post.mock.calls[0])).toBeTruthy();
    expect(headerOf(post.mock.calls[0])).toBe(headerOf(post.mock.calls[1]));
  });

  it('clique duplo sai uma vez só', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const a = sendWhatsAppText(PHONE, 'Oi');
    const b = sendWhatsAppText(PHONE, 'Oi');
    resolve({ data: { success: true, messageId: 'wamid.SIM' } });
    await Promise.all([a, b]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('depois de enviada, o mesmo texto de novo é outra mensagem (outra chave)', async () => {
    post.mockResolvedValue({ data: { success: true, messageId: 'wamid.SIM' } });
    await sendWhatsAppText(PHONE, 'Bom dia');
    await sendWhatsAppText(PHONE, 'Bom dia');
    expect(headerOf(post.mock.calls[0])).not.toBe(headerOf(post.mock.calls[1]));
  });

  it('409 em andamento mantém a chave; 409 incerto descarta (usuário confere antes de reenviar)', async () => {
    post.mockRejectedValueOnce(httpErr(409, { code: 'DELIVERY_IN_PROGRESS', retryable: true }))
      .mockRejectedValueOnce(httpErr(409, { code: 'DELIVERY_UNCERTAIN', retryable: false }))
      .mockResolvedValueOnce({ data: { success: true, messageId: 'wamid.SIM' } });
    await expect(sendWhatsAppText(PHONE, 'Teste')).rejects.toThrow();
    await expect(sendWhatsAppText(PHONE, 'Teste')).rejects.toThrow();
    await sendWhatsAppText(PHONE, 'Teste');
    const [k1, k2, k3] = post.mock.calls.map(headerOf);
    expect(k1).toBe(k2);
    expect(k3).not.toBe(k2);
  });

  it('mídia: retentativa do mesmo arquivo usa a mesma chave; outro arquivo, outra chave', async () => {
    const f1 = new File(['a'], 'a.pdf', { type: 'application/pdf', lastModified: 1 });
    const f2 = new File(['bb'], 'b.pdf', { type: 'application/pdf', lastModified: 2 });
    post.mockRejectedValueOnce(timeout()).mockResolvedValue({ data: { success: true } });
    await expect(sendWhatsAppMedia(PHONE, f1, 'document')).rejects.toThrow();
    await sendWhatsAppMedia(PHONE, f1, 'document');
    await sendWhatsAppMedia(PHONE, f2, 'document');
    const [k1, k2, k3] = post.mock.calls.map(headerOf);
    expect(k1).toBeTruthy();
    expect(k1).toBe(k2);
    expect(k3).not.toBe(k2);
  });

  it('template: clique duplo sai uma vez e leva a chave', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const a = whatsappService.sendTemplateMessage({ phone: PHONE, template: 'lembrete', parameters: { nome: 'Fulano' } } as any);
    const b = whatsappService.sendTemplateMessage({ phone: PHONE, template: 'lembrete', parameters: { nome: 'Fulano' } } as any);
    resolve({ data: { success: true } });
    await Promise.all([a, b]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(headerOf(post.mock.calls[0])).toBeTruthy();
  });
});
