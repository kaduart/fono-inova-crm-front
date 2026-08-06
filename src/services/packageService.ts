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
  time: string;
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
  sessionType: 'fonoaudiologia' | 'terapia_ocupacional' | 'psicologia' | 'fisioterapia' | 'neuropsicologia';
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
    'frequencyInterval',
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
    // Sessões retroativas absorvidas na criação do pacote
    'preConsumedCount',
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
      }
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
    }
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

  listPackages: async (params: PaginationParams & { patientId?: string; doctorId?: string }) => {
    console.log('[packageService] listPackages chamado:', params);

    const response = await API.get<IPaginatedPackageResponse>('/v2/packages', {
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        status: params.status,
        type: params.type,
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
        ...(params.patientId && { patientId: params.patientId }),
        ...(params.doctorId && { doctorId: params.doctorId }),
      }
    });
    
    console.log('[packageService] listPackages response:', response.data);
    
    const data = extractV2Data(response);
    console.log('[packageService] listPackages extracted:', data);
    
    return data;
  },

  // Operações com Pagamentos
  createPayment: async (packageId: string, data: CreatePaymentParams) => {
    // 🚀 V2: Usa settle-payments para quitar débitos do pacote
    const response = await API.post(`/v2/packages/${packageId}/settle-payments`, {
      paymentIds: data.coveredSessions, // array de IDs de payments a quitar
      paymentMethod: data.paymentMethod,
    });
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
    // 🚀 V2: Sessions vêm na própria view do pacote
    const response = await API.get(`/v2/packages/${packageId}`);
    const pkg = extractV2Data(response) as any;
    return pkg?.sessions || [];
  },

  getPackagePayments: async (packageId: string) => {
    // 🚀 V2: Payments vêm na própria view do pacote
    const response = await API.get(`/v2/packages/${packageId}`);
    const pkg = extractV2Data(response) as any;
    return pkg?.payments || [];
  },

  // Operações com Sessões
  createSession: async (packageId: string, data: CreateSessionParams & { patientId: string; doctorId: string }) => {
    // 🚀 V2: Cria agendamento vinculado ao pacote
    const response = await API.post('/v2/appointments', {
      patientId: data.patientId,
      doctorId: data.doctorId,
      date: data.date,
      time: data.time,
      specialty: data.sessionType,
      package: packageId,
      serviceType: 'package_session',
      operationalStatus: 'scheduled',
      clinicalStatus: 'pending',
    });
    return extractV2Data(response);
  },

  updateSession: async (packageId: string, data: ISession & { appointmentId?: string }) => {
    if (data.status !== 'canceled') {
      data.confirmedAbsence = null;
    }
    // 🚀 V2: Usa endpoint de appointments em vez do legado de packages/sessions
    const appointmentId = data.appointmentId;
    if (!appointmentId) {
      throw new Error('appointmentId é obrigatório para atualizar sessão no V2');
    }
    
    // 🎯 CADA STATUS usa o endpoint correto que já sincroniza a triade (appointment + session + package)
    if (data.status === 'completed') {
      // ✅ completeSessionV2 sincroniza: appointment → session → package → payment
      // (inclusive reverte cancelamento automaticamente se necessário)
      const response = await API.patch(`/v2/appointments/${appointmentId}/complete`, {
        paymentMethod: data.payment?.method || 'pix',
        amount: data.payment?.amount,
      });
      window.dispatchEvent(new CustomEvent('session:completed'));
      return extractV2Data(response);
    }
    
    if (data.status === 'canceled') {
      // ✅ cancelSessionV2 sincroniza: appointment → session → package
      const response = await API.patch(`/v2/appointments/${appointmentId}/cancel`, {
        reason: data.notes || 'Cancelado pelo usuário',
        confirmedAbsence: data.confirmedAbsence || false,
      });
      return extractV2Data(response);
    }
    
    // 📝 Para scheduled/pending: PUT sincroniza appointment + session + payment
    // 🎯 NORMALIZA: 'pending' do frontend → 'scheduled' no backend
    const normalizedStatus = data.status === 'pending' ? 'scheduled' : data.status;
    const response = await API.put(`/v2/appointments/${appointmentId}`, {
      patientId: data.patientId || data.patient,
      doctorId: data.doctorId,
      date: data.date,
      time: data.time,
      notes: data.notes,
      specialty: data.specialty || data.sessionType,
      operationalStatus: normalizedStatus,
      clinicalStatus: 'pending',
      paymentAmount: data.payment?.amount,
      paymentMethod: data.payment?.method,
    });
    
    return extractV2Data(response);
  },

  addSession: async (packageId: string, sessionData: any) => {
    // 🚀 V2: Cria agendamento vinculado ao pacote
    const response = await API.post('/v2/appointments', {
      patientId: sessionData.patientId,
      doctorId: sessionData.doctorId,
      date: sessionData.date,
      time: sessionData.time,
      specialty: sessionData.sessionType || sessionData.specialty,
      package: packageId,
      serviceType: 'package_session',
      operationalStatus: 'scheduled',
      clinicalStatus: 'pending',
    });
    return extractV2Data(response);
  },

  // Operação para "usar" uma sessão e atualizar pagamento
  useSession: async (packageId: string, data: UseSessionParams & { appointmentId?: string }) => {
    // 🚀 V2: Completa o agendamento diretamente
    if (!data.appointmentId) {
      throw new Error('appointmentId é obrigatório para usar sessão no V2');
    }
    const response = await API.patch(`/v2/appointments/${data.appointmentId}/complete`, {
      paymentMethod: data.paymentMethod || 'pix',
      amount: data.paymentAmount,
    });
    return extractV2Data(response);
  },

  // 🔄 Cancelamento em massa de sessões (com lista específica)
  bulkCancelSessions: async (packageId: string, appointmentIds: string[], confirmedAbsence: boolean = false) => {
    // 🚀 V2: Cancela cada agendamento individualmente
    let canceledCount = 0;
    for (const appointmentId of appointmentIds) {
      try {
        await API.patch(`/v2/appointments/${appointmentId}/cancel`, {
          reason: 'Cancelamento em massa',
          confirmedAbsence,
        });
        canceledCount++;
      } catch (e) {
        console.warn(`[bulkCancelSessions] Falha ao cancelar ${appointmentId}:`, e);
      }
    }
    return { success: true, message: `${canceledCount} sessões canceladas`, canceledCount };
  },

  // 🚀 Cancelar TODAS as sessões do pacote (mais simples, mais rápido)
  cancelAllSessions: async (packageId: string, confirmedAbsence: boolean = false) => {
    // 🚀 V2: Busca pacote, pega appointments e cancela um por um
    const pkgResponse = await API.get(`/v2/packages/${packageId}`);
    const pkg = extractV2Data(pkgResponse) as any;
    const sessions = pkg?.sessions || [];
    
    let canceledCount = 0;
    for (const session of sessions) {
      if (session.appointmentId && session.status !== 'canceled' && session.status !== 'completed') {
        try {
          await API.patch(`/v2/appointments/${session.appointmentId}/cancel`, {
            reason: 'Cancelamento de todas as sessões do pacote',
            confirmedAbsence,
          });
          canceledCount++;
        } catch (e) {
          console.warn(`[cancelAllSessions] Falha ao cancelar ${session.appointmentId}:`, e);
        }
      }
    }
    return {
      success: true,
      data: {
        canceledSessions: canceledCount,
        finalStatus: canceledCount > 0 ? 'canceled' : 'active',
        message: `${canceledCount} sessões canceladas`,
      }
    };
  },

  inactivatePackage: async (packageId: string) => {
    const response = await API.post<{ success: boolean; data: { sessionsCanceled: number; appointmentsCanceled: number; paymentsCanceled: number } }>(
      `/v2/packages/${packageId}/inactivate`
    );
    return response.data;
  },

  bulkUpdateAppointments: async (
    packageId: string,
    patch: { doctorId?: string; time?: string; dayOfWeek?: number }
  ): Promise<{ updated: number }> => {
    const response = await API.patch<{ success: boolean; data: { updated: number } }>(
      `/v2/packages/${packageId}/appointments/bulk`,
      patch
    );
    return response.data?.data ?? { updated: 0 };
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