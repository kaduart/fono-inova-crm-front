import { useCallback, useState } from 'react';
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
  const [analiticoData, setAnaliticoData] = useState<any>(null);
  const [pacotesAndamento, setPacotesAndamento] = useState<any[]>([]);
  const [fechamentoData, setFechamentoData] = useState<any>(null);
  const [atividadeHoje, setAtividadeHoje] = useState<any>(null);
  const [loadingAtividade, setLoadingAtividade] = useState(false);
  const [projecaoMes, setProjecaoMes] = useState<any>(null);
  const [metricasMes, setMetricasMes] = useState<any>(null);
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  const [pacotesConcluidos, setPacotesConcluidos] = useState<any[]>([]);
  const [resumoPaciente, setResumoPaciente] = useState<any>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);

  const fetchMetricasMes = useCallback(async (mes: number, ano: number) => {
    setLoadingMetricas(true);
    try {
      const response = await api.get(`/provisionamento/metricas-mes?month=${mes}&year=${ano}`);
      setMetricasMes(response.data);
      return response.data;
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
      return null;
    } finally {
      setLoadingMetricas(false);
    }
  }, []);

  const fetchProjecaoMes = useCallback(async (mes: number, ano: number) => {
    try {
      const response = await api.get(`/provisionamento/projecao-mes?month=${mes}&year=${ano}`);
      setProjecaoMes(response.data);
      return response.data;
    } catch (err) {
      console.error('Erro projeção:', err);
      return null;
    }
  }, []);

  // Adicione a função:
  const fetchAtividadeHoje = useCallback(async () => {
    setLoadingAtividade(true);
    try {
      const response = await api.get('/provisionamento/atividade-hoje');
      setAtividadeHoje(response.data.data);
      return response.data.data;
    } catch (err: any) {
      console.error('Erro ao carregar atividade de hoje:', err);
      return null;
    } finally {
      setLoadingAtividade(false);
    }
  }, []);

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

  const carregarPendentes = useCallback(async (mes?: number, ano?: number) => {
    setLoadingPendentes(true);
    try {
      const params = mes && ano ? `?month=${mes}&year=${ano}` : '';
      const response = await api.get(`/provisionamento/agenda-temporaria${params}`);
      setPendingAppointments(response.data.data || []);
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

  // Busca dados analíticos completos (planilha detalhada)
  const fetchAnalitico = useCallback(async (mes: number, ano: number) => {
    const response = await api.get(`/provisionamento/analitico?month=${mes}&year=${ano}`);
    setAnaliticoData(response.data);
    return response.data;
  }, []);

  // Busca pacotes em andamento (com % concluído)
  const fetchPacotesAndamento = useCallback(async () => {
    const response = await api.get('/provisionamento/pacotes-andamento');
    setPacotesAndamento(response.data.data);
    return response.data.data;
  }, []);

  // Busca DRE (fechamento mensal)
  const fetchFechamento = useCallback(async (mes: number, ano: number) => {
    const response = await api.get(`/provisionamento/fechamento-mensal?month=${mes}&year=${ano}`);
    setFechamentoData(response.data);
    return response.data;
  }, []);

  const fetchPacotesConcluidos = useCallback(async () => {
    const response = await api.get('/provisionamento/pacotes-concluidos');
    setPacotesConcluidos(response.data.data);
    return response.data.data;
  }, []);

  const fetchResumoPaciente = useCallback(async (patientId: string) => {
    setLoadingResumo(true);
    try {
      const response = await api.get(`/provisionamento/paciente/${patientId}/resumo`);
      setResumoPaciente(response.data.data);
      return response.data.data;
    } finally {
      setLoadingResumo(false);
    }
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
    liberarVagas,

    analiticoData,
    pacotesAndamento,
    fechamentoData,
    fetchAnalitico,
    fetchPacotesAndamento,
    fetchFechamento,
    atividadeHoje,
    loadingAtividade,
    fetchAtividadeHoje,
    projecaoMes,
    fetchProjecaoMes,
    metricasMes,
    loadingMetricas,
    fetchMetricasMes,
    pacotesConcluidos,
    fetchPacotesConcluidos,
    resumoPaciente,
    fetchResumoPaciente,
    loadingResumo,

    refreshAll: async (mes: number, ano: number) => {
      await Promise.all([
        calcular(mes, ano),
        carregarPendentes(),
        fetchAtividadeHoje()
      ]);
    }

  };
};

export default useProvisionamento;
