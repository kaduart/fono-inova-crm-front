import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    console.log('[WhatsAppPopup] 📡 Registrando listener...');

    const handler = (payload: any) => {
      console.log('[WhatsAppPopup] 📥 RAW payload:', JSON.stringify(payload).substring(0, 200));
      const dir = String(payload.direction || "").toLowerCase();
      console.log('[WhatsAppPopup] ➡️ direction:', dir);
      if (dir !== "inbound" && dir !== "received" && dir !== "in") {
        console.log('[WhatsAppPopup] ❌ Ignorado — direction não é inbound/received/in');
        return;
      }

      const n: MessageNotification = {
        id: payload.id || String(Date.now()),
        from: payload.from || 'Desconhecido',
        text: (payload.text || payload.content || 'Nova mensagem').substring(0, 60),
        timestamp: Date.now(),
      };

      console.log('[WhatsAppPopup] 🔔 Popup disparado:', n);
      setNotifications(prev => [n, ...prev].slice(0, 3));

      try { new Audio(notifySound).play().catch(() => {}); } catch {}

      setTimeout(() => {
        setNotifications(prev => prev.filter(x => x.id !== n.id));
      }, 8000);
    };

    const unsubscribe = socketManager.onMessageNew(handler);
    return () => unsubscribe();
  }, []);

  console.log(`[WhatsAppPopup] 🎨 Render: ${notifications.length} notificações`);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[9999] flex flex-col gap-2">
      {notifications.map(n => (
        <div key={n.id} className="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-3 min-w-[280px] max-w-[350px]">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full"><MessageCircle className="w-5 h-5 text-green-600" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium">Nova mensagem WhatsApp</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{n.from}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{n.text}</p>
            </div>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WhatsAppMessagePopup;
