import { useCallback, useEffect, useRef, useState } from 'react';
import { patientService } from '../services/patientService';
import { IPatient } from '../utils/types/types';

// 🔹 Cache estático para evitar recarregamentos desnecessários
const cache = {
    patients: null as IPatient[] | null,
    totalPatients: 0,
    patientOverview: null,
    timestamp: 0,
    isLoading: false,
    promises: null as Promise<void> | null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const usePatients = () => {
    const [patients, setPatients] = useState<IPatient[]>(cache.patients || []);
    const [loading, setLoading] = useState(cache.isLoading);
    const [error, setError] = useState<string | null>(null);

    const [totalPatients, setTotalPatients] = useState<number>(cache.totalPatients);
    const [patientOverview, setPatientOverview] = useState<any>(cache.patientOverview);
    
    const isMounted = useRef(true);
    const isInitialLoad = useRef(true);

    const fetchAllData = useCallback(async () => {
        // Se já tem cache válido, não recarrega
        const now = Date.now();
        if (cache.patients && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
            if (isMounted.current) {
                setPatients(cache.patients!);
                setTotalPatients(cache.totalPatients);
                setPatientOverview(cache.patientOverview);
            }
            return;
        }

        // Se já está carregando, espera a promise existente
        if (cache.isLoading && cache.promises) {
            await cache.promises;
            if (isMounted.current) {
                setPatients(cache.patients!);
                setTotalPatients(cache.totalPatients);
                setPatientOverview(cache.patientOverview);
            }
            return;
        }

        cache.isLoading = true;
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

                // Atualiza o cache
                cache.patients = patientsData;
                cache.totalPatients = totalData.totalPatients;
                cache.patientOverview = overviewData;
                cache.timestamp = Date.now();
            } catch (err) {
                console.error('❌ Erro ao buscar dados dos pacientes:', err);
                if (isMounted.current) {
                    setError('Falha ao carregar pacientes');
                }
            } finally {
                cache.isLoading = false;
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        })();

        cache.promises = loadPromise;
        await loadPromise;
        cache.promises = null;
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

    // 🔹 Método para forçar refresh manual
    const refreshData = useCallback(async () => {
        cache.timestamp = 0; // Invalida o cache
        await fetchAllData();
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
            // 🔹 Invalida cache e recarrega todos os dados de uma vez
            cache.timestamp = 0;
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
            // 🔹 Invalida cache e recarrega todos os dados de uma vez
            cache.timestamp = 0;
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
            // 🔹 Invalida cache e recarrega todos os dados de uma vez
            cache.timestamp = 0;
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
