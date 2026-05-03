// src/services/packageService.ts
import {
  IPaginatedPackageResponse,
  IPayment,
  ISession,
  ITherapyPackage,
  PackageStatus,
  PaymentType,
  TherapyType
} from '../utils/types/types';
import API from './api';
import { extractErrorMessage } from '../utils/errorUtils';
import { debugPayload } from '../utils/payloadDebugger';

export type CreatePackageParams = {
  patientId: string;
  doctorId: string;
  sessionType: TherapyType; // fonoaudiologia, psicologia, etc.
  specialty: string;
  sessionValue: number;
  paymentType?: string; // full, parcial, etc. (opcional para liminar)
  sessionsPerWeek: number;
  durationMonths: number;
  totalSessions: number;
  date: string; // primeira sessão
  time: string; // hora da primeira sessão
  calculationMode: "sessions" | "duration";
  selectedSlots: {
    date: string;
    time: string;
  }[];
  payments?: {
    amount: number;
    method: string;
    date: string;
    description?: string;
  }[];
  // 🏥 Campos para pacotes convênio
  // ⚠️ LEGADO: 'liminar' é dado antigo. NÃO usar em novos fluxos.
  type?: 'therapy' | 'convenio' | 'liminar';
  insuranceGuideId?: string;
  insuranceProvider?: string;
  insuranceGrossAmount?: number;
  // ⚖️ Campos para pacotes liminar
  liminarProcessNumber?: string;
  liminarCourt?: string;
  liminarMode?: 'deferred' | 'immediate' | 'hybrid';
};

export type CreateConvenioPackageParams = {
  patientId: string;
  doctorId: string;
  insuranceGuideId: string;
  specialty: string;
  totalSessions: number;
  sessionValue: number;
  schedule: {
    date: string;
    time: string;
  }[];
};


export type UpdatePackageParams = Partial<{
  totalSessions: number;
  sessionType: TherapyType;
  sessionValue: number;
}>;

export type PaginationParams = {
  page?: number;
  limit?: number;
  status?: PackageStatus;
  type?: TherapyType;
  startDate?: Date;
  endDate?: Date;
};

export type CreateSessionParams = {
  date: Date;
  doctorId: string;
  sessionType: TherapyType;
  value: number;
  notes?: string;
};

export type CreatePaymentParams = {
  amount: number;
  paymentMethod: PaymentType;
  coveredSessions: string[];
  notes?: string;
};

export type UseSessionParams = {
  _id?: string;
  date: string;
  time: string;
  package: string;
  patient: string;
  doctorId: string;
  serviceType: 'individual_session' | 'package_session' | 'evaluation';
  sessionType: 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia';
  paymentAmount?: number;
  paymentMethod?: 'dinheiro' | 'pix' | 'cartão';
  notes?: string;
  durationMonths?: number;
  sessionsPerWeek?: number;
  status?: 'pending' | 'completed' | 'active';
  confirmedAbsence?: boolean;
};

/**
 * Helper para extrair dados do DTO V2
 */
const extractV2Data = <T>(response: any): T => {
  const dto = response.data;
  // DTO V2: extrai data quando presente
  if (dto?.success && dto?.data !== undefined) {
    return dto.data as T;
  }
  return dto as T;
};

/**
 * 🔥 Sanitiza payload para V2 - mantém apenas campos válidos
 * Preserva dados clínicos/operacionais importantes para o cuidado
 */
