// hooks/useAppointmentsByType.ts
// 📊 Hook para consumir analytics de agendamentos (novos vs retornos 45+ dias)

import { useCallback, useState } from 'react';
import appointmentService from '../services/appointmentService';
import { IAppointment } from '../utils/types/types';

export interface AppointmentsByTypeData {
  leads: IAppointment[];
  novos: IAppointment[];
  retornos45: IAppointment[];
  recorrentes: IAppointment[];
  all: IAppointment[];
}

export interface AppointmentsByTypeSummary {
  total: number;
  leads: { count: number; percentage: number };
  novos: { count: number; percentage: number };
  retornos45: { count: number; percentage: number };
  recorrentes: { count: number; percentage: number };
}

export const useAppointmentsByType = () => {
  const [data, setData] = useState<AppointmentsByTypeData | null>(null);
  const [summary, setSummary] = useState<AppointmentsByTypeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    specialty?: string;
    mode?: 'createdAt' | 'date';
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await appointmentService.getAppointmentsByType(params || {});
      setData(response.data.details);
      setSummary(response.data.summary);
      return response.data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao buscar agendamentos';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchToday = useCallback(async (filters?: { doctorId?: string; specialty?: string; mode?: 'createdAt' | 'date' }) => {
    return fetch({ ...filters });
  }, [fetch]);

  return {
    data,
    summary,
    loading,
    error,
    fetch,
    fetchToday,
  };
};

export default useAppointmentsByType;
