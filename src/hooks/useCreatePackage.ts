/**
 * 🎯 Hook para criação de pacotes V2
 * 
 * Segue exatamente as regras da arquitetura:
 * - therapy: com paymentType
 * - convenio: sem paymentType (usa insuranceGuideId)
 * - liminar: sem paymentType (usa crédito judicial)
 */

import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { useErrorHandler } from './useErrorHandler';

export type PackageType = 'therapy' | 'convenio' | 'liminar';
export type PaymentType = 'full' | 'partial' | 'per-session';
export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'transferencia';

interface BasePackageValues {
  patientId: string;
  doctorId: string;
  totalSessions: number;
  sessionValue: number;
  specialty: string;
  sessionType: string;
}

interface TherapyPackageValues extends BasePackageValues {
  type: 'therapy';
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
}

interface ConvenioPackageValues extends BasePackageValues {
  type: 'convenio';
  insuranceGuideId: string;
}

interface LiminarPackageValues extends BasePackageValues {
  type: 'liminar';
  liminarProcessNumber: string;
  liminarCourt: string;
  liminarTotalCredit?: number; // calculado automaticamente se não informado
}

export type CreatePackageValues = 
  | TherapyPackageValues 
  | ConvenioPackageValues 
  | LiminarPackageValues;

interface UseCreatePackageReturn {
  create: (values: CreatePackageValues) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

/**
 * 🚀 Hook para criar pacote seguindo as regras da arquitetura V2
 * 
 * @example
 * const { create } = useCreatePackage();
 * 
 * // Therapy
 * const packageId = await create({
 *   type: 'therapy',
 *   patientId: '123',
 *   doctorId: '456',
 *   totalSessions: 10,
 *   sessionValue: 200,
 *   specialty: 'fonoaudiologia',
 *   sessionType: 'fonoaudiologia',
 *   paymentType: 'per-session',
 *   paymentMethod: 'pix'
 * });
 * 
 * // Convênio
 * const packageId = await create({
 *   type: 'convenio',
 *   patientId: '123',
 *   doctorId: '456',
 *   totalSessions: 10,
 *   sessionValue: 0,
 *   specialty: 'fonoaudiologia',
 *   sessionType: 'fonoaudiologia',
 *   insuranceGuideId: 'guide-123'
 * });
 * 
 * // Liminar
 * const packageId = await create({
 *   type: 'liminar',
 *   patientId: '123',
 *   doctorId: '456',
 *   totalSessions: 20,
 *   sessionValue: 450,
 *   specialty: 'fonoaudiologia',
 *   sessionType: 'fonoaudiologia',
 *   liminarProcessNumber: 'PROC-123',
 *   liminarCourt: '1ª Vara Federal'
 * });
 */
export const useCreatePackage = (): UseCreatePackageReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  const buildPayload = useCallback((values: CreatePackageValues) => {
    const base = {
      patientId: values.patientId,
      doctorId: values.doctorId,
      totalSessions: values.totalSessions,
      sessionValue: values.sessionValue,
      specialty: values.specialty,
      sessionType: values.sessionType,
    };

    let payload: Record<string, any>;

    switch (values.type) {
      case 'therapy':
        payload = {
          ...base,
          type: 'therapy',
          paymentType: values.paymentType,
          paymentMethod: values.paymentMethod,
        };
        break;

      case 'convenio':
        payload = {
          ...base,
          type: 'convenio',
          insuranceGuideId: values.insuranceGuideId,
        };
        break;

      case 'liminar':
        payload = {
          ...base,
          type: 'liminar',
          liminarProcessNumber: values.liminarProcessNumber,
          liminarCourt: values.liminarCourt,
          liminarTotalCredit: values.liminarTotalCredit ?? (values.totalSessions * values.sessionValue),
        };
        break;

      default:
        throw new Error(`Tipo de pacote inválido: ${(values as any).type}`);
    }

    // 🔥 ANTI-BUG: Remove paymentType se não for therapy
    if (payload.type !== 'therapy') {
      delete payload.paymentType;
      delete payload.paymentMethod;
    }

    return payload;
  }, []);

  const create = useCallback(async (values: CreatePackageValues): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = buildPayload(values);
      
      console.log('[useCreatePackage] Criando pacote:', {
        type: payload.type,
        patientId: payload.patientId,
        totalSessions: payload.totalSessions
      });

      const response = await api.post('/packages', payload);
      
      const packageId = response.data?.packageId || response.data?.data?.packageId;
      
      if (!packageId) {
        throw new Error('Backend não retornou packageId');
      }

      console.log('[useCreatePackage] Pacote criado:', packageId);
      
      return packageId;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao criar pacote';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [buildPayload, handleError]);

  return {
    create,
    isLoading,
    error,
  };
};

export default useCreatePackage;
