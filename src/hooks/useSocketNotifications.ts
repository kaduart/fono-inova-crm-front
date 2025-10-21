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
  const {
    showPaymentNotification,
    showMediaNotification,
    showChatNotification,
  } = useNotification();

  const lastEventTime = useRef<number>(0);

  useEffect(() => {
    console.log("⚙️ usePixSocket iniciado");

    const socket = io(
      import.meta.env.VITE_BACKEND_URL ||
      "https://fono-inova-crm-back.onrender.com",
      {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        withCredentials: true,
      }
    );

    (window as any).globalSocket = socket;

    const throttled = () => {
      const now = Date.now();
      if (now - lastEventTime.current < 1500) return true;
      lastEventTime.current = now;
      return false;
    };

    // ======================================================
    // 💰 PIX RECEBIDO
    // ======================================================
    socket.on("pix-received", (pix) => {
      if (throttled()) return;

      showPaymentNotification({
        appointmentId: pix.appointmentId || "",
        amount: pix.amount || 0,
        date: new Date(pix.date || Date.now()),
        patientName: pix.payer || "Desconhecido",
      });

      onPaymentRefresh?.();
      onCalendarRefresh?.();
    });

    // ======================================================
    // 💳 ATUALIZAÇÃO DE PAGAMENTO
    // ======================================================
    socket.on("paymentUpdate", (data) => {
      if (throttled()) return;

      showPaymentNotification({
        appointmentId: data.appointmentId || "",
        amount: data.amount || 0,
        date: new Date(data.date || Date.now()),
        patientName: data.patientName || "Atualização de pagamento",
      });

      onPaymentRefresh?.();
    });

    // ======================================================
    // 💬 MENSAGEM DE TEXTO RECEBIDA
    // ======================================================
    socket.on("whatsapp:new_message", (msg) => {
      if (throttled()) return;
      console.log("💬 [Socket] Nova mensagem WhatsApp:", msg);

      showChatNotification({
        id: msg.id || `msg-${Date.now()}`,
        from: msg.from || "Contato desconhecido",
        text: msg.text || msg.content || "",
        timestamp: msg.timestamp || Date.now(),
      });
    });

    // ======================================================
    // 📎 MÍDIA RECEBIDA (áudio, imagem, vídeo, doc)
    // ======================================================
    socket.on("whatsapp:new_media", (media) => {
      if (throttled()) return;
      console.log("📎 [Socket] Nova mídia WhatsApp:", media);

      showMediaNotification({
        id: media.id || `media-${Date.now()}`,
        from: media.from || "Contato desconhecido",
        type: media.type || "document",
        caption: media.caption || "",
        url: media.url || "",
        timestamp: media.timestamp || Date.now(),
      });
    });

    // ======================================================
    // ⚠️ DESCONECTADO
    // ======================================================
    socket.on("disconnect", () => {
      console.warn("⚠️ Desconectado do Socket.IO");
    });

    socket.onAny((event, data) => {
      if (event.startsWith("whatsapp")) {
        console.log("📡 [Socket Event]", event, data);
      }
    });

    return () => {
      console.log("🧹 Encerrando conexão socket...");
      socket.disconnect();
    };
  }, [
    showPaymentNotification,
    showMediaNotification,
    showChatNotification,
    onPaymentRefresh,
    onCalendarRefresh,
  ]);
};
