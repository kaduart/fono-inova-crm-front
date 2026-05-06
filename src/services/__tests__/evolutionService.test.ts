/**
 * evolutionService.test.ts
 *
 * Garante que todas as operações de evolução usam exclusivamente
 * o endpoint V2 (/v2/evolutions), sem fallback para V1 legado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchEvolutionsByPatient,
  fetchEvolutionChart,
  fetchEvolutionProgress,
  fetchLastEvolution,
  createEvolution,
  updateEvolution,
  deleteEvolution,
} from '../evolutionService';
import API from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedAPI = API as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('evolutionService - exclusivo V2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchEvolutionsByPatient chama GET /v2/evolutions/patient/:id', async () => {
    mockedAPI.get.mockResolvedValue({
      data: { success: true, data: [{ _id: 'evo1' }] },
    });
    const result = await fetchEvolutionsByPatient('p1');
    expect(mockedAPI.get).toHaveBeenCalledWith('/v2/evolutions/patient/p1');
    expect(result).toEqual([{ _id: 'evo1' }]);
  });

  it('fetchEvolutionChart chama GET /v2/evolutions/chart/:id', async () => {
    mockedAPI.get.mockResolvedValue({
      data: { success: true, data: { labels: [] } },
    });
    const result = await fetchEvolutionChart('p1');
    expect(mockedAPI.get).toHaveBeenCalledWith('/v2/evolutions/chart/p1');
    expect(result).toEqual({ labels: [] });
  });

  it('fetchEvolutionProgress chama GET /v2/evolutions/patient/:id/progress', async () => {
    mockedAPI.get.mockResolvedValue({
      data: { success: true, data: { currentPlan: null } },
    });
    const result = await fetchEvolutionProgress('p1');
    expect(mockedAPI.get).toHaveBeenCalledWith(
      '/v2/evolutions/patient/p1/progress'
    );
    expect(result).toEqual({ currentPlan: null });
  });

  it('createEvolution chama POST /v2/evolutions e unwrap envelope', async () => {
    const payload = {
      patientId: 'p1',
      doctorId: 'd1',
      sessionType: 'session',
      paymentType: 'particular',
      date: '2025-06-01',
      time: '10:00',
    };
    mockedAPI.post.mockResolvedValue({
      data: { success: true, data: { _id: 'evo2' } },
    });
    const result = await createEvolution(payload);
    expect(mockedAPI.post).toHaveBeenCalledWith('/v2/evolutions', payload);
    expect(result).toEqual({ _id: 'evo2' });
  });

  it('updateEvolution chama PUT /v2/evolutions/:id', async () => {
    mockedAPI.put.mockResolvedValue({
      data: { success: true, data: { _id: 'evo3' } },
    });
    const result = await updateEvolution('evo3', { content: 'updated' });
    expect(mockedAPI.put).toHaveBeenCalledWith('/v2/evolutions/evo3', {
      content: 'updated',
    });
    expect(result).toEqual({ _id: 'evo3' });
  });

  it('deleteEvolution chama DELETE /v2/evolutions/:id', async () => {
    mockedAPI.delete.mockResolvedValue({
      data: { success: true, data: {} },
    });
    await deleteEvolution('evo4');
    expect(mockedAPI.delete).toHaveBeenCalledWith('/v2/evolutions/evo4');
  });

  it('fetchLastEvolution chama GET /v2/evolutions/patient/:id/last', async () => {
    mockedAPI.get.mockResolvedValue({
      data: { success: true, data: { _id: 'evo5', content: 'Última' } },
    });
    const result = await fetchLastEvolution('p1');
    expect(mockedAPI.get).toHaveBeenCalledWith('/v2/evolutions/patient/p1/last');
    expect(result).toEqual({ _id: 'evo5', content: 'Última' });
  });

  it('fetchLastEvolution retorna null em 404', async () => {
    const err = new Error('Not Found') as any;
    err.response = { status: 404 };
    mockedAPI.get.mockRejectedValue(err);
    const result = await fetchLastEvolution('p1');
    expect(result).toBeNull();
  });

  it('rejeita quando envelope V2 indica erro (success: false)', async () => {
    mockedAPI.get.mockResolvedValue({
      data: { success: false, error: { message: 'Paciente não encontrado' } },
    });
    await expect(fetchEvolutionsByPatient('p1')).rejects.toThrow(
      'Paciente não encontrado'
    );
  });
});
