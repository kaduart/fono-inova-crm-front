/**
 * @file doctorFlow.integration.test.ts
 * @description Testes de integração para o fluxo completo de gerenciamento de médicos
 * @version 1.0.0
 * 
 * Estes testes verificam se os hooks useDoctorList e useDoctorStats
 * trabalham corretamente juntos e mantêm consistência de dados.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDoctorList, invalidateDoctorListCache } from '../useDoctorList';
import { useDoctorStats, invalidateDoctorStatsCache } from '../useDoctorStats';
import { doctorService } from '../../services/doctorService';
import API from '../../services/api';

// Mocks
vi.mock('../../services/doctorService', () => ({
  doctorService: {
    getAllDoctors: vi.fn(),
    getActiveDoctors: vi.fn(),
    getInactiveDoctors: vi.fn(),
    getDoctorOverview: vi.fn(),
    getTotalDoctors: vi.fn(),
    getAttendanceSummary: vi.fn(),
    getAppointmentCalendarDoctor: vi.fn(),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
    deactivateDoctor: vi.fn(),
    reactivateDoctor: vi.fn(),
  }
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  }
}));

// Mock data completo
const mockDoctors = [
  {
    _id: 'doc1',
    fullName: 'Dr. Ana Silva',
    email: 'ana@clinica.com',
    specialty: 'fonoaudiologia',
    licenseNumber: 'CRF-12345',
    phoneNumber: '11987654321',
    active: true,
  },
  {
    _id: 'doc2',
    fullName: 'Dr. João Santos',
    email: 'joao@clinica.com',
    specialty: 'psicologia',
    licenseNumber: 'CRP-54321',
    phoneNumber: '11987654322',
    active: true,
  },
  {
    _id: 'doc3',
    fullName: 'Dra. Maria Costa',
    email: 'maria@clinica.com',
    specialty: 'terapia_ocupacional',
    licenseNumber: 'CRTO-98765',
    phoneNumber: '11987654323',
    active: false,
    deactivatedAt: '2024-01-15T10:00:00.000Z',
  }
];

const mockStats = {
  today: 5,
  confirmed: 3,
  totalPatients: 25,
  specialties: { fonoaudiologia: 3 },
  clinical: { pending: 2, inProgress: 1, completed: 2, noShow: 0 },
  operational: { scheduled: 3, confirmed: 2, canceled: 0, paid: 5 }
};

const mockOverview = {
  totalDoctors: 3,
  activeDoctors: 2,
  inactiveDoctors: 1,
  bySpecialty: { fonoaudiologia: 1, psicologia: 1, terapia_ocupacional: 1 },
  stats: mockStats
};

describe('Doctor Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDoctorListCache();
    invalidateDoctorStatsCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    invalidateDoctorListCache();
    invalidateDoctorStatsCache();
  });

  describe('Consistência de Dados', () => {
    it('deve manter consistência entre useDoctorList e useDoctorStats', async () => {
      // Setup
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: mockDoctors } as any);
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 3 });

      // Renderiza ambos os hooks
      const { result: listResult } = renderHook(() => useDoctorList());
      const { result: statsResult } = renderHook(() => useDoctorStats());

      // Aguarda ambos carregarem
      await waitFor(() => {
        expect(listResult.current.loading).toBe(false);
        expect(statsResult.current.loading).toBe(false);
      });

      // Verifica consistência das contagens
      expect(listResult.current.count).toBe(statsResult.current.totalDoctors);
      expect(listResult.current.activeCount).toBe(mockOverview.activeDoctors);
      expect(listResult.current.inactiveCount).toBe(mockOverview.inactiveDoctors);
    });

    it('deve atualizar ambos os hooks quando cache é invalidado', async () => {
      // Setup inicial
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: mockDoctors } as any);
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 3 });

      const { result: listResult } = renderHook(() => useDoctorList());
      const { result: statsResult } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(listResult.current.loading).toBe(false);
      });

      expect(listResult.current.count).toBe(3);

      // Novo dado após "mutação"
      const updatedDoctors = [...mockDoctors, {
        _id: 'doc4',
        fullName: 'Dr. Novo Médico',
        email: 'novo@clinica.com',
        specialty: 'pediatria',
        licenseNumber: 'CRM-11111',
        phoneNumber: '11999999999',
        active: true,
      }];

      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: updatedDoctors } as any);

      // Invalida cache e refetch
      act(() => {
        invalidateDoctorListCache();
      });

      await act(async () => {
        await listResult.current.refetch();
      });

      // Verifica atualização
      expect(listResult.current.count).toBe(4);
    });
  });

  describe('Cenário: Inativação de Médico', () => {
    it('deve refletir mudança de status após inativação', async () => {
      // Dados iniciais
      const initialDoctors = [...mockDoctors];
      
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: initialDoctors } as any);
      vi.mocked(doctorService.getActiveDoctors).mockResolvedValue({ 
        data: initialDoctors.filter(d => d.active) 
      } as any);
      vi.mocked(doctorService.getInactiveDoctors).mockResolvedValue({ 
        data: initialDoctors.filter(d => !d.active) 
      } as any);

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activeCount).toBe(2);
      expect(result.current.inactiveCount).toBe(1);

      // Simula inativação
      const afterDeactivation = initialDoctors.map(d => 
        d._id === 'doc1' ? { ...d, active: false, deactivatedAt: new Date().toISOString() } : d
      );

      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: afterDeactivation } as any);

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.activeCount).toBe(1);
      expect(result.current.inactiveCount).toBe(2);
    });

    it('deve separar corretamente médicos ativos e inativos em filtros', async () => {
      vi.mocked(doctorService.getActiveDoctors).mockResolvedValue({
        data: mockDoctors.filter(d => d.active)
      } as any);
      
      vi.mocked(doctorService.getInactiveDoctors).mockResolvedValue({
        data: mockDoctors.filter(d => !d.active)
      } as any);

      // Hook para ativos
      const { result: activeResult } = renderHook(() => useDoctorList({ filter: 'active' }));
      
      // Hook para inativos
      const { result: inactiveResult } = renderHook(() => useDoctorList({ filter: 'inactive' }));

      await waitFor(() => {
        expect(activeResult.current.loading).toBe(false);
        expect(inactiveResult.current.loading).toBe(false);
      });

      // Verifica separação
      expect(activeResult.current.doctors).toHaveLength(2);
      expect(activeResult.current.doctors.every(d => d.active !== false)).toBe(true);
      
      expect(inactiveResult.current.doctors).toHaveLength(1);
      expect(inactiveResult.current.doctors.every(d => d.active === false)).toBe(true);
    });
  });

  describe('Cenário: Dashboard do Admin', () => {
    it('deve carregar dados necessários para o AdminDashboard', async () => {
      // Setup dos mocks
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: mockDoctors } as any);
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 3 });

      // Hooks que seriam usados no AdminDashboard
      const { result: listResult } = renderHook(() => useDoctorList());
      const { result: statsResult } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(listResult.current.loading).toBe(false);
        expect(statsResult.current.loadingOverview).toBe(false);
      });

      // Verifica dados do AdminDashboard
      expect(listResult.current.doctors).toHaveLength(3);
      expect(statsResult.current.totalDoctors).toBe(3);
      expect(statsResult.current.doctorOverview?.activeDoctors).toBe(2);
      expect(statsResult.current.doctorOverview?.inactiveDoctors).toBe(1);
      
      // Verifica se tem todas as especialidades
      expect(statsResult.current.doctorOverview?.bySpecialty).toHaveProperty('fonoaudiologia');
      expect(statsResult.current.doctorOverview?.bySpecialty).toHaveProperty('psicologia');
      expect(statsResult.current.doctorOverview?.bySpecialty).toHaveProperty('terapia_ocupacional');
    });

    it('deve carregar dados específicos quando seleciona um médico', async () => {
      const selectedDoctorId = 'doc1';
      
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 3 });
      vi.mocked(API.get).mockResolvedValue({ data: mockStats });
      vi.mocked(doctorService.getAttendanceSummary).mockResolvedValue({
        data: { data: [] }
      } as any);
      vi.mocked(doctorService.getAppointmentCalendarDoctor).mockResolvedValue([]);

      const { result } = renderHook(() => useDoctorStats({ doctorId: selectedDoctorId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verifica que buscou dados específicos do médico
      expect(API.get).toHaveBeenCalledWith(`/doctors/${selectedDoctorId}/stats`);
      expect(doctorService.getAttendanceSummary).toHaveBeenCalledWith(selectedDoctorId);
      expect(doctorService.getAppointmentCalendarDoctor).toHaveBeenCalledWith(selectedDoctorId);
    });
  });

  describe('Performance', () => {
    it('deve reusar cache entre refreshs rápidos', async () => {
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: mockDoctors } as any);

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Limpa mocks
      vi.mocked(doctorService.getAllDoctors).mockClear();

      // Primeiro refresh (vai usar cache, então não chama API)
      await act(async () => {
        await result.current.refresh();
      });

      // Como usa cache, não deve ter chamado API
      expect(doctorService.getAllDoctors).not.toHaveBeenCalled();

      // Invalida cache
      invalidateDoctorListCache();

      // Agora o refresh deve chamar API
      await act(async () => {
        await result.current.refresh();
      });

      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('deve lidar com falha parcial (um hook falha, outro funciona)', async () => {
      // Lista funciona
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: mockDoctors } as any);
      
      // Stats falha
      vi.mocked(doctorService.getDoctorOverview).mockRejectedValue(new Error('Erro no servidor'));

      const { result: listResult } = renderHook(() => useDoctorList());
      const { result: statsResult } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(listResult.current.loading).toBe(false);
        expect(statsResult.current.loadingStats).toBe(false);
      });

      // Lista deve ter dados
      expect(listResult.current.doctors).toHaveLength(3);
      expect(listResult.current.hasError).toBe(false);

      // Stats deve ter erro
      expect(statsResult.current.hasError).toBe(true);
      expect(statsResult.current.stats).toBeNull();
    });

    it('deve permitir retry após erro', async () => {
      vi.mocked(doctorService.getAllDoctors)
        .mockRejectedValueOnce(new Error('Erro'))
        .mockResolvedValueOnce({ data: mockDoctors } as any);

      const { result } = renderHook(() => useDoctorList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);

      // Força refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.hasError).toBe(false);
      expect(result.current.doctors).toHaveLength(3);
    });
  });

  describe('Cache Independence', () => {
    it('deve ter caches independentes para list e stats', async () => {
      vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: mockDoctors } as any);
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 3 });

      const { result: listResult } = renderHook(() => useDoctorList());
      const { result: statsResult } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(listResult.current.loading).toBe(false);
        expect(statsResult.current.loading).toBe(false);
      });

      // Limpa mocks
      vi.mocked(doctorService.getAllDoctors).mockClear();
      vi.mocked(doctorService.getDoctorOverview).mockClear();

      // Invalida apenas cache de lista
      invalidateDoctorListCache();
      
      await act(async () => {
        await listResult.current.refresh();
      });

      // Lista deve ter feito nova requisição
      expect(doctorService.getAllDoctors).toHaveBeenCalledTimes(1);
      
      // Stats não deve ter feito requisição (cache ainda válido)
      expect(doctorService.getDoctorOverview).not.toHaveBeenCalled();
    });
  });
});

/**
 * Testes específicos do cenário de ManageDoctors
 */
