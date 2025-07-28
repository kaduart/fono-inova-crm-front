/* // src/hooks/usePaymentNotifications.ts
import { useEffect } from 'react';
import io from 'socket.io-client';
import { useNotification } from '../contexts/NotificationContext';

const usePaymentNotifications = () => {
    const { showPaymentNotification } = useNotification();

    useEffect(() => {
        // URL do socket usando variável de ambiente do Vite (ou CRA)
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9001';

        const socket = io(socketUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        });

        socket.on('payment-confirmed', (data: {
            appointmentId: string;
            amount: number;
            date: Date;
            patientName: string;
            doctorName: string;
        }) => {
            showPaymentNotification({
                id: `payment-${Date.now()}`,
                appointmentId: data.appointmentId,
                amount: data.amount,
                date: new Date(data.date),
                patientName: data.patientName,
                doctorName: data.doctorName
            });
        });

        socket.on('connect_error', (err) => {
            console.error('Erro de conexão Socket.io:', err.message);
        });

        return () => {
            socket.disconnect();
        };
    }, [showPaymentNotification]);
};

export default usePaymentNotifications; */