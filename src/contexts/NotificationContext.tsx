// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface PaymentNotification {
  id: string;
  appointmentId: string;
  amount: number;
  date: Date;
  patientName?: string;
  doctorName?: string;
}

interface NotificationContextType {
  paymentNotification: PaymentNotification | null;
  showPaymentNotification: (notification: Omit<PaymentNotification, 'id'>) => void;
  closePaymentNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotification | null>(null);

  const showPaymentNotification = useCallback((notification: Omit<PaymentNotification, 'id'>) => {
    const id = `notif-${Date.now()}`;
    setPaymentNotification({ id, ...notification });
    
    // Fechar automaticamente após 10 segundos
    setTimeout(() => {
      setPaymentNotification((current) => current?.id === id ? null : current);
    }, 10000);
  }, []);

  const closePaymentNotification = useCallback(() => {
    setPaymentNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      paymentNotification, 
      showPaymentNotification, 
      closePaymentNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};