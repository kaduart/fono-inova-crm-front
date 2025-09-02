import API from './api';
import { GAEvent, GAMetrics } from '../utils/types';

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
}

export const analyticsService = {
  fetchEvents: (params?: { startDate?: string; endDate?: string }) =>
    API.get<GAEvent[]>('/analytics/events', { params }),

  fetchMetrics: (params?: { startDate?: string; endDate?: string }) =>
    API.get<GAMetrics>('/analytics/metrics', { params }),
};
