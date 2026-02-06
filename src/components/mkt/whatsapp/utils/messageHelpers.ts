// utils/messageHelpers.ts
import { normalizeE164BR } from '../../../../utils/phone';
import { uid } from '../../../../utils/uid';
import type { Message } from '../types/chat.types';

export function pickMsgId(src: any): string {
    const raw =
        src?.id ||
        src?._id ||
        src?.messageId ||
        `${src?.direction || "in"}-${src?.timestamp || ""}-${src?.from || ""}-${src?.to || ""}-${src?.type || "text"}-${src?.text || src?.content || src?.caption || ""}`.slice(0, 80);

    const base = String(raw && raw.length ? raw : uid("m"));
    return base.startsWith("m-") ? base : `m-${base}`;
}

export function formatMessage(m: any, chatPhoneE164?: string): Message {
    const dir = String(m?.direction || "").toLowerCase();
    const fromE164 = normalizeE164BR(m?.from || "");
    const toE164 = normalizeE164BR(m?.to || "");

    const fromMe =
        dir ? dir === "outbound"
            : chatPhoneE164
                ? normalizeE164BR(m?.from || "") !== chatPhoneE164
                : !!m?.fromMe;

    const text =
        typeof m === "string"
            ? m
            : (m.text || m.content || m.body || m.message || m.caption || "");

    const tsRaw = m.timestamp || m.createdAt || m.date || m.time || Date.now();
    const timestamp = new Date(tsRaw);

    const id = pickMsgId(m);
    const msgType = m.type === "sticker" ? "sticker" : (m.type || "text");

    return {
        id,
        text,
        type: msgType,
        timestamp,
        fromMe,
        status: m.status || (fromMe ? "sent" : "received"),
        mediaUrl: m.mediaUrl || m.url || m.media || m.fileUrl || "",
        mediaId: m.mediaId || undefined,
        caption: m.caption || "",
    };
}

export function isGenericName(name?: string, phone?: string): boolean {
    const n = (name || "").trim().toLowerCase();
    if (!n) return true;
    if (n.startsWith("whatsapp")) return true;

    const last4 = String(phone || "").replace(/\D/g, "").slice(-4);
    if (last4 && n.includes(last4)) return true;

    return false;
}
