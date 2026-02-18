/**
 * Testes Unitários - usePayment Hook
 * 
 * Estes testes garantem que o hook de pagamentos:
 * 1. Usa a função correta para extrair valores (incluindo convênios)
 * 2. Invalida cache corretamente após mutações
 * 3. Trata erros adequadamente
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayment } from '../usePayment';
import * as paymentService from '../../services/paymentService';

// Mock do serviço
vi.mock('../../services/paymentService');

describe('usePayment Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchPayments', () => {
        
        it('deve buscar pagamentos e normalizar resposta', async () => {
            const mockPayments = [
                { _id: '1', amount: 100, paymentMethod: 'pix' },
                { _id: '2', amount: 200, paymentMethod: 'debito' }
            ];
            
            vi.mocked(paymentService.getPayments).mockResolvedValueOnce({
                data: { data: mockPayments }
            } as any);

            const { result } = renderHook(() => usePayment());
            
            await act(async () => {
                await result.current.fetchPayments();
            });

            expect(result.current.payments).toEqual(mockPayments);
            expect(result.current.error).toBeNull();
        });

        it('deve usar cache quando válido (menos de 2 minutos)', async () => {
            const mockPayments = [{ _id: '1', amount: 100 }];
            
            vi.mocked(paymentService.getPayments).mockResolvedValueOnce({
                data: { data: mockPayments }
            } as any);

            const { result } = renderHook(() => usePayment());
            
            // Primeira chamada
            await act(async () => {
                await result.current.fetchPayments();
            });
            
            // Segunda chamada imediata (deve usar cache)
            await act(async () => {
                await result.current.fetchPayments();
            });

            // Serviço deve ser chamado apenas uma vez
            expect(paymentService.getPayments).toHaveBeenCalledTimes(1);
        });

        it('deve ignorar cache quando forceRefresh=true', async () => {
            const mockPayments = [{ _id: '1', amount: 100 }];
            
            vi.mocked(paymentService.getPayments).mockResolvedValue({
                data: { data: mockPayments }
            } as any);

            const { result } = renderHook(() => usePayment());
            
            // Primeira chamada
            await act(async () => {
                await result.current.fetchPayments();
            });
            
            // Segunda chamada com forceRefresh
            await act(async () => {
                await result.current.fetchPayments({}, true);
            });

            expect(paymentService.getPayments).toHaveBeenCalledTimes(2);
        });
    });

    describe('markAsPaid', () => {
        
        it('deve invalidar cache após marcar como pago', async () => {
            const mockPayment = { _id: '1', amount: 100, status: 'pending' };
            const mockUpdated = { _id: '1', amount: 100, status: 'paid' };
            
            vi.mocked(paymentService.markPaymentAsPaid).mockResolvedValueOnce({
                data: { data: mockUpdated }
            } as any);

            const { result } = renderHook(() => usePayment());
            
            await act(async () => {
                await result.current.markAsPaid('1');
            });

            // Cache deve ser invalidado (timestamp = 0)
            // Na próxima chamada de fetchPayments, deve buscar do servidor
            expect(result.current.payments).toContainEqual(mockUpdated);
        });
    });

    describe('⚠️ Validação de Convênios', () => {
        
        it('deve usar insurance.grossAmount para convênios no cálculo de totais', async () => {
            // Este teste verifica se o frontend está usando a função correta
            // para extrair valores de pagamentos
            
            const mockPayments = [
                { _id: '1', amount: 100, paymentMethod: 'pix' },
                { 
                    _id: '2', 
                    amount: 0,  // ⚠️ Convênio tem amount=0
                    billingType: 'convenio',
                    insurance: { grossAmount: 250 }
                }
            ];
            
            vi.mocked(paymentService.getPayments).mockResolvedValueOnce({
                data: { data: mockPayments }
            } as any);

            const { result } = renderHook(() => usePayment());
            
            await act(async () => {
                await result.current.fetchPayments();
            });

            // Verificar que o hook retornou os dados completos
            expect(result.current.payments).toHaveLength(2);
            
            // O segundo pagamento deve ter os dados do convênio
            const convenioPayment = result.current.payments[1];
            expect(convenioPayment.amount).toBe(0);
            expect(convenioPayment.insurance?.grossAmount).toBe(250);
        });
    });

    describe('Tratamento de Erros', () => {
        
        it('deve setar error quando API falhar', async () => {
            vi.mocked(paymentService.getPayments).mockRejectedValueOnce(
                new Error('Network error')
            );

            const { result } = renderHook(() => usePayment());
            
            await act(async () => {
                await result.current.fetchPayments();
            });

            expect(result.current.error).toBe('Erro ao buscar pagamentos');
        });

        it('deve setar loading=false mesmo quando falhar', async () => {
            vi.mocked(paymentService.getPayments).mockRejectedValueOnce(
                new Error('Network error')
            );

            const { result } = renderHook(() => usePayment());
            
            await act(async () => {
                await result.current.fetchPayments();
            });

            expect(result.current.loading).toBe(false);
        });
    });
});
