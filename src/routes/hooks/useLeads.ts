// src/hooks/useLeads.ts
import { useCallback, useEffect, useState } from 'react';
import { leadService } from '../../services/leadService';

export const useLeads = (filters: any = {}) => {
    const [state, setState] = useState({
        leads: [],
        loading: true,
        error: null as string | null
    });

    const fetchLeads = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const response = await leadService.getLeads(filters);

            if (response.success) {
                setState({
                    leads: response.data.data || [],
                    loading: false,
                    error: null
                });
            } else {
                throw new Error(response.error?.message || 'Erro ao carregar leads');
            }
        } catch (err: any) {
            setState({
                leads: [],
                loading: false,
                error: err.message || 'Erro ao carregar leads'
            });
        }
    }, [JSON.stringify(filters)]);

    const createLead = async (leadData: any) => {
        try {
            const response = await leadService.createLead(leadData);

            if (response.success) {
                await fetchLeads(); // Recarregar a lista
                return response.data;
            } else {
                throw new Error(response.error?.message || 'Erro ao criar lead');
            }
        } catch (err: any) {
            throw new Error(err.message || 'Erro ao criar lead');
        }
    };

    const updateLeadStatus = async (leadId: string, status: string) => {
        try {
            const response = await leadService.updateLeadStatus(leadId, status);

            if (response.success) {
                await fetchLeads();
                return response.data;
            } else {
                throw new Error(response.error?.message || 'Erro ao atualizar status');
            }
        } catch (err: any) {
            throw new Error(err.message || 'Erro ao atualizar status');
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    return {
        leads: state.leads,
        loading: state.loading,
        error: state.error,
        createLead,
        updateLeadStatus,
        refetch: fetchLeads,
    };
};