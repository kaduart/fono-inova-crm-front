import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BASE_URL } from '../constants/constants';
import { useAuth } from '../contexts/AuthContext';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { login: authLogin, logout: authLogout, loading } = useAuth();

  const login = async (credentials: { email: string; password: string; role: string }) => {
    loading.showLoading();
    try {
      const response = await axios.post(`${BASE_URL}/login`, credentials);
      const data = response.data;

      if (data.requiresPasswordCreation) {
        loading.hideLoading();
        return { requiresPasswordCreation: true };
      }

      // 1. Faz o login sem redirecionar ainda
      await authLogin(data.token, data.user);

      // 2. Delay para visualização do loading
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Redireciona baseado no role (agora simplificado)
      switch (data.user.role) {
        case 'doctor':
          navigate('/doctors');
          break;
        case 'admin':
          navigate('/admin');
          break;
        case 'patient':
          navigate('/patient');
          break;
        default:
          navigate('/dashboard');
      }

      return { success: true };
    } catch (error: any) {
      loading.hideLoading();
      const message = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(message);
      return { success: false };
    } finally {
      // Esconde o loading após navegação
      setTimeout(() => loading.hideLoading(), 300);
    }

  };

  const logout = async () => {
    loading.showLoading();
    try {
      await authLogout();
      navigate('/login');
    } finally {
      setTimeout(() => loading.hideLoading(), 500);
    }
  };

  return { login, logout };
};