describe('ManageDoctors Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDoctorListCache();
  });

  it('deve suportar o fluxo completo de inativação', async () => {
    // Estado inicial
    const doctors = [...mockDoctors];
    
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: doctors } as any);
    vi.mocked(doctorService.deactivateDoctor).mockResolvedValue({
      data: {
        message: 'Profissional inativado com sucesso',
        doctor: { ...doctors[0], active: false }
      }
    } as any);

    const { result } = renderHook(() => useDoctorList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeCount).toBe(2);

    // Simula inativação
    const doctorToDeactivate = result.current.doctors[0];
    
    // Mock novo estado após inativação
    const updatedDoctors = doctors.map(d => 
      d._id === doctorToDeactivate._id 
        ? { ...d, active: false, deactivatedAt: new Date().toISOString() }
        : d
    );
    
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: updatedDoctors } as any);

    // Executa inativação e refetch
    await act(async () => {
      await doctorService.deactivateDoctor(doctorToDeactivate._id);
      await result.current.refetch();
    });

    // Verifica resultado
    expect(result.current.activeCount).toBe(1);
    expect(result.current.inactiveCount).toBe(2);
    
    const inactivated = result.current.doctors.find(d => d._id === doctorToDeactivate._id);
    expect(inactivated?.active).toBe(false);
  });

  it('deve suportar o fluxo de reativação', async () => {
    const doctors = [...mockDoctors];
    const inactiveDoctor = doctors.find(d => !d.active)!;
    
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: doctors } as any);
    vi.mocked(doctorService.reactivateDoctor).mockResolvedValue({
      data: {
        message: 'Profissional reativado com sucesso',
        doctor: { ...inactiveDoctor, active: true }
      }
    } as any);

    const { result } = renderHook(() => useDoctorList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.inactiveCount).toBe(1);

    // Simula reativação
    const updatedDoctors = doctors.map(d => 
      d._id === inactiveDoctor._id 
        ? { ...d, active: true }
        : d
    );
    
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue({ data: updatedDoctors } as any);

    await act(async () => {
      await doctorService.reactivateDoctor(inactiveDoctor._id);
      await result.current.refetch();
    });

    expect(result.current.activeCount).toBe(3);
    expect(result.current.inactiveCount).toBe(0);
  });
});
