import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientInactivateModal from '../PatientInactivateModal';

describe('PatientInactivateModal', () => {
  it('só deixa inativar depois de escolher o motivo e envia a observação', () => {
    const onConfirm = vi.fn();
    render(<PatientInactivateModal open patientName="Ana" nextSessionLabel="12/11 às 10:40" onConfirm={onConfirm} onClose={() => {}} />);

    const confirm = screen.getByRole('button', { name: 'Inativar' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Ainda tem sessão marcada \(12\/11 às 10:40\)/)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Financeiro / preço' }));
    fireEvent.change(screen.getByLabelText('Observação (opcional)'), { target: { value: ' achou caro ' } });
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledWith('financeiro', 'achou caro');
  });
});
