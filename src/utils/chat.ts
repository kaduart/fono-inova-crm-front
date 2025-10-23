// src/utils/chat.ts

import { normalizeE164BR } from "./phone";

export type UIMsg = {
    id: string;
    text: string;            // 👈 SEMPRE preenchido
    type: string;
    mediaUrl?: string;
    caption?: string;
    timestamp: Date;
    fromMe: boolean;
    status?: string;
    from?: string;
    to?: string;
    direction?: "inbound" | "outbound";
};

export function toUIMsg(raw: any, chatPhone: string): UIMsg {
    const from = normalizeE164BR(raw.from);
    const to = normalizeE164BR(raw.to);
    const isMedia = raw.type && raw.type !== "text" && raw.type !== "template";
    const body = isMedia
        ? (raw.caption || `[${String(raw.type).toUpperCase()}]`)
        : (raw.content ?? raw.text ?? ""); // 👈 aqui garantimos `text`

    return {
        id: raw.id || `m-${Date.now()}`,
        text: body,                                 // 👈 SEMPRE setado
        type: raw.type || "text",
        mediaUrl: raw.mediaUrl,
        caption: raw.caption || "",
        timestamp: new Date(raw.timestamp || Date.now()),
        fromMe: raw.direction ? raw.direction === "outbound" : (from !== chatPhone),
        status: raw.status || "received",
        from, to, direction: raw.direction,
    };
}
