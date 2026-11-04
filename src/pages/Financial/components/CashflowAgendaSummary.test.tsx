import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CashflowAgendaSummary from './CashflowAgendaSummary';
import type { AppointmentsByTypeData } from '../../../hooks/useAppointmentsByType';
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
  expect(screen.getByRole('button', { name: 'Ver agendados: 17' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ver aguardando: 5' })).toBeTruthy();
  expect(screen.getByText('(0 pré-agendados · 1 1ª consulta)')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ver 8 novos agendamentos criados no dia' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ver agenda e atendimentos' }));
  expect(base.onAgenda).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Ver atendidos: 12' }));
  expect(base.onAgenda).toHaveBeenLastCalledWith('completed');
 });
 it('informa indisponibilidade sem apresentar zero como dado confirmado', () => {
  render(<CashflowAgendaSummary {...base} analytics={null} error createdError />);
  expect(screen.getByText(/Perfil da agenda indisponível/)).toBeTruthy();
  expect(screen.getByText('novos agendamentos criados no dia').parentElement!.textContent).toContain('—');
 });
 it('mostra pacientes novos e nova terapia de quem AGENDOU no dia (mode createdAt)', () => {
  const onProfile = vi.fn();
  const createdAnalytics = { leads: [{ date: '2026-11-10' }], novos: [{ date: '2026-10-30' }, { date: '2026-11-05' }], novosEspecialidade: [{ date: '2026-11-06' }], retornos45: [], recorrentes: [], continuousTreatment: [], all: [] } as unknown as AppointmentsByTypeData;
  render(<CashflowAgendaSummary {...base} createdAnalytics={createdAnalytics} onProfile={onProfile} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver 3 pacientes novos' }));
  expect(onProfile).toHaveBeenLastCalledWith('Pacientes novos que agendaram no dia', [...createdAnalytics.leads, ...createdAnalytics.novos]);
  fireEvent.click(screen.getByRole('button', { name: 'Ver 1 em nova terapia' }));
  expect(onProfile).toHaveBeenLastCalledWith('Nova terapia agendada no dia', createdAnalytics.novosEspecialidade);
 });
});
