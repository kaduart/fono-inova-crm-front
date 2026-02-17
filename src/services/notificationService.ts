import api from './api';

export interface NotificationData {
  patientName: string;
  specialty: string;
  doctorName?: string;
  date?: string;
  time?: string;
  phone?: string;
  source?: string;
}

export interface Notification {
  id: string;
  type: 'preagendamento' | 'agendamento_confirmado' | 'cancelamento' | 'sistema';
  data: NotificationData;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'dismissed';
  createdAt: string;
  timeAgo: string;
  isBroadcast: boolean;
}

export interface NotificationSummary {
  unread: number;
  isBusinessHours: boolean;
}

export interface NotificationCountResponse {
  success: boolean;
  count: number;
  hasUnread: boolean;
  isBusinessHours: boolean;
}

/**
 * 🔔 Serviço de Notificações
 * 
 * Gerencia notificações persistentes do sistema:
 * - Notificações fora do horário comercial
 * - Badge de contador
 * - Marcar como lida
 */
class NotificationService {
  /**
   * Busca notificações do usuário
   */
  async getNotifications(
    status: 'unread' | 'read' | 'all' = 'unread',
    limit: number = 20
  ): Promise<{ data: Notification[]; summary: NotificationSummary }> {
    const response = await api.get('/notifications', {
      params: { status, limit }
    });
    return {
      data: response.data.data || [],
      summary: response.data.summary || { unread: 0, isBusinessHours: true }
    };
  }

  /**
   * Retorna apenas a contagem (para o badge)
   */
  async getUnreadCount(): Promise<NotificationCountResponse> {
    const response = await api.get('/notifications/count');
    return response.data;
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(notificationId: string): Promise<{ unreadCount: number }> {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return { unreadCount: response.data.unreadCount };
  }

  /**
   * Marca todas como lidas
   */
  async markAllAsRead(): Promise<{ cleared: number }> {
    const response = await api.post('/notifications/read-all');
    return { cleared: response.data.cleared };
  }

  /**
   * Remove/descarta uma notificação
   */
  async dismiss(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  }

  /**
   * Busca notificações pendentes da noite
   * (Usado quando usuário loga de manhã)
   */
  async getPendingOvernight(): Promise<{ count: number; data: Notification[] }> {
    const response = await api.get('/notifications/pending-overnight');
    return {
      count: response.data.count,
      data: response.data.data || []
    };
  }

  /**
   * Formata o texto da notificação para exibição
   */
  formatNotificationText(notification: Notification): string {
    const { data, type } = notification;
    
    if (type === 'preagendamento') {
      const specialtyMap: Record<string, string> = {
        fonoaudiologia: 'Fono',
        psicologia: 'Psico',
        fisioterapia: 'Fisio',
        terapia_ocupacional: 'TO',
        musicoterapia: 'Music',
        psicopedagogia: 'Psicoped',
        neuroped: 'Neuroped'
      };
      
      const specialty = specialtyMap[data.specialty] || data.specialty;
      const time = data.time || '--:--';
      
      return `${data.patientName} - ${specialty} - ${time}`;
    }
    
    return data.patientName || 'Nova notificação';
  }

  /**
   * Retorna a cor baseada na prioridade
   */
  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      normal: 'bg-blue-500',
      low: 'bg-gray-400'
    };
    return colors[priority] || 'bg-blue-500';
  }

  /**
   * Retorna o ícone baseado no tipo
   */
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      preagendamento: '📅',
      agendamento_confirmado: '✅',
      cancelamento: '❌',
      sistema: '🔔'
    };
    return icons[type] || '🔔';
  }
}

export const notificationService = new NotificationService();
export default notificationService;
