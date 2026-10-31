import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CashflowAgendaSummary from './CashflowAgendaSummary';
const base = {
 data: { atendimentos: { total: 17, realizados: 12, faltantes: 5 }, agenda: { faltasOuCancelados: 2 } } as any,
 analytics: { novos: [{ date: '2026-10-30' }, { date: '2026-11-02' }], leads: [], novosEspecialidade: [], retornos45: [], recorrentes: [], continuousTreatment: [], all: [] } as any,
 loading: false, error: false, createdTotal: 8, createdLoading: false, createdError: false,
 startDate: '2026-10-30', endDate: '2026-10-30', onAgenda: vi.fn(), onNewSpecialty: vi.fn(),
};
afterEach(cleanup);
describe('Resumo operacional do caixa', () => {
 it('separa a agenda do dia dos agendamentos criados para datas futuras', () => {
  render(<CashflowAgendaSummary {...base} />);
  const value = (label: string) => within(screen.getByText(label).parentElement!).getAllByRole('definition')[0].textContent;
  expect(value('Agendados ativos')).toBe('17');
  expect(value('Atendidos')).toBe('12');
  expect(value('Aguardando')).toBe('5');
  expect(value('Primeira consulta')).toBe('1');
  expect(within(screen.getByText('Agendamentos criados').parentElement!).getAllByRole('definition')[0].textContent).toBe('8');
  fireEvent.click(screen.getByRole('button', { name: 'Ver agenda e atendimentos' }));
  expect(base.onAgenda).toHaveBeenCalledOnce();
 });
 it('informa indisponibilidade sem apresentar zero como dado confirmado', () => {
  render(<CashflowAgendaSummary {...base} analytics={null} error createdError />);
  expect(screen.getByText(/Perfil da agenda indisponível/)).toBeTruthy();
  expect(within(screen.getByText('Agendamentos criados').parentElement!).getAllByRole('definition')[0].textContent).toBe('—');
 });
});

