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
    showChatNotification, // 👈 novo
  } = useNotification();

  useEffect(() => {
    console.log("⚙️ usePixSocket iniciado");
  }, []);

  const lastEventTime = useRef<number>(0);

  useEffect(() => {
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

    // 🔹 torna global (para os popups acessarem diretamente, se quiser)
    (window as any).globalSocket = socket;

    // ======================================================
    // 💰 PIX RECEBIDO
    // ======================================================
    socket.on("pix-received", (pix) => {

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

    // ======================================================
    // 💳 ATUALIZAÇÃO DE PAGAMENTO
    // ======================================================
    socket.on("paymentUpdate", (data) => {
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

    // ======================================================
    // 📎 MÍDIA RECEBIDA DO WHATSAPP
    // ======================================================
    socket.on("whatsapp:new_media", (media) => {
      console.log("📎 MÍDIA RECEBIDA:", media);

      const now = Date.now();
      if (now - lastEventTime.current < 2000) return;
      lastEventTime.current = now;

      showMediaNotification({
        from: media.from || "Contato desconhecido",
        type: media.type || "document",
        caption: media.caption || "",
        timestamp: media.timestamp || Date.now(),
        url: media.url || "",
      });
    });

    // ======================================================
    // 💬 MENSAGEM DE TEXTO RECEBIDA DO WHATSAPP
    // ======================================================
    socket.on("whatsapp:new_message", (msg) => {
      console.log("💬 NOVA MENSAGEM WHATSAPP:", msg);

      const now = Date.now();
      if (now - lastEventTime.current < 2000) return;
      lastEventTime.current = now;

      showChatNotification({
        from: msg.from || "Contato desconhecido",
        text: msg.text || "",
        timestamp: msg.timestamp || Date.now(),
      });
    });

    // ======================================================
    // ⚠️ DESCONECTADO
    // ======================================================
    socket.on("disconnect", () => {
      console.warn("⚠️ Desconectado do Socket.IO");
    });

    socket.onAny((event, data) => {
      console.log("📡 [SOCKET EVENT RECEBIDO]", event, data);
    });


    return () => socket.disconnect();
  }, [
    showPaymentNotification,
    showMediaNotification,
    showChatNotification,
    onPaymentRefresh,
    onCalendarRefresh,
  ]);
};
