import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FamilySummaryModal from '../FamilySummaryModal';
import { defaultReportMonth } from '../patient/MonthlyReportsSection';

const fetchFamilySummary = vi.fn();
const sendFamilySummary = vi.fn();
vi.mock('../../../services/evolutionService', () => ({
    fetchFamilySummary: (...a: unknown[]) => fetchFamilySummary(...a),
    sendFamilySummary: (...a: unknown[]) => sendFamilySummary(...a),
}));

describe('Resumo para a família', () => {
    beforeEach(() => { fetchFamilySummary.mockReset(); sendFamilySummary.mockReset(); });

    it('bloqueia envio com [colchetes] e envia o texto revisado', async () => {
        fetchFamilySummary.mockResolvedValue({ suggestion: 'Oi! Hoje o Lucas trabalhou [área]. Seguimos na próxima sessão.', sent: null, canSend: true, blockReason: null, phoneLast4: '0000' });
        sendFamilySummary.mockResolvedValue({ text: 'x', status: 'queued', phoneLast4: '0000' });
        const onSent = vi.fn();
        render(<FamilySummaryModal evolutionId="e1" patientName="Lucas Almeida" onClose={() => {}} onSent={onSent} />);
        const box = await screen.findByLabelText('Mensagem') as HTMLTextAreaElement;
        const btn = screen.getByRole('button', { name: /Enviar pelo WhatsApp/ }) as HTMLButtonElement;
        expect(btn.disabled).toBe(true);

        fireEvent.change(box, { target: { value: 'Oi! Hoje o Lucas trabalhou pedidos com duas palavras e foi muito bem.' } });
        expect(btn.disabled).toBe(false);
        fireEvent.click(btn);
        await waitFor(() => expect(sendFamilySummary).toHaveBeenCalledWith('e1', 'Oi! Hoje o Lucas trabalhou pedidos com duas palavras e foi muito bem.'));
        await waitFor(() => expect(onSent).toHaveBeenCalled());
    });

    it('sem telefone mostra o motivo e não envia', async () => {
        fetchFamilySummary.mockResolvedValue({ suggestion: 'Oi! Sessão boa hoje, seguimos na próxima.', sent: null, canSend: false, blockReason: 'Paciente sem telefone cadastrado', phoneLast4: null });
        render(<FamilySummaryModal evolutionId="e2" patientName="Ana" onClose={() => {}} />);
        expect(await screen.findByText(/sem telefone/)).toBeTruthy();
        expect((screen.getByRole('button', { name: /Enviar pelo WhatsApp/ }) as HTMLButtonElement).disabled).toBe(true);
    });
});

describe('Relatório mensal', () => {
    it('até dia 10 sugere o mês anterior', () => {
        expect(defaultReportMonth(new Date(2026, 10, 3))).toBe('2026-10');
        expect(defaultReportMonth(new Date(2026, 0, 5))).toBe('2025-12');
        expect(defaultReportMonth(new Date(2026, 10, 20))).toBe('2026-11');
    });
});
