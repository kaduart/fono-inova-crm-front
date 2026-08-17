// services/adminService.ts
import { Appointment } from '../utils/types';
import { AdminInfo } from '../utils/types/types';
import API from './api';

// 🚀 V2: Flag para usar endpoints V2
const USE_V2 = false;

export const adminService = {
    fetchProfile: () => API.get<AdminInfo>(USE_V2 ? '/v2/admin/dashboard/profile' : '/admin/profile'),

    updateProfile: (profileData: { fullName: string; email: string }) =>
        API.put<{ admin: AdminInfo }>(USE_V2 ? '/v2/admin/dashboard/profile' : '/admin/profile', profileData),

    fetchCompletedAppointments: () =>
        API.get<Appointment[]>(USE_V2 ? '/v2/admin/dashboard/appointments/completed' : '/admin/appointment/completed-cancelled'),

    addAdmin: (adminData: { fullName: string; email: string; password: string; role?: string }) =>
        API.post(USE_V2 ? '/v2/admin/dashboard/admins' : '/admin/add-admin', adminData),

    fetchSecretaries: () =>
        API.get<{ success: boolean; data: Array<{ _id: string; fullName: string; email: string; role: 'secretary' }> }>('/admin/secretaries'),
    
    // 🚀 V2: Novo método para overview do dashboard
    fetchDashboardOverview: () =>
        API.get('/v2/admin/dashboard/overview'),
    
    // 🚀 V2: Novo método para quick stats
    fetchQuickStats: () =>
        API.get('/v2/admin/dashboard/quick-stats'),
    
    // 🚀 V2: Novo método para payments summary
    fetchPaymentsSummary: (startDate?: string, endDate?: string) =>
        API.get('/v2/admin/dashboard/payments-summary', {
            params: { startDate, endDate }
        })
};
