import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConvenioMetrics } from '../useConvenioMetrics';

// Mock do fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useConvenioMetrics', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.setItem('token', 'test-token');
  });

  it('deve buscar métricas corretamente', async () => {
    const mockData = {
      success: true,
      data: {
        receitaRealizada: {
          total: 360,
          quantidadeSessoes: 2
        },
        aReceber: {
          total: 360,
          quantidadeSessoes: 2
        },
        provisaoConvenio: {
          total: 360,
          quantidadeSessoes: 2,
          ateData: '2026-02-28'
        },
        pipelineFuturo: {
          total: 1800,
          quantidadeSessoes: 10
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useConvenioMetrics());

    // Inicialmente loading deve ser false
    expect(result.current.loading).toBe(false);

    // Chamar fetchMetrics
    result.current.fetchMetrics(2, 2026);

    // Depois da chamada, loading deve ser true
    expect(result.current.loading).toBe(true);

    // Esperar os dados carregarem
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.receitaRealizada.total).toBe(360);
    expect(result.current.loading).toBe(false);
  });

  it('deve formatar moeda corretamente', () => {
    const { result } = renderHook(() => useConvenioMetrics());
    
    expect(result.current.formatCurrency(360)).toBe('R$ 360,00');
    expect(result.current.formatCurrency(1000.50)).toBe('R$ 1.000,50');
    expect(result.current.formatCurrency(0)).toBe('R$ 0,00');
  });

  it('deve formatar sessões corretamente', () => {
    const { result } = renderHook(() => useConvenioMetrics());
    
    expect(result.current.formatSessoes(1)).toBe('1 sessão');
    expect(result.current.formatSessoes(5)).toBe('5 sessões');
    expect(result.current.formatSessoes(0)).toBe('0 sessões');
  });

  it('deve lidar com erro na API', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Erro na API'));

    const { result } = renderHook(() => useConvenioMetrics());

    await result.current.fetchMetrics(2, 2026);

    expect(result.current.error).toBe('Erro na API');
    expect(result.current.loading).toBe(false);
  });
});
