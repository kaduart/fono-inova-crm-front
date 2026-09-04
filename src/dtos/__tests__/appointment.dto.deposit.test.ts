import { describe, it, expect } from 'vitest';
import { mapToUpdateAppointmentDTO } from '../appointment.dto';

/**
 * Regressão (2026-09-04): mapToUpdateAppointmentDTO tinha uma allowlist
 * explícita que não incluía depositAmount/depositPaymentMethod — o campo
 * "Registrar sinal recebido" da aba de editar podia ser preenchido na tela,
 * mas o valor era descartado antes de sair pro backend (PATCH silenciosamente
 * sem efeito). Achado ao testar em produção: criar um pré-agendamento com
 * sinal funcionava (agenda externa usa outro payload builder), editar um
 * agendamento existente para registrar o sinal não tinha efeito nenhum.
 */
describe('mapToUpdateAppointmentDTO — sinal recebido na edição', () => {
    it('preserva depositAmount e depositPaymentMethod no payload de update', () => {
        const dto = mapToUpdateAppointmentDTO({
            doctorId: 'doc-1',
            patientId: 'pat-1',
            billingType: 'particular',
            paymentAmount: 500,
            paymentMethod: 'pix',
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        });

        expect(dto.depositAmount).toBe(50);
        expect(dto.depositPaymentMethod).toBe('pix');
    });

    it('não envia depositAmount quando não há sinal (edição comum, fluxo legado intacto)', () => {
        const dto = mapToUpdateAppointmentDTO({
            doctorId: 'doc-1',
            patientId: 'pat-1',
            billingType: 'particular',
            paymentAmount: 500,
            paymentMethod: 'pix',
        });

        expect(dto.depositAmount).toBeUndefined();
        expect(dto.depositPaymentMethod).toBeUndefined();
    });

    it('depositAmount=0 não é enviado (mesma regra: só envia recebimento confirmado > 0)', () => {
        const dto = mapToUpdateAppointmentDTO({
            doctorId: 'doc-1',
            patientId: 'pat-1',
            billingType: 'particular',
            paymentAmount: 500,
            paymentMethod: 'pix',
            depositAmount: 0,
        });

        expect(dto.depositAmount).toBeUndefined();
    });
});
