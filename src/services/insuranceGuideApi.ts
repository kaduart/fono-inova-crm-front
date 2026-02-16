// src/services/insuranceGuideApi.ts
import API from './api';

export interface InsuranceGuide {
  _id: string;
  number: string;
  patientId: string;
  specialty: string;
  insurance: string;
  totalSessions: number;
  usedSessions: number;
  expiresAt: string;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled';
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  remaining?: number;
}

export interface InsuranceGuideBalance {
  total: number;
  used: number;
  remaining: number;
  guides: Array<{
    id: string;
    number: string;
    specialty: string;
    insurance: string;
    total: number;
    used: number;
    remaining: number;
    expiresAt: string;
  }>;
}

export interface CreateGuideData {
  number: string;
  patientId: string;
  specialty: string;
  insurance: string;
  totalSessions: number;
  expiresAt: string;
  notes?: string;
}

export interface UpdateGuideData {
  specialty?: string;
  insurance?: string;
  totalSessions?: number;
  expiresAt?: string;
  notes?: string;
}

export interface GetGuidesFilters {
  specialty?: string;
  status?: string;
  insurance?: string;
}

/**
 * Busca guias de um paciente com filtros opcionais
 */
export const getGuides = async (
  patientId: string,
  filters?: GetGuidesFilters
): Promise<InsuranceGuide[]> => {
  try {
    const params = new URLSearchParams({ patientId });

    if (filters?.specialty) params.append('specialty', filters.specialty);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.insurance) params.append('insurance', filters.insurance);

    const response = await API.get(`/insurance-guides?${params.toString()}`);

    return response.data.data?.guides || [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Erro ao buscar guias');
  }
};

/**
 * Busca uma guia específica por ID
 */
export const getGuide = async (id: string): Promise<InsuranceGuide> => {
  try {
    const response = await API.get(`/insurance-guides/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Erro ao buscar guia');
  }
};

/**
 * Cria nova guia de convênio
 */
export const createGuide = async (data: CreateGuideData): Promise<InsuranceGuide> => {
  try {
    const response = await API.post('/insurance-guides', data);
    return response.data.data;
  } catch (error: any) {
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message;

    // Mapear erros específicos
    if (errorCode === 'DUPLICATE_GUIDE_NUMBER') {
      throw new Error('Este número de guia já está cadastrado no sistema');
    }
    if (errorCode === 'INVALID_SPECIALTY') {
      throw new Error('Especialidade inválida');
    }
    if (errorCode === 'INVALID_INSURANCE') {
      throw new Error('Convênio inválido');
    }

    throw new Error(errorMessage || 'Erro ao criar guia');
  }
};

/**
 * Atualiza guia existente (apenas se não foi utilizada)
 */
export const updateGuide = async (
  id: string,
  data: UpdateGuideData
): Promise<InsuranceGuide> => {
  try {
    const response = await API.put(`/insurance-guides/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message;

    if (errorCode === 'GUIDE_ALREADY_USED') {
      throw new Error('Não é possível editar guia já utilizada');
    }

    throw new Error(errorMessage || 'Erro ao atualizar guia');
  }
};

/**
 * Cancela guia (soft delete)
 */
export const cancelGuide = async (id: string): Promise<void> => {
  try {
    await API.delete(`/insurance-guides/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Erro ao cancelar guia');
  }
};

/**
 * Busca saldo agregado de guias do paciente
 */
export const getBalance = async (
  patientId: string,
  specialty?: string
): Promise<InsuranceGuideBalance> => {
  try {
    const url = specialty
      ? `/insurance-guides/patient/${patientId}/balance?specialty=${specialty}`
      : `/insurance-guides/patient/${patientId}/balance`;

    const response = await API.get(url);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Erro ao buscar saldo');
  }
};
