import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { socketManager } from '../utils/socketManager';

interface PatientInfo {
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  age?: number;
}

interface ContactAttempt {
  date: string;
  channel: 'whatsapp' | 'telefone' | 'email' | 'manual';
  success: boolean;
  notes?: string;
  madeBy?: { fullName: string };
}

export interface PreAgendamento {
  _id: string;
  operationalStatus: string;
  // aliases de compatibilidade (adicionados pelo backend)
  status: string;
  patientInfo: PatientInfo;
  patient?: { _id: string; fullName: string; phone: string };
  patientId?: { _id: string; fullName: string; phone: string }; // alias
  specialty: string;
  date: string;
  time?: string;
  preferredDate: string; // alias para date
  preferredTime?: string; // alias para time
  preferredPeriod?: 'manha' | 'tarde' | 'noite';
  professionalName?: string;
  doctor?: { _id: string; fullName: string };
  professionalId?: { _id: string; fullName: string }; // alias
  serviceType?: string;
  sessionValue: number;
  suggestedValue: number; // alias
  secretaryNotes?: string;
  notes?: string;
  contactAttempts: ContactAttempt[];
  assignedTo?: { _id: string; fullName: string };
  urgency: 'baixa' | 'media' | 'alta' | 'critica';
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: { origin?: { source?: string } };
}

interface DashboardStats {
  porStatus: Record<string, number>;
  urgentes: number;
  porEspecialidade: Array<{ _id: string; count: number }>;
  conversao: {
    taxa: number;
    total: number;
    importados: number;
  };
}

interface UsePreAgendamentosReturn {
  preAgendamentos: PreAgendamento[];
  stats: DashboardStats | null;
  loading: boolean;
  loadingStats: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchPreAgendamentos: (filters?: Record<string, any>) => Promise<void>;
  fetchStats: () => Promise<void>;
  importar: (id: string, data: ImportarData) => Promise<any>;
  descartar: (id: string, reason: string) => Promise<any>;
  registrarContato: (id: string, data: { channel: string; success: boolean; notes?: string }) => Promise<any>;
  atribuir: (id: string, userId?: string) => Promise<any>;
}

interface ImportarData {
  doctorId: string;
  date: string;
  time: string;
  sessionValue: number;
  serviceType?: string;
  paymentMethod?: string;
  notes?: string;
}

export const usePreAgendamentos = (): UsePreAgendamentosReturn => {
  const [preAgendamentos, setPreAgendamentos] = useState<PreAgendamento[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Guarda os últimos filtros usados para que os socket handlers recarreguem com o mesmo filtro
  const lastFiltersRef = useRef<Record<string, any>>({});

  const fetchPreAgendamentos = useCallback(async (filters?: Record<string, any>) => {
    // Se não passou filtros novos, reutiliza os últimos (chamada via socket)
    const activeFilters = filters !== undefined ? filters : lastFiltersRef.current;
    lastFiltersRef.current = activeFilters;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });

      const response = await api.get(`/pre-agendamento?${params.toString()}`);
      setPreAgendamentos(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Erro ao buscar pré-agendamentos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await api.get('/pre-agendamento/stats/dashboard');
      setStats(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const importar = useCallback(async (id: string, data: ImportarData) => {
    const response = await api.post(`/pre-agendamento/${id}/importar`, data);
    return response.data;
  }, []);

  const descartar = useCallback(async (id: string, reason: string) => {
    const response = await api.post(`/pre-agendamento/${id}/descartar`, { reason });
    return response.data;
  }, []);

  const registrarContato = useCallback(async (id: string, data: { channel: string; success: boolean; notes?: string }) => {
    const response = await api.post(`/pre-agendamento/${id}/contact`, data);
    return response.data;
  }, []);

  const atribuir = useCallback(async (id: string, userId?: string) => {
    const response = await api.post(`/pre-agendamento/${id}/assign`, { userId });
    return response.data;
  }, []);

  // Socket para atualização em tempo real
  useEffect(() => {
    const handleNew = (data: any) => {
      console.log('📡 Novo pré-agendamento via socket:', data);
      fetchPreAgendamentos();
    };

    const handleUpdate = (data: any) => {
      console.log('📡 Pré-agendamento atualizado via socket:', data);
      fetchPreAgendamentos();
    };

    const unsubs = [
      socketManager.on('preagendamento:new', handleNew),
      socketManager.on('appointmentCreated', handleNew),
      socketManager.on('preagendamento:imported', handleUpdate),
      socketManager.on('preagendamento:discarded', handleUpdate),
      socketManager.on('preagendamento:updated', handleUpdate),
      socketManager.on('appointmentUpdated', handleUpdate),
    ];

    return () => unsubs.forEach(u => u());
  }, [fetchPreAgendamentos]);

  return {
    preAgendamentos,
    stats,
    loading,
    loadingStats,
    pagination,
    fetchPreAgendamentos,
    fetchStats,
    importar,
    descartar,
    registrarContato,
    atribuir
  };
};

export default usePreAgendamentos;
