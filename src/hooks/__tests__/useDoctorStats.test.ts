/**
 * @file useDoctorStats.test.ts
 * @description Testes unitários para o hook useDoctorStats
 * @version 1.0.0
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDoctorStats, invalidateDoctorStatsCache, DoctorStats } from '../useDoctorStats';
import doctorService from '../../services/doctorService';
import API from '../../services/api';

// Mocks
vi.mock('../../services/doctorService', () => ({
  doctorService: {
    getDoctorOverview: vi.fn(),
    getTotalDoctors: vi.fn(),
    getAttendanceSummary: vi.fn(),
    getAppointmentCalendarDoctor: vi.fn(),
  }
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  }
}));

// Mock data
const mockStats: DoctorStats = {
  today: 5,
  confirmed: 3,
  totalPatients: 25,
  specialties: { fonoaudiologia: 3, psicologia: 2 },
  clinical: {
    pending: 2,
    inProgress: 1,
    completed: 2,
    noShow: 0
  },
  operational: {
    scheduled: 3,
    confirmed: 2,
    canceled: 0,
    paid: 5
  }
};

const mockAttendanceSummary = [
  {
    patient: { _id: 'p1', fullName: 'Paciente 1' },
    total: 10,
    attended: 8,
    missed: 1,
    canceled: 1,
    pending: 0,
    frequency: 80,
    lastSession: '2024-01-15T10:00:00.000Z'
  }
];

const mockOverview = {
  totalDoctors: 10,
  activeDoctors: 8,
  inactiveDoctors: 2,
  bySpecialty: { fonoaudiologia: 4, psicologia: 3, terapia_ocupacional: 3 }
};

const mockCalendarEvents = [
  {
    id: 'evt1',
    title: 'Paciente 1 - Fonoaudiologia',
    start: '2024-01-16T09:00:00.000Z',
    end: '2024-01-16T09:40:00.000Z',
    extendedProps: {
      status: 'scheduled',
      clinicalStatus: 'pending',
      operationalStatus: 'scheduled',
      specialty: 'fonoaudiologia',
      reason: 'Consulta',
      patient: { fullName: 'Paciente 1' },
      doctor: { fullName: 'Dr. Ana' },
      time: '09:00',
      date: '2024-01-16'
    }
  }
];

describe('useDoctorStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDoctorStatsCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    invalidateDoctorStatsCache();
  });

  describe('Inicialização', () => {
    it('deve iniciar com estados nulos/vazios', () => {
      const { result } = renderHook(() => useDoctorStats({ autoFetch: false }));

      expect(result.current.stats).toBeNull();
      expect(result.current.attendanceSummary).toEqual([]);
      expect(result.current.doctorOverview).toBeNull();
      expect(result.current.calendarEvents).toEqual([]);
      expect(result.current.totalDoctors).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve buscar overview automaticamente quando autoFetch=true', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValueOnce(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValueOnce({ totalDoctors: 10 });

      const { result } = renderHook(() => useDoctorStats({ autoFetch: true }));

      // Deve estar carregando
      expect(result.current.loadingOverview).toBe(true);

      await waitFor(() => {
        expect(result.current.loadingOverview).toBe(false);
      });

      // Verifica que as funções foram chamadas
      expect(doctorService.getDoctorOverview).toHaveBeenCalled();
      expect(doctorService.getTotalDoctors).toHaveBeenCalled();
      
      // Verifica o total de médicos
      expect(result.current.totalDoctors).toBe(10);
    });
  });

  describe('Busca de Stats', () => {
    it('deve buscar stats do médico logado quando não tem doctorId', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValueOnce({
        ...mockOverview,
        stats: mockStats
      });
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValueOnce({ totalDoctors: 10 });

      const { result } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(result.current.loadingStats).toBe(false);
      });

      expect(doctorService.getDoctorOverview).toHaveBeenCalled();
    });

    it('deve buscar stats de médico específico quando tem doctorId', async () => {
      vi.mocked(API.get).mockResolvedValueOnce({ data: mockStats });
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValueOnce(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValueOnce({ totalDoctors: 10 });
      vi.mocked(doctorService.getAttendanceSummary).mockResolvedValueOnce({
        data: { data: [] }
      } as any);
      vi.mocked(doctorService.getAppointmentCalendarDoctor).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useDoctorStats({ doctorId: 'doc123' }));

      await waitFor(() => {
        expect(result.current.loadingStats).toBe(false);
      });

      expect(API.get).toHaveBeenCalledWith('/doctors/doc123/stats');
    });
  });

  describe('Attendance Summary', () => {
    it('não deve buscar attendance se não tem doctorId', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValueOnce(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValueOnce({ totalDoctors: 10 });

      const { result } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(doctorService.getAttendanceSummary).not.toHaveBeenCalled();
    });

    it('deve buscar attendance quando tem doctorId', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValueOnce(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValueOnce({ totalDoctors: 10 });
      vi.mocked(doctorService.getAttendanceSummary).mockResolvedValueOnce({
        data: { data: mockAttendanceSummary }
      } as any);
      vi.mocked(doctorService.getAppointmentCalendarDoctor).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useDoctorStats({ doctorId: 'doc123' }));

      await waitFor(() => {
        expect(result.current.loadingAttendance).toBe(false);
      });

      expect(doctorService.getAttendanceSummary).toHaveBeenCalledWith('doc123');
    });
  });

  describe('Calendar Events', () => {
    it('deve buscar eventos do calendário quando tem doctorId', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValueOnce(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValueOnce({ totalDoctors: 10 });
      vi.mocked(doctorService.getAttendanceSummary).mockResolvedValueOnce({
        data: { data: [] }
      } as any);
      vi.mocked(doctorService.getAppointmentCalendarDoctor).mockResolvedValueOnce(mockCalendarEvents);

      const { result } = renderHook(() => useDoctorStats({ doctorId: 'doc123' }));

      await waitFor(() => {
        expect(result.current.loadingCalendar).toBe(false);
      });

      expect(doctorService.getAppointmentCalendarDoctor).toHaveBeenCalledWith('doc123');
      expect(result.current.calendarEvents).toEqual(mockCalendarEvents);
    });
  });

  describe('Refresh All', () => {
    it('deve fazer refresh de todos os dados', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 10 });
      vi.mocked(doctorService.getAttendanceSummary).mockResolvedValue({
        data: { data: mockAttendanceSummary }
      } as any);
      vi.mocked(doctorService.getAppointmentCalendarDoctor).mockResolvedValue(mockCalendarEvents);

      const { result } = renderHook(() => useDoctorStats({ doctorId: 'doc123' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Limpa mocks para contar apenas chamadas do refreshAll
      vi.mocked(doctorService.getDoctorOverview).mockClear();
      vi.mocked(doctorService.getAttendanceSummary).mockClear();
      vi.mocked(doctorService.getAppointmentCalendarDoctor).mockClear();

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(doctorService.getDoctorOverview).toHaveBeenCalled();
      expect(doctorService.getAttendanceSummary).toHaveBeenCalled();
    });

    it('deve atualizar lastUpdated após refreshAll', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 10 });

      const before = new Date();

      const { result } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshAll();
      });

      const after = new Date();

      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.current.lastUpdated!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve setar error quando API falha', async () => {
      const errorMessage = 'Erro no servidor';
      vi.mocked(doctorService.getDoctorOverview).mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useDoctorStats({ onError }));

      await waitFor(() => {
        expect(result.current.loadingStats).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.hasError).toBe(true);
      expect(onError).toHaveBeenCalled();
    });

    it('deve usar mensagem padrão quando erro não tem mensagem', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockRejectedValueOnce(new Error());

      const { result } = renderHook(() => useDoctorStats());

      await waitFor(() => {
        expect(result.current.loadingStats).toBe(false);
      });

      expect(result.current.error).toBe('Erro ao carregar estatísticas');
    });
  });

  describe('Estados de Loading', () => {
    it('deve ter loading=true se QUALQUER um dos loadings estiver true', async () => {
      vi.mocked(doctorService.getDoctorOverview).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockOverview), 100))
      );
      vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 10 });

      const { result } = renderHook(() => useDoctorStats());

      // Durante o loading
      expect(result.current.loading).toBe(true);
      expect(result.current.loadingOverview).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.loadingOverview).toBe(false);
    });
  });
});

describe('invalidateDoctorStatsCache', () => {
  it('deve invalidar todo o cache', async () => {
    vi.mocked(doctorService.getDoctorOverview).mockResolvedValue(mockOverview);
    vi.mocked(doctorService.getTotalDoctors).mockResolvedValue({ totalDoctors: 10 });

    const { result } = renderHook(() => useDoctorStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Limpa mocks
    vi.mocked(doctorService.getDoctorOverview).mockClear();

    // Primeiro refresh deve usar cache (não chama API)
    await act(async () => {
      await result.current.refreshStats();
    });

    // Invalida cache
    invalidateDoctorStatsCache();

    // Agora deve fazer nova requisição
    await act(async () => {
      await result.current.refreshStats();
    });

    expect(doctorService.getDoctorOverview).toHaveBeenCalled();
  });
});
