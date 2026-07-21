// src/services/whatsappQueueService.ts
import API from './api';

export interface WhatsAppQueueStatus {
  queueName: string;
  isPaused: boolean;
  counts: {
    waiting: number;
    delayed: number;
    active: number;
    failed: number;
    completed: number;
  };
  lastFailed: { phone?: string; reason?: string; attempts?: number } | null;
}

export interface WhatsAppQueueClearResult {
  removedCount: number;
  removed: Array<{ id: string; phone?: string; attemptsMade?: number }>;
  status: WhatsAppQueueStatus;
}

export const whatsappQueueService = {
  fetchStatus: () => API.get<WhatsAppQueueStatus>('/admin/whatsapp-queue/status'),
  pause: () => API.post<WhatsAppQueueStatus>('/admin/whatsapp-queue/pause'),
  resume: () => API.post<WhatsAppQueueStatus>('/admin/whatsapp-queue/resume'),
  clearStuck: () => API.post<WhatsAppQueueClearResult>('/admin/whatsapp-queue/clear-stuck'),
};

export default whatsappQueueService;
