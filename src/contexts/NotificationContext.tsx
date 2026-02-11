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
  url?: string;
  timestamp: number;
}

interface ChatNotification {
  id: string;
  from: string;
  text: string;
  timestamp: number;
  contactId?: string;
  contactName?: string;
  leadId?: string;
}

// ✅ ADICIONAR: Interface do Pré-Agendamento
interface PreAgendamentoNotification {
  id: string;
  patientName: string;
  specialty: string;
  phone: string;
  preferredDate: string;
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

  // ✅ ADICIONAR: Pré-Agendamento
  preAgendamentoNotification: PreAgendamentoNotification | null;
  showPreAgendamentoNotification: (notification: PreAgendamentoNotification) => void;
  closePreAgendamentoNotification: () => void;
}

// ======================================================
// 🔹 Criação do contexto
// ======================================================
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotification | null>(null);
  const [mediaNotification, setMediaNotification] = useState<MediaNotification | null>(null);
  const [chatNotification, setChatNotification] = useState<ChatNotification | null>(null);
  const [preAgendamentoNotification, setPreAgendamentoNotification] = useState<PreAgendamentoNotification | null>(null);

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

  // 📋 PRÉ-AGENDAMENTO (corrigido com useCallback)
  const showPreAgendamentoNotification = useCallback((notification: PreAgendamentoNotification) => {
    setPreAgendamentoNotification(notification);
    // Auto-close após 15 segundos se não clicar
    setTimeout(() => {
      setPreAgendamentoNotification((prev) => 
        prev?.id === notification.id ? null : prev
      );
    }, 15000);
  }, []);

  const closePreAgendamentoNotification = useCallback(() => {
    setPreAgendamentoNotification(null);
  }, []);

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

        // ✅ ADICIONAR AQUI: Pré-Agendamento
        preAgendamentoNotification,
        showPreAgendamentoNotification,
        closePreAgendamentoNotification,
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