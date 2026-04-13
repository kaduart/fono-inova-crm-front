/**
 * 🚀 Hook V2 para criação de pacotes
 * Com React Query Mutation + Cache Invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { packageService } from '@/services/packageService';
import { toast } from 'sonner';

interface CreatePackagePayload {
  type: 'therapy' | 'convenio' | 'liminar';
  patientId: string;
  doctorId: string;
  specialty: string;
  sessionType: string;
  totalSessions: number;
  sessionValue: number;
  paymentType?: string;
  paymentMethod?: string;
  selectedSlots?: Array<{ date: string; time: string }>;
  durationMonths?: number;
  sessionsPerWeek?: number;
  payments?: Array<{ amount: number; method: string; date: string; description?: string }>;
  insuranceGuideId?: string;
  liminarProcessNumber?: string;
  liminarCourt?: string;
  [key: string]: any;
}

export const useCreatePackageV2 = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['createPackage'],
    
    mutationFn: async (payload: CreatePackagePayload) => {
      console.log('[useCreatePackageV2] Criando pacote:', payload.type);
      const response = await packageService.createPackage(payload);
      return response;
    },
    
    onSuccess: (data, variables) => {
      const patientId = variables.patientId;
      const packageId = data?.data?.packageId || data?.packageId;
      
      console.log('[useCreatePackageV2] Sucesso! PackageId:', packageId);
      
      // 🔄 INVALIDA TODOS OS CACHES RELACIONADOS
      // Lista de pacotes do paciente
      queryClient.invalidateQueries({ 
        queryKey: ['packages', patientId],
        exact: false
      });
      
      // Lista geral de pacotes
      queryClient.invalidateQueries({ 
        queryKey: ['packages'],
        exact: false
      });
      
      // Agendamentos (pois criamos appointments)
      queryClient.invalidateQueries({ 
        queryKey: ['appointments'],
        exact: false
      });
      
      // Dashboard
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
        exact: false
      });
      
      // Paciente específico
      queryClient.invalidateQueries({ 
        queryKey: ['patient', patientId],
        exact: false
      });
      
      toast.success(`✅ Pacote criado com sucesso!`);
      
      return data;
    },
    
    onError: (error: any, variables) => {
      const code = error.response?.data?.errorCode || error.errorCode;
      const message = error.response?.data?.message || error.message;
      const correlationId = error.response?.data?.meta?.correlationId;
      
      console.error('[useCreatePackageV2] Erro:', {
        code,
        message,
        correlationId,
        patientId: variables.patientId
      });
      
      switch (code) {
        case 'HOLIDAY_BLOCKED':
          toast.error(`❌ ${message || 'Data é feriado. Escolha outra data.'}`);
          break;
          
        case 'SCHEDULE_CONFLICT':
          toast.error('❌ Conflito de horário. O médico já tem agendamento neste horário.');
          break;
          
        case 'DUPLICATE_APPOINTMENT':
          toast.error('❌ Já existe um agendamento para este paciente neste horário.');
          break;
          
        case 'INVALID_TYPE':
          toast.error('❌ Erro de integração V2. Contate o suporte técnico.');
          console.error('Payload enviado:', variables);
          break;
          
        case 'MISSING_REQUIRED_FIELDS':
          toast.error('❌ Preencha todos os campos obrigatórios.');
          break;
          
        case 'POSSIBLE_DUPLICATE':
          toast.warning('⚠️ Pacote similar criado recentemente. Verifique na lista.');
          break;
          
        default:
          toast.error(message || 'Erro ao criar pacote. Tente novamente.');
      }
      
      throw error;
    },
    
    retry: (failureCount, error: any) => {
      // Não retry em erros de validação
      const code = error.response?.data?.errorCode;
      if (['HOLIDAY_BLOCKED', 'SCHEDULE_CONFLICT', 'INVALID_TYPE'].includes(code)) {
        return false;
      }
      // Retry max 2x em erros de rede
      return failureCount < 2;
    },
    
    retryDelay: 1000,
  });
};

export default useCreatePackageV2;
