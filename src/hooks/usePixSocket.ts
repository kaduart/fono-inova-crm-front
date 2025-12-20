// src/hooks/usePixSocket.ts
import { useEffect, useRef } from "react";
import { useNotification } from "../contexts/NotificationContext";
import { logger } from "../utils/logger";
import { normalizeE164BR } from "../utils/phone";
import { socketManager } from "../utils/socketManager";

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
        showChatNotification,
        showMediaNotification,
    } = useNotification();

    const lastEventTime = useRef<number>(0);
    const notifRef = useRef({
        showPaymentNotification,
        showChatNotification,
        showMediaNotification,
        onPaymentRefresh,
        onCalendarRefresh,
    });

    useEffect(() => {
        notifRef.current = {
            showPaymentNotification,
            showChatNotification,
            showMediaNotification,
            onPaymentRefresh,
            onCalendarRefresh,
        };
    }, [showPaymentNotification, showChatNotification, showMediaNotification, onPaymentRefresh, onCalendarRefresh]);

    useEffect(() => {
        socketManager.initialize();

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
            const fromN = normalizeE164BR(from);
            const toN = normalizeE164BR(to);

            // fallback seguro: inbound se veio 'from' e não veio 'to'
            const isInbound = dir ? dir === "inbound" : (!!fromN && !toN);

            // 🚫 Não notificar mensagens outbound
            if (!isInbound) return;

            // 🚪 Se o chat deste contato estiver aberto, não notificar
            const active = socketManager.getActiveChatPhone();
            const contactPhone = fromN || toN;
            const isChatOpen = active && contactPhone && active === contactPhone;

            if (isChatOpen) return;

            if (!type || type === "text" || type === "template") {
                notifRef.current.showChatNotification({ id, from, text, timestamp });
            } else {
                notifRef.current.showMediaNotification({ id, from, type, caption, url: mediaUrl, timestamp });
            }
        };

        // ====== bind listeners ======
        const offConnect = socketManager.on("connect", () => logger.info("🔌 socket connected"));
        const offConnectErr = socketManager.on("connect_error", (e: any) => logger.warn("socket connect_error:", e?.message || e));
        const offDisconnect = socketManager.on("disconnect", (r: any) => logger.warn("socket disconnect:", r));

        const offPix = socketManager.on("pix-received", onPix);
        const offPayment = socketManager.on("paymentUpdate", onPaymentUpdate);

        const offMsg = socketManager.onMessageNew(onAnyMessage);

        return () => {
            offConnect(); offConnectErr(); offDisconnect();
            offPix(); offPayment();
            offMsg();
        };
    }, []);
};
