// utils/appointmentStatus.ts
// 🚀 Mapeamento centralizado de status de appointments
// Garante consistência entre backend, frontend e UI

export type OperationalStatus = 
  | 'scheduled'
  | 'confirmed' 
  | 'completed'
  | 'canceled'
  | 'processing_create'
  | 'processing_complete'
  | 'processing_cancel'
  | 'failed'
  | 'error';

export type ClinicalStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'missed';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
  description?: string;
}

// Configuração de status operacionais
export const OPERATIONAL_STATUS_CONFIG: Record<OperationalStatus, StatusConfig> = {
  scheduled: {
    label: 'Agendado',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Aguardando confirmação'
  },
  confirmed: {
    label: 'Confirmado',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Paciente confirmou presença'
  },
  completed: {
    label: 'Concluído',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Sessão realizada com sucesso'
  },
  canceled: {
    label: 'Cancelado',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Agendamento cancelado'
  },
  processing_create: {
    label: 'Criando...',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Processando criação'
  },
  processing_complete: {
    label: 'Finalizando...',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Processando finalização'
  },
  processing_cancel: {
    label: 'Cancelando...',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Processando cancelamento'
  },
  failed: {
    label: 'Falhou',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Processamento falhou'
  },
  error: {
    label: 'Erro',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Erro no processamento'
  }
};

// Status que indicam processamento em andamento
export const PROCESSING_STATUSES: OperationalStatus[] = [
  'processing_create',
  'processing_complete',
  'processing_cancel'
];

// Status finais (não mudam mais)
export const FINAL_STATUSES: OperationalStatus[] = [
  'completed',
  'canceled',
  'failed',
  'error'
];

// Status que permitem ações
export const ACTIONABLE_STATUSES = {
  canComplete: ['confirmed', 'scheduled'] as OperationalStatus[],
  canCancel: ['scheduled', 'confirmed'] as OperationalStatus[],
  canReschedule: ['scheduled', 'confirmed'] as OperationalStatus[],
  canConfirm: ['scheduled'] as OperationalStatus[]
};

// Helpers
export const isProcessing = (status: string): boolean => 
  PROCESSING_STATUSES.includes(status as OperationalStatus);

export const isFinal = (status: string): boolean => 
  FINAL_STATUSES.includes(status as OperationalStatus);

export const canComplete = (status: string): boolean =>
  ACTIONABLE_STATUSES.canComplete.includes(status as OperationalStatus);

export const canCancel = (status: string): boolean =>
  ACTIONABLE_STATUSES.canCancel.includes(status as OperationalStatus);

export const getStatusConfig = (status: string): StatusConfig =>
  OPERATIONAL_STATUS_CONFIG[status as OperationalStatus] || {
    label: status,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'Status desconhecido'
  };

// Mapeamento para exibição em UI
export const getStatusBadgeProps = (status: string, isProcessingFlag?: boolean) => {
  const config = getStatusConfig(status);
  return {
    ...config,
    isProcessing: isProcessingFlag || isProcessing(status)
  };
};

export default {
  OPERATIONAL_STATUS_CONFIG,
  PROCESSING_STATUSES,
  FINAL_STATUSES,
  ACTIONABLE_STATUSES,
  isProcessing,
  isFinal,
  canComplete,
  canCancel,
  getStatusConfig,
  getStatusBadgeProps
};
