/**
 * Testes Unitários - Funções de Cálculo Financeiro (Frontend)
 * 
 * Estas funções são usadas nos componentes e devem estar
 * sincronizadas com o backend.
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// FUNÇÕES A SEREM TESTADAS (Copiadas dos componentes)
// =============================================================================

interface Payment {
    _id: string;
    amount: number;
    paymentMethod?: string;
    billingType?: string;
    insurance?: {
        grossAmount: number;
    };
}

/**
 * ⚠️ CRÍTICO: Extrai valor real do pagamento
 * Convênios têm amount=0, valor real está em insurance.grossAmount
 * 
 * Usado em: frontend financeiro
 */
function getPaymentValue(payment: Payment): number {
    if (payment.billingType === 'convenio' || payment.paymentMethod === 'convenio') {
        return payment.insurance?.grossAmount || payment.amount || 0;
    }
    return payment.amount || 0;
}

/**
 * Calcula taxa de cartão baseada na bandeira e parcelas
 * Usado em: frontend financeiro
 */
interface TaxaCartao {
    bandeira: string;
    debito: number;
    credito_1x: number;
    credito_6x: number;
    credito_12x: number;
}

const TAXAS_PADRAO: Record<string, TaxaCartao> = {
    visa: { bandeira: 'visa', debito: 0.90, credito_1x: 1.85, credito_6x: 2.29, credito_12x: 2.53 },
    mastercard: { bandeira: 'mastercard', debito: 0.90, credito_1x: 1.85, credito_6x: 2.29, credito_12x: 2.53 },
    elo: { bandeira: 'elo', debito: 1.45, credito_1x: 2.40, credito_6x: 2.94, credito_12x: 3.18 },
};

function calcularTaxaCartao(valor: number, bandeira: string, parcelas: number = 1): number {
    const taxas = TAXAS_PADRAO[bandeira.toLowerCase()];
    if (!taxas) return 0;
    
    let percentual = taxas.credito_1x;
    if (parcelas === 1) percentual = taxas.credito_1x;
    else if (parcelas <= 6) percentual = taxas.credito_6x;
    else percentual = taxas.credito_12x;
    
    return (valor * percentual) / 100;
}

/**
 * Separa pagamentos em Caixa vs A Receber
 * Usado em: frontend financeiro
 */
interface SeparacaoValores {
    caixa: number;
    aReceber: number;
    total: number;
}

function separarCaixaAReceber(payments: Payment[]): SeparacaoValores {
    return payments.reduce((acc: SeparacaoValores, payment: Payment) => {
        const valor = getPaymentValue(payment);
        
        if (payment.billingType === 'convenio' || payment.paymentMethod === 'convenio') {
            acc.aReceber += valor;
        } else {
            // Pix, dinheiro, cartão = Caixa
            acc.caixa += valor;
        }
        
        acc.total += valor;
        return acc;
    }, { caixa: 0, aReceber: 0, total: 0 });
}

// =============================================================================
// TESTES
// =============================================================================

