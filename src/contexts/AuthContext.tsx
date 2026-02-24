// AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BASE_URL } from '../constants/constants';
import { SESSION_CONFIG } from '../constants/session';
import API from '../services/api';

type UserRole = 'doctor' | 'admin' | 'patient';

export interface User {
  _id: string;
  fullName: string;
  email: string;
  specialty?: string;
  specialties?: string[];
  licenseNumber?: string;
  phoneNumber?: string;
  active: boolean;
  role: UserRole;
  weeklyAvailability?: {
    day: string;
    times: string[];
  }[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

interface LoadingState {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<{ success: boolean; userRole?: string }>;
  logout: () => Promise<{ success: boolean }>;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  loading: LoadingState;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  const showLoading = useCallback(() => setOperationLoading(true), []);
  const hideLoading = useCallback(() => setOperationLoading(false), []);

  // Usando as constantes de SESSION_CONFIG
  const SESSION_TIMEOUT = SESSION_CONFIG.TIMEOUT;
  const TOKEN_RENEWAL_INTERVAL = 30 * 60 * 1000; // Manendo 30 minutos para renovação do token

  // Atualiza a última atividade do usuário
  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now());
    localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  const login = useCallback(async (token: string, userData: User) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', JSON.stringify(userData.role));
      localStorage.setItem('lastActivity', Date.now().toString());

      setUser(userData);
      setLastActivity(Date.now());
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true, userRole: userData.role };
    } catch {
      return { success: false };
    }
  }, []);

  const logout = useCallback(() => {
    showLoading();
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');

      setUser(null);
      delete API.defaults.headers.common['Authorization'];

      // Delay para visualização do loading
      return { success: true };
    } finally {
      setTimeout(hideLoading, 1000);
    }
  }, [showLoading, hideLoading]);

  // Verifica se a sessão expirou
  const checkSessionExpiry = useCallback(() => {
    const storedTime = localStorage.getItem('lastActivity');
    if (!storedTime) return true;

    const currentTime = Date.now();
    const elapsedTime = currentTime - parseInt(storedTime);

    return elapsedTime > SESSION_TIMEOUT;
  }, [SESSION_TIMEOUT]);


  const publicPaths = [
    '/reset-password',
    '/login',
    '/signup',
    '/forgot-password'
  ];

  // 🔒 Efeito único e consolidado para validação de autenticação
  // Evita race condition entre múltiplos useEffect concorrentes
  useEffect(() => {
    let isMounted = true;
    let isRunning = false;

    const validateAuth = async () => {
      // Previne execuções concorrentes
      if (isRunning) return;
      isRunning = true;

      try {
        // Rotas públicas não precisam de validação
        if (publicPaths.some(path => location.pathname.startsWith(path))) {
          if (isMounted) setAuthLoading(false);
          return;
        }

        if (isMounted) setAuthLoading(true);

        // Etapa 1: Verifica expiração da sessão
        const isExpired = checkSessionExpiry();
        if (isExpired) {
          if (isMounted) {
            await logout();
            window.dispatchEvent(new CustomEvent('sessionExpired'));
          }
          return;
        }

        // Etapa 2: Valida token com o backend
        const userRes = await API.get('/users/me');
        
        if (isMounted) {
          setUser(userRes.data);
          updateLastActivity();
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          await logout();
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
        isRunning = false;
      }
    };

    validateAuth();

    return () => {
      isMounted = false;
    };
  }, [checkSessionExpiry, logout, updateLastActivity]);

  useEffect(() => {
    const renewToken = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${BASE_URL}/renew-token`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const { newToken } = await response.json();
          localStorage.setItem('token', newToken);
        }
      } catch (error) {
        console.error('Falha ao renovar token:', error);
      }
    };

    const interval = setInterval(() => {
      if (user) {
        renewToken();
      }
    }, TOKEN_RENEWAL_INTERVAL);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const sessionCheckInterval = setInterval(() => {
      if (checkSessionExpiry() && user) {
        logout();
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }, SESSION_CONFIG.CHECK_INTERVAL); // Usando CHECK_INTERVAL da configuração

    return () => clearInterval(sessionCheckInterval);
  }, [checkSessionExpiry, logout, user]);

  const value = useMemo(() => ({
    user,
    isLoading: authLoading,
    isAuthenticated: !!user,
    login,
    logout,
    setUser,
    loading: {
      isLoading: operationLoading,
      showLoading,
      hideLoading
    }
  }), [user, authLoading, operationLoading, login, logout, showLoading, hideLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};