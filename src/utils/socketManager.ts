// src/utils/socketManager.ts
import { io, type Socket } from "socket.io-client";
import { logger } from "./logger";

type AnyHandler<T = any> = (payload: T) => void;

type Unsubscribe = () => void;

type MessageNewPayload = {
    id?: string;
    wamid?: string;
    type?: string;        // text | image | audio | document | ...
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

    private ensureSocket() {
        if (this.socket) return this.socket;

        const url =
            (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
            (typeof process !== "undefined" && (process as any).env?.VITE_API_URL);

        if (!url) {
            logger.warn("⚠️ [socket] VITE_SOCKET_URL não configurado — conectando no origin atual.");
        }

        const s = io(url || "", {
            transports: ["websocket"],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            withCredentials: true,
        });

        s.on("connect", () => logger.info("🔌 [socket] connected:", s.id));
        s.on("connect_error", (e: any) => logger.warn("⚠️ [socket] connect_error:", e?.message || e));
        s.on("disconnect", (r: any) => logger.warn("⚠️ [socket] disconnected:", r));

        this.socket = s;
        return s;
    }

    initialize() {
        this.ensureSocket();
    }

    disconnect() {
        if (!this.socket) return;
        try {
            this.socket.disconnect();
        } finally {
            this.socket = null;
        }
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
}

export const socketManager = new SocketManager();
export type { MessageDeletedPayload, MessageNewPayload, Unsubscribe };

