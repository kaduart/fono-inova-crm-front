import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsuranceGuideForm from '../InsuranceGuideForm';

vi.mock('../../../../hooks/useConvenios', () => ({
  useConvenios: () => ({ convenios: [{ _id: 'unimed', code: 'unimed-anapolis', name: 'Unimed Anápolis' }], isLoading: false })
}));

describe('Avaliação existente no formulário da guia', () => {
  it('mostra a data e o horário salvos e orienta atualizar o agendamento existente', () => {
    const { container } = render(<InsuranceGuideForm open onClose={vi.fn()} onSave={vi.fn()} guide={{
      number: '16513883', specialty: 'fonoaudiologia', insurance: 'unimed-anapolis',
      totalSessions: 10, sessionValue: 80, evaluationAmount: 250,
      status: 'active', expiresAt: '2026-11-28T00:00:00Z', issuedAt: '2026-09-07T00:00:00Z',
      evaluationSessionId: 'evaluation-session',
      evaluationAppointment: { date: '2026-09-15T03:00:00Z', time: '16:00' }
    }} />);
    expect(container.querySelector('input[name="evaluationDate"]')).toHaveValue('2026-09-15');
    expect(container.querySelector('input[name="evaluationTime"]')).toHaveValue('16:00');
    expect(container.querySelector('input[name="issuedAt"]')).toHaveValue('2026-09-07');
    expect(container.querySelector('input[name="expiresAt"]')).toHaveValue('2026-11-28');
    expect(screen.getByText('A avaliação já está na agenda. Ao salvar, a data e o horário serão atualizados.')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Agendar avaliação' })).not.toBeInTheDocument();
  });
});
