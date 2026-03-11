/**
 * DoctorsContext - Gerenciamento Global de Médicos
 * 
 * Centraliza o estado de médicos para toda a aplicação,
 * eliminando duplicação entre useDoctors, useDoctorList e useDoctorDashboard.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { doctorService, Doctor } from '../services/doctorService';
import { 
  subscribeToCacheInvalidation, 
  invalidateCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';
import { socketManager } from '../utils/socketManager';

interface DoctorsContextData {
  // Dados
  doctors: Doctor[];
  activeDoctors: Doctor[];
  inactiveDoctors: Doctor[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Ações
  refreshDoctors: () => Promise<void>;
  invalidateDoctorsCache: () => void;
}

const DoctorsContext = createContext<DoctorsContextData>({} as DoctorsContextData);

export const DoctorsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctors, setDoctors] = useState<Doctor[]>(getCache<Doctor[]>('doctors') || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    getCache('doctors') ? new Date() : null
  );

  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  // 🎯 Computed values
  const activeDoctors = doctors.filter(d => d.active !== false);
  const inactiveDoctors = doctors.filter(d => d.active === false);

  /**
   * 🔄 Carrega médicos do servidor
   */
  const loadDoctors = useCallback(async (forceRefresh = false) => {
    // Verificar se tem token antes de carregar
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('⏳ DoctorsContext: Token não disponível, skip load');
      return;
    }

    // Verificar cache
    if (!forceRefresh && isCacheValid('doctors')) {
      const cached = getCache<Doctor[]>('doctors');
      if (cached && isMounted.current) {
        console.log('📦 DoctorsContext: Usando cache');
        setDoctors(cached);
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
        console.log('🔄 DoctorsContext: Buscando médicos...');
        const [activeRes, inactiveRes] = await Promise.all([
          doctorService.getActiveDoctors(),
          doctorService.getInactiveDoctors()
        ]);

        const active = activeRes.data || [];
        const inactive = (inactiveRes.data || []).map((d: Doctor) => ({ ...d, active: false as const }));
        
        const allDoctors = [...active, ...inactive];

        if (isMounted.current) {
          setDoctors(allDoctors);
          setLastUpdated(new Date());
          setCache('doctors', allDoctors);
          console.log(`✅ DoctorsContext: ${allDoctors.length} médicos carregados`);
        }
      } catch (err: any) {
        console.error('❌ DoctorsContext: Erro ao buscar médicos:', err);
        if (isMounted.current) {
          setError(err.message || 'Erro ao carregar médicos');
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
  const refreshDoctors = useCallback(async () => {
    await loadDoctors(true);
  }, [loadDoctors]);

  /**
   * 🗑️ Invalida cache
   */
  const invalidateDoctorsCache = useCallback(() => {
    invalidateCache('doctors');
  }, []);

  // 🔔 Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation('doctors', () => {
      console.log('🔄 DoctorsContext: Cache invalidado externamente');
      loadDoctors(true);
    });

    return () => unsubscribe();
  }, [loadDoctors]);

  // 🔌 Socket listeners para atualizações em tempo real
  useEffect(() => {
    const handleDoctorUpdated = () => {
      console.log('📡 DoctorsContext: Doctor updated via socket');
      loadDoctors(true);
    };

    const unsubUpdated = socketManager.on('doctorUpdated', handleDoctorUpdated);
    const unsubCreated = socketManager.on('doctorCreated', handleDoctorUpdated);
    const unsubDeactivated = socketManager.on('doctorDeactivated', handleDoctorUpdated);
    const unsubReactivated = socketManager.on('doctorReactivated', handleDoctorUpdated);

    return () => {
      unsubUpdated();
      unsubCreated();
      unsubDeactivated();
      unsubReactivated();
    };
  }, [loadDoctors]);

  // 🚀 Carregamento inicial - só carrega se tiver token
  useEffect(() => {
    isMounted.current = true;

    const handleAuthReady = () => {
      console.log('🔄 DoctorsContext: Auth ready, loading doctors...');
      loadDoctors(true);
    };

    const handleAuthLogout = () => {
      console.log('[DoctorsContext] Logout detected, clearing doctors...');
      setDoctors([]);
      invalidateCache('doctors');
    };

    // Só carrega se tiver token
    const token = localStorage.getItem('token');
    if (token && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadDoctors();
    }

    // Escuta eventos de auth
    window.addEventListener('authReady', handleAuthReady);
    window.addEventListener('authLogout', handleAuthLogout);

    return () => {
      isMounted.current = false;
      window.removeEventListener('authReady', handleAuthReady);
      window.removeEventListener('authLogout', handleAuthLogout);
    };
  }, [loadDoctors]);

  return (
    <DoctorsContext.Provider value={{
      doctors,
      activeDoctors,
      inactiveDoctors,
      loading,
      error,
      lastUpdated,
      refreshDoctors,
      invalidateDoctorsCache
    }}>
      {children}
    </DoctorsContext.Provider>
  );
};

export const useDoctorsContext = () => {
  const context = useContext(DoctorsContext);
  if (!context) {
    throw new Error('useDoctorsContext deve ser usado dentro de DoctorsProvider');
  }
  return context;
};

export default DoctorsContext;
