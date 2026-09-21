import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// Provider REAL; só a rede e o socket são simulados.
const { listMock, socketHandlers } = vi.hoisted(() => ({
  listMock: vi.fn(),
  socketHandlers: {} as Record<string, () => void>,
}));

vi.mock('../../services/appointmentService', () => ({
  appointmentService: { list: (...a: any[]) => listMock(...a), getStatus: vi.fn() },
}));
vi.mock('../../utils/socketManager', () => ({
  socketManager: {
    on: (evt: string, cb: () => void) => { socketHandlers[evt] = cb; return () => { delete socketHandlers[evt]; }; },
  },
}));
vi.mock('../../utils/cacheManager', () => ({ invalidateCache: vi.fn() }));

import { AppointmentsProvider, useAppointmentsContext } from '../../contexts/AppointmentsContext';
import { useCalendarAppointmentsSync } from '../useCalendarAppointmentsSync';

const SEPT = { startDate: '2026-09-01', endDate: '2026-09-30' };
const OCT = { startDate: '2026-10-01', endDate: '2026-10-31' };
const TODAY = '2026-09-18';

const appt = (id: string, date: string) => ({
  _id: id, date, time: '09:00', patient: { _id: `p${id}`, fullName: `Pac ${id}` }, doctor: { _id: 'd1', fullName: 'Dra' },
});
const MONTH = [appt('a1', '2026-09-02'), appt('a2', '2026-09-10'), appt('a3', TODAY), appt('a4', '2026-09-25')];
const TODAY_ONLY = [appt('a3', TODAY)];

let todayDelayMs = 0;
listMock.mockImplementation(async (params: any) => {
  if (params.startDate === TODAY && params.endDate === TODAY) {
    if (todayDelayMs) await new Promise(r => setTimeout(r, todayDelayMs));
    return { data: { data: { appointments: TODAY_ONLY } } };
  }
  if (params.startDate === SEPT.startDate) return { data: { data: { appointments: MONTH } } };
  return { data: { data: { appointments: [appt('o1', '2026-10-05')] } } };
});

// Tela de Pagamentos: ao ativar, busca só "hoje" no contexto compartilhado (PaymentPage.tsx, efeito de `enabled`).
const PaymentsProbe = () => {
  const { fetchAppointments } = useAppointmentsContext();
  useEffect(() => { fetchAppointments({ startDate: TODAY, endDate: TODAY }); }, []); // eslint-disable-line
  return null;
};

// Espelha o AdminDashboard: o pai fica montado, só a aba visível muda.
type Tab = 'Calendário' | 'Pagamentos' | 'Outra';
const Host: React.FC<{ tab: Tab; range?: typeof SEPT }> = ({ tab, range = SEPT }) => {
  const { appointments, fetchAppointments } = useAppointmentsContext();
  useCalendarAppointmentsSync({ isCalendarTab: tab === 'Calendário', hasLoaded: true, range, fetchAppointments });
  return (
    <>
      {tab === 'Calendário' && <div data-testid="cal">{appointments.map(a => a._id).sort().join(',')}</div>}
      {tab === 'Pagamentos' && <PaymentsProbe />}
    </>
  );
};

const ALL_MONTH = 'a1,a2,a3,a4';
const rangeCalls = (r: { startDate: string; endDate: string }) =>
  listMock.mock.calls.filter(([p]) => p.startDate === r.startDate && p.endDate === r.endDate).length;

beforeEach(() => {
  listMock.mockClear();
  todayDelayMs = 0;
  Object.keys(socketHandlers).forEach(k => delete socketHandlers[k]);
});

describe('calendário × contexto compartilhado de agendamentos', () => {
  it('primeira visita: busca o mês uma única vez', async () => {
    render(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));
    expect(rangeCalls(SEPT)).toBe(1);
  });

  it('volta ao calendário depois de Pagamentos: o mês inteiro reaparece (não só hoje)', async () => {
    const { rerender } = render(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));

    rerender(<AppointmentsProvider><Host tab="Pagamentos" /></AppointmentsProvider>);
    await waitFor(() => expect(rangeCalls({ startDate: TODAY, endDate: TODAY })).toBe(1));

    rerender(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));
  });

  it('voltar de uma aba que NÃO mexe nos agendamentos usa o cache (nenhuma requisição extra)', async () => {
    const { rerender } = render(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));
    rerender(<AppointmentsProvider><Host tab="Outra" /></AppointmentsProvider>);
    rerender(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));
    expect(rangeCalls(SEPT)).toBe(1);
  });

  it('volta ao calendário com a busca de "hoje" ainda em andamento: o mês prevalece', async () => {
    todayDelayMs = 150;
    const { rerender } = render(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));

    rerender(<AppointmentsProvider><Host tab="Pagamentos" /></AppointmentsProvider>);
    await waitFor(() => expect(rangeCalls({ startDate: TODAY, endDate: TODAY })).toBe(1)); // em voo
    rerender(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);

    await act(async () => { await new Promise(r => setTimeout(r, 400)); }); // deixa "hoje" terminar
    expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH);
  });

  it('atualização por socket depois de voltar recarrega o MÊS (não o range de hoje)', async () => {
    const { rerender } = render(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));
    rerender(<AppointmentsProvider><Host tab="Pagamentos" /></AppointmentsProvider>);
    await waitFor(() => expect(rangeCalls({ startDate: TODAY, endDate: TODAY })).toBe(1));
    rerender(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));

    listMock.mockClear();
    await act(async () => { socketHandlers['appointmentUpdated']?.(); await new Promise(r => setTimeout(r, 1300)); });
    expect(rangeCalls({ startDate: TODAY, endDate: TODAY })).toBe(0);
    expect(rangeCalls(SEPT)).toBe(1);
    expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH);
  });

  it('navegar para outro mês continua buscando o novo range', async () => {
    const { rerender } = render(<AppointmentsProvider><Host tab="Calendário" /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe(ALL_MONTH));
    rerender(<AppointmentsProvider><Host tab="Calendário" range={OCT} /></AppointmentsProvider>);
    await waitFor(() => expect(screen.getByTestId('cal').textContent).toBe('o1'));
    expect(rangeCalls(OCT)).toBe(1);
  });
});
