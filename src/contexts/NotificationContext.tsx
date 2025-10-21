import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

// ======================================================
// 🔹 Tipos de notificação
// ======================================================
interface PaymentNotification {
  id: string;
  appointmentId?: string;
  amount?: number;
  date?: Date;
  patientName?: string;
}

interface MediaNotification {
  id: string;
  from: string;
  type: string;
  caption?: string;
  timestamp: number;
}

interface ChatNotification {
  id: string;
  from: string;
  text: string;
  timestamp: number;
}

// ======================================================
// 🔹 Interface do contexto global
// ======================================================
interface NotificationContextType {
  // 💰 PIX
  paymentNotification: PaymentNotification | null;
  showPaymentNotification: (notification: Omit<PaymentNotification, 'id'>) => void;
  closePaymentNotification: () => void;

  // 📎 WHATSAPP - mídia
  mediaNotification: MediaNotification | null;
  showMediaNotification: (notification: Omit<MediaNotification, 'id'>) => void;
  closeMediaNotification: () => void;

  // 💬 WHATSAPP - texto
  chatNotification: ChatNotification | null;
  showChatNotification: (notification: Omit<ChatNotification, 'id'>) => void;
  closeChatNotification: () => void;
}

// ======================================================
// 🔹 Criação do contexto
// ======================================================
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotification | null>(null);
  const [mediaNotification, setMediaNotification] = useState<MediaNotification | null>(null);
  const [chatNotification, setChatNotification] = useState<ChatNotification | null>(null);

  // 💰 PIX
  const showPaymentNotification = useCallback((notification: Omit<PaymentNotification, 'id'>) => {
    const id = `pix-${Date.now()}`;
    setPaymentNotification({ id, ...notification });
    setTimeout(() => setPaymentNotification(null), 10000);
  }, []);
  const closePaymentNotification = useCallback(() => setPaymentNotification(null), []);

  // 📎 WHATSAPP - Mídia
  const showMediaNotification = useCallback((notification: Omit<MediaNotification, 'id'>) => {
    const id = `media-${Date.now()}`;
    setMediaNotification({ id, ...notification });
    setTimeout(() => setMediaNotification(null), 10000);
  }, []);
  const closeMediaNotification = useCallback(() => setMediaNotification(null), []);

  // 💬 WHATSAPP - Texto
  const showChatNotification = useCallback((notification: Omit<ChatNotification, 'id'>) => {
    const id = `chat-${Date.now()}`;
    setChatNotification({ id, ...notification });
    setTimeout(() => setChatNotification(null), 10000);
  }, []);
  const closeChatNotification = useCallback(() => setChatNotification(null), []);

  return (
    <NotificationContext.Provider
      value={{
        // Pix
        paymentNotification,
        showPaymentNotification,
        closePaymentNotification,

        // WhatsApp mídia
        mediaNotification,
        showMediaNotification,
        closeMediaNotification,

        // WhatsApp texto
        chatNotification,
        showChatNotification,
        closeChatNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// ======================================================
// 🔹 Hook de acesso simplificado
// ======================================================
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
