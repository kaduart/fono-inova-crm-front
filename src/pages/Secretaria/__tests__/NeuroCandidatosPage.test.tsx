import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NeuroReferral, NeuroReferralSummary } from '../../../services/neuroReferralService';
import { buildNeuroOfferMessage } from '../../../utils/neuroReferral';

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({ list: vi.fn(), summary: vi.fn(), update: vi.fn(), scan: vi.fn(), refer: vi.fn() }));
vi.mock('../../../services/neuroReferralService', () => ({ default: api }));

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warn: vi.fn() }));
vi.mock('../../../utils/toast', () => ({ toast: toastMock, default: toastMock }));
vi.mock('../../../utils/notifyApiError', () => ({ notifyApiError: vi.fn() }));

import NeuroCandidatosPage from '../NeuroCandidatosPage';

const ref = (overrides: Partial<NeuroReferral> = {}): NeuroReferral => ({
  _id: 'r1',
  patient: { _id: 'p1', fullName: 'Ana Souza', phone: '(62) 99999-0000', legalGuardian: 'Carla Souza', dateOfBirth: '2021-03-10T00:00:00.000Z' },
  status: 'indicado',
  reasons: ['tea'],
  source: 'terapeuta',
  matchedTerms: [],
  matchedIn: [],
  homeSpecialties: ['fonoaudiologia'],
  note: null,
  offeredAt: null,
  scheduledAt: null,
  appointment: null,
  declineReason: null,
  createdAt: '2026-11-12T10:00:00.000Z',
  updatedAt: '2026-11-12T10:00:00.000Z',
  ...overrides,
});

const summary: NeuroReferralSummary = {
  byStatus: { a_confirmar: 2, indicado: 1, oferecido: 0, agendado: 3, recusado: 1, ja_tem_laudo: 0, descartado: 0 },
  pendingOffer: 1,
  pendingTherapist: 2,
  conversionRate: 0.75,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue([ref()]);
  api.summary.mockResolvedValue(summary);
  api.update.mockResolvedValue(ref({ status: 'oferecido' }));
  api.scan.mockResolvedValue({ scanned: 10, candidates: 2, created: 2, dryRun: false });
});

describe('buildNeuroOfferMessage', () => {
  it('explica o valor, diz que é particular, não fala preço, convênio nem diagnóstico', () => {
    const msg = buildNeuroOfferMessage({ fullName: 'Ana Souza', legalGuardian: 'Carla Souza' });
    expect(msg).toContain('Oi, Carla!');
    expect(msg).toContain('Ana');
    expect(msg).toMatch(/laudo/);
    expect(msg).toMatch(/particular/);
    expect(msg).not.toMatch(/R\$|\d{3}/);
    expect(msg).not.toMatch(/convênio|GEAP|Base Aérea|autis|TEA|TDAH/i);
    expect(msg.match(/💚/g)).toHaveLength(1);
  });
});

describe('NeuroCandidatosPage', () => {
  it('lista quem oferecer, mostra KPIs e marca como oferecido', async () => {
    render(<NeuroCandidatosPage />);
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith('indicado');
    expect(screen.getByText('75%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Já ofereci' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('r1', { status: 'oferecido' }));
  });

  it('abre o WhatsApp com a mensagem pronta', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<NeuroCandidatosPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Oferecer/ }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toMatch(/^https:\/\/wa\.me\/5562999990000\?text=/);
  });

  it('recusa com motivo', async () => {
    render(<NeuroCandidatosPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recusou' }));
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), { target: { value: 'Depois das férias' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('r1', { status: 'recusado', declineReason: 'Depois das férias' }));
  });

  it('busca sugestões', async () => {
    render(<NeuroCandidatosPage />);
    await screen.findByText('Ana Souza');
    fireEvent.click(screen.getByRole('button', { name: /Buscar sugestões/ }));
    await waitFor(() => expect(api.scan).toHaveBeenCalledWith(false));
    expect(toastMock.success).toHaveBeenCalled();
  });
});
