/**
 * @file useDoctorList.test.ts
 * @description Testes unitários para o hook useDoctorList
 * @version 1.0.0
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDoctorList, invalidateDoctorListCache } from '../useDoctorList';
import doctorService from '../../services/doctorService';

// Mock do doctorService
vi.mock('../../services/doctorService', () => ({
  doctorService: {
    getAllDoctors: vi.fn(),
    getActiveDoctors: vi.fn(),
    getInactiveDoctors: vi.fn(),
  }
}));

// Mock doctors para testes
const mockDoctors = [
  {
    _id: '1',
    fullName: 'Dr. Ana Silva',
    email: 'ana@clinica.com',
    specialty: 'fonoaudiologia',
    licenseNumber: 'CRF-12345',
    phoneNumber: '11987654321',
    active: true,
  },
  {
    _id: '2',
    fullName: 'Dr. João Santos',
    email: 'joao@clinica.com',
    specialty: 'psicologia',
    licenseNumber: 'CRP-54321',
    phoneNumber: '11987654322',
    active: false,
    deactivatedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    _id: '3',
    fullName: 'Dra. Maria Costa',
    email: 'maria@clinica.com',
    specialty: 'terapia_ocupacional',
    licenseNumber: 'CRTO-98765',
    phoneNumber: '11987654323',
    active: true,
  }
];

describe('useDoctorList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Limpa o cache antes de cada teste
    invalidateDoctorListCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Limpa o cache após cada teste para não afetar outros testes
    invalidateDoctorListCache();
  });

  describe('Inicialização', () => {
    it('deve iniciar com estados vazios', () => {
      const { result } = renderHook(() => useDoctorList({ autoFetch: false }));

      expect(result.current.doctors).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.count).toBe(0);
    });

    it('deve buscar médicos automaticamente quando autoFetch=true', async () => {
      vi.mocked(doctorService.getAllDoctors).mockResolvedValueOnce({
        data: mockDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList({ autoFetch: true }));

      // Deve estar loading inicialmente
      expect(result.current.loading).toBe(true);

      // Aguarda a resolução
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.doctors).toEqual(mockDoctors);
      expect(result.current.count).toBe(3);
      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);
    });

    it('não deve buscar quando autoFetch=false', async () => {
      const { result } = renderHook(() => useDoctorList({ autoFetch: false }));

      expect(result.current.loading).toBe(false);
      expect(doctorService.getAllDoctors).not.toHaveBeenCalled();
    });
  });

  describe('Filtragem', () => {
    it('deve buscar apenas médicos ativos quando filter=active', async () => {
      const activeDoctors = mockDoctors.filter(d => d.active !== false);
      
      vi.mocked(doctorService.getActiveDoctors).mockResolvedValueOnce({
        data: activeDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList({ filter: 'active' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(doctorService.getActiveDoctors).toHaveBeenCalledTimes(1);
      expect(doctorService.getAllDoctors).not.toHaveBeenCalled();
      expect(result.current.doctors).toHaveLength(2);
      expect(result.current.activeCount).toBe(2);
      expect(result.current.inactiveCount).toBe(0);
    });

    it('deve buscar apenas médicos inativos quando filter=inactive', async () => {
      const inactiveDoctors = mockDoctors.filter(d => d.active === false);
      
      vi.mocked(doctorService.getInactiveDoctors).mockResolvedValueOnce({
        data: inactiveDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList({ filter: 'inactive' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(doctorService.getInactiveDoctors).toHaveBeenCalledTimes(1);
      expect(result.current.doctors).toHaveLength(1);
      expect(result.current.activeCount).toBe(0);
      expect(result.current.inactiveCount).toBe(1);
    });

    it('deve buscar todos os médicos quando filter=all (padrão)', async () => {
      vi.mocked(doctorService.getAllDoctors).mockResolvedValueOnce({
        data: mockDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList({ filter: 'all' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);
      expect(result.current.count).toBe(3);
      expect(result.current.activeCount).toBe(2);
      expect(result.current.inactiveCount).toBe(1);
    });
  });

  describe('Refresh e Refetch', () => {
    it('deve usar cache em refresh() se dados são recentes', async () => {
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({
        data: mockDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Chama refresh (deve usar cache)
      await act(async () => {
        await result.current.refresh();
      });

      // Deve ter chamado apenas uma vez (a inicial)
      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);
    });

    it('deve ignorar cache em refetch()', async () => {
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({
        data: mockDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Chama refetch (deve ignorar cache)
      await act(async () => {
        await result.current.refetch();
      });

      // Deve ter chamado duas vezes (inicial + refetch)
      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve setar error quando API falha', async () => {
      const errorMessage = 'Erro de conexão';
      vi.mocked(doctorService.getAllDoctors).mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useDoctorList({ onError }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.hasError).toBe(true);
      expect(onError).toHaveBeenCalled();
    });

    it('deve usar mensagem padrão quando erro não tem mensagem específica', async () => {
      vi.mocked(doctorService.getAllDoctors).mockRejectedValueOnce(new Error());

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Erro ao carregar lista de profissionais');
    });

    it('deve limpar médicos quando ocorre erro', async () => {
      vi.mocked(doctorService.getAllDoctors)
        .mockResolvedValueOnce({ data: mockDoctors } as any)
        .mockRejectedValueOnce({ response: { data: { message: 'Erro' } } });

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.doctors).toHaveLength(3);
      });

      // Força refetch que vai falhar
      invalidateDoctorListCache();
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.doctors).toEqual([]);
      });
    });
  });

  describe('Race Conditions', () => {
    it('deve evitar requisições concorrentes', async () => {
      let resolvePromise: ((value: any) => void) | null = null;
      
      vi.mocked(doctorService.getAllDoctors).mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useDoctorList());

      // Aguarda loading começar
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Tenta fazer outra requisição enquanto uma está em andamento
      await act(async () => {
        await result.current.refresh();
      });

      // Deve ter chamado apenas uma vez (a primeira)
      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);

      // Resolve a promise
      await act(async () => {
        resolvePromise?.({ data: mockDoctors } as any);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.doctors).toHaveLength(3);
    });

    it('não deve atualizar estado se componente desmontar', async () => {
      vi.mocked(doctorService.getAllDoctors).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockDoctors } as any), 100))
      );

      const { result, unmount } = renderHook(() => useDoctorList());

      // Aguarda loading começar
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Desmonta antes da resposta
      unmount();

      // Aguarda tempo suficiente
      await new Promise(r => setTimeout(r, 150));

      // Não deve ter erro de "Can't perform a React state update on an unmounted component"
      expect(result.current.doctors).toEqual([]);
    });
  });

  describe('Última Atualização', () => {
    it('deve registrar timestamp da última atualização', async () => {
      const before = new Date();
      
      vi.mocked(doctorService.getAllDoctors).mockResolvedValueOnce({
        data: mockDoctors
      } as any);

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const after = new Date();
      
      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.current.lastUpdated!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

describe('invalidateDoctorListCache', () => {
  it('deve invalidar todo o cache', async () => {
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue({
      data: mockDoctors
    } as any);

    const { result } = renderHook(() => useDoctorList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Limpa o mock para contar apenas chamadas novas
    vi.mocked(doctorService.getAllDoctors).mockClear();

    // Primeiro refresh deve usar cache (não chama API)
    await act(async () => {
      await result.current.refresh();
    });
    expect(doctorService.getAllDoctors).not.toHaveBeenCalled();

    // Invalida cache
    invalidateDoctorListCache();

    // Agora deve fazer nova requisição
    await act(async () => {
      await result.current.refresh();
    });
    expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);
  });
});
