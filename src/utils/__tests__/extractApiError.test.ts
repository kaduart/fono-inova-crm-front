import { describe, it, expect } from 'vitest';
import { extractApiError } from '../errorUtils';

const axiosError = (status: number, data: any) => ({ response: { status, data } });

describe('extractApiError', () => {
  it('lê o envelope padrão completo', () => {
    const info = extractApiError(axiosError(409, {
      success: false,
      code: 'PAYMENT_STATUS_NOT_BILLABLE',
      message: 'Pagamento já baixado\nAntonella — sessão de 29/06/2026\n\nAvise o financeiro.',
      error: 'Pagamento já baixado\nAntonella — sessão de 29/06/2026\n\nAvise o financeiro.',
      title: 'Pagamento já baixado',
      action: 'Avise o financeiro.',
      items: [{ sessionId: 's1' }],
      technicalMessage: 'Payment 6a3c… está em paid',
      correlationId: 'abc',
    }));
    expect(info.code).toBe('PAYMENT_STATUS_NOT_BILLABLE');
    expect(info.message).toContain('Antonella');
    expect(info.title).toBe('Pagamento já baixado');
    expect(info.action).toBe('Avise o financeiro.');
    expect(info.items).toHaveLength(1);
    expect(info.technicalMessage).toContain('6a3c');
    expect(info.correlationId).toBe('abc');
    expect(info.status).toBe(409);
  });

  it('continua lendo respostas antigas { error, code }', () => {
    const info = extractApiError(axiosError(400, { success: false, error: 'Campo inválido', code: 'VALIDATION_ERROR' }));
    expect(info.message).toBe('Campo inválido');
    expect(info.code).toBe('VALIDATION_ERROR');
    expect(info.title).toBeNull();
    expect(info.items).toEqual([]);
  });

  it('erro sem resposta usa a mensagem padrão e nunca lança', () => {
    expect(extractApiError(undefined, 'Falhou').message).toBe('Falhou');
    expect(extractApiError('texto solto').message).toBe('texto solto');
  });
});
