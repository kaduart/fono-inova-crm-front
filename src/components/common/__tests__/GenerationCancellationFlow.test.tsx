import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GenerationCancellationFlow from '../GenerationCancellationFlow';
const row = { specialty: 'fonoaudiologia', date: '2026-10-29', time: '14:00', doctorId: '68bedf1104ec4875aaea8188', sessionValue: 80, reason: 'Cancelado pelo paciente', cancelRequester: 'patient' };
vi.mock('../CancellationEntryForm', () => ({ default: ({ onDraftChange }: any) => <button onClick={() => onDraftChange([row])}>Informar cancelamento de teste</button> }));
afterEach(cleanup);
describe('Confirmação única de geração e cancelamentos', () => {
  it('inclui as datas na prévia e na aplicação, sem salvar na primeira chamada', async () => {
    const onRun = vi.fn().mockResolvedValue({ created: 8, cancellations: { created: 1, preserved: 0, decisions: [{ ...row, action: 'create' }] } });
    const onApplied = vi.fn(); render(<GenerationCancellationFlow specialties={['fonoaudiologia']} contextKey="1" onRun={onRun} onApplied={onApplied} />);
    fireEvent.click(screen.getByText('Informar cancelamento de teste'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir geração' }));
    await screen.findByText('Prévia — nada foi salvo');
    expect(onRun).toHaveBeenNthCalledWith(1, [row], true); expect(onApplied).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e gerar' }));
    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce()); expect(onRun).toHaveBeenNthCalledWith(2, [row], false);
  });
  it('invalida a prévia quando a configuração da geração muda', async () => {
    const onRun = vi.fn().mockResolvedValue({ created: 8 });
    const props = { specialties: ['fonoaudiologia'], contextKey: '1', onRun, onApplied: vi.fn() };
    const view = render(<GenerationCancellationFlow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Conferir geração' })); await screen.findByText('Prévia — nada foi salvo');
    view.rerender(<GenerationCancellationFlow {...props} contextKey="2" />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirmar e gerar' })).toBeNull());
    expect(onRun).toHaveBeenCalledOnce();
  });
});

describe('Conflito de cancelamento (409 GENERATION_VALIDATION)', () => {
  it('mostra quais datas batem e o que já está lançado, em vez de só "Confira os cancelamentos"', async () => {
    const error = Object.assign(new Error('Request failed with status code 409'), { response: { status: 409, data: {
      success: false, code: 'GENERATION_VALIDATION', message: 'Nada foi gerado', title: 'Nada foi gerado — 1 data cancelada bate com um atendimento já lançado',
      action: 'Tire essa data da lista. Nada foi salvo.',
      items: [{ date: '2026-10-02', time: '10:40', existing: [{ specialty: 'fonoaudiologia', doctorName: 'Lorrany', guideNumber: '0020', status: 'pre_agendado' }] }],
    } } });
    const onRun = vi.fn().mockRejectedValue(error);
    render(<GenerationCancellationFlow specialties={['fonoaudiologia']} contextKey="1" onRun={onRun} onApplied={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Conferir geração' }));
    await screen.findByText('02/10/2026 às 10:40 — já existe Fonoaudiologia com Lorrany (guia 0020), pré-agendado');
    expect(screen.getByText(/1 data cancelada bate/)).toBeTruthy();
    expect(screen.getByText('Tire essa data da lista. Nada foi salvo.')).toBeTruthy();
  });
  it('resposta antiga (só conflicts) ainda lista as datas', async () => {
    const error = { response: { status: 409, data: { message: 'Confira os cancelamentos antes de gerar.', conflicts: [{ date: '2026-10-16', time: '10:40', message: 'Já existe atendimento nesse horário.' }] } } };
    render(<GenerationCancellationFlow specialties={['fonoaudiologia']} contextKey="1" onRun={vi.fn().mockRejectedValue(error)} onApplied={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Conferir geração' }));
    await screen.findByText('16/10/2026 às 10:40 — Já existe atendimento nesse horário.');
  });
});
