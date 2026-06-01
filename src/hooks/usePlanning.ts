// src/hooks/usePlanning.ts
import { useState, useCallback } from 'react';
import { planningService, Planning } from '../services/planningService';
import { toast } from 'react-toastify';

export const usePlanning = () => {
    const [plannings, setPlannings] = useState<Planning[]>([]);
    const [projection, setProjection] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchPlannings = useCallback(async (filters?: any) => {
        setLoading(true);
        try {
            // Usar refresh=true para recalcular automaticamente
            const response = await planningService.getAllWithRefresh(filters);
            setPlannings(response.data);
            setProjection(response.projection || null);
        } catch (error: any) {
            toast.error('Erro ao carregar planejamentos');
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshAllPlannings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await planningService.refreshAll();
            toast.success(`${response.data.updated} planejamentos atualizados!`);
            // Recarregar após atualizar
            await fetchPlannings({});
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao atualizar planejamentos');
            throw error;
        } finally {
            setLoading(false);
        }
    }, [fetchPlannings]);

    const createPlanning = useCallback(async (data: Partial<Planning>) => {
        try {
            // Calcular datas automaticamente baseado no tipo
            const startDate = new Date(data.year!, data.month! - 1, 1);
            const endDate = new Date(data.year!, data.month!, 0);

            const planningData = {
                ...data,
                period: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0]
                },
                actual: {
                    completedSessions: 0,
                    actualRevenue: 0,
                    workedHours: 0
                },
                progress: {
                    sessionsPercentage: 0,
                    revenuePercentage: 0,
                    overallStatus: 'on_track',
                    gapRevenue: data.targets?.expectedRevenue
                }
            };

            const response = await planningService.create(planningData);
            toast.success('Planejamento criado com sucesso!');
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao criar planejamento');
            throw error;
        }
    }, []);

    const updatePlanning = useCallback(async (id: string, data: Partial<Planning>) => {
        try {
            const response = await planningService.update(id, data);
            toast.success('Planejamento atualizado com sucesso!');
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao atualizar planejamento');
            throw error;
        }
    }, []);

    const deletePlanning = useCallback(async (id: string) => {
        try {
            await planningService.delete(id);
            toast.success('Planejamento excluído com sucesso!');
            // Atualizar lista após exclusão
            setPlannings(prev => prev.filter(p => p._id !== id));
        } catch (error: any) {
            toast.error('Erro ao excluir planejamento');
            throw error;
        }
    }, []);

    const updateProgress = useCallback(async (id: string) => {
        try {
            const response = await planningService.updateProgress(id);
            toast.success(response.message);
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao atualizar progresso');
            throw error;
        }
    }, []);

    const createWeekly = useCallback(async (startDate: string) => {
        try {
            const response = await planningService.createWeekly(startDate);
            toast.success(response.message);
            await fetchPlannings();
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao criar planejamento semanal');
            throw error;
        }
    }, [fetchPlannings]);

    const createMonthly = useCallback(async (month: number, year: number) => {
        try {
            const response = await planningService.createMonthly(month, year);
            toast.success(response.message);
            await fetchPlannings();
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao criar planejamento mensal');
            throw error;
        }
    }, [fetchPlannings]);

    return {
        plannings,
        loading,
        projection,
        fetchPlannings,
        createPlanning,
        updatePlanning,
        deletePlanning,
        updateProgress,
        createWeekly,
        createMonthly,
        refreshAllPlannings
    };
};
