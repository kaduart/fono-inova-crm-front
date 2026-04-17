import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, X } from 'lucide-react';
import notifySound from '../../assets/notify1.wav';
import { socketManager } from '../../utils/socketManager';

interface MessageNotification {
  id: string;
  from: string;
  text: string;
  timestamp: number;
}

export const WhatsAppMessagePopup: React.FC = () => {
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);

  const addNotification = useCallback((payload: any) => {
    const dir = String(payload.direction || "").toLowerCase();
    
    // Só mostra para mensagens recebidas (inbound)
    if (dir !== "inbound" && dir !== "received" && dir !== "in") {
      return;
    }

    const newNotification: MessageNotification = {
      id: payload.id || String(Date.now()),
      from: payload.from || 'Desconhecido',
      text: (payload.text || payload.content || 'Nova mensagem').substring(0, 60),
      timestamp: Date.now(),
    };

    console.log('[WhatsAppPopup] 🔔 Adicionando notificação:', newNotification);

    // Tocar som de notificação
    try {
      const audio = new Audio(notifySound);
      audio.play().catch(() => {});
    } catch {}

    setNotifications(prev => [newNotification, ...prev].slice(0, 3)); // Max 3 notificações

    // Auto-remove após 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Escuta mensagens via socket
  useEffect(() => {
    console.log('[WhatsAppPopup] 📡 Registrando listener...');
    
    const unsubscribe = socketManager.onMessageNew((payload) => {
      console.log('[WhatsAppPopup] 📨 Mensagem recebida:', payload);
      addNotification(payload);
    });

    return () => {
      console.log('[WhatsAppPopup] 🧹 Removendo listener');
      unsubscribe();
    };
  }, [addNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-3 min-w-[280px] max-w-[350px] animate-in slide-in-from-right fade-in duration-300 pointer-events-auto"
        >
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">
                Nova mensagem WhatsApp
              </p>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {notification.from}
              </p>
              <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                {notification.text}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WhatsAppMessagePopup;
