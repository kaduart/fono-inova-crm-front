// src/hooks/useInsurancePlan.ts
import { useQuery } from '@tanstack/react-query';
import { getInsurancePlanByGuide } from '../services/insuranceGuideApi';

export const insurancePlanQueryKey = (guideId?: string | null) => ['insurance-plan', guideId] as const;

/**
 * Query única e compartilhada do InsurancePlan de uma guia.
 * Qualquer componente que chame com o mesmo guideId consome o mesmo cache
 * (GuideCard e GuideDetailsModal não precisam mais buscar de forma independente).
 */
export const useInsurancePlan = (guideId?: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: insurancePlanQueryKey(guideId),
    queryFn: () => getInsurancePlanByGuide(guideId as string),
    enabled: !!guideId && enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error: any) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
      return failureCount < 2;
    },
  });
};
