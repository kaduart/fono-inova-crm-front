/**
 * 🚀 Hook V2 para listar pacotes
 * Com React Query + Cache Otimizado
 */

import { useQuery } from '@tanstack/react-query';
import { packageService } from '@/services/packageService';

interface UsePackagesOptions {
  patientId?: string;
  status?: 'active' | 'finished' | 'canceled';
  type?: 'therapy' | 'convenio' | 'liminar';
  page?: number;
  limit?: number;
}

export const usePackagesV2 = (options: UsePackagesOptions = {}) => {
  const { patientId, status, type, page = 1, limit = 10 } = options;
  
  // Gera queryKey dinâmica baseada nos filtros
  const queryKey = ['packages', { patientId, status, type, page, limit }];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const params: any = { page, limit };
      
      if (patientId) params.patientId = patientId;
      if (status) params.status = status;
      if (type) params.type = type;
      
      const response = await packageService.listPackages(params);
      return response;
    },
    
    // 🎯 Configurações de Cache
    staleTime: 1000 * 30, // 30 segundos - dados ficam "frescos"
    gcTime: 1000 * 60 * 5, // 5 minutos - mantém em memória
    
    // 🔄 Comportamento de Refetch
    refetchOnWindowFocus: true, // Recarrega quando volta para a aba
    refetchOnMount: 'always', // Sempre verifica ao montar
    refetchOnReconnect: true, // Recarrega quando reconecta
    
    // ❌ Não retry em erros 4xx (não é problema de rede)
    retry: (failureCount, error: any) => {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    
    // Desabilita se não tiver patientId (dependência obrigatória)
    enabled: !!patientId,
  });
};

// Hook simplificado para lista de paciente
export const usePatientPackages = (patientId: string) => {
  return usePackagesV2({ patientId, limit: 100 });
};

// Hook para pacotes ativos
export const useActivePackages = (patientId: string) => {
  return usePackagesV2({ patientId, status: 'active', limit: 100 });
};

export default usePackagesV2;