const sanitizeV2Payload = (data: any): any => {
  // Campos válidos para V2 (incluindo campos clínicos do legado)
  const validFields = [
    // Identificação
    'patientId',
    'doctorId',
    // Campos clínicos
    'specialty',
    'sessionType',
    'totalSessions',
    'sessionValue',
    'totalValue',
    // Tipo e modelo V2
    'type',           // package | convenio | liminar | insurance | legal
    'model',          // per_session | prepaid (para package)
    // Agendamento (importante para o cuidado)
    'date',
    'time',
    'schedule',       // Array de {date, time}
    'durationMonths',
    'sessionsPerWeek',
    'calculationMode',
    'selectedSlots',
    // Financeiro
    'paymentType',
    'paymentMethod',
    'payments',
    'modality',       // presencial | online
    // Convênio
    'insuranceGuideId',
    // ⚠️ LEGADO — LIMINAR NÃO USA MAIS PACKAGE
    // 'liminarProcessNumber',
    // 'liminarCourt',
    // 'liminarTotalCredit',
    // Opcional
    'notes',
    'startDate',
    'endDate',
    'idempotencyKey',
    'name',
    // Agendamento existente (reutilizar avulso)
    'appointmentId',
    // Débitos pendentes a quitar
    'selectedDebts',
  ];
  
  const sanitized: any = {};
  for (const field of validFields) {
    if (data[field] !== undefined) {
      sanitized[field] = data[field];
    }
  }
  
  // Garante campos obrigatórios padrão
  if (!sanitized.name && sanitized.type) {
    sanitized.name = `Pacote ${sanitized.type}`;
  }
  if (!sanitized.modality) {
    sanitized.modality = 'presencial';
  }
  
  return sanitized;
};

