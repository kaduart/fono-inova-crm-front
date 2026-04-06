import { useCallback, useEffect, useRef, useState } from 'react';
import patientService from '../services/patientService';
import { IPatient } from '../utils/types/types';
import { 
    subscribeToCacheInvalidation, 
    invalidateCache,
    isCacheValid,
    getCache,
    setCache
} from '../utils/cacheManager';

// 🔹 Cache estático para evitar recarregamentos desnecessários
const localCache = {
    isLoading: false,
    promise: null as Promise<void> | null
};

export const usePatients = () => {
    const cachedData = getCache<{patients: IPatient[], totalPatients: number, patientOverview: any}>('patients');
    
    const [patients, setPatients] = useState<IPatient[]>(cachedData?.patients || []);
    const [loading, setLoading] = useState(localCache.isLoading);
    const [error, setError] = useState<string | null>(null);

    const [totalPatients, setTotalPatients] = useState<number>(cachedData?.totalPatients || 0);
    const [patientOverview, setPatientOverview] = useState<any>(cachedData?.patientOverview || null);

    const isMounted = useRef(true);
    const isInitialLoad = useRef(true);

    const fetchAllData = useCallback(async (forceRefresh = false) => {
        // Se já tem cache válido, não recarrega
        if (!forceRefresh && isCacheValid('patients')) {
            const cached = getCache<{patients: IPatient[], totalPatients: number, patientOverview: any}>('patients');
            if (cached && isMounted.current) {
                console.log('📦 usePatients: Usando cache');
                setPatients(cached.patients);
                setTotalPatients(cached.totalPatients);
                setPatientOverview(cached.patientOverview);
            }
            return;
        }

        // Se já está carregando, espera a promise existente
        if (localCache.isLoading && localCache.promise) {
            await localCache.promise;
            const cached = getCache<{patients: IPatient[], totalPatients: number, patientOverview: any}>('patients');
            if (cached && isMounted.current) {
                setPatients(cached.patients);
                setTotalPatients(cached.totalPatients);
                setPatientOverview(cached.patientOverview);
            }
            return;
        }

        localCache.isLoading = true;
        setLoading(true);

        const loadPromise = (async () => {
            try {
                // 🔹 Carrega tudo em paralelo com Promise.all
                const [patientsData, totalData, overviewData] = await Promise.all([
                    patientService.fetchAll(),
                    patientService.getTotalPatients(),
                    patientService.getPatientOverview()
                ]);

                if (isMounted.current) {
                    setPatients(patientsData);
                    setTotalPatients(totalData.totalPatients);
                    setPatientOverview(overviewData);
                }

                // Atualiza o cache global
                setCache('patients', {
                    patients: patientsData,
                    totalPatients: totalData.totalPatients,
                    patientOverview: overviewData
                });
            } catch (err) {
                console.error('❌ Erro ao buscar dados dos pacientes:', err);
                if (isMounted.current) {
                    setError('Falha ao carregar pacientes');
                }
            } finally {
                localCache.isLoading = false;
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        })();

        localCache.promise = loadPromise;
        await loadPromise;
        localCache.promise = null;
    }, []);

    useEffect(() => {
        isMounted.current = true;

        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            fetchAllData();
        }

        return () => {
            isMounted.current = false;
        };
    }, [fetchAllData]);

    // 🔔 Subscribe para invalidação de cache externa
    useEffect(() => {
        const unsubscribe = subscribeToCacheInvalidation('patients', () => {
            console.log('🔄 usePatients: Cache invalidado externamente, recarregando...');
            fetchAllData(true);
        });

        return () => unsubscribe();
    }, [fetchAllData]);

    // 🔹 Método para forçar refresh manual
    const refreshData = useCallback(async () => {
        await fetchAllData(true);
    }, [fetchAllData]);

    const fetchPatients = useCallback(async () => {
        await refreshData();
    }, [refreshData]);

    const fetchTotalPatients = useCallback(async () => {
        // Dados já estão no estado, apenas retorna
        return { totalPatients };
    }, [totalPatients]);

    const fetchPatientOverview = useCallback(async () => {
        // Dados já estão no estado, apenas retorna
        return patientOverview;
    }, [patientOverview]);

    const createPatient = async (IPatient: IPatient) => {
        try {
            setLoading(true);
            setError(null);

            const newPatient = await patientService.create(IPatient);
            // 🚀 Invalida cache e propaga para hooks relacionados
            invalidateCache('patients');
            await refreshData();
            return newPatient;
        } catch (error: any) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updatePatient = async (id: string, IPatient: Partial<IPatient>) => {
        try {
            setLoading(true);
            const updatedPatient = await patientService.update(id, IPatient);
            // 🚀 Invalida cache e propaga para hooks relacionados
            invalidateCache('patients');
            await refreshData();
            return updatedPatient;
        } catch (error) {
            setError('Falha ao atualizar paciente');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deletePatient = async (id: string) => {
        try {
            setLoading(true);
            await patientService.delete(id);
            // 🚀 Invalida cache e propaga para hooks relacionados
            invalidateCache('patients');
            await refreshData();
        } catch (error) {
            setError('Falha ao remover paciente');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        patients,
        totalPatients,
        patientOverview,
        loading,
        error,
        fetchPatients,
        fetchTotalPatients,
        fetchPatientOverview,
        createPatient,
        updatePatient,
        deletePatient,
        refreshData,
    };
};
