// src/utils/socketManager.ts - VERSÃO CORRIGIDA
import { io, type Socket } from "socket.io-client";
import { logger } from "./logger";

type AnyHandler<T = any> = (payload: T) => void;
type Unsubscribe = () => void;

type MessageNewPayload = {
    id?: string;
    wamid?: string;
    type?: string;
    text?: string;
    content?: string;
    caption?: string;
    url?: string;
    mediaUrl?: string;
    from?: string;
    to?: string;
    timestamp?: number | string;
    direction?: "inbound" | "outbound" | string;
    status?: string;
};

type MessageDeletedPayload = {
    id: string;
    from?: string;
    to?: string;
};

class SocketManager {
    private socket: Socket | null = null;
    private activeChatPhone: string | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private lastPong: number = Date.now();

    private ensureSocket() {
        if (this.socket?.connected) return this.socket;

        if (this.socket && !this.socket.connected) {
            this.cleanup();
        }

        // ✅ DETECÇÃO ROBUSTA DA URL
        const getSocketUrl = () => {
            // 1. Tenta variáveis de ambiente Vite
            const viteUrl = (import.meta as any).env?.VITE_BACKEND_URL ||
                (import.meta as any).env?.VITE_API_URL;

            if (viteUrl) {
                logger.info("🔌 [socket] Usando VITE_URL:", viteUrl);
                return viteUrl;
            }

            // 2. Produção (Render) - mesma origem
            if (window.location.hostname.includes('onrender.com') ||
                window.location.hostname === 'app.clinicafonoinova.com.br') {
                const origin = window.location.origin;
                logger.info("🔌 [socket] Usando origin (PRD):", origin);
                return origin;
            }

            // 3. Fallback local
            logger.warn("⚠️ [socket] Fallback para localhost:5000");
            return "http://localhost:5000";
        };

        const url = getSocketUrl();
        logger.info("🔌 [socket] Conectando em:", url); // Log para debug

        const s = io(url, {
            transports: ["websocket", "polling"],
            // upgrade: false,  // ❌ REMOVA ISSO - impede upgrade para WebSocket!
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            withCredentials: true,
        });

        // ✅ Listeners de conexão
        s.on("connect", () => {
            logger.info("🔌 [socket] Conectado:", s.id);
            this.lastPong = Date.now();
            this.startHeartbeat();
        });

        s.on("connect_error", (e: any) => {
            logger.warn("⚠️ [socket] Erro de conexão:", e?.message || e);
        });

        s.on("disconnect", (reason: any) => {
            logger.warn("⚠️ [socket] Desconectado:", reason);
            this.stopHeartbeat();

            // ✅ Reconecta manualmente se foi desconectado pelo servidor
            if (reason === "io server disconnect" || reason === "transport close") {
                logger.info("🔄 [socket] Tentando reconectar...");
                setTimeout(() => s.connect(), 1000);
            }
        });

        // ✅ Resposta do heartbeat
        s.on("pong", () => {
            this.lastPong = Date.now();
        });

        this.socket = s;

        // ✅ Reconectar quando a aba voltar ao foco
        this.setupVisibilityHandler();

        return s;
    }

    // ✅ NOVO: Heartbeat para detectar conexões zumbis
    private startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (!this.socket?.connected) {
                logger.warn("💔 [socket] Heartbeat detectou desconexão");
                this.reconnect();
                return;
            }

            // Verifica se o último pong foi há mais de 30s
            const timeSincePong = Date.now() - this.lastPong;
            if (timeSincePong > 30000) {
                logger.warn("💔 [socket] Conexão zumbi detectada (sem pong há 30s)");
                this.reconnect();
                return;
            }

