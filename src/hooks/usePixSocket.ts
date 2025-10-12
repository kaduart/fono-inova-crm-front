import { useEffect } from "react";
import { io } from "socket.io-client";
import { useNotification } from "../contexts/NotificationContext";

export const usePixSocket = () => {
  const { showPaymentNotification } = useNotification();

  useEffect(() => {
    const socket = io("https://fono-inova-crm-back.onrender.com", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("✅ Conectado ao Socket.IO:", socket.id);
    });

    socket.on("pix-received", (pix) => {
      console.log("💰 PIX RECEBIDO no frontend:", pix);
      showPaymentNotification({
        appointmentId: pix.id || "",
        amount: pix.amount || 0,
        date: new Date(pix.date || Date.now()),
        patientName: pix.payer || "Desconhecido",
      });
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Desconectado do Socket.IO");
    });

    return () => socket.disconnect();
  }, [showPaymentNotification]);
};
