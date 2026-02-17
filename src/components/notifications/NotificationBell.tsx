import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Calendar, Clock, User, Phone } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import notificationService from '../../services/notificationService';
import { Notification } from '../../services/notificationService';

interface NotificationBellProps {
  className?: string;
}

/**
 * 🔔 NotificationBell
 * 
 * Componente de sino de notificações para o header:
 * - Mostra badge com contador de não lidas
 * - Dropdown com lista de notificações
 * - Agrupa notificações por prioridade
 * - Mostra horário de criação relativo
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    isBusinessHours,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss
  } = useNotifications({ showToastOnRealtime: false });

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carrega notificações ao abrir dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    // Se for pré-agendamento, pode redirecionar
    if (notification.type === 'preagendamento') {
      // Opcional: redirecionar para página de pré-agendamentos
      // navigate('/pre-agendamentos');
    }
    
    // Fecha dropdown se não houver mais notificações
    if (unreadCount <= 1) {
      setIsOpen(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      normal: 'bg-blue-100 text-blue-700 border-blue-200',
      low: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    
    const labels: Record<string, string> = {
      urgent: 'Urgente',
      high: 'Alta',
      normal: 'Normal',
      low: 'Baixa'
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[priority] || styles.normal}`}>
        {labels[priority] || 'Normal'}
      </span>
    );
  };

  const getSourceBadge = (source?: string) => {
    const icons: Record<string, string> = {
      amandaAI: '🤖',
      agenda_externa: '📱',
      whatsapp: '💬',
      telefone: '📞',
      site: '🌐',
      instagram: '📸'
    };
    
    return (
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
        {icons[source || ''] || '📋'} {source || 'Sistema'}
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 🔔 Botão do Sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-all duration-200
          ${isOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}
          ${!isBusinessHours && unreadCount > 0 ? 'animate-pulse' : ''}
        `}
        title={isBusinessHours ? 'Horário comercial' : 'Fora do horário comercial'}
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold
            flex items-center justify-center text-white
            ${unreadCount > 5 ? 'bg-red-500' : 'bg-blue-500'}
          `}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Indicador de fora do horário */}
        {!isBusinessHours && unreadCount === 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full" />
        )}
      </button>

      {/* 📋 Dropdown */}
      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200
          z-50 overflow-hidden
        ">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <h3 className="font-semibold text-white">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                  </span>
                )}
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-white/90 hover:text-white flex items-center gap-1 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-4 h-4" />
                  Limpar todas
                </button>
              )}
            </div>
            
            {/* Status do horário comercial */}
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isBusinessHours ? 'bg-green-400' : 'bg-orange-400'}`} />
              <span className="text-xs text-white/80">
                {isBusinessHours 
                  ? '🟢 Horário comercial - Notificações em tempo real' 
                  : '🔴 Fora do horário - Notificações acumuladas'}
              </span>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma notificação pendente</p>
                <p className="text-xs mt-1">
                  {isBusinessHours 
                    ? 'Novas notificações aparecerão em tempo real'
                    : 'As notificações serão acumuladas até o próximo horário comercial'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="
                      p-4 hover:bg-gray-50 transition-colors cursor-pointer group
                      border-l-4 border-transparent hover:border-blue-500
                    "
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Tipo e Prioridade */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {notificationService.getTypeIcon(notification.type)}
                          </span>
                          {getPriorityBadge(notification.priority)}
                          <span className="text-xs text-gray-400">
                            {notification.timeAgo}
                          </span>
                        </div>

                        {/* Conteúdo Principal */}
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900 truncate">
                            {notification.data.patientName}
                          </p>
                          
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            {notification.data.specialty && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {notification.data.specialty}
                              </span>
                            )}
                            {notification.data.doctorName && (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                                {notification.data.doctorName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {notification.data.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(notification.data.date).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {notification.data.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {notification.data.time}
                              </span>
                            )}
                          </div>

                          {/* Origem */}
                          <div className="pt-1">
                            {getSourceBadge(notification.data.source)}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(notification.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Descartar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <button
                onClick={() => {
                  // Opcional: navegar para página completa de notificações
                  // navigate('/notificacoes');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
