// AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BASE_URL } from '../constants/constants';
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

  const showLoading = useCallback(() => setOperationLoading(true), []);
  const hideLoading = useCallback(() => setOperationLoading(false), []);

  const login = useCallback(async (token: string, userData: User) => {
    showLoading();
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return { success: true, userRole: userData.role };
    } catch {
      hideLoading();
    }
  }, [showLoading, hideLoading]);


  const logout = useCallback(() => {
    showLoading();
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      delete API.defaults.headers.common['Authorization'];

      // Delay para visualização do loading
      return { success: true };
    } finally {
      setTimeout(hideLoading, 1000);
    }
  }, [showLoading, hideLoading]);

  useEffect(() => {
    const validateSession = async () => {
      try {
        setAuthLoading(true);
        const userRes = await API.get('/users/me');
        setUser(userRes.data);
      } catch (error) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    validateSession();
  }, [showLoading, hideLoading]);



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
    }, 30 * 60 * 1000); // A cada 30 minutos

    return () => clearInterval(interval);
  }, [user]);

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