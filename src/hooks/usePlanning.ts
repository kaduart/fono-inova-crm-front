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
        let refreshQueued = false;
        try {
            // Usar refresh=true para recalcular automaticamente
            const response = await planningService.getAllWithRefresh(filters);
            setPlannings(response.data);
            setProjection(response.projection || null);
            refreshQueued = response.refreshQueued || false;

            // Se o backend enfileirou refresh em background, fica em loading e
            // faz polling silencioso até os cálculos terminarem.
            if (refreshQueued) {
                console.log('[usePlanning] 🔄 Refresh enfileirado, iniciando polling...');
                const maxAttempts = 15;
                const intervalMs = 3000;
                let attempts = 0;

                const poll = async () => {
                    attempts += 1;
                    try {
                        const pollResponse = await planningService.getAll(filters);
                        const allDone = pollResponse.data.every(
                            (p: any) => p.calculationStatus !== 'processing'
                        );

                        if (allDone || attempts >= maxAttempts) {
                            setPlannings(pollResponse.data);
                            setProjection(pollResponse.projection || null);
                            setLoading(false);
                            if (allDone) {
                                console.log('[usePlanning] ✅ Refresh concluído após polling');
                            } else {
                                console.warn('[usePlanning] ⚠️ Polling atingiu timeout');
                            }
                            return;
                        }

                        setTimeout(poll, intervalMs);
                    } catch (pollErr: any) {
                        console.error('[usePlanning] ❌ Erro no polling:', pollErr.message);
                        setLoading(false);
                    }
                };

                setTimeout(poll, intervalMs);
            }
        } catch (error: any) {
            toast.error('Erro ao carregar planejamentos');
        } finally {
            if (!refreshQueued) {
                setLoading(false);
            }
        }
    }, []);

    const refreshAllPlannings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await planningService.refreshAll();
            if (response.refreshQueued) {
                toast.success('Atualização de planejamentos enfileirada! Acompanhando progresso...');
            } else {
                toast.success(`${response.data?.updated} planejamentos atualizados!`);
            }
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

    const autoGeneratePlanning = useCallback(async (payload: {
        month: number;
        year: number;
        targets: {
            expectedRevenue: number;
            totalSessions: number;
            workHours: number;
            averageTicket: number;
            commercialTicket?: number;
        };
        bySpecialty?: Array<{ specialty: string; sessions: number; revenue: number }>;
        notes?: string;
    }) => {
        try {
            const response = await planningService.autoGenerate(payload);
            toast.success(response.message);
            await fetchPlannings();
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao gerar planejamentos automaticamente');
            throw error;
        }
    }, [fetchPlannings]);

    const recalculateFutureTargets = useCallback(async (month: number, year: number) => {
        try {
            const response = await planningService.recalculateFutureTargets(month, year);
            toast.success(response.message);
            await fetchPlannings();
            return response.data;
        } catch (error: any) {
            toast.error('Erro ao recalcular metas futuras');
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
        autoGeneratePlanning,
        recalculateFutureTargets,
        refreshAllPlannings
    };
};
