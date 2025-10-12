// hooks/usePixSocket.ts
import { useEffect } from 'react';
import io from 'socket.io-client'; // ✅ <-- corrige o erro
import { useNotification } from '../contexts/NotificationContext';

export const usePixSocket = () => {
    const { showPaymentNotification } = useNotification();

    useEffect(() => {
        // ✅ Ouve evento manual vindo do console
        const handleManualPix = (e: any) => {
            const pix = e.detail;
            console.log("💰 PIX simulado recebido manualmente:", pix);

            showPaymentNotification({
                appointmentId: pix.id || 'manual',
                amount: pix.amount || 0,
                date: new Date(pix.date),
                patientName: pix.payer || 'Desconhecido',
            });
        };

        window.addEventListener("pix-received", handleManualPix);

        return () => {
            window.removeEventListener("pix-received", handleManualPix);
        };
    }, [showPaymentNotification]);

    useEffect(() => {
        const socket = io('https://fono-inova-crm-back.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,

        });

        socket.on('connect', () => {
            console.log('⚡ Frontend conectado ao Socket.IO', socket.id);
        });

        socket.on('pix-received', (pix: any) => {
            console.log('💰 PIX RECEBIDO no frontend:', pix);

            showPaymentNotification({
                appointmentId: pix.appointmentId || '',
                amount: pix.amount || 0,
                date: new Date(pix.date || Date.now()),
                patientName: pix.payer || 'Não informado',
            });
        });

        socket.on('disconnect', () => {
            console.log('⚡ Desconectado do Socket.IO');
        });

        return () => {
            socket.disconnect();
        };
    }, [showPaymentNotification]);
};
