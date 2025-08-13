// src/services/api.ts
import axios, { AxiosHeaders } from 'axios';
import { BASE_URL } from '../constants/constants';
import { clearAuthTokens } from './authService';

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use(config => {
  // Verifica múltiplas fontes de token
  const token = localStorage.getItem('token') ||
    document.cookie.split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

  if (!token) {
    console.error('Token não encontrado para:', config.url);
    window.dispatchEvent(new CustomEvent('authError'));
    return Promise.reject(new Error('Token não disponível'));
  }

  // Garante que headers é um objeto AxiosHeaders
  const headers = new AxiosHeaders(config.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  config.headers = headers;
  return config;
});

// Interceptor de Response
API.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      clearAuthTokens();
      window.dispatchEvent(new CustomEvent('authError', {
        detail: {
          code: error.response.data?.code || 'UNAUTHORIZED',
          message: error.response.data?.message || 'Sessão expirada'
        }
      }));
    }
    return Promise.reject(error);
  }
);


// Mantenha suas funções existentes
export const generatePixPayment = async (appointmentId: string) => {
  const response = await API.post('/pix/generate', { appointmentId });
  return response.data;
};

export const checkPixStatus = async (txid: string) => {
  const response = await API.get(`/pix/status/${txid}`);
  return response.data;
};


// src/services/api.ts (ou em outro arquivo, desde que importe depois)


export const loginAPI = async (credentials: { email: string; password: string }) => {
  const response = await API.post('/login', credentials);
  // supondo que o backend retorne { token, user } no body
  return response.data;
};

export default API;