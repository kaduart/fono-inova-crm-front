// src/hooks/usePlanning.ts
import { useState, useCallback } from 'react';
import { planningService, Planning } from '../services/planningService';
import { toast } from 'react-toastify';

export const usePlanning = () => {
    const [plannings, setPlannings] = useState<Planning[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPlannings = useCallback(async (filters?: any) => {
        setLoading(true);
        try {
            const response = await planningService.getAll(filters);
            setPlannings(response.data);
        } catch (error: any) {
            toast.error('Erro ao carregar planejamentos');
        } finally {
            setLoading(false);
        }
    }, []);

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
        fetchPlannings,
        createPlanning,
        updateProgress,
        createWeekly,
        createMonthly
    };
};
