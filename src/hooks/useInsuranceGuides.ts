// src/hooks/useInsuranceGuides.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { buildGuidesPresentation } from '../services/guidePresentationService';
import {
  getGuides,
  getBalance,
  createGuide,
  updateGuide,
  cancelGuide,
  inactivateGuide,
  CreateGuideData,
  UpdateGuideData,
  InsuranceGuide,
  InsuranceGuideBalance,
  GetGuidesFilters
} from '../services/insuranceGuideApi';

interface UseInsuranceGuidesReturn {
  guides: InsuranceGuide[];
  balance: InsuranceGuideBalance | null;
  isLoading: boolean;
  isLoadingBalance: boolean;
  error: string | null;
  createGuide: (data: CreateGuideData) => Promise<InsuranceGuide>;
  updateGuide: (id: string, data: UpdateGuideData) => Promise<InsuranceGuide>;
  cancelGuide: (id: string) => Promise<void>;
  inactivateGuide: (id: string) => Promise<{
    guideId: string;
    sessionsCanceled: number;
    appointmentsCanceled: number;
    paymentsCanceled: number;
  }>;
  refetch: () => Promise<void>;
  refetchBalance: () => Promise<void>;
}

/**
 * Hook para gerenciar guias de convênio de um paciente
 *
 * @param patientId - ID do paciente
 * @param filters - Filtros opcionais (specialty, status, insurance)
 * @param autoFetch - Se deve buscar automaticamente ao montar (default: true)
 */
export const useInsuranceGuides = (
  patientId: string,
  filters?: GetGuidesFilters,
  autoFetch: boolean = true
): UseInsuranceGuidesReturn => {
  const [guides, setGuides] = useState<InsuranceGuide[]>([]);
  const [balance, setBalance] = useState<InsuranceGuideBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 Estabilizar dependências de filtros usando valores primitivos
  const filterSpecialty = filters?.specialty;
  const filterStatus = filters?.status;
  const filterInsurance = filters?.insurance;

  // Reconstruir objeto de filtros apenas quando valores primitivos mudarem
  const stableFilters = useMemo(() => {
    if (!filterSpecialty && !filterStatus && !filterInsurance) {
      return undefined;
    }
    return {
      specialty: filterSpecialty,
      status: filterStatus,
      insurance: filterInsurance
    };
  }, [filterSpecialty, filterStatus, filterInsurance]);

  /**
   * Busca guias do paciente
   */
  const fetchGuides = useCallback(async () => {
    if (!patientId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getGuides(patientId, stableFilters);

      // Ordenar por prioridade clínica usando a camada de apresentação:
      // 1. Guias utilizáveis primeiro (canSchedule)
      // 2. Entre utilizáveis: alerta EXPIRING_SOON primeiro, depois mais próximas do vencimento
      // 3. Demais por createdAt descendente
      const presentations = buildGuidesPresentation(data);
      const hasExpiringSoon = (p: ReturnType<typeof buildGuidesPresentation>[number]) =>
        p.rawGuide.lifecycle?.alerts?.some(a => a.code === 'EXPIRING_SOON');

      presentations.sort((a, b) => {
        if (a.isUsable !== b.isUsable) return (b.isUsable ? 1 : 0) - (a.isUsable ? 1 : 0);
        if (a.isUsable && b.isUsable) {
          const aUrgent = hasExpiringSoon(a) ? 1 : 0;
          const bUrgent = hasExpiringSoon(b) ? 1 : 0;
          if (aUrgent !== bUrgent) return bUrgent - aUrgent;
          const aDays = a.daysUntilExpiration ?? Infinity;
          const bDays = b.daysUntilExpiration ?? Infinity;
          return aDays - bDays;
        }
        return new Date(b.rawGuide.createdAt).getTime() - new Date(a.rawGuide.createdAt).getTime();
      });

      setGuides(presentations.map(p => p.rawGuide));
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar guias:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, stableFilters]);

  /**
   * Busca saldo agregado
   */
  const fetchBalance = useCallback(async () => {
    if (!patientId) return;

    setIsLoadingBalance(true);

    try {
      const data = await getBalance(patientId, filterSpecialty);
      setBalance(data);
    } catch (err: any) {
      console.error('Erro ao buscar saldo:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [patientId, filterSpecialty]);

  /**
   * Cria nova guia
   */
  const handleCreateGuide = useCallback(async (data: CreateGuideData) => {
    try {
      const newGuide = await createGuide(data);

      // Refetch automático após criar
      await Promise.all([fetchGuides(), fetchBalance()]);

      return newGuide;
    } catch (err: any) {
      throw err;
    }
  }, [fetchGuides, fetchBalance]);

  /**
   * Atualiza guia existente
   */
  const handleUpdateGuide = useCallback(async (id: string, data: UpdateGuideData) => {
    try {
      const updatedGuide = await updateGuide(id, data);

      // Refetch automático após atualizar
      await Promise.all([fetchGuides(), fetchBalance()]);

      return updatedGuide;
    } catch (err: any) {
      throw err;
    }
  }, [fetchGuides, fetchBalance]);

  /**
   * Cancela guia
   */
  const handleCancelGuide = useCallback(async (id: string) => {
    try {
      await cancelGuide(id);

      // Refetch automático após cancelar
      await Promise.all([fetchGuides(), fetchBalance()]);
    } catch (err: any) {
      throw err;
    }
  }, [fetchGuides, fetchBalance]);

  /**
   * Inativa guia (mesmo padrão de pacotes)
   */
  const handleInactivateGuide = useCallback(async (id: string) => {
    try {
      const result = await inactivateGuide(id);

      // Refetch automático após inativar
      await Promise.all([fetchGuides(), fetchBalance()]);

      return result;
    } catch (err: any) {
      throw err;
    }
  }, [fetchGuides, fetchBalance]);

  /**
   * Refetch manual
   */
  const refetch = useCallback(async () => {
    await fetchGuides();
  }, [fetchGuides]);

  const refetchBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  // Fetch inicial
  // ✅ Agora fetchGuides e fetchBalance são estáveis pois dependem de valores primitivos
  useEffect(() => {
    if (autoFetch && patientId) {
      fetchGuides();
      fetchBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, patientId, stableFilters, filterSpecialty]);

  return {
    guides,
    balance,
    isLoading,
    isLoadingBalance,
    error,
    createGuide: handleCreateGuide,
    updateGuide: handleUpdateGuide,
    cancelGuide: handleCancelGuide,
    inactivateGuide: handleInactivateGuide,
    refetch,
    refetchBalance
  };
};
