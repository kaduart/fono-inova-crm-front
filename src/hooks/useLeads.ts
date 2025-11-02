// src/hooks/useLeads.ts
import { useCallback, useEffect, useState } from "react";
import { leadService } from "../services/leadService";

export const useLeads = (filters: any = {}) => {
  const [state, setState] = useState({
    leads: [] as any[],
    loading: true,
    error: null as string | null,
    total: 0,
  });

  const fetchLeads = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const res = await leadService.getLeads(filters);

      if (res.success) {
        setState({
          leads: res.data,
          total: res.total ?? res.data?.length ?? 0,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(res.error?.message || "Erro ao carregar leads");
      }
    } catch (err: any) {
      setState({
        leads: [],
        total: 0,
        loading: false,
        error: err.message || "Erro ao carregar leads",
      });
    }
  }, [JSON.stringify(filters)]);

  const createLeadFromSheet = async (payload: any) => {
    const res = await leadService.createLeadFromSheet(payload);
    if (res.success) await fetchLeads();
    else throw new Error(res.error?.message || "Erro ao criar lead");
    return res.data;
  };

  const updateLeadStatus = async (leadId: string, status: any) => {
    const res = await leadService.updateLeadStatus(leadId, status);
    if (res.success) await fetchLeads();
    else throw new Error(res.error?.message || "Erro ao atualizar status");
    return res.data;
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads: state.leads,
    total: state.total,
    loading: state.loading,
    error: state.error,
    createLeadFromSheet,
    updateLeadStatus,
    refetch: fetchLeads,
  };
};
