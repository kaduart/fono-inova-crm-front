/**
 * usePatientsMinimal - Hook para Dados Mínimos de Pacientes
 * 
 * Só carrega o essencial para o Dashboard:
 * - Contagem total de pacientes
 * - Lista básica (nome, id) para modais/formulários
 * 
 * NÃO carrega:
 * - Histórico completo
 * - Dados clínicos detalhados
 * - Paginação completa
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { patientService } from '../services/patientService';
import toast from 'react-hot-toast';

interface PatientMinimal {
    _id: string;
    fullName: string;
    phone?: string;
    email?: string;
}

interface UsePatientsMinimalReturn {
    patients: PatientMinimal[];
    totalPatients: number;
    loading: boolean;
    fetchPatients: () => Promise<void>;
}

// Cache
let cache: { patients: PatientMinimal[]; total: number } | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const usePatientsMinimal = (): UsePatientsMinimalReturn => {
    const [patients, setPatients] = useState<PatientMinimal[]>(cache?.patients || []);
    const [totalPatients, setTotalPatients] = useState(cache?.total || 0);
    const [loading, setLoading] = useState(!cache);
    
    const isMounted = useRef(true);

    const fetchPatients = useCallback(async (force = false) => {
        // Usa cache se válido
        if (!force && cache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
            setPatients(cache.patients);
            setTotalPatients(cache.total);
            setLoading(false);
            return;
        }

        setLoading(true);
        
        try {
            // Busca só primeira página com limit pequeno
            const response = await patientService.fetchAll(false);
            
            if (!isMounted.current) return;

            const patientsData = Array.isArray(response) ? response : [];
            const total = patientsData.length;
            
            // Mapeia para dados mínimos
            const minimal = patientsData.map((p: any) => ({
                _id: p._id,
                fullName: p.fullName,
                phone: p.phone,
                email: p.email
            }));

            // Salva cache
            cache = { patients: minimal, total };
            cacheTimestamp = Date.now();

            setPatients(minimal);
            setTotalPatients(total);
        } catch (error) {
            if (!isMounted.current) return;
            toast.error('Erro ao carregar pacientes');
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        
        // Só busca se tiver token
        const token = localStorage.getItem('token');
        if (token) {
            fetchPatients();
        } else {
            // Aguarda um pouco e tenta novamente (token pode estar sendo setado)
            const timer = setTimeout(() => {
                const retryToken = localStorage.getItem('token');
                if (retryToken && isMounted.current) {
                    fetchPatients();
                }
            }, 500);
            return () => clearTimeout(timer);
        }

        // 🔄 Listener para quando o token for setado em outro lugar
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && e.newValue && isMounted.current) {
                fetchPatients();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            isMounted.current = false;
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [fetchPatients]);

    return {
        patients,
        totalPatients,
        loading,
        fetchPatients
    };
};

export default usePatientsMinimal;
