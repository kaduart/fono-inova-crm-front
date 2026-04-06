/**
 * Admin Service V2 - CQRS + Event-Driven
 * 
 * Service para administração do sistema usando endpoints V2 otimizados.
 * 
 * Features:
 * - Endpoints V2 com projection
 * - Cache inteligente
 * - Tipos TypeScript completos
 * - Fallback para V1
 */

import API from './api';
import { Appointment } from '../utils/types';
import { AdminInfo } from '../utils/types/types';

// ============================================
// CONFIG
// ============================================

const USE_V2_ADMIN = import.meta.env.VITE_USE_V2_ADMIN === 'true' || true;

const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

// ============================================
// TYPES
// ============================================

export interface AdminProfile {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  stats: {
    totalPatients: number;
    totalDoctors: number;
    todayAppointments: number;
    weekAppointments: number;
    pendingPayments: number;
    monthRevenue: number;
    monthLeads: number;
    leadsByStatus: Record<string, number>;
    calculatedAt: string;
  };
  charts: {
    appointmentsChart: Array<{ date: string; count: number }>;
    leadsByOrigin: Array<{ _id: string; count: number }>;
    revenueChart: Array<{ date: string; value: number }>;
    patientsBySpecialty: Array<{ _id: string; count: number }>;
    calculatedAt: string;
  };
  doctorsOverview: Array<{
    _id: string;
    name: string;
    specialty: string;
    patients: number;
    appointments: number;
  }>;
  upcomingAppointments: Array<{
    _id: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    patient: string;
    doctor: string;
  }>;
  generatedAt: string;
}

export interface QuickStats {
  patients: { total: number; newThisMonth: number };
  doctors: { total: number; active: number };
  appointments: { today: number; week: number; month: number };
  payments: { pending: number; received: number; total: number };
  revenue: { month: number; projected: number };
}

export interface PaymentsSummary {
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
  byPeriod: Array<{ period: string; amount: number; count: number }>;
  total: number;
  received: number;
  pending: number;
}

export interface CompletedAppointment extends Appointment {
  patientName?: string;
  doctorName?: string;
  paymentStatus?: string;
}

export interface NewAdminData {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}

// ============================================
// CACHE
// ============================================

const cache: {
  overview: DashboardOverview | null;
  quickStats: QuickStats | null;
  timestamp: number;
  promise: Promise<any> | null;
} = {
  overview: null,
  quickStats: null,
  timestamp: 0,
  promise: null
};

// ============================================
// SERVICE V2
// ============================================

