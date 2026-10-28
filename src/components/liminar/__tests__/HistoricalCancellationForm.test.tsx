import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HistoricalCancellationForm from '../HistoricalCancellationForm';
const mocks = vi.hoisted(() => ({ record: vi.fn() }));
// Paths are relative to the component, resolved explicitly here for the test module.
vi.mock('../../../services/doctorService', () => ({ default: { getActiveDoctors: async () => ({ data: [{ _id: '68bedf1104ec4875aaea8188', fullName: 'Profissional local' }] }) } }));
vi.mock('../../../services/liminarContractService', () => ({ default: { recordHistoricalCancellations: mocks.record } }));
const props = () => ({ contractId: 'contract', plan: { _id: 'plan', version: 1, status: 'active' as const, therapies: { fonoaudiologia: { slots: [], sessionValue: 160, sessionDurationMinutes: 40 } }, startDate: '2026-01-01' }, onRecorded: vi.fn(), onPendingChange: vi.fn() });
afterEach(() => { cleanup(); mocks.record.mockReset(); });
describe('cancelamento ausente', () => {
  it('não exige um agendamento existente nem presume dados históricos', async () => {
    render(<HistoricalCancellationForm {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar cancelamento ausente' }));
    expect((screen.getByLabelText('Data do atendimento') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Valor informado da sessão (R$)') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Conferir cancelamentos' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Preencha'));
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it('exige prévia antes de confirmar e só envia dados informados', async () => {
    const p = props(); render(<HistoricalCancellationForm {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar cancelamento ausente' }));
    await screen.findByRole('option', { name: 'Profissional local' });
    expect((screen.getByRole('button', { name: 'Salvar cancelamentos' }) as HTMLButtonElement).disabled).toBe(true);
    for (const [label, value] of [['Data do atendimento', '2026-09-29'], ['Horário original', '14:00'], ['Profissional', '68bedf1104ec4875aaea8188'], ['Valor informado da sessão (R$)', '160'], ['Quem solicitou?', 'patient'], ['Motivo', 'Cancelamento informado pela família']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    mocks.record.mockResolvedValueOnce({ dryRun: true, created: 0, preserved: 0, conflicts: [], decisions: [{ date: '2026-09-29', time: '14:00', specialty: 'fonoaudiologia', action: 'create' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir cancelamentos' }));
    await screen.findByText(/será criado como cancelado/);
    expect(mocks.record.mock.calls[0][3]).toBe(true);
    mocks.record.mockResolvedValueOnce({ dryRun: false, created: 1, preserved: 0, conflicts: [], decisions: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cancelamentos' }));
    await waitFor(() => expect(p.onRecorded).toHaveBeenCalledOnce());
    expect(mocks.record.mock.calls[1][3]).toBe(false);
  });
  it('desabilita confirmação quando a prévia encontra conflito', async () => {
    render(<HistoricalCancellationForm {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar cancelamento ausente' }));
    await screen.findByRole('option', { name: 'Profissional local' });
    for (const [label, value] of [['Data do atendimento', '2026-09-29'], ['Horário original', '14:00'], ['Profissional', '68bedf1104ec4875aaea8188'], ['Valor informado da sessão (R$)', '160'], ['Quem solicitou?', 'clinic'], ['Motivo', 'Clínica fechada']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    mocks.record.mockResolvedValueOnce({ dryRun: true, created: 0, preserved: 0, conflicts: [{ message: 'conflito' }], decisions: [{ date: '2026-09-29', time: '14:00', specialty: 'fonoaudiologia', action: 'conflict' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir cancelamentos' }));
    await screen.findByText(/Nenhum registro será salvo/);
    expect((screen.getByRole('button', { name: 'Salvar cancelamentos' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
