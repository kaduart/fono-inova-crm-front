// hooks/useAdmin.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminService } from '../services/adminService';
import { Appointment } from '../utils/types';
import { AdminInfo } from '../utils/types/types';
import {
  subscribeToCacheInvalidation,
  invalidateCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';

interface UseAdminReturn {
  adminInfo: AdminInfo | null;
  editedInfo: AdminInfo | null;
  setEditedInfo: React.Dispatch<React.SetStateAction<AdminInfo | null>>;
  completedAppointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAdminProfile: () => Promise<void>;
  fetchCompletedAppointments: () => Promise<void>;
  updateAdminProfile: (profileData: { fullName: string; email: string }) => Promise<any>;
  addNewAdmin: (adminData: { fullName: string; email: string; password: string }) => Promise<void>;
}

/**
 * Hook para gerenciamento de dados do admin
 * Agora com cache integrado via cacheManager
 */
export const useAdmin = (): UseAdminReturn => {
  const cachedData = getCache<any>('admin');
  
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(cachedData?.adminInfo || null);
  const [editedInfo, setEditedInfo] = useState<AdminInfo | null>(cachedData?.adminInfo || null);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>(cachedData?.completedAppointments || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const isMounted = useRef(true);

  const fetchAdminProfile = useCallback(async (forceRefresh = false) => {
    // Usa cache se válido
    if (!forceRefresh && isCacheValid('admin')) {
      const cached = getCache<any>('admin');
      if (cached?.adminInfo && isMounted.current) {
        console.log('📦 useAdmin: Usando cache de adminInfo');
        setAdminInfo(cached.adminInfo);
        setEditedInfo(cached.adminInfo);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoading(true);
      const response = await adminService.fetchProfile();

      if (response.status >= 200 && response.status < 300 && isMounted.current) {
        setAdminInfo(response.data);
        setEditedInfo(response.data);
        
        // Atualiza cache
        const currentCache = getCache<any>('admin') || {};
        setCache('admin', { ...currentCache, adminInfo: response.data });
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const fetchCompletedAppointments = useCallback(async (forceRefresh = false) => {
    // Usa cache se válido
    if (!forceRefresh && isCacheValid('admin')) {
      const cached = getCache<any>('admin');
      if (cached?.completedAppointments && isMounted.current) {
        console.log('📦 useAdmin: Usando cache de completedAppointments');
        setCompletedAppointments(cached.completedAppointments);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);
      const response = await adminService.fetchCompletedAppointments();

      if (response.status >= 200 && response.status < 300 && isMounted.current) {
        setCompletedAppointments(response.data);
        
        // Atualiza cache
        const currentCache = getCache<any>('admin') || {};
        setCache('admin', { ...currentCache, completedAppointments: response.data });
      }
    } catch (error) {
      console.error('Error fetching completed/cancelled appointments:', error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [navigate]);

  const updateAdminProfile = useCallback(async (profileData: { fullName: string; email: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.updateProfile(profileData);
      
      if (isMounted.current) {
        setAdminInfo(response.data.admin);
        setEditedInfo(response.data.admin);
      }
      
      // Invalida cache para atualizar dados
      invalidateCache('admin');
      toast.success("Perfil atualizado com sucesso.");
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.response?.data?.message || "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addNewAdmin = useCallback(async (adminData: { fullName: string; email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await adminService.addAdmin(adminData);
      toast.success('Admin adicionado com sucesso');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.response?.data?.message || 'An error occurred. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔔 Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation('admin', () => {
      console.log('🔄 useAdmin: Cache invalidado externamente');
      fetchAdminProfile(true);
    });

    return () => unsubscribe();
  }, [fetchAdminProfile]);

  // ✅ Guard de carregamento único
  const isInitialLoad = useRef(true);
  
  // Efeito inicial
  useEffect(() => {
    isMounted.current = true;
    
    // Só carrega na primeira vez
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      fetchAdminProfile();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchAdminProfile]);

  return {
    adminInfo,
    editedInfo,
    setEditedInfo,
    completedAppointments,
    loading,
    error,
    fetchAdminProfile,
    fetchCompletedAppointments,
    updateAdminProfile,
    addNewAdmin
  };
};