export const adminServiceV2 = {
  USE_V2: USE_V2_ADMIN,

  // ==========================================
  // PROFILE
  // ==========================================

  /**
   * 👤 Busca perfil do admin
   * GET /v2/admin/dashboard/profile
   */
  async fetchProfile(): Promise<AdminProfile> {
    const response = await API.get<{ success: boolean; data: AdminProfile }>(
      '/v2/admin/dashboard/profile'
    );
    return response.data?.data || response.data;
  },

  /**
   * ✏️ Atualiza perfil do admin
   * PUT /v2/admin/dashboard/profile
   */
  async updateProfile(profileData: { fullName: string; email: string }): Promise<{ admin: AdminProfile }> {
    const response = await API.put<{ success: boolean; data: { admin: AdminProfile } }>(
      '/v2/admin/dashboard/profile',
      profileData
    );
    return response.data?.data || response.data;
  },

  // ==========================================
  // DASHBOARD
  // ==========================================

  /**
   * 🎯 Dashboard Overview (consolidado)
   * GET /v2/admin/dashboard/overview
   */
  async fetchDashboardOverview(forceRefresh = false): Promise<DashboardOverview> {
    const now = Date.now();

    // Cache
    if (!forceRefresh && cache.overview && (now - cache.timestamp < CACHE_TTL)) {
      console.log('📦 adminServiceV2: Usando cache overview');
      return cache.overview;
    }

    // Evitar chamadas paralelas
    if (cache.promise) {
      return cache.promise;
    }

    cache.promise = (async () => {
      try {
        const response = await API.get<{ success: boolean; data: DashboardOverview }>(
          '/v2/admin/dashboard/overview'
        );
        const data = response.data?.data || response.data;
        
        cache.overview = data;
        cache.timestamp = now;
        
        return data;
      } finally {
        cache.promise = null;
      }
    })();

    return cache.promise;
  },

  /**
   * 📊 Quick Stats
   * GET /v2/admin/dashboard/quick-stats
   */
  async fetchQuickStats(): Promise<QuickStats> {
    const response = await API.get<{ success: boolean; data: QuickStats }>(
      '/v2/admin/dashboard/quick-stats'
    );
    return response.data?.data || response.data;
  },

  /**
   * 💰 Payments Summary
   * GET /v2/admin/dashboard/payments-summary
   */
  async fetchPaymentsSummary(startDate?: string, endDate?: string): Promise<PaymentsSummary> {
    const response = await API.get<{ success: boolean; data: PaymentsSummary }>(
      '/v2/admin/dashboard/payments-summary',
      { params: { startDate, endDate } }
    );
    return response.data?.data || response.data;
  },

  // ==========================================
  // APPOINTMENTS
  // ==========================================

  /**
   * 📅 Consultas completadas
   * GET /v2/admin/dashboard/appointments/completed
   */
  async fetchCompletedAppointments(): Promise<CompletedAppointment[]> {
    const response = await API.get<{ success: boolean; data: CompletedAppointment[] }>(
      '/v2/admin/dashboard/appointments/completed'
    );
    return response.data?.data || response.data;
  },

  // ==========================================
  // ADMIN MANAGEMENT
  // ==========================================

  /**
   * ➕ Adiciona novo admin
   * POST /v2/admin/dashboard/admins
   */
  async addAdmin(adminData: NewAdminData): Promise<{ admin: AdminProfile }> {
    const response = await API.post<{ success: boolean; data: { admin: AdminProfile } }>(
      '/v2/admin/dashboard/admins',
      adminData
    );
    return response.data?.data || response.data;
  },

  /**
   * 👥 Lista todos os admins
   * GET /v2/admin/dashboard/admins
   */
  async listAdmins(): Promise<AdminProfile[]> {
    const response = await API.get<{ success: boolean; data: AdminProfile[] }>(
      '/v2/admin/dashboard/admins'
    );
    return response.data?.data || response.data;
  },

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  /**
   * 🗑️ Invalida cache no backend
   */
  async invalidateCache(): Promise<void> {
    await API.post('/v2/admin/dashboard/invalidate-cache');
    this.clearLocalCache();
  },

  /**
   * 🧹 Limpa cache local
   */
  clearLocalCache(): void {
    cache.overview = null;
    cache.quickStats = null;
    cache.timestamp = 0;
    cache.promise = null;
    console.log('🧹 Cache do adminServiceV2 limpo');
  },

  /**
   * 📊 Estado do cache
   */
  getCacheState() {
    return {
      hasOverview: !!cache.overview,
      hasQuickStats: !!cache.quickStats,
      timestamp: cache.timestamp,
      age: Date.now() - cache.timestamp,
      isLoading: !!cache.promise
    };
  }
};

// ============================================
// FALLBACK V1
// ============================================

import { adminService as adminServiceV1 } from './adminService';

export const adminServiceHybrid = {
  USE_V2: USE_V2_ADMIN,

  async fetchProfile(): Promise<AdminProfile> {
    if (USE_V2_ADMIN) {
      return adminServiceV2.fetchProfile();
    }
    const response = await adminServiceV1.fetchProfile();
    return response.data;
  },

  async updateProfile(profileData: { fullName: string; email: string }) {
    if (USE_V2_ADMIN) {
      return adminServiceV2.updateProfile(profileData);
    }
    return adminServiceV1.updateProfile(profileData);
  },

  async fetchDashboardOverview(forceRefresh = false) {
    if (USE_V2_ADMIN) {
      return adminServiceV2.fetchDashboardOverview(forceRefresh);
    }
    const response = await adminServiceV1.fetchDashboardOverview();
    return response.data?.data || response.data;
  },

  async fetchQuickStats() {
    if (USE_V2_ADMIN) {
      return adminServiceV2.fetchQuickStats();
    }
    throw new Error('QuickStats só disponível na V2');
  },

  async fetchPaymentsSummary(startDate?: string, endDate?: string) {
    if (USE_V2_ADMIN) {
      return adminServiceV2.fetchPaymentsSummary(startDate, endDate);
    }
    throw new Error('PaymentsSummary só disponível na V2');
  },

  async fetchCompletedAppointments() {
    if (USE_V2_ADMIN) {
      return adminServiceV2.fetchCompletedAppointments();
    }
    return adminServiceV1.fetchCompletedAppointments();
  },

  async addAdmin(adminData: NewAdminData) {
    if (USE_V2_ADMIN) {
      return adminServiceV2.addAdmin(adminData);
    }
    return adminServiceV1.addAdmin(adminData);
  },

  async listAdmins() {
    if (USE_V2_ADMIN) {
      return adminServiceV2.listAdmins();
    }
    throw new Error('ListAdmins só disponível na V2');
  },

  async invalidateCache() {
    if (USE_V2_ADMIN) {
      return adminServiceV2.invalidateCache();
    }
  },

  clearLocalCache() {
    adminServiceV2.clearLocalCache();
  },

  getCacheState() {
    return adminServiceV2.getCacheState();
  }
};

export default adminServiceHybrid;
