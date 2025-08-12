// hooks/useAuthNavigation.ts
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BASE_URL } from '../constants/constants';
import { useAuth } from '../contexts/AuthContext';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const { login: authLogin, logout: authLogout } = auth;
  const loading = auth?.loading || {
    isLoading: false,
    showLoading: () => { },
    hideLoading: () => { }
  };

  const login = async (credentials: { email: string; password: string; role: string }) => {
    loading.showLoading();
    try {
      const response = await axios.post(`${BASE_URL}/login`, credentials);
      const data = response.data;

      if (data.requiresPasswordCreation) {
        loading.hideLoading();
        return { requiresPasswordCreation: true };
      }

      console.log('bateu no loginnn', data)
      const result = await authLogin(data.token, data.user);

      setTimeout(() => {
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
        loading.hideLoading(); // Só esconde após navegar
      }, 500);

      // Redirecionamento seguro
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('bateu no loginnn', result)
      if (result.userRole === 'doctor') {
        navigate('/doctors');
      } else if (result.userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/patient');
      }

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(message);
      return { success: false };
    } finally {
      loading.hideLoading();
    }
  };

  const logout = async () => {
    loading.showLoading();
    try {
      await authLogout();
      navigate('/login');
    } finally {
      loading.hideLoading();
    }
  };

  return { login, logout };
};

