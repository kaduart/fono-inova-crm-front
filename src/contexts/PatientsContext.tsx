/**
 * PatientsContext - Gerenciamento Global de Pacientes
 * 
 * Centraliza o estado de pacientes para toda a aplicação,
 * eliminando duplicação entre usePatients e usePatientsMinimal.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import patientService from '../services/patientService';
import { IPatient } from '../utils/types/types';
import { 
  subscribeToCacheInvalidation, 
  invalidateCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';
import { socketManager } from '../utils/socketManager';
import { extractErrorMessage } from '../utils/errorUtils';

interface PatientOverview {
  name: string;
  appointments: number;
}

interface PatientsContextData {
  // Dados
  patients: IPatient[];
  totalPatients: number;
  patientOverview: PatientOverview[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Ações de consulta
  refreshPatients: () => Promise<void>;
  searchPatients: (searchTerm: string) => Promise<IPatient[]>;
  getPatientById: (id: string) => IPatient | undefined;
  
  // Ações de mutação
  createPatient: (patient: IPatient) => Promise<IPatient>;
  updatePatient: (id: string, patient: Partial<IPatient>) => Promise<IPatient>;
  deletePatient: (id: string) => Promise<void>;
  
  // Cache
  invalidatePatientsCache: () => void;
}

const PatientsContext = createContext<PatientsContextData>({} as PatientsContextData);

export const PatientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cachedData = getCache<{
    patients: IPatient[], 
    totalPatients: number, 
    patientOverview: PatientOverview[]
  }>('patients');
  
  const [patients, setPatients] = useState<IPatient[]>(cachedData?.patients || []);
  const [totalPatients, setTotalPatients] = useState<number>(cachedData?.totalPatients || 0);
  const [patientOverview, setPatientOverview] = useState<PatientOverview[] | null>(cachedData?.patientOverview || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cachedData ? new Date() : null
  );

  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  /**
   * 🔄 Carrega pacientes do servidor
   */
  const loadPatients = useCallback(async (forceRefresh = false) => {
    // Verificar se tem token antes de carregar
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('⏳ PatientsContext: Token não disponível, skip load');
      return;
    }

    // Verificar cache
    if (!forceRefresh && isCacheValid('patients')) {
      const cached = getCache<{
        patients: IPatient[], 
        totalPatients: number, 
        patientOverview: PatientOverview[]
      }>('patients');
      if (cached && isMounted.current) {
        console.log('📦 PatientsContext: Usando cache');
        setPatients(cached.patients);
        setTotalPatients(cached.totalPatients);
        setPatientOverview(cached.patientOverview);
        return;
      }
    }

    // Evitar chamadas paralelas
    if (loadPromiseRef.current) {
      await loadPromiseRef.current;
      return;
    }

    if (isMounted.current) setLoading(true);
    setError(null);

    const loadPromise = (async () => {
      try {
        console.log('🔄 PatientsContext: Buscando pacientes (limite: 20)...');
        
        // 🔹 Carrega APENAS os primeiros 20 pacientes + total
        const [patientsData, totalData] = await Promise.all([
          patientService.fetchAll(20), // Só 20 iniciais!
          patientService.getTotalPatients()
        ]);

        if (isMounted.current) {
          setPatients(patientsData);
          setTotalPatients(totalData.totalPatients);
          // Overview vazio inicialmente - carrega sob demanda
          setPatientOverview([]);
          setLastUpdated(new Date());
          
          // Atualiza cache global
          setCache('patients', {
            patients: patientsData,
            totalPatients: totalData.totalPatients,
            patientOverview: []
          });
          
          console.log(`✅ PatientsContext: ${patientsData.length} pacientes carregados (total: ${totalData.totalPatients})`);
        }
      } catch (err: any) {
        console.error('❌ PatientsContext: Erro ao buscar pacientes:', err);
        if (isMounted.current) {
          setError(extractErrorMessage(err, 'Erro ao carregar pacientes'));
        }
      } finally {
        if (isMounted.current) setLoading(false);
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = loadPromise;
    await loadPromise;
  }, []);

  /**
   * 🔄 Força atualização
   */
  const refreshPatients = useCallback(async () => {
    await loadPatients(true);
  }, [loadPatients]);

  /**
   * 🔍 Busca pacientes por termo
   */
  const searchPatients = useCallback(async (searchTerm: string): Promise<IPatient[]> => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return patients;
    }
    try {
      const results = await patientService.search(searchTerm);
      return results;
    } catch (err) {
      console.error('Erro na busca:', err);
      return [];
    }
  }, [patients]);

  /**
   * 🎯 Retorna paciente por ID (do cache local)
   */
  const getPatientById = useCallback((id: string): IPatient | undefined => {
    return patients.find(p => p._id === id);
  }, [patients]);

  /**
   * ➕ Cria novo paciente
   */
  const createPatient = useCallback(async (patientData: IPatient): Promise<IPatient> => {
    setLoading(true);
    setError(null);
    try {
      const newPatient = await patientService.create(patientData);
      console.log('✅ PatientsContext: Paciente criado');
      
      // Invalida e recarrega
      invalidateCache('patients');
      await loadPatients(true);
      
      return newPatient;
    } catch (error: any) {
      setError(extractErrorMessage(error, 'Erro ao criar paciente'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadPatients]);

  /**
   * ✏️ Atualiza paciente
   */
  const updatePatient = useCallback(async (id: string, patientData: Partial<IPatient>): Promise<IPatient> => {
    setLoading(true);
    try {
      const updatedPatient = await patientService.update(id, patientData);
      console.log('✅ PatientsContext: Paciente atualizado');
      
      // Atualiza localmente para feedback imediato
      setPatients(prev => prev.map(p => 
        p._id === id ? { ...p, ...updatedPatient } : p
      ));
      
      // Invalida e recarrega em background
      invalidateCache('patients');
      loadPatients(true);
      
      return updatedPatient;
    } catch (error: any) {
      setError(extractErrorMessage(error, 'Erro ao criar paciente'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadPatients]);

  /**
   * 🗑️ Deleta paciente
   */
  const deletePatient = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    try {
      await patientService.delete(id);
      console.log('✅ PatientsContext: Paciente deletado');
      
      // Atualiza localmente
      setPatients(prev => prev.filter(p => p._id !== id));
      setTotalPatients(prev => prev - 1);
      
      // Invalida e recarrega
      invalidateCache('patients');
      loadPatients(true);
    } catch (error: any) {
      setError(extractErrorMessage(error, 'Erro ao criar paciente'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadPatients]);

  /**
   * 🗑️ Invalida cache
   */
  const invalidatePatientsCache = useCallback(() => {
    invalidateCache('patients');
  }, []);

  // 🔔 Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation('patients', () => {
      console.log('🔄 PatientsContext: Cache invalidado externamente');
      loadPatients(true);
    });

    return () => unsubscribe();
  }, [loadPatients]);

  // 🔌 Socket listeners
  useEffect(() => {
    const handlePatientChange = () => {
      console.log('📡 PatientsContext: Patient change via socket');
      loadPatients(true);
    };

    const unsubCreated = socketManager.on('patientCreated', handlePatientChange);
    const unsubUpdated = socketManager.on('patientUpdated', handlePatientChange);
    const unsubDeleted = socketManager.on('patientDeleted', handlePatientChange);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [loadPatients]);

  // 🚀 Carregamento inicial - só carrega se tiver token
  useEffect(() => {
    isMounted.current = true;

    const handleAuthReady = () => {
      console.log('🔄 PatientsContext: Auth ready, loading patients...');
      loadPatients(true);
    };

    const handleAuthLogout = () => {
      console.log('[PatientsContext] Logout detected, clearing patients...');
      setPatients([]);
      setTotalPatients(0);
      setPatientOverview(null);
      invalidateCache('patients');
    };

    // Só carrega se tiver token
    const token = localStorage.getItem('token');
    if (token && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadPatients();
    }

    // Escuta eventos de auth
    window.addEventListener('authReady', handleAuthReady);
    window.addEventListener('authLogout', handleAuthLogout);

    return () => {
      isMounted.current = false;
      window.removeEventListener('authReady', handleAuthReady);
      window.removeEventListener('authLogout', handleAuthLogout);
    };
  }, [loadPatients]);

  return (
    <PatientsContext.Provider value={{
      patients,
      totalPatients,
      patientOverview,
      loading,
      error,
      lastUpdated,
      refreshPatients,
      searchPatients,
      getPatientById,
      createPatient,
      updatePatient,
      deletePatient,
      invalidatePatientsCache
    }}>
      {children}
    </PatientsContext.Provider>
  );
};

export const usePatientsContext = () => {
  const context = useContext(PatientsContext);
  if (!context) {
    throw new Error('usePatientsContext deve ser usado dentro de PatientsProvider');
  }
  return context;
};

export default PatientsContext;
