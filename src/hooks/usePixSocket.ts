// usePixSocket.ts - VERSÃO CORRIGIDA E FUNCIONAL
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useNotification } from "../contexts/NotificationContext";
import { logger } from "../utils/logger";
import { socketManager } from "../utils/socketManager";

interface PixSocketOptions {
    onPaymentRefresh?: () => void;
    onCalendarRefresh?: () => void;
    onPreAgendamentoRefresh?: () => void;
}

const normalizePhone = (v: string) => (v || "").replace(/\D/g, "").replace(/^55/, "");

export const usePixSocket = ({
    onPaymentRefresh,
    onCalendarRefresh,
    onPreAgendamentoRefresh,
}: PixSocketOptions = {}) => {
    const {
        showPaymentNotification,
        showChatNotification,
        showMediaNotification,
        showPreAgendamentoNotification
    } = useNotification();

    const lastEventTime = useRef<number>(0);
    const throttled = () => {
        const now = Date.now();
        if (now - lastEventTime.current < 1500) return true;
        lastEventTime.current = now;
        return false;
    };

    const notifRef = useRef({
        showPaymentNotification,
        showChatNotification,
        showMediaNotification,
        showPreAgendamentoNotification,
        onPaymentRefresh,
        onCalendarRefresh,
        onPreAgendamentoRefresh,
    });

    // Atualiza a ref quando as props mudam
    useEffect(() => {
        notifRef.current = {
            showPaymentNotification,
            showChatNotification,
            showMediaNotification,
            showPreAgendamentoNotification,
            onPaymentRefresh,
            onCalendarRefresh,
            onPreAgendamentoRefresh,
        };
    }, [showPaymentNotification, showChatNotification, showMediaNotification, showPreAgendamentoNotification, onPaymentRefresh, onCalendarRefresh, onPreAgendamentoRefresh]);

    // ✅ UM ÚNICO useEffect COM TUDO
    useEffect(() => {
        console.log("🔌 [usePixSocket] INICIANDO");

        // 1. Define TODAS as funções de handler PRIMEIRO (antes de registrar)

        // 💰 PIX
        const onPix = (pix: any) => {
            if (throttled()) return;
            logger.info("💰 PIX recebido:", pix);
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

        const onPreAgendamentoNew = (data: any) => {
            console.log("📅 [SOCKET] preagendamento:new", data);
            // Só toast, sem popup, sem som
            toast.info(`Novo pré-agendamento: ${data.patientName || "Paciente"}`);
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        const onPreAgendamentoImported = (data: any) => {
            console.log("✅ [SOCKET] preagendamento:imported", data);
            // 🎉 POPUP + SOM quando confirma!
            new Audio("/notification.mp3").play().catch(() => { });
            notifRef.current.showPreAgendamentoNotification({
                id: `confirmed-${data.preAgendamentoId || Date.now()}`,
                patientName: data.patientName || "Paciente confirmado",
                specialty: "Agendamento Confirmado!",
                phone: "",
                preferredDate: new Date().toLocaleDateString(),
            });
            notifRef.current.onPreAgendamentoRefresh?.();
        };


        const onPreAgendamentoCanceled = (data: any) => {
            console.log("🚫 [SOCKET] preagendamento:canceled", data);
            if (data?.patientName) {
                toast.warning(`${data.patientName} - CANCELADO`);
            }
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        const onPreAgendamentoUpdated = (data: any) => {
            console.log("✏️ [SOCKET] preagendamento:updated", data);
            if (data?.patientName) {
                toast.info(`${data.patientName} - Dados atualizados`);
            }
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        const onPreAgendamentoDeleted = (data: any) => {
            console.log("🗑️ [SOCKET] preagendamento:deleted", data);
            if (data?.patientName) {
                toast.error(`${data.patientName} - EXCLUÍDO`);
            }
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        // 💬 WHATSAPP
        const onAnyMessage = (data: any) => {
            if (throttled()) return;
            const type = data?.type || "text";
            const text = data?.content ?? data?.text ?? "";
            const from = data?.from || "";
            const to = data?.to || "";
            const caption = data?.caption || "";
            const mediaUrl = data?.mediaUrl || data?.url || "";
            const rawTs = data?.timestamp || Date.now();
            const timestamp = typeof rawTs === "number" ? rawTs : new Date(rawTs).getTime();
            const id = data?.id || data?.wamid || `${type}-${timestamp}`;

            const dir = (data?.direction || "").toLowerCase();
            const fromN = normalizePhone(from);
            const toN = normalizePhone(to);
            const isInbound = dir ? dir === "inbound" : (!!fromN && !toN);

            if (!isInbound) return;

            const active = (window as any).activeChatPhone || socketManager.getActiveChatPhone() || null;
            const contactPhone = fromN || toN;
            const isChatOpen = active && contactPhone && active === contactPhone;

            if (isChatOpen) return;

            if (!type || type === "text" || type === "template") {
                notifRef.current.showChatNotification({ id, from, text, timestamp });
            } else {
                notifRef.current.showMediaNotification({ id, from, type, caption, url: mediaUrl, timestamp });
            }
        };

        // 2. Inicializa socket
        socketManager.initialize();
        console.log("🔌 [usePixSocket] Socket inicializado");

        // 3. Registra listeners DEPOIS das funções existirem
        const registraTudo = () => {
            console.log("🔄 [usePixSocket] Registrando listeners...");
            console.log("🔌 Socket conectado?", socketManager.isConnected());
            console.log("🔌 Socket ID:", socketManager.getStatus().socketId);

            // PIX
            console.log("💰 Registrando pix-received...");
            socketManager.on("pix-received", onPix);

            // WhatsApp
            console.log("💬 Registrando onMessageNew...");
            socketManager.onMessageNew(onAnyMessage);

            // Pré-agendamentos - LOG ESPECÍFICO AQUI
            console.log("📅 Registrando preagendamento:new...");
            try {
                socketManager.on("preagendamento:new", onPreAgendamentoNew);
                console.log("✅ preagendamento:new registrado com sucesso");
            } catch (e) {
                console.error("❌ Erro ao registrar preagendamento:new:", e);
            }

            socketManager.on("preagendamento:imported", onPreAgendamentoImported);
            socketManager.on("preagendamento:updated", onPreAgendamentoUpdated);
            socketManager.on("preagendamento:canceled", onPreAgendamentoCanceled);
            socketManager.on("preagendamento:deleted", onPreAgendamentoDeleted);

            console.log("✅ [usePixSocket] Todos os listeners registrados");
        };

        registraTudo();

        // Keep-alive
        const pingInterval = setInterval(() => {
            if (socketManager.isConnected?.()) {
                socketManager.emit?.("ping", Date.now());
            }
        }, 20000);

        // Debug global
        (window as any).sm = socketManager;
        (window as any).checkSocket = () => {
            console.log("Conectado:", socketManager.isConnected?.());
            console.log("Status:", socketManager.getStatus?.());
        };

        // Cleanup
        return () => {
            clearInterval(pingInterval);
            console.log("🧹 [usePixSocket] Limpando...");
        };
    }, []); // ✅ Array vazio - roda só uma vez

    return null;
};