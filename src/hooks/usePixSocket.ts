// usePixSocket.ts
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
    }, [
        showPaymentNotification,
        showChatNotification,
        showMediaNotification,
        showPreAgendamentoNotification,
        onPaymentRefresh,
        onCalendarRefresh,
        onPreAgendamentoRefresh,
    ]);

    useEffect(() => {
        logger.info("🔌 [usePixSocket] Iniciando e registrando listeners");

        socketManager.initialize();

        // 💰 PIX
        const onPix = (pix: any) => {
            logger.info("💰 PIX recebido:", pix);
            notifRef.current.showPaymentNotification({
                appointmentId: pix?.appointmentId || "",
                amount: pix?.amount || 0,
                date: new Date(pix?.date || Date.now()),
                patientName: pix?.payer || "Desconhecido",
            });
            notifRef.current.onPaymentRefresh?.();
            // 🚫 REMOVIDO: Não atualiza calendário automaticamente para evitar reload sozinho
            // notifRef.current.onCalendarRefresh?.();
        };

        // 📅 PRÉ-AGENDAMENTOS
        const onPreAgendamentoNew = (data: any) => {
            logger.info("📅 [SOCKET] preagendamento:new", data);
            toast.info(`Novo pré-agendamento: ${data.patientName || "Paciente"}`);
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        const onPreAgendamentoImported = (data: any) => {
            logger.info("✅ [SOCKET] preagendamento:imported", data);
            new Audio("/notification.mp3").play().catch(() => { });
            notifRef.current.showPreAgendamentoNotification({
                id: `confirmed-${data.preAgendamentoId || Date.now()}`,
                patientName: data.patientName || "Paciente confirmado",
                specialty: "Agendamento Confirmado!",
                phone: "",
                preferredDate: new Date().toLocaleDateString(),
            });
            notifRef.current.onPreAgendamentoRefresh?.();
            notifRef.current.onPaymentRefresh?.(); // atualiza lista de pagamentos
        };

        const onPreAgendamentoCanceled = (data: any) => {
            logger.info("🚫 [SOCKET] preagendamento:canceled", data);
            if (data?.patientName) toast.warning(`${data.patientName} - CANCELADO`);
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        const onPreAgendamentoUpdated = (data: any) => {
            logger.info("✏️ [SOCKET] preagendamento:updated", data);
            if (data?.patientName) toast.info(`${data.patientName} - Dados atualizados`);
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        const onPreAgendamentoDeleted = (data: any) => {
            logger.info("🗑️ [SOCKET] preagendamento:deleted", data);
            if (data?.patientName) toast.error(`${data.patientName} - EXCLUÍDO`);
            notifRef.current.onPreAgendamentoRefresh?.();
        };

        // 📅 AGENDAMENTOS (criados/atualizados/deletados pela agenda externa ou CRM)
        // 🚫 REMOVIDOS: Eventos que causavam reload sozinho no calendário
        // Agora o usuário precisa atualizar manualmente (F5 ou trocar de aba)
        const onAppointmentCreated = (data: any) => {
            logger.info("📅 [SOCKET] appointmentCreated (ignorando refresh automático)", data);
            // notifRef.current.onCalendarRefresh?.();
            notifRef.current.onPaymentRefresh?.();
        };

        const onAppointmentUpdated = (data: any) => {
            logger.info("✏️ [SOCKET] appointmentUpdated (ignorando refresh automático)", data);
            // 🚫 REMOVIDO: invalidateCache('payments') — já é invalidado pelas operações de pagamento
            // e causava propagação desnecessária para dashboard, gerando recargas em cascata.
            // notifRef.current.onCalendarRefresh?.();
            notifRef.current.onPaymentRefresh?.();
        };

        const onAppointmentDeleted = (data: any) => {
            logger.info("🗑️ [SOCKET] appointmentDeleted (ignorando refresh automático)", data);
            // notifRef.current.onCalendarRefresh?.();
            notifRef.current.onPaymentRefresh?.();
        };

        // 💬 WHATSAPP — notificação para secretaria
        const onAnyMessage = (data: any) => {
            const type = (data?.type || "text").toLowerCase();
            const text = data?.content ?? data?.text ?? "";
            const from = data?.from || "";
            const to = data?.to || "";
            const caption = data?.caption || "";
            const mediaUrl = data?.mediaUrl || data?.url || "";
            const rawTs = data?.timestamp || Date.now();
            const timestamp = typeof rawTs === "number" ? rawTs : new Date(rawTs).getTime();
            const id = data?.id || data?.wamid || `${type}-${timestamp}`;
            const contactName = data?.contact?.name || data?.contactName || "";

            const dir = (data?.direction || "").toLowerCase();
            const fromN = normalizePhone(from);
            const toN = normalizePhone(to);
            // Mensagem inbound = recebida do lead
            const isInbound = dir ? dir === "inbound" : (!!fromN && !toN);

            if (!isInbound) return;

            // ✅ Não notifica se a secretaria já está com este chat aberto
            const activeChatPhone = socketManager.getActiveChatPhone();
            const contactPhone = fromN || toN;
            if (activeChatPhone && contactPhone && activeChatPhone === contactPhone) {
                console.log(`[usePixSocket] 🔕 Notificação suprimida — chat aberto para ${contactPhone}`);
                return;
            }

            if (!type || type === "text" || type === "template") {
                notifRef.current.showChatNotification({
                    id,
                    from,
                    text,
                    timestamp,
                    contactName,
                });
            } else {
                notifRef.current.showMediaNotification({
                    id,
                    from,
                    type,
                    caption,
                    url: mediaUrl,
                    timestamp,
                });
            }
        };

        // ✅ Registra todos os listeners com cleanup correto
        const unsubPix       = socketManager.on("pix-received", onPix);
        const unsubMsg       = socketManager.onMessageNew(onAnyMessage);
        const unsubPreNew    = socketManager.on("preagendamento:new", onPreAgendamentoNew);
        const unsubPreImp    = socketManager.on("preagendamento:imported", onPreAgendamentoImported);
        const unsubPreUpd    = socketManager.on("preagendamento:updated", onPreAgendamentoUpdated);
        const unsubPreCan    = socketManager.on("preagendamento:canceled", onPreAgendamentoCanceled);
        const unsubPreDel    = socketManager.on("preagendamento:deleted", onPreAgendamentoDeleted);
        const unsubAptCrt    = socketManager.on("appointmentCreated", onAppointmentCreated);
        const unsubAptUpd    = socketManager.on("appointmentUpdated", onAppointmentUpdated);
        const unsubAptDel    = socketManager.on("appointmentDeleted", onAppointmentDeleted);

        logger.info("✅ [usePixSocket] Todos os listeners registrados");

        // Debug global
        (window as any).sm = socketManager;
        (window as any).checkSocket = () => {
            console.log("Status:", socketManager.getStatus());
        };

        return () => {
            logger.info("🧹 [usePixSocket] Removendo listeners");
            unsubPix();
            unsubMsg();
            unsubPreNew();
            unsubPreImp();
            unsubPreUpd();
            unsubPreCan();
            unsubPreDel();
            unsubAptCrt();
            unsubAptUpd();
            unsubAptDel();
        };
    }, []);

    return null;
};
