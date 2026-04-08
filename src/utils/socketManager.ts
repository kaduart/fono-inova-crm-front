// src/utils/socketManager.ts
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
    contactId?: string;
    contact?: { _id?: string; phone?: string; name?: string };
    leadId?: string;
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
    // Evita limpar socket que está em processo de conexão (ainda não connected)
    private isConnecting = false;

    // ✅ Registro persistente de handlers — sobrevive ao reconnect
    private persistentHandlers: Map<string, Set<AnyHandler>> = new Map();

    private getSocketUrl(): string {
        const viteUrl = (import.meta as any).env?.VITE_BACKEND_URL ||
            (import.meta as any).env?.VITE_API_URL;
        if (viteUrl) {
            logger.info("🔌 [socket] Usando VITE_URL:", viteUrl);
            return viteUrl;
        }
        if (window.location.hostname === 'app.clinicafonoinova.com.br') {
            const renderUrl = 'https://fono-inova-crm-back.onrender.com';
            logger.info("🔌 [socket] Vercel → Render:", renderUrl);
            return renderUrl;
        }
        if (window.location.hostname.includes('onrender.com')) {
            logger.info("🔌 [socket] Render origin:", window.location.origin);
            return window.location.origin;
        }
        logger.warn("⚠️ [socket] Fallback para localhost:5000");
        return "http://localhost:5000";
    }

    // ✅ Reaplica todos os handlers persistentes no socket (idempotente: off→on)
    private applyPersistentHandlers(s: Socket) {
        let total = 0;
        this.persistentHandlers.forEach((handlers, event) => {
            handlers.forEach(h => {
                s.off(event, h); // remove primeiro para evitar duplicata
                s.on(event, h);
                total++;
            });
        });
        if (total > 0) {
            logger.info(`🔄 [socket] ${total} handlers replicados após reconnect`);
        }
    }

    private ensureSocket(): Socket {
        if (this.socket?.connected) return this.socket;

        // Socket existe mas não conectado: se ainda está tentando conectar, retorna sem limpar
        if (this.socket && !this.socket.connected) {
            if (this.isConnecting) return this.socket;
            this.cleanupSocket();
        }

        const url = this.getSocketUrl();
        logger.info("🔌 [socket] Conectando em:", url);

        const s = io(url, {
            // 🆕 IMPORTANTE: Polling primeiro (mais confiável no Render), depois upgrade para WebSocket
            transports: ["polling", "websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            withCredentials: true,
            // 🆕 Configurações adicionais para funcionar no Render
            path: "/socket.io/",
            autoConnect: true,
            forceNew: false,
        });

        s.on("connect", () => {
            this.isConnecting = false;
            logger.info("🔌 [socket] Conectado:", s.id);
            this.lastPong = Date.now();
            this.startHeartbeat();
            (window as any).globalSocket = s;
            (window as any).socketManager = this;
        });

        s.on("connect_error", (e: any) => {
            this.isConnecting = false;
            logger.warn("⚠️ [socket] Erro de conexão:", e?.message || e);
        });

        s.on("disconnect", (reason: any) => {
            logger.warn("⚠️ [socket] Desconectado:", reason);
            this.stopHeartbeat();
            if (reason === "io server disconnect" || reason === "transport close") {
                logger.info("🔄 [socket] Tentando reconectar...");
                setTimeout(() => s.connect(), 1000);
            }
        });

        s.on("pong", () => {
            this.lastPong = Date.now();
        });

        this.socket = s;
        this.isConnecting = true;

        this.setupVisibilityHandler();

        // ✅ Reaplica handlers persistentes no novo socket (idempotente: off→on)
        this.applyPersistentHandlers(s);

        return s;
    }

    private cleanupSocket() {
        this.isConnecting = false;
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (!this.socket?.connected) {
                logger.warn("💔 [socket] Heartbeat detectou desconexão");
                this.reconnect();
                return;
            }
            const timeSincePong = Date.now() - this.lastPong;
            if (timeSincePong > 30000) {
                logger.warn("💔 [socket] Conexão zumbi detectada");
                this.reconnect();
                return;
            }
            this.socket.emit("ping");
        }, 10000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

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
                    this.socket?.emit("ping");
                }
            }
        });

        window.addEventListener("online", () => {
            logger.info("🌐 [socket] Internet restaurada, reconectando...");
            this.reconnect();
        });
    }

    public onPreAgendamento(callback: (data: any) => void) {
        return this.on("preagendamento:new", callback);
    }

    public onPreAgendamentoUpdate(callback: (data: any) => void) {
        const u1 = this.on("preagendamento:imported", callback);
        const u2 = this.on("preagendamento:updated", callback);
        return () => { u1(); u2(); };
    }

    public onPreAgendamentoCanceled(callback: (data: any) => void) {
        return this.on("preagendamento:canceled", callback);
    }

    public onPreAgendamentoUpdated(callback: (data: any) => void) {
        return this.on("preagendamento:updated", callback);
    }

    public onPreAgendamentoDeleted(callback: (data: any) => void) {
        return this.on("preagendamento:deleted", callback);
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    reconnect() {
        logger.info("🔄 [socket] Forçando reconexão...");
        this.cleanupSocket();
        this.ensureSocket();
    }

    initialize() {
        this.ensureSocket();
    }

    disconnect() {
        this.persistentHandlers.clear();
        this.cleanupSocket();
    }

    setActiveChatPhone(phoneNormalizedE164: string | null) {
        this.activeChatPhone = phoneNormalizedE164;
    }

    getActiveChatPhone() {
        return this.activeChatPhone;
    }

    // ✅ on() armazena handler persistente e registra no socket atual
    on(event: string, handler: AnyHandler): Unsubscribe {
        // Log quando o evento for recebido
        const wrappedHandler = (payload: any) => {
            handler(payload);
        };

        // ✅ PRIMEIRO: Adiciona aos persistentHandlers ANTES de qualquer coisa
        if (!this.persistentHandlers.has(event)) {
            this.persistentHandlers.set(event, new Set());
        }
        this.persistentHandlers.get(event)!.add(wrappedHandler);

        // DEPOIS: Garante socket e registra
        const s = this.ensureSocket();
        
        // Registra no socket atual (pode ser novo ou existente)
        s.on(event, wrappedHandler);

        return () => {
            this.persistentHandlers.get(event)?.delete(wrappedHandler);
            this.socket?.off(event, wrappedHandler);
        };
    }

    onMessageNew(handler: AnyHandler<MessageNewPayload>): Unsubscribe {
        const u1 = this.on("message:new", handler);
        const u2 = this.on("whatsapp:new_message", handler);
        const u3 = this.on("whatsapp:new_media", handler);
        return () => { u1(); u2(); u3(); };
    }

    onMessageDeleted(handler: AnyHandler<MessageDeletedPayload>): Unsubscribe {
        return this.on("message:deleted", handler);
    }

    // 🆕 Escuta mudanças no controle manual (Amanda pausada/reativada)
    onManualControlChange(handler: AnyHandler<{ leadId: string; manualActive: boolean; phone: string; reason: string; timestamp: string }>): Unsubscribe {
        return this.on("lead:manualControl", handler);
    }

    // 🆕 Escuta falhas de entrega de mensagens WhatsApp
    onMessageFailed(handler: AnyHandler<{ messageId: string; leadId: string; phone: string; error: any; content?: string; timestamp: string }>): Unsubscribe {
        return this.on("whatsapp:message:failed", handler);
    }

    // 🆕 Escuta alertas do sistema (silêncio, anomalia, erros)
    onSystemAlert(handler: AnyHandler<{ type: 'silence' | 'anomaly' | 'error'; message: string; details?: any; timestamp: string }>): Unsubscribe {
        return this.on("system:alert", handler);
    }

    // ✅ Registra callback para evento de (re)conexão
    onReconnect(callback: () => void): Unsubscribe {
        return this.on("connect", callback);
    }

    emit(event: string, data?: any) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        }
    }

    getStatus() {
        return {
            connected: this.isConnected(),
            socketId: this.socket?.id || null,
            activeChatPhone: this.activeChatPhone,
            lastPong: new Date(this.lastPong).toISOString(),
            persistentHandlerCount: Array.from(this.persistentHandlers.values())
                .reduce((sum, s) => sum + s.size, 0),
        };
    }
}

export const socketManager = new SocketManager();

if (typeof window !== 'undefined') {
    (window as any).socketManager = socketManager;
}

export type { MessageDeletedPayload, MessageNewPayload, Unsubscribe };
