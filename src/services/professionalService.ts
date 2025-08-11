import axios from "axios";
import { BASE_URL } from "../constants/constants";
import { IDoctor } from "../utils/types/types";
import { getAuthToken } from "./authService";


const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const professionalService = {
    fetchAll: (): Promise<IDoctor[]> =>
        API.get<IDoctor[]>('/doctors/all')
            .then(res => res.data),

    fetchById: (id: string): Promise<IDoctor> =>
        API.get<IDoctor>(`/doctors/${id}`)
            .then(res => res.data),

    create: (data: Partial<IDoctor>): Promise<IDoctor> =>
        API.post<IDoctor>('/doctors', data)
            .then(res => res.data),

    update: (id: string, data: Partial<IDoctor>): Promise<IDoctor> =>
        API.put<IDoctor>(`/doctors/${id}`, data)
            .then(res => res.data),

    remove: (id: string): Promise<void> =>
        API.delete<void>(`/doctors/${id}`)
            .then(() => { }),
};


