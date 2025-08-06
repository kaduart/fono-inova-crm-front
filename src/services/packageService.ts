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

export type CreatePackageParams = {
  patientId: string;
  sessionType: TherapyType;
  /* totalSessions: number;
  sessionValue: number; */
  doctorId: string;
  paymentType: string;
  amountPaid: number;
  paymentMethod: string;
  durationMonths: number;
  date: string;
  time: string;
  sessionsPerWeek: number;
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

export const packageService = {
  // Operações com Pacotes
  createPackage: async (data: CreatePackageParams) => {
    try {
      const response = await API.post<ITherapyPackage>('/packages', data);
      return response.data;
    } catch (error) {
      console.error('Erro na requisição:', error.config?.data);
      throw new Error(error.response?.data?.message || 'Erro ao criar pacote');
    }

  },

  getPackage: async (id: string) => {
    return API.get<ITherapyPackage>(`/packages/${id}`);
  },

  updatePackage: async (id: string, data: UpdatePackageParams) => {
    return API.patch<ITherapyPackage>(`/packages/${id}`, data);
  },

  deletePackage: async (id: string) => {
    return API.delete<{ message: string }>(`/packages/${id}`);
  },

  listPackages: async (params: PaginationParams & { patientId: string }) => {
    return API.get<IPaginatedPackageResponse>('/packages', {
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
  },

  // Operações com Pagamentos
  createPayment: async (packageId: string, data: CreatePaymentParams) => {
    return API.post<IPayment>(`/packages/${packageId}/payments`, data);
  },

  // Operações Especiais
  searchPackages: async (filters: {
    status?: PackageStatus;
    type?: TherapyType;
    startDate?: Date;
    endDate?: Date;
  }) => {
    return API.get<ITherapyPackage[]>('/packages/search', {
      params: {
        ...filters,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      }
    });
  },

  getPackageSessions: async (packageId: string) => {
    return API.get<ISession[]>(`/packages/${packageId}/sessions`);
  },

  getPackagePayments: async (packageId: string) => {
    return API.get<IPayment[]>(`/packages/${packageId}/payments`);
  },

  // Operações com Sessões
  createSession: async (packageId: string, data: CreateSessionParams) => {
    return API.post<ISession>(`/packages/${packageId}/sessions`, data);
  },

  updateSession: async (packageId: string, data: ISession) => {
    if (data.status !== 'canceled') {
      data.confirmedAbsence = null;
    }
    return API.put<ISession>(`/packages/${packageId}/sessions/${data.sessionId}`, data);
  },
  // Operação para "usar" uma sessão e atualizar pagamento
  useSession: async (packageId: string, data: UseSessionParams) => {
    return API.patch<ISession>(`/packages/${packageId}/use-session`, data);
  },
}

export const validatePayment = (amount: number, balance: number) => {
  if (amount <= 0) throw new Error("Valor deve ser maior que zero");
  if (amount > balance) {
    throw new Error(
      `Valor excede saldo devedor. Saldo atual: ${balance.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })}`
    );
  }
};

export default packageService;