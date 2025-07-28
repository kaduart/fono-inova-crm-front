// src/services/api.ts
import axios from 'axios';
import { BASE_URL } from '../constants/constants';
import { getAuthToken } from './authService';

const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

API.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            console.warn('Token inválido ou expirado. Redirecionando para login...');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const generatePixPayment = async (appointmentId: string) => {
    const response = await API.post('/api/pix/generate', { appointmentId });
    return response.data;
};

export const checkPixStatus = async (txid: string) => {
    const response = await API.get(`/api/pix/status/${txid}`);
    return response.data;
};

export default API;
