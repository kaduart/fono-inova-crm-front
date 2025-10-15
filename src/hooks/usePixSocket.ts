import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useNotification } from "../contexts/NotificationContext";

interface PixSocketOptions {
  onPaymentRefresh?: () => void;
  onCalendarRefresh?: () => void;
}

export const usePixSocket = ({
  onPaymentRefresh,
  onCalendarRefresh,
}: PixSocketOptions = {}) => {
  const { showPaymentNotification } = useNotification();
  const lastEventTime = useRef<number>(0);

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com",
      {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    );

    socket.on("connect", () => {
      console.log("✅ Conectado ao Socket.IO:", socket.id);
    });

    // 💰 Evento de recebimento de PIX
    socket.on("pix-received", (pix) => {
      console.log("💰 PIX RECEBIDO no frontend:", pix);

      // Evita eventos duplicados em poucos segundos (render triplo, reconexões, etc.)
      const now = Date.now();
      if (now - lastEventTime.current < 2000) return;
      lastEventTime.current = now;

      // Mostra notificação visual elegante
      showPaymentNotification({
        appointmentId: pix.appointmentId || "",
        amount: pix.amount || 0,
        date: new Date(pix.date || Date.now()),
        patientName: pix.payer || "Desconhecido",
      });

      // 🔄 Atualiza apenas as partes necessárias (leve)
      onPaymentRefresh?.();
      onCalendarRefresh?.();
    });

    // 💳 Evento genérico de atualização de pagamento
    socket.on("paymentUpdate", (data) => {
      console.log("📢 Atualização de pagamento:", data);

      const now = Date.now();
      if (now - lastEventTime.current < 2000) return;
      lastEventTime.current = now;

      showPaymentNotification({
        appointmentId: data.appointmentId || "",
        amount: data.amount || 0,
        date: new Date(data.date || Date.now()),
        patientName: data.patientName || "Atualização de pagamento",
      });

      onPaymentRefresh?.();
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Desconectado do Socket.IO");
    });

    return () => socket.disconnect();
  }, [showPaymentNotification, onPaymentRefresh, onCalendarRefresh]);
};
