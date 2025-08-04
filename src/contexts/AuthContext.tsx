// AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../constants/constants';
import API from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  // Adicione outros campos conforme necessário
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    const origin = location.state?.from?.pathname || '/dashboard';
    navigate(origin, { replace: true });
  }, [navigate, location.state]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const userRes = await API.get('/users/me');
        setUser(userRes.data);
        setIsLoading(false);
      } catch (error) {
        // Se 401, já vai cair no interceptor acima e redirecionar
        setUser(null);
        setIsLoading(false);
      }
    };

    validateSession();
  }, [logout]);


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
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    setUser,
  }), [user, isLoading, login, logout]);

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