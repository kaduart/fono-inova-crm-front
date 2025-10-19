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
  const { showPaymentNotification, showMediaNotification } = useNotification();
  const lastEventTime = useRef<number>(0);

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com",
      {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        withCredentials: true,
      }
    );

    socket.on("connect", () => {
      console.log("✅ Conectado ao Socket.IO:", socket.id);
    });

    // 💰 PIX RECEBIDO
    socket.on("pix-received", (pix) => {
      console.log("💰 PIX RECEBIDO:", pix);

      const now = Date.now();
      if (now - lastEventTime.current < 2000) return;
      lastEventTime.current = now;

      showPaymentNotification({
        appointmentId: pix.appointmentId || "",
        amount: pix.amount || 0,
        date: new Date(pix.date || Date.now()),
        patientName: pix.payer || "Desconhecido",
      });

      onPaymentRefresh?.();
      onCalendarRefresh?.();
    });

    // 💳 ATUALIZAÇÃO DE PAGAMENTO
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

    // 📎 MÍDIA RECEBIDA DO WHATSAPP
    socket.on("media-received", (media) => {
      console.log("📎 MÍDIA RECEBIDA:", media);

      const now = Date.now();
      if (now - lastEventTime.current < 2000) return;
      lastEventTime.current = now;

      showMediaNotification({
        from: media.from || "Contato desconhecido",
        type: media.type || "document",
        caption: media.caption || "",
        timestamp: media.timestamp || Date.now(),
      });
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Desconectado do Socket.IO");
    });

    return () => socket.disconnect();
  }, [showPaymentNotification, showMediaNotification, onPaymentRefresh, onCalendarRefresh]);
};
