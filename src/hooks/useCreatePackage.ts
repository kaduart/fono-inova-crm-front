/**
 * 🎯 Hook para criação de pacotes V2
 * 
 * Segue exatamente as regras da arquitetura:
 * - therapy: com paymentType
 * - convenio: sem paymentType (usa insuranceGuideId)
 * - liminar: ⚠️ LEGADO — não usar mais. Usar LiminarContract.
 */

import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { packageService } from '@/services/packageService';
import { useErrorHandler } from './useErrorHandler';

// ⚠️ LEGADO: 'liminar' removido. Usar LiminarContract.
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
  // Campos de planejamento do cuidado (opcionais)
  selectedSlots?: Array<{date: string, time: string}>;
  durationMonths?: number;
  sessionsPerWeek?: number;
  date?: string;
  time?: string;
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

// ⚠️ LEGADO — LIMINAR NÃO USA MAIS PACKAGE
// interface LiminarPackageValues extends BasePackageValues {
//   type: 'liminar';
//   liminarProcessNumber: string;
//   liminarCourt: string;
//   liminarTotalCredit?: number;
// }

export type CreatePackageValues = 
  | TherapyPackageValues 
  | ConvenioPackageValues;
  // ⚠️ LEGADO — LiminarPackageValues removido. Usar LiminarContract.

interface UseCreatePackageReturn {
  create: (values: CreatePackageValues & {
    selectedSlots?: Array<{date: string, time: string}>;
    durationMonths?: number;
    sessionsPerWeek?: number;
    date?: string;
    time?: string;
  }) => Promise<string>;
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
 *   // ⚠️ LEGADO — NÃO usar type='liminar'. Usar LiminarContract.
 *   // type: 'liminar',
 *   // liminarProcessNumber: 'PROC-123',
 *   // liminarCourt: '1ª Vara Federal'
 * });
 */
export const useCreatePackage = (): UseCreatePackageReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  const buildPayload = useCallback((values: CreatePackageValues & { 
    selectedSlots?: Array<{date: string, time: string}>;
    durationMonths?: number;
    sessionsPerWeek?: number;
    date?: string;
    time?: string;
  }) => {
    // 🔥 V2 PAYLOAD FORMAT: Converte tipos frontend para backend V2
    // Frontend: therapy | convenio | liminar
    // Backend V2: package | convenio | liminar
    
    // Converte selectedSlots para schedule (formato V2)
    const schedule = values.selectedSlots?.map(slot => ({
      date: slot.date,
      time: slot.time
    })) || [];
    
    // Base com todos os campos clínicos pertinentes ao cuidado
    const base = {
      patientId: values.patientId,
      doctorId: values.doctorId,
      totalSessions: values.totalSessions,
      sessionValue: values.sessionValue,
      specialty: values.specialty,
      sessionType: values.sessionType, // ✅ Campo clínico necessário
      // Campos de planejamento do cuidado
      durationMonths: values.durationMonths || Math.ceil(values.totalSessions / 4),
      sessionsPerWeek: values.sessionsPerWeek || 1,
      date: values.date || (schedule[0]?.date),
      time: values.time || (schedule[0]?.time),
      schedule, // ✅ V2 espera schedule array
    };

    let payload: Record<string, any>;

    switch (values.type) {
      case 'therapy':
        // V2: type='package' + model='per_session'|'prepaid'
        // Campos de agendamento são importantes para o cuidado
        payload = {
          ...base,
          type: 'package',
          model: values.paymentType === 'per-session' ? 'per_session' : 'prepaid',
          // Mantém campos clínicos/operacionais
          paymentType: values.paymentType,
          paymentMethod: values.paymentMethod,
        };
        break;

      case 'convenio':
        // V2: type='convenio' + insuranceGuideId
        payload = {
          ...base,
          type: 'convenio',
          insuranceGuideId: values.insuranceGuideId,
        };
        break;

      // ⚠️ LEGADO — LIMINAR NÃO USA MAIS PACKAGE
      // case 'liminar':
      //   payload = {
      //     ...base,
      //     type: 'liminar',
      //     liminarProcessNumber: values.liminarProcessNumber,
      //     liminarCourt: values.liminarCourt,
      //     liminarTotalCredit: values.liminarTotalCredit ?? (values.totalSessions * values.sessionValue),
      //   };
      //   break;

      default:
        throw new Error(`Tipo de pacote inválido: ${(values as any).type}`);
    }

    return payload;
  }, []);

  const create = useCallback(async (values: CreatePackageValues & {
    selectedSlots?: Array<{date: string, time: string}>;
    durationMonths?: number;
    sessionsPerWeek?: number;
    date?: string;
    time?: string;
  }): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = buildPayload(values);
      
      console.log('[useCreatePackage] Criando pacote:', {
        type: payload.type,
        patientId: payload.patientId,
        totalSessions: payload.totalSessions
      });

      // 🚀 V2: Usa packageService que automaticamente chama /v2/packages
      const result = await packageService.createPackage(payload);
      
      // V2 retorna DTO com data.packageId ou diretamente packageId
      const packageId = result?.data?.packageId || result?.packageId;
      
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
