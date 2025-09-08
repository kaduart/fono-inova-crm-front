// hooks/usePixSocket.ts
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotification } from '../contexts/NotificationContext';

let socket: Socket | null = null;

export const usePixSocket = () => {
    const { showPaymentNotification } = useNotification();

    useEffect(() => {
        if (!socket) {
            socket = io('http://localhost:5000', {
                transports: ['websocket'],
            });
        }

        socket.on('connect', () => {
            console.log('⚡ Frontend conectado ao Socket.IO', socket?.id);
        });

        socket.on('pix-received', (pix: any) => {
            console.log('💰 PIX RECEBIDO no frontend:', pix);

            showPaymentNotification({
                appointmentId: pix.appointmentId,
                amount: pix.amount,
                date: new Date(pix.date),
                patientName: pix.payer,
            });
        });

        socket.on('disconnect', () => {
            console.log('⚡ Desconectado do Socket.IO');
        });

        return () => {
            socket?.off('pix-received');
            socket?.off('connect');
            socket?.off('disconnect');
        };
    }, [showPaymentNotification]);
};
