import { useCallback, useEffect, useState } from 'react';
import { patientService } from '../../services/patientService';
import { IPatient } from '../../utils/types/types';

export const usePatients = () => {
    const [patients, setPatients] = useState<IPatient[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [totalPatients, setTotalPatients] = useState<number>(0);
    const [patientOverview, setPatientOverview] = useState<any>(null);

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await patientService.fetchAll();
            setPatients(data);
        } catch (err) {
            console.error('❌ Erro ao buscar pacientes:', err);
            setError('Falha ao carregar pacientes');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTotalPatients = useCallback(async () => {
        try {
            const data = await patientService.getTotalPatients();
            setTotalPatients(data.totalPatients);
        } catch (err) {
            console.error('❌ Erro ao buscar total de pacientes:', err);
        }
    }, []);

    const fetchPatientOverview = useCallback(async () => {
        try {
            const data = await patientService.getPatientOverview();
            setPatientOverview(data);
        } catch (err) {
            console.error('❌ Erro ao buscar overview de pacientes:', err);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
        fetchTotalPatients();
        fetchPatientOverview();
    }, [fetchPatients, fetchTotalPatients, fetchPatientOverview]);

    const createPatient = async (IPatient: IPatient) => {
        try {
            setLoading(true);
            setError(null);

            const newPatient = await patientService.create(IPatient);
            await fetchPatients();
            await fetchTotalPatients();
            await fetchPatientOverview();    // ✅ garante overview atualizado
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
            await fetchPatients();
            await fetchTotalPatients();
            await fetchPatientOverview();
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
            setPatients(prev => prev.filter(p => p._id !== id));
            setTotalPatients(prev => prev - 1); // ✅ decrementa total
            await fetchPatientOverview();       // ✅ garante overview atualizado
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
    };
};
