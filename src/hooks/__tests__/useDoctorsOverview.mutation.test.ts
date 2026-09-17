/**
 * @file useDoctorsOverview.mutation.test.ts
 * @description Confirma que, depois de uma mutação real (inativar/reativar
 * profissional), o refresh de useDoctorsOverview busca dado NOVO — não serve
 * o cache de até 2 minutos (TTL do bloco 'doctors') como se nada tivesse
 * mudado. Ver AdminDashboard.tsx: onDoctorsChange chama refresh(true).
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../../services/api';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockedAPI = API as unknown as { get: ReturnType<typeof vi.fn> };

function overviewWithDoctors(doctors: Array<{ _id: string; name: string }>) {
  return {
    data: {
      success: true,
      data: {
        doctorsOverview: doctors.map((d) => ({ ...d, specialty: 'fono', patients: 0, appointments: 0 })),
        meta: { generatedAt: new Date().toISOString(), version: 'v2', included: ['doctors'] },
      },
    },
  };
}

describe('useDoctorsOverview — refresh após mutação real', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refresh() sem argumento (mount inicial) serve do cache dentro do TTL — não bate na rede de novo', async () => {
    const { useDoctorsOverview } = await import('../useDashboard');
    mockedAPI.get.mockResolvedValue(overviewWithDoctors([{ _id: 'd1', name: 'Dra. Ana (ativa)' }]));

    const { result } = renderHook(() => useDoctorsOverview());
    await waitFor(() => expect(result.current.doctors).toHaveLength(1));
    expect(mockedAPI.get).toHaveBeenCalledTimes(1);

    // Chamar refresh() sem forçar, ainda dentro do TTL, não deveria bater na rede de novo
    await act(async () => { await result.current.refresh(); });
    expect(mockedAPI.get).toHaveBeenCalledTimes(1);
  });

  it('refresh(true) depois de inativar um profissional busca a lista atualizada de verdade, ignorando o cache', async () => {
    const { useDoctorsOverview } = await import('../useDashboard');

    // 1ª resposta: profissional ainda ativo
    mockedAPI.get.mockResolvedValueOnce(overviewWithDoctors([{ _id: 'd1', name: 'Dra. Ana (ativa)' }]));

    const { result } = renderHook(() => useDoctorsOverview());
    await waitFor(() => expect(result.current.doctors).toHaveLength(1));
    expect(result.current.doctors[0].name).toBe('Dra. Ana (ativa)');

    // Simula a mutação real (PATCH de inativação) acontecendo em outro lugar do
    // app — o backend agora responderia sem a Dra. Ana na lista de ativos.
    mockedAPI.get.mockResolvedValueOnce(overviewWithDoctors([]));

    // onDoctorsChange (AdminDashboard.tsx) chama exatamente isto: refresh(true)
    await act(async () => { await result.current.refresh(true); });

    expect(mockedAPI.get).toHaveBeenCalledTimes(2); // bateu na rede de novo, não usou cache
    expect(result.current.doctors).toHaveLength(0); // lista realmente atualizada, sem a Dra. Ana
  });
});
