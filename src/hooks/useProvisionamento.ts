import { useState, useCallback } from 'react';
import api from '../services/api';

interface CamadaProvisionamento {
  valor: number;
  percentual: number;
  certeza: number;
  cor: string;
  quantidade?: number;
  valorBruto?: number;
  detalhes?: any[];
}

interface ProvisionamentoData {
  periodo: {
    mes: number;
    ano: number;
    inicio: string;
    fim: string;
  };
  camadas: {
    garantido: CamadaProvisionamento;
    agendadoConfirmado: CamadaProvisionamento;
    agendadoPendente: CamadaProvisionamento;
    pipeline: CamadaProvisionamento;
  };
  total: number;
  indiceCerteza: number;
  status: 'SEGURO' | 'ATENCAO' | 'PERIGO';
  custos: {
    fixos: number;
    breakEven: number;
    margemSeguranca: number;
    diasParaBreakEven: number;
  };
  porEspecialidade: Array<{
    especialidade: string;
    confirmado: number;
    pendente: number;
    total: number;
  }>;
  alertas: Array<{
    tipo: 'error' | 'warning' | 'info';
    mensagem: string;
    acao: string;
    itens?: any[];
  }>;
  metricas: {
    taxaConfirmacao24h: number;
    taxaPresenca: number;
  };
}

interface PendingAppointment {
  _id: string;
  patient?: { fullName: string; phoneNumber?: string };
  doctor?: { fullName: string; specialty?: string };
  date: string;
  time?: string;
  specialty: string;
  sessionValue?: number;
  risco: 'urgente' | 'medio' | 'baixo';
  horasRestantes: number;
  acaoSugerida: string;
}

export const useProvisionamento = () => {
  const [data, setData] = useState<ProvisionamentoData | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcular = useCallback(async (mes?: number, ano?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = mes && ano ? `?mes=${mes}&ano=${ano}` : '';
      const response = await api.get(`/provisionamento${params}`);
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao calcular provisionamento');
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarPendentes = useCallback(async () => {
    setLoadingPendentes(true);
    try {
      const response = await api.get('/provisionamento/agenda-temporaria');
      setPendingAppointments(response.data.data);
      return response.data;
    } catch (err: any) {
      console.error('Erro ao carregar pendentes:', err);
      return null;
    } finally {
      setLoadingPendentes(false);
    }
  }, []);

  const confirmarAgendamentos = useCallback(async (ids: string[]) => {
    const response = await api.post('/provisionamento/confirmar-massa', { ids });
    return response.data;
  }, []);

  const liberarVagas = useCallback(async (ids: string[], motivo?: string) => {
    const response = await api.post('/provisionamento/liberar-vagas', { ids, motivo });
    return response.data;
  }, []);

  return {
    data,
    pendingAppointments,
    loading,
    loadingPendentes,
    error,
    calcular,
    carregarPendentes,
    confirmarAgendamentos,
    liberarVagas
  };
};

export default useProvisionamento;
