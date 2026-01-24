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

        // Se existe mas desconectado, limpa
        if (this.socket && !this.socket.connected) {
            this.cleanup();
        }

        const envUrl =
            (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_BACKEND_URL) ||
            (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL);

        if (!envUrl) logger.warn("⚠️ [socket] URL não definida nas envs; usando fallback Render.");

        const s = io(envUrl || "https://fono-inova-crm-back.onrender.com", { ... });


        if (!url) {
            logger.warn("⚠️ [socket] VITE_API_URL não configurado — conectando no origin atual.");
        }

        const s = io(url || "", {
            transports: ["websocket"],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: Infinity,  // ✅ NUNCA para de reconectar
            reconnectionDelay: 1000,         // ✅ Começa com 1s
            reconnectionDelayMax: 10000,     // ✅ Máximo 10s entre tentativas
            timeout: 20000,                  // ✅ Timeout de conexão
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