            // Envia ping
            this.socket.emit("ping");
        }, 10000); // A cada 10 segundos
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // ✅ NOVO: Reconectar quando aba volta ao foco
    private visibilityHandlerSetup = false;
    private setupVisibilityHandler() {
        if (this.visibilityHandlerSetup) return;
        this.visibilityHandlerSetup = true;

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                logger.info("👁️ [socket] Aba em foco, verificando conexão...");

                if (!this.isConnected()) {
                    logger.info("🔄 [socket] Reconectando após retorno do foco...");
                    this.reconnect();
                } else {
                    // Força um ping pra garantir que tá vivo
                    this.socket?.emit("ping");
                }
            }
        });

        // Também reconecta quando volta online
        window.addEventListener("online", () => {
            logger.info("🌐 [socket] Internet restaurada, reconectando...");
            this.reconnect();
        });
    }

    private cleanup() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Adicione este método na classe/socketManager:
    public onPreAgendamento(callback: (data: any) => void) {
        const s = this.ensureSocket();   // 🔥 ESSENCIAL
        s.on("preagendamento:new", callback);
        return () => s.off("preagendamento:new", callback);
    }

    public onPreAgendamentoUpdate(callback: (data: any) => void) {
        this.socket?.on("preagendamento:imported", callback);
        this.socket?.on("preagendamento:updated", callback);
        return () => {
            this.socket?.off("preagendamento:imported", callback);
            this.socket?.off("preagendamento:updated", callback);
        };
    }

    // ✅ ADICIONAR ESTES 3 QUE FALTAM:
    public onPreAgendamentoCanceled(callback: (data: any) => void) {
        const s = this.ensureSocket();
        s.on("preagendamento:canceled", callback);
        return () => s.off("preagendamento:canceled", callback);
    }

    public onPreAgendamentoUpdated(callback: (data: any) => void) {
        const s = this.ensureSocket();
        s.on("preagendamento:updated", callback);
        return () => s.off("preagendamento:updated", callback);
    }

    public onPreAgendamentoDeleted(callback: (data: any) => void) {
        const s = this.ensureSocket();
        s.on("preagendamento:deleted", callback);
        return () => s.off("preagendamento:deleted", callback);
    }

    // ✅ NOVO: Verifica se está conectado
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    // ✅ NOVO: Força reconexão
    reconnect() {
        logger.info("🔄 [socket] Forçando reconexão...");
        this.cleanup();
        this.ensureSocket();
    }

    initialize() {
        this.ensureSocket();
    }

    disconnect() {
        this.cleanup();
    }

    setActiveChatPhone(phoneNormalizedE164: string | null) {
        this.activeChatPhone = phoneNormalizedE164;
    }

    getActiveChatPhone() {
        return this.activeChatPhone;
    }

    onMessageNew(handler: AnyHandler<MessageNewPayload>): Unsubscribe {
        const s = this.ensureSocket();
        const h = (payload: MessageNewPayload) => handler(payload);

        // unified + retrocompat
        s.on("message:new", h);
        s.on("whatsapp:new_message", h as any);
        s.on("whatsapp:new_media", h as any);

        return () => {
            s.off("message:new", h);
            s.off("whatsapp:new_message", h as any);
            s.off("whatsapp:new_media", h as any);
        };
    }

    onMessageDeleted(handler: AnyHandler<MessageDeletedPayload>): Unsubscribe {
        const s = this.ensureSocket();
        const h = (payload: MessageDeletedPayload) => handler(payload);
        s.on("message:deleted", h);
        return () => s.off("message:deleted", h);
    }

    on(event: string, handler: AnyHandler): Unsubscribe {
        const s = this.ensureSocket();
        s.on(event, handler);
        return () => s.off(event, handler);
    }

    // ✅ NOVO: Emitir eventos
    emit(event: string, data?: any) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        }
    }

    // ✅ NOVO: Status para debug
    getStatus() {
        return {
            connected: this.isConnected(),
            socketId: this.socket?.id || null,
            activeChatPhone: this.activeChatPhone,
            lastPong: new Date(this.lastPong).toISOString(),
        };
    }
}

export const socketManager = new SocketManager();
export type { MessageDeletedPayload, MessageNewPayload, Unsubscribe };
