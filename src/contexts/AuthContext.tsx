// AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BASE_URL } from '../constants/constants';
import { SESSION_CONFIG } from '../constants/session';
import API from '../services/api';
import { getAuthToken, isTokenExpired, getTokenTimeRemaining } from '../services/authService';

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
  logout: (options?: { forceClear?: boolean }) => Promise<{ success: boolean }>;
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

      // 🔔 Notifica outros contextos que auth está pronto
      window.dispatchEvent(new CustomEvent('authReady', { 
        detail: { user: userData, role: userData.role } 
      }));

      return { success: true, userRole: userData.role };
    } catch {
      return { success: false };
    }
  }, []);

  const logout = useCallback((options?: { forceClear?: boolean }) => {
    showLoading();
    try {
      // 🧹 LIMPEZA COMPLETA de todos os dados de autenticação
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('lastActivity');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      setUser(null);
      delete API.defaults.headers.common['Authorization'];

      // 🔔 Notifica outros contextos sobre logout
      window.dispatchEvent(new CustomEvent('authLogout'));

      // Se for forçado, garante que não haja restore automático
      if (options?.forceClear) {
        localStorage.clear();
        sessionStorage.clear();
      }

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

        // Etapa 0: Verifica se o token JWT está expirado (8h, 24h)
        const token = getAuthToken();
        if (isTokenExpired(token)) {
          console.log('[Auth] Token JWT expirado na inicialização');
          if (isMounted) {
            await logout({ forceClear: true });
            window.dispatchEvent(new CustomEvent('sessionExpired'));
          }
          return;
        }

        // Etapa 1: Verifica expiração da sessão (4h de inatividade)
        const isExpired = checkSessionExpiry();
        if (isExpired) {
          if (isMounted) {
            await logout({ forceClear: true });
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
          await logout({ forceClear: true });
          window.dispatchEvent(new CustomEvent('sessionExpired'));
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
        logout({ forceClear: true });
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }, SESSION_CONFIG.CHECK_INTERVAL); // Usando CHECK_INTERVAL da configuração

    return () => clearInterval(sessionCheckInterval);
  }, [checkSessionExpiry, logout, user]);

  // 🔐 Verificação de expiração do TOKEN JWT (8h, 24h, etc)
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = getAuthToken();
      
      if (!token) return;
      
      // Verifica se o token JWT está expirado
      if (isTokenExpired(token)) {
        console.log('[Auth] Token JWT expirado. Fazendo logout...');
        logout({ forceClear: true });
        window.dispatchEvent(new CustomEvent('sessionExpired'));
        return;
      }
      
      // Log para debug: mostra quanto tempo falta (apenas se estiver logado)
      const timeRemaining = getTokenTimeRemaining(token);
      if (user && timeRemaining > 0 && timeRemaining < 3600) { // Menos de 1 hora
        console.log(`[Auth] Token expira em ${Math.floor(timeRemaining / 60)} minutos`);
      }
    };

    // Verifica imediatamente na montagem
    checkTokenExpiration();
    
    // Verifica a cada minuto
    const tokenCheckInterval = setInterval(checkTokenExpiration, 60 * 1000);

    return () => clearInterval(tokenCheckInterval);
  }, [logout, user]);

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