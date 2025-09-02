// services/adminService.ts
import { Appointment } from '../utils/types';
import { AdminInfo } from '../utils/types/types';
import API from './api';

export const adminService = {
    fetchProfile: () => API.get<AdminInfo>('/admin/profile'),

    updateProfile: (profileData: { fullName: string; email: string }) =>
        API.put<{ admin: AdminInfo }>('/admin/profile', profileData),

    fetchCompletedAppointments: () =>
        API.get<Appointment[]>('/admin/appointment/completed-cancelled'),

    addAdmin: (adminData: { fullName: string; email: string; password: string }) =>
        API.post('/admin/add-admin', adminData)
};