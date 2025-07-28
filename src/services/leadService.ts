import axios from 'axios';
import { BASE_URL } from '../constants/constants';

const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const getLeads = (filters = {}) => API.get('/leads', { params: filters });
export const getLead = (id: string) => API.get(`/leads/${id}`);
export const createLead = (data: any) => API.post('/leads', data);
export const updateLead = (id: string, data: any) => API.put(`/leads/${id}`, data);
export const deleteLead = (id: string) => API.delete(`/leads/${id}`);
export const getLeadSummary = () => API.get('/leads/report/summary');