export const packageService = {
  // 🔥 LOCK V2 MODE: Todas as operações usam /api/v2/packages
  
  // Operações com Pacotes
  createPackage: async (data: CreatePackageParams & { type?: string; paymentType?: string }) => {
    try {
      // 🔥 DEBUG: Loga payload original
      debugPayload('createPackage INPUT', data);
      
      // 🔥 MAPEAMENTO V2: Converte tipo frontend para backend V2
      // Frontend: therapy | convenio | liminar
      // Backend V2: package | convenio | liminar
      let v2Payload: any = { ...data };
      
      if (data.type === 'therapy') {
        v2Payload = {
          ...v2Payload,
          type: 'package',
          model: data.paymentType === 'per-session' ? 'per_session' : 'prepaid',
        };
      } else if (data.type === 'convenio') {
        v2Payload = {
          ...v2Payload,
          type: 'convenio',
        };
      // ⚠️ LEGADO — LIMINAR NÃO USA MAIS PACKAGE
      // } else if (data.type === 'liminar') {
      //   v2Payload = { ...v2Payload, type: 'liminar' };
      // }
      
      // Sanitiza payload para remover campos legado
      const sanitized = sanitizeV2Payload(v2Payload);
      debugPayload('createPackage OUTPUT (sanitized)', sanitized);
      
      const response = await API.post<ITherapyPackage>('/v2/packages', sanitized);
      // Retorna DTO completo para hook extrair packageId
      return response.data;
    } catch (error) {
      console.error('Erro na requisição:', error.config?.data);
      throw new Error(extractErrorMessage(error, 'Erro ao criar pacote'));
    }
  },

  // Criar pacote de convênio
  createConvenioPackage: async (data: CreateConvenioPackageParams) => {
    try {
      const response = await API.post<any>('/v2/packages', {
        ...data,
        type: 'convenio',
        billingType: 'convenio'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar pacote de convênio:', error.config?.data);
      throw new Error(extractErrorMessage(error, 'Erro ao criar pacote de convênio'));
    }
  },

  getPackage: async (id: string) => {
    const response = await API.get<ITherapyPackage>(`/v2/packages/${id}`);
    return extractV2Data(response);
  },

  updatePackage: async (id: string, data: UpdatePackageParams & { type?: string; paymentType?: string }) => {
    // 🔥 MAPEAMENTO V2 para update
    let v2Payload: any = { ...data };
    
    if (data.type === 'therapy') {
      v2Payload = {
        ...v2Payload,
        type: 'package',
        model: data.paymentType === 'per-session' ? 'per_session' : 'prepaid',
      };
    } else if (data.type === 'convenio') {
      v2Payload.type = 'convenio';
    // ⚠️ LEGADO — LIMINAR NÃO USA MAIS PACKAGE
    // } else if (data.type === 'liminar') {
    //   v2Payload.type = 'liminar';
    // }
    
    const sanitized = sanitizeV2Payload(v2Payload);
    const response = await API.put<ITherapyPackage>(`/v2/packages/${id}`, sanitized);
    return extractV2Data(response);
  },

  deletePackage: async (id: string) => {
    const response = await API.delete<{ message: string }>(`/v2/packages/${id}`);
    return extractV2Data(response);
  },

  listPackages: async (params: PaginationParams & { patientId: string }) => {
    console.log('[packageService] listPackages chamado:', params);
    
    const response = await API.get<IPaginatedPackageResponse>('/v2/packages', {
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        status: params.status,
        type: params.type,
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
        patientId: params.patientId
      }
    });
    
    console.log('[packageService] listPackages response:', response.data);
    
    const data = extractV2Data(response);
    console.log('[packageService] listPackages extracted:', data);
    
    return data;
  },

  // Operações com Pagamentos
  createPayment: async (packageId: string, data: CreatePaymentParams) => {
    const response = await API.post<IPayment>(`/packages/${packageId}/payments`, data);
    return extractV2Data(response);
  },

  // Operações Especiais
  searchPackages: async (filters: {
    status?: PackageStatus;
    type?: TherapyType;
    startDate?: Date;
    endDate?: Date;
  }) => {
    const response = await API.get<ITherapyPackage[]>('/packages/search', {
      params: {
        ...filters,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      }
    });
    return extractV2Data(response);
  },

  addLiminarCredit: async (packageId: string, amount: number, reason?: string) => {
    const response = await API.patch(`/v2/packages/${packageId}/credit`, { amount, reason });
    return response.data;
  },

  getPackageSessions: async (packageId: string) => {
    const response = await API.get<ISession[]>(`/packages/${packageId}/sessions`);
    return extractV2Data(response);
  },

  getPackagePayments: async (packageId: string) => {
    const response = await API.get<IPayment[]>(`/packages/${packageId}/payments`);
    return extractV2Data(response);
  },

  // Operações com Sessões
  createSession: async (packageId: string, data: CreateSessionParams) => {
    const response = await API.post<ISession>(`/packages/${packageId}/sessions`, data);
    return extractV2Data(response);
  },

  updateSession: async (packageId: string, data: ISession) => {
    if (data.status !== 'canceled') {
      data.confirmedAbsence = null;
    }
    const sessionId = data.sessionId || data._id;
    const response = await API.put<ISession>(`/packages/${packageId}/sessions/${sessionId}`, data);
    return extractV2Data(response);
  },

  addSession: async (packageId: string, sessionData: any) => {
    const response = await API.post(`/packages/${packageId}/sessions`, sessionData);
    return extractV2Data(response);
  },

  // Operação para "usar" uma sessão e atualizar pagamento
  useSession: async (packageId: string, data: UseSessionParams) => {
    const response = await API.patch<ISession>(`/packages/${packageId}/use-session`, data);
    return extractV2Data(response);
  },

  // 🔄 Cancelamento em massa de sessões (com lista específica)
  bulkCancelSessions: async (packageId: string, sessionIds: string[], confirmedAbsence: boolean = false) => {
    const response = await API.post<{ success: boolean; message: string; canceledCount: number }>(
      `/packages/${packageId}/sessions/bulk-cancel`,
      { sessionIds, confirmedAbsence }
    );
    return extractV2Data(response);
  },

  // 🚀 Cancelar TODAS as sessões do pacote (mais simples, mais rápido)
  cancelAllSessions: async (packageId: string, confirmedAbsence: boolean = false) => {
    const response = await API.post<{ success: boolean; message: string; canceledCount: number }>(
      `/packages/${packageId}/cancel-all-sessions`,
      { confirmedAbsence }
    );
    return extractV2Data(response);
  },
}

export const validatePayment = (amount: number, balance: number) => {
  if (amount <= 0) throw new Error("Valor deve ser maior que zero");
  // Se não há saldo devedor (balance <= 0 = crédito ou zerado), não valida limite
  if (balance > 0 && amount > balance) {
    throw new Error(
      `Valor excede saldo devedor. Saldo atual: ${balance.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })}`
    );
  }
};

export default packageService;