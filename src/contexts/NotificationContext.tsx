// contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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

interface NotificationContextType {
  // PIX
  paymentNotification: PaymentNotification | null;
  showPaymentNotification: (notification: Omit<PaymentNotification, 'id'>) => void;
  closePaymentNotification: () => void;

  // WHATSAPP
  mediaNotification: MediaNotification | null;
  showMediaNotification: (notification: Omit<MediaNotification, 'id'>) => void;
  closeMediaNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotification | null>(null);
  const [mediaNotification, setMediaNotification] = useState<MediaNotification | null>(null);

  // PIX
  const showPaymentNotification = useCallback((notification: Omit<PaymentNotification, 'id'>) => {
    const id = `pix-${Date.now()}`;
    setPaymentNotification({ id, ...notification });
    setTimeout(() => setPaymentNotification(null), 10000);
  }, []);
  const closePaymentNotification = useCallback(() => setPaymentNotification(null), []);

  // WHATSAPP
  const showMediaNotification = useCallback((notification: Omit<MediaNotification, 'id'>) => {
    const id = `media-${Date.now()}`;
    setMediaNotification({ id, ...notification });
    setTimeout(() => setMediaNotification(null), 10000);
  }, []);
  const closeMediaNotification = useCallback(() => setMediaNotification(null), []);

  return (
    <NotificationContext.Provider
      value={{
        paymentNotification,
        showPaymentNotification,
        closePaymentNotification,
        mediaNotification,
        showMediaNotification,
        closeMediaNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
