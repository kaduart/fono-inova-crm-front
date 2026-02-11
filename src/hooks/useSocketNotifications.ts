// src/hooks/usePixSocket.ts
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

  // refs para manter as callbacks SEM re-registrar listeners
  const notifRef = useRef({
    showPaymentNotification,
    showMediaNotification,
    showChatNotification,
    onPaymentRefresh,
    onCalendarRefresh,
  });

  useEffect(() => {
    notifRef.current = {
      showPaymentNotification,
      showMediaNotification,
      showChatNotification,
      onPaymentRefresh,
      onCalendarRefresh,
    };
  }, [
    showPaymentNotification,
    showMediaNotification,
    showChatNotification,
    onPaymentRefresh,
    onCalendarRefresh,
  ]);

  const lastEventTime = useRef<number>(0);

  useEffect(() => {
    const normalize = (v: string) => (v || "").replace(/\D/g, "").replace(/^55/, "");

    const socket = io(
      import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com",
      {
        path: "/socket.io",
        transports: ["websocket"],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        withCredentials: true,
      }
    );

    // salva global para outras partes do app (ChatWindow usa)
    (window as any).globalSocket = socket;

    const throttled = () => {
      const now = Date.now();
      if (now - lastEventTime.current < 1500) return true; // 1.5s
      lastEventTime.current = now;
      return false;
    };

    // =========================
    // 💰 PIX RECEBIDO
    // =========================
    const onPix = (pix: any) => {
      if (throttled()) return;
      notifRef.current.showPaymentNotification({
        appointmentId: pix?.appointmentId || "",
        amount: pix?.amount || 0,
        date: new Date(pix?.date || Date.now()),
        patientName: pix?.payer || "Desconhecido",
      });
      notifRef.current.onPaymentRefresh?.();
      notifRef.current.onCalendarRefresh?.();
    };

    // 💳 ATUALIZAÇÃO DE PAGAMENTO
    const onPaymentUpdate = (data: any) => {
      if (throttled()) return;
      notifRef.current.showPaymentNotification({
        appointmentId: data?.appointmentId || "",
        amount: data?.amount || 0,
        date: new Date(data?.date || Date.now()),
        patientName: data?.patientName || "Atualização de pagamento",
      });
      notifRef.current.onPaymentRefresh?.();
    };

    // =========================
    // 💬 / 📎 MENSAGENS (handler único)
    // =========================
    const onAnyMessage = (data: any) => {
      if (throttled()) return;

      // dados brutos
      const type = data?.type || "text";
      const text = data?.content ?? data?.text ?? "";
      const from = data?.from || "";
      const to = data?.to || "";
      const caption = data?.caption || "";
      const mediaUrl = data?.mediaUrl || data?.url || "";
      const rawTs = data?.timestamp || Date.now();
      const timestamp = typeof rawTs === "number" ? rawTs : new Date(rawTs).getTime();
      const id = data?.id || data?.wamid || `${type}-${timestamp}`;

      // direção (se o back mandar, usamos; senão inferimos)
      const dir = (data?.direction || "").toLowerCase(); // "inbound" | "outbound" | ""
      const fromN = normalize(from);
      const toN = normalize(to);

      // fallback seguro: se veio 'from' do cliente e não tem 'to', tratamos como inbound
      const isInbound = dir ? dir === "inbound" : (!!fromN && !toN);

      // 🚫 Não notificar mensagens que a clínica enviou (outbound)
      if (!isInbound) return;

      // 🚪 Se o chat deste contato estiver aberto, não notificar
      const active = (window as any).activeChatPhone || null;
      const contactPhone = fromN || toN;
      const isChatOpen = active && contactPhone && active === contactPhone;

      // ✅ Dispara o tipo certo APENAS se o chat não estiver aberto
      if (!isChatOpen) {
        if (!type || type === "text" || type === "template") {
          notifRef.current.showChatNotification({ id, from, text, timestamp });
        } else {
          notifRef.current.showMediaNotification({ id, from, type, caption, url: mediaUrl, timestamp });
        }
      }
    };

    // logs úteis
    const onConnect = () => console.log("🔌 socket connected:", socket.id);
    const onConnectError = (e: any) =>
      console.warn("socket connect_error:", e?.message || e);
    const onDisconnect = (r: any) =>
      console.warn("socket disconnect:", r);
    const onAny = (event: string, payload: any) => {
      if (
        event.startsWith("whatsapp") ||
        event === "message:new" ||
        event.includes("pix")
      ) {
        console.log("📡 [Socket Event]", event, payload);
      }
    };

    // ====== bind listeners ======
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

    socket.on("pix-received", onPix);
    socket.on("paymentUpdate", onPaymentUpdate);

    // novo/unificado
    socket.on("message:new", onAnyMessage);
    // retrocompat
    socket.on("whatsapp:new_message", onAnyMessage);
    socket.on("whatsapp:new_media", onAnyMessage);

    socket.onAny(onAny);

    // Adicione no final dos listeners, antes do cleanup:

    // =========================
    // 📅 PRÉ-AGENDAMENTOS
    // =========================
    const onPreAgendamentoNew = (data: any) => {
      console.log("📅 Novo pré-agendamento:", data);
      // Toca som de notificação (opcional)
      new Audio("/notification.mp3").play().catch(() => { });

      // Mostra notificação visual
      notifRef.current.showChatNotification({
        id: `pre-${data.id}`,
        from: "Sistema",
        text: `Novo pré-agendamento: ${data.patientName} - ${data.specialty}`,
        timestamp: Date.now(),
      });

      // Dispara callback para atualizar lista
      notifRef.current.onPreAgendamentoRefresh?.();
    };

    const onPreAgendamentoImported = (data: any) => {
      console.log("✅ Pré-agendamento importado:", data);
      notifRef.current.onPreAgendamentoRefresh?.();
    };

    // Registra os listeners
    socket.on("preagendamento:new", onPreAgendamentoNew);
    socket.on("preagendamento:imported", onPreAgendamentoImported);
    socket.on("preagendamento:updated", onPreAgendamentoImported);

    // cleanup: remove somente listeners (NÃO desconecta o singleton)
    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);

      socket.off("pix-received", onPix);
      socket.off("paymentUpdate", onPaymentUpdate);

      socket.off("message:new", onAnyMessage);
      socket.off("whatsapp:new_message", onAnyMessage);
      socket.off("whatsapp:new_media", onAnyMessage);

      socket.off("preagendamento:new", onPreAgendamentoNew);
      socket.off("preagendamento:imported", onPreAgendamentoImported);
      socket.off("preagendamento:updated", onPreAgendamentoImported);

      socket.offAny(onAny);
      // ❌ não chame socket.disconnect() aqui
    };
    // deps vazias: registra uma vez
  }, []);
};
