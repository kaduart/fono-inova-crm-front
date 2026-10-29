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
    await waitFor(() => expect((screen.getByRole('button', { name: 'Confirmar e gerar' }) as HTMLButtonElement).disabled).toBe(true));
    expect(onRun).toHaveBeenCalledOnce();
  });
});
