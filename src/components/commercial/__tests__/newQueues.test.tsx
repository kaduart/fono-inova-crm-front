// Filas "Avaliou e não fechou" e "Sessões sem confirmação" (31/10/2026).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const send = vi.fn(async () => ({ queued: 2, skipped: 1, failed: 0, queuePaused: false }));
const register = vi.fn(async () => ({}));
vi.mock('../../../services/commercialService', () => ({
    commercialService: { sendConfirmationReminders: send, registerContact: register, confirmAttendance: vi.fn(async () => ({})) },
}));

const { EvaluationPanel, NextDayConfirmPanel } = await import('../CommercialParts');

const item = (over: any) => ({ appointmentId: 'a1', patientId: 'p1', name: 'Arthur Silva', phone: '62999990000', time: '08:00', specialty: 'fonoaudiologia', doctorName: 'Dra. Luana', status: 'scheduled', state: 'not_sent', sentAt: null, respondedAt: null, responseText: null, missed30: 0, ...over });

describe('NextDayConfirmPanel', () => {
    it('pede confirmação antes do lote e envia uma vez só', async () => {
        const queue = { date: '2026-11-02', total: 5, confirmed: 2, items: [item({}), item({ appointmentId: 'a2', patientId: 'p2' }), item({ appointmentId: 'a3', state: 'no_reply' })] };
        render(<NextDayConfirmPanel queue={queue as any} onClose={() => {}} onChanged={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Enviar lembrete para 2' }));
        expect(send).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('2 lembretes entraram'));
        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith('2026-11-02');
    });
});

describe('EvaluationPanel', () => {
    it('separa por faixa e registra "Não vai fechar" com o motivo', async () => {
        const queue = { total: 2, potentialMonthly: 1440, items: [
            { patientId: 'p1', appointmentId: 'e1', name: 'Davi', phone: '62999990000', specialty: 'fonoaudiologia', doctorName: 'Dra. Luana', evaluatedAt: '2026-10-27', daysSince: 4, lastContactAt: null, lastContactNote: null },
            { patientId: 'p2', appointmentId: 'e2', name: 'Helena', phone: '', specialty: 'psicologia', doctorName: null, evaluatedAt: '2026-10-19', daysSince: 12, lastContactAt: null, lastContactNote: null },
        ] };
        render(<EvaluationPanel queue={queue as any} onClose={() => {}} onChanged={() => {}} />);
        expect(screen.getAllByText(/Davi/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Helena/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Não vai fechar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Preço' }));
        await waitFor(() => expect(register).toHaveBeenCalledWith({ targetType: 'patient', targetId: 'p1', kind: 'evaluation_lost', note: 'Preço' }));
    });
});
