import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { socketManager } from '../utils/socketManager';
import notificationService, { Notification } from '../services/notificationService';

interface UseNotificationsOptions {
  /** Se deve mostrar toast quando receber notificação em tempo real */
  showToastOnRealtime?: boolean;
  /** Se deve carregar notificações pendentes ao montar */
  loadPendingOnMount?: boolean;
  /** Callback quando houver nova notificação */
  onNewNotification?: (notification: Notification) => void;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isBusinessHours: boolean;
  isLoading: boolean;
  hasPendingOvernight: boolean;
}

/**
 * 🔔 Hook de Notificações
 * 
 * Gerencia notificações persistentes e em tempo real:
 * - Socket para notificações instantâneas (horário comercial)
 * - Polling para badge de contador
 * - Notificações acumuladas da noite
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    showToastOnRealtime = true,
    loadPendingOnMount = true,
    onNewNotification
  } = options;

  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    isBusinessHours: true,
    isLoading: false,
    hasPendingOvernight: false
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Busca contagem de não lidas (para o badge)
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationService.getUnreadCount();
      setState(prev => ({
        ...prev,
        unreadCount: result.count,
        isBusinessHours: result.isBusinessHours
      }));
      return result.count;
    } catch (error) {
      console.error('[useNotifications] Erro ao buscar contagem:', error);
      return 0;
    }
  }, []);

  /**
   * Busca todas as notificações
   */
  const fetchNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await notificationService.getNotifications('unread', 50);
      setState(prev => ({
        ...prev,
        notifications: result.data,
        unreadCount: result.summary.unread,
        isBusinessHours: result.summary.isBusinessHours,
        isLoading: false
      }));
      return result.data;
    } catch (error) {
      console.error('[useNotifications] Erro ao buscar notificações:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return [];
    }
  }, []);

  /**
   * Busca notificações pendentes da noite
   */
  const checkPendingOvernight = useCallback(async () => {
    try {
      const result = await notificationService.getPendingOvernight();
      if (result.count > 0) {
        setState(prev => ({ ...prev, hasPendingOvernight: true }));
        toast.info(
          `📅 ${result.count} pré-agendamento${result.count > 1 ? 's' : ''} aguardando análise`,
          { autoClose: 5000 }
        );
      }
      return result.count;
    } catch (error) {
      console.error('[useNotifications] Erro ao verificar pendentes:', error);
      return 0;
    }
  }, []);

  /**
   * Marca notificação como lida
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      
      // Atualiza estado local
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId),
        unreadCount: result.unreadCount
      }));
      
      return result.unreadCount;
    } catch (error) {
      console.error('[useNotifications] Erro ao marcar como lida:', error);
      toast.error('Erro ao marcar notificação');
      return stateRef.current.unreadCount;
    }
  }, []);

  /**
   * Marca todas como lidas
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await notificationService.markAllAsRead();
      
      setState(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
        hasPendingOvernight: false
      }));
      
      toast.success(`${result.cleared} notificações marcadas como lidas`);
      return result.cleared;
    } catch (error) {
      console.error('[useNotifications] Erro ao marcar todas:', error);
      toast.error('Erro ao limpar notificações');
      return 0;
    }
  }, []);

  /**
   * Remove uma notificação
   */
  const dismiss = useCallback(async (notificationId: string) => {
    try {
      await notificationService.dismiss(notificationId);
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId),
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
    } catch (error) {
      console.error('[useNotifications] Erro ao remover:', error);
    }
  }, []);

  /**
   * Handler para nova notificação via socket
   */
  const handleNewNotification = useCallback((data: any) => {
    console.log('[useNotifications] Nova notificação via socket:', data);
    
    // Se fora do horário comercial, adiciona à lista
    if (!data.isBusinessHours) {
      const notification: Notification = {
        id: data.id,
        type: data.type || 'preagendamento',
        data: data.data,
        priority: data.priority || 'normal',
        status: 'unread',
        createdAt: new Date().toISOString(),
        timeAgo: 'Agora',
        isBroadcast: true
      };

      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications],
        unreadCount: prev.unreadCount + 1
      }));

      // Toast opcional
      if (showToastOnRealtime) {
        toast.info(
          `📅 ${data.data?.patientName || 'Novo pré-agendamento'} - Fora do horário comercial`,
          { autoClose: 3000 }
        );
      }

      onNewNotification?.(notification);
    }
  }, [showToastOnRealtime, onNewNotification]);

  /**
   * Handler para pré-agendamento em tempo real (horário comercial)
   */
  const handlePreAgendamentoRealtime = useCallback((data: any) => {
    if (data.isBusinessHours !== false) {
      // Horário comercial: toast normal
      if (showToastOnRealtime) {
        toast.info(
          `📅 Novo pré-agendamento: ${data.patientName} - ${data.specialty}`,
          { autoClose: 5000 }
        );
      }
      
      // Incrementa contador
      setState(prev => ({ ...prev, unreadCount: prev.unreadCount + 1 }));
    }
  }, [showToastOnRealtime]);

  // Efeito inicial: carrega dados e configura socket
  useEffect(() => {
    // Carrega contagem inicial
    fetchUnreadCount();

    // Verifica pendentes da noite
    if (loadPendingOnMount) {
      checkPendingOvernight();
    }

    // Configura listeners de socket
    const unsubNotification = socketManager.on('notification:new', handleNewNotification);
    const unsubPreAgendamento = socketManager.on('preagendamento:new', handlePreAgendamentoRealtime);

    // Polling suave para manter badge atualizado (a cada 30s)
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      unsubNotification();
      unsubPreAgendamento();
      clearInterval(interval);
    };
  }, [fetchUnreadCount, checkPendingOvernight, loadPendingOnMount, handleNewNotification, handlePreAgendamentoRealtime]);

  return {
    // Estado
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isBusinessHours: state.isBusinessHours,
    isLoading: state.isLoading,
    hasPendingOvernight: state.hasPendingOvernight,
    
    // Ações
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    checkPendingOvernight
  };
}

export default useNotifications;
