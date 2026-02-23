import API from './api';

export interface GAEvent {
  action: string;
  value: number;
  timestamp: string;
}

export interface GAMetrics {
  totalUsers: number;
  activeUsers: number;
  sessions: number;
  engagedSessions: number;
  avgSessionDuration: number;
  source?: 'ga4' | 'internal'; // Indica a fonte dos dados
}

export const analyticsService = {
  fetchEvents: (params?: { startDate?: string; endDate?: string }) =>
    API.get<GAEvent[]>('/analytics/events', { params }),

  fetchMetrics: (params?: { startDate?: string; endDate?: string }) =>
    API.get<GAMetrics>('/analytics/metrics', { params }),
};