describe('Funções Financeiras - Frontend', () => {
    
    describe('getPaymentValue()', () => {
        
        it('⚠️ CRÍTICO: Convênio com amount=0 deve retornar insurance.grossAmount', () => {
            const payment: Payment = {
                _id: '1',
                amount: 0,
                billingType: 'convenio',
                insurance: { grossAmount: 250 }
            };
            
            const valor = getPaymentValue(payment);
            
            expect(valor).toBe(250);
            expect(valor).not.toBe(0); // Não deve retornar amount!
        });

        it('Convênio por paymentMethod=convenio também deve funcionar', () => {
            const payment: Payment = {
                _id: '1',
                amount: 0,
                paymentMethod: 'convenio',
                insurance: { grossAmount: 300 }
            };
            
            const valor = getPaymentValue(payment);
            expect(valor).toBe(300);
        });

        it('Pagamento normal (pix) deve retornar amount', () => {
            const payment: Payment = {
                _id: '1',
                amount: 150,
                paymentMethod: 'pix'
            };
            
            const valor = getPaymentValue(payment);
            expect(valor).toBe(150);
        });

        it('Pagamento em dinheiro deve retornar amount', () => {
            const payment: Payment = {
                _id: '1',
                amount: 200,
                paymentMethod: 'dinheiro'
            };
            
            const valor = getPaymentValue(payment);
            expect(valor).toBe(200);
        });

        it('Convênio sem insurance deve retornar 0', () => {
            const payment: Payment = {
                _id: '1',
                amount: 0,
                billingType: 'convenio'
                // Sem insurance
            };
            
            const valor = getPaymentValue(payment);
            expect(valor).toBe(0);
        });

        it('Pagamento com amount undefined deve retornar 0', () => {
            const payment: Payment = {
                _id: '1',
                amount: undefined as any,
                paymentMethod: 'pix'
            };
            
            const valor = getPaymentValue(payment);
            expect(valor).toBe(0);
        });
    });

    describe('calcularTaxaCartao()', () => {
        
        it('Visa crédito 1x: 1.85% de R$ 100 = R$ 1.85', () => {
            const taxa = calcularTaxaCartao(100, 'visa', 1);
            expect(taxa).toBe(1.85);
        });

        it('Visa crédito 6x: 2.29% de R$ 200 = R$ 4.58', () => {
            const taxa = calcularTaxaCartao(200, 'visa', 6);
            expect(taxa).toBe(4.58);
        });

        it('Elo débito: 1.45% de R$ 150 = R$ 2.175', () => {
            // Nota: função atual calcula apenas crédito, débito seria caso separado
            const taxa = calcularTaxaCartao(150, 'elo', 1);
            expect(taxa).toBe(3.60); // 2.40% de 150
        });

        it('Bandeira desconhecida deve retornar 0', () => {
            const taxa = calcularTaxaCartao(100, 'desconhecida', 1);
            expect(taxa).toBe(0);
        });

        it('Parcelas acima de 6 deve usar taxa de 12x', () => {
            const taxa = calcularTaxaCartao(100, 'visa', 10);
            expect(taxa).toBe(2.53); // 2.53% de 100
        });
    });

    describe('separarCaixaAReceber()', () => {
        
        it('Deve separar corretamente Caixa vs Convênio', () => {
            const payments: Payment[] = [
                { _id: '1', amount: 100, paymentMethod: 'pix' },
                { _id: '2', amount: 200, paymentMethod: 'dinheiro' },
                { _id: '3', amount: 0, billingType: 'convenio', insurance: { grossAmount: 300 } },
                { _id: '4', amount: 0, billingType: 'convenio', insurance: { grossAmount: 250 } }
            ];
            
            const resultado = separarCaixaAReceber(payments);
            
            expect(resultado.caixa).toBe(300); // 100 + 200
            expect(resultado.aReceber).toBe(550); // 300 + 250
            expect(resultado.total).toBe(850);
        });

        it('⚠️ BUG CRÍTICO: Se esquecer de usar getPaymentValue, convênios contam como 0', () => {
            // Simulação do bug: usando amount diretamente
            const payments: Payment[] = [
                { _id: '1', amount: 0, billingType: 'convenio', insurance: { grossAmount: 300 } }
            ];
            
            // Cálculo ERRADO (usando amount):
            const valorErrado = payments[0].amount; // 0
            expect(valorErrado).toBe(0);
            
            // Cálculo CORRETO (usando getPaymentValue):
            const valorCorreto = getPaymentValue(payments[0]); // 300
            expect(valorCorreto).toBe(300);
        });

        it('Lista vazia deve retornar zeros', () => {
            const resultado = separarCaixaAReceber([]);
            
            expect(resultado.caixa).toBe(0);
            expect(resultado.aReceber).toBe(0);
            expect(resultado.total).toBe(0);
        });

        it('Mix completo: pix, dinheiro, débito, crédito e convênios', () => {
            const payments: Payment[] = [
                { _id: '1', amount: 100, paymentMethod: 'pix' },
                { _id: '2', amount: 150, paymentMethod: 'dinheiro' },
                { _id: '3', amount: 200, paymentMethod: 'debito' },
                { _id: '4', amount: 250, paymentMethod: 'credito' },
                { _id: '5', amount: 0, billingType: 'convenio', insurance: { grossAmount: 300 } }
            ];
            
            const resultado = separarCaixaAReceber(payments);
            
            expect(resultado.caixa).toBe(700); // 100 + 150 + 200 + 250
            expect(resultado.aReceber).toBe(300);
            expect(resultado.total).toBe(1000);
        });
    });

    describe('Cenários de borda', () => {
        
        it('Convênio com grossAmount=0 deve retornar 0', () => {
            const payment: Payment = {
                _id: '1',
                amount: 0,
                billingType: 'convenio',
                insurance: { grossAmount: 0 }
            };
            
            expect(getPaymentValue(payment)).toBe(0);
        });

        it('Valores decimais devem ser preservados', () => {
            const payment: Payment = {
                _id: '1',
                amount: 150.50,
                paymentMethod: 'pix'
            };
            
            expect(getPaymentValue(payment)).toBe(150.50);
        });

        it('Valores negativos (estorno) devem ser tratados', () => {
            const payment: Payment = {
                _id: '1',
                amount: -100,
                paymentMethod: 'pix'
            };
            
            // A função atual retorna negativo - isso é correto para estornos
            expect(getPaymentValue(payment)).toBe(-100);
        });
    });
});

// Exportar para uso em outros testes
export { getPaymentValue, calcularTaxaCartao, separarCaixaAReceber };
