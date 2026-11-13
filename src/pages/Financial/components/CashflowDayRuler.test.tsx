import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CashflowDayRuler from './CashflowDayRuler';

describe('Atendimentos do Caixa', () => {
  it('preserva os nomes acessíveis e os filtros da régua original', () => {
    const onState = vi.fn();
    render(<CashflowDayRuler appointments={[
      { id: '1', time: '09:00', professionalName: 'Profissional com nome completo extenso', patientName: 'Paciente Primeiro', billingType: 'convenio' },
      { id: '2', time: '09:00', professionalName: 'Profissional com nome completo extenso', patientName: 'Paciente Segundo' },
    ]} isCompleted={() => true} pendingIds={new Set(['2'])} isToday={false} onState={onState} values={{ sem: 'R$ 150,00' }} />);
    expect(screen.getByText('Profissional com nome completo extenso')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /09:00 Paciente Primeiro: convênio/ }));
    expect(onState).toHaveBeenLastCalledWith('conv');
    fireEvent.click(screen.getByRole('button', { name: /09:00 Paciente Segundo: atendido sem pagamento/ }));
    expect(onState).toHaveBeenLastCalledWith('sem');
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });

  it('continua excluindo pré-agendamento convertido e preserva classificação de pacote', () => {
    const onState = vi.fn();
    render(<CashflowDayRuler appointments={[
      { id: 'converted', time: '10:00', patientName: 'Registro convertido', operationalStatus: 'converted' },
      { id: 'package', time: '11:00', patientName: 'Paciente Pacote', package: { id: 'pkg' } },
    ]} isCompleted={() => true} pendingIds={new Set()} isToday={false} onState={onState} />);
    expect(screen.queryByText('Registro convertido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /11:00 Paciente Pacote: pacote/ }));
    expect(onState).toHaveBeenCalledWith('pacote');
  });
});
