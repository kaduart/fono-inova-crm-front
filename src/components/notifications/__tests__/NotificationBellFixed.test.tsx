import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const amanha = new Date(Date.now() + 86400000).toISOString();
const site = [{ _id: 's1', operationalStatus: 'pre_agendado', channel: 'link_agendamento', date: amanha, time: '09:00', specialty: 'fonoaudiologia', createdAt: new Date().toISOString(), mainComplaint: 'Não fala', patientInfo: { fullName: 'Maria Site' } }];
const com = [{ _id: 'c1', operationalStatus: 'pre_agendado', channel: null, date: amanha, time: '14:00', specialty: 'psicologia', patientInfo: { fullName: 'João Comercial' } }];

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url.includes('channel=link_agendamento')) return Promise.resolve({ data: { data: site, pagination: { total: 1 } } });
      if (url.includes('channel=comercial')) return Promise.resolve({ data: { data: com, pagination: { total: 1 } } });
      return Promise.resolve({ data: { success: false } });
    }),
  },
}));
vi.mock('../../../utils/socketManager', () => ({ socketManager: { on: () => () => {} } }));

import { NotificationBellFixed } from '../NotificationBellFixed';

describe('NotificationBellFixed', () => {
  beforeEach(() => localStorage.clear());

  it('badge conta só quem agendou pelo site e mostra data sem Invalid Date', async () => {
    render(<MemoryRouter><NotificationBellFixed /></MemoryRouter>);
    const btn = await screen.findByRole('button', { name: 'Notificações' });
    expect(btn.textContent).toContain('1');
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText('Maria Site')).toBeTruthy());
    expect(screen.getByText(/Queixa: Não fala/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('Invalid Date');
    expect(document.body.textContent).toContain('às 09:00');
    fireEvent.click(screen.getByText(/Comercial \(1\)/));
    expect(screen.getByText('João Comercial')).toBeTruthy();
  });
});
