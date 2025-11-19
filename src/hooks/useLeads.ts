// src/hooks/useLeads.ts
import { useCallback, useEffect, useState } from "react";
import { leadService } from "../services/leadService";

interface UseLeadsProps {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  origin?: string;
}

export const useLeads = (filters: UseLeadsProps = {}) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: filters.page || 1,
    limit: filters.limit || 20,
    total: 0,
    pages: 0
  });

  // ✅ CORREÇÃO: fetchLeads com dependências estáveis
  const fetchLeads = useCallback(async (currentPage?: number, currentLimit?: number) => {
    try {
      setLoading(true);
      setError(null);

      const pageToUse = currentPage !== undefined ? currentPage : pagination.page;
      const limitToUse = currentLimit !== undefined ? currentLimit : pagination.limit;

      const requestFilters = {
        ...filters,
        page: pageToUse,
        limit: limitToUse
      };

      // Remove valores undefined
      Object.keys(requestFilters).forEach(key => {
        if (requestFilters[key as keyof typeof requestFilters] === undefined) {
          delete requestFilters[key as keyof typeof requestFilters];
        }
      });

      const res = await leadService.getLeads(requestFilters);

      if (res.success) {
        setLeads(res.data || []);
        setPagination(prev => ({
          ...prev,
          page: pageToUse,
          limit: limitToUse,
          total: res.total || 0,
          pages: Math.ceil((res.total || 0) / limitToUse)
        }));
      } else {
        throw new Error(res.error?.message || "Erro ao carregar leads");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [
    // ✅ DEPENDÊNCIAS: apenas valores primitivos específicos
    filters.search,
    filters.status,
    filters.origin,
    pagination.page,
    pagination.limit
  ]);

  const goToPage = useCallback((newPage: number) => {
    // ✅ CORREÇÃO: Não chama fetchLeads diretamente, apenas atualiza estado
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    // ✅ CORREÇÃO: Atualiza estado e reseta para página 1
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1
    }));
  }, []);

  const createLeadFromSheet = useCallback(async (payload: any) => {
    try {
      const res = await leadService.createLeadFromSheet(payload);
      if (res.success) {
        await fetchLeads(pagination.page, pagination.limit);
        return res.data;
      } else {
        throw new Error(res.error?.message || "Erro ao criar lead");
      }
    } catch (err: any) {
      throw new Error(err.message || "Erro ao criar lead");
    }
  }, [fetchLeads, pagination.page, pagination.limit]);

  const updateLeadStatus = useCallback(async (leadId: string, status: any) => {
    try {
      const res = await leadService.updateLeadStatus(leadId, status);
      if (res.success) {
        setLeads(prev => prev.map(lead =>
          lead._id === leadId ? { ...lead, status } : lead
        ));
        return res.data;
      } else {
        throw new Error(res.error?.message || "Erro ao atualizar status");
      }
    } catch (err: any) {
      throw new Error(err.message || "Erro ao atualizar status");
    }
  }, []);

  // ✅ CORREÇÃO: Efeito para buscar dados quando paginação ou filtros mudam
  useEffect(() => {
    fetchLeads();
  }, [
    // ✅ DEPENDÊNCIAS ESPECÍFICAS que devem disparar nova busca
    filters.search,
    filters.status,
    filters.origin,
    pagination.page,
    pagination.limit
  ]);

  return {
    leads,
    loading,
    error,
    pagination,
    refetch: () => fetchLeads(pagination.page, pagination.limit),
    goToPage,
    changeLimit,
    createLeadFromSheet,
    updateLeadStatus,
  };
};