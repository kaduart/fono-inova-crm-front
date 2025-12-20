// src/contexts/ContactsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchContacts } from "../services/whatsappService";
import { logger } from "../utils/logger";
import { normalizeE164BR } from "../utils/phone";
import { socketManager, type MessageNewPayload } from "../utils/socketManager";

export type Contact = {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    lastMessage?: string;
    lastMessagePreview?: string;
    lastMessageTime?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    hasNewMessage?: boolean;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
    [key: string]: any;
};

interface ContactsContextType {
    contacts: Contact[];
    loading: boolean;
    activeContactId: string | null;

    refreshContacts: () => Promise<void>;
    updateContact: (id: string, updates: Partial<Contact>) => void;
    markAsRead: (id: string) => void;
    setActiveContactId: (id: string | null) => void;
}

const ContactsContext = createContext<ContactsContextType | null>(null);

function buildPreview(payload: MessageNewPayload): string {
    const type = (payload.type || "text").toLowerCase();
    const text = payload.content ?? payload.text ?? "";

    const isMedia = type && type !== "text" && type !== "template";
    if (!isMedia) return text || "Nova mensagem";

    const caption = payload.caption || "";
    const label =
        type === "image"
            ? "📷 Foto"
            : type === "audio"
                ? "🎤 Áudio"
                : type === "video"
                    ? "🎥 Vídeo"
                    : type === "document"
                        ? "📄 Documento"
                        : type === "sticker"
                            ? "🧩 Figurinha"
                            : "📎 Mídia";

    return caption ? `${label}: ${caption}` : label;
}

function getEventTimestamp(payload: MessageNewPayload): string {
    const raw = payload.timestamp ?? Date.now();
    const ms = typeof raw === "number" ? raw : new Date(raw).getTime();
    return new Date(ms).toISOString();
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeContactId, setActiveContactId] = useState<string | null>(null);

    // Guards
    const isMountedRef = useRef(true);

    // Keep active contact in a ref so socket handler doesn't need re-subscribe
    const activeContactIdRef = useRef<string | null>(null);

    // Map phone->contactId for quick matching
    const phoneIndexRef = useRef<Map<string, string>>(new Map());

    const rebuildIndex = (list: Contact[]) => {
        const m = new Map<string, string>();
        for (const c of list) {
            const p = normalizeE164BR(c.phone);
            if (!p) continue;
            m.set(p, c._id);
        }
        phoneIndexRef.current = m;
    };

    const refreshContacts = async () => {
        setLoading(true);
        try {
            const data: any = await fetchContacts();
            const list: Contact[] = (data?.data || data || []) as Contact[];

            if (!isMountedRef.current) return;

            setContacts(list);
            rebuildIndex(list);
        } catch (e) {
            logger.error("[ContactsContext] Erro ao buscar contatos:", e);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const updateContact = (id: string, updates: Partial<Contact>) => {
        setContacts((prev) => {
            const next = prev.map((c) => (c._id === id ? { ...c, ...updates } : c));
            // keep index in sync if phone changed
            if (updates.phone) rebuildIndex(next);
            return next;
        });
    };

    const markAsRead = (id: string) => {
        updateContact(id, { unreadCount: 0, hasNewMessage: false });
    };

    // Keep ref synced (no re-subscribe needed)
    useEffect(() => {
        activeContactIdRef.current = activeContactId;
    }, [activeContactId]);

    // Initial fetch
    useEffect(() => {
        refreshContacts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Socket-driven reconciliation (subscribe once)
    useEffect(() => {
        isMountedRef.current = true;

        socketManager.initialize();

        const unsub = socketManager.onMessageNew((payload) => {
            try {
                const from = normalizeE164BR(payload.from || "");
                const to = normalizeE164BR(payload.to || "");
                const contactPhone = from || to;

                if (!contactPhone) return;

                const contactId = phoneIndexRef.current.get(contactPhone);
                if (!contactId) return;

                const dir = String(payload.direction || "").toLowerCase();
                const isInbound = dir ? dir === "inbound" : Boolean(from);

                const preview = buildPreview(payload);
                const ts = getEventTimestamp(payload);

                const activeId = activeContactIdRef.current;
                const incUnread = isInbound && activeId !== contactId;

                setContacts((prev) =>
                    prev.map((c) => {
                        if (c._id !== contactId) return c;

                        return {
                            ...c,
                            lastMessagePreview: preview,
                            lastMessage: preview,
                            lastMessageAt: ts,
                            hasNewMessage: incUnread ? true : c.hasNewMessage,
                            unreadCount: incUnread ? Number(c.unreadCount || 0) + 1 : c.unreadCount || 0,
                        };
                    })
                );
            } catch (e) {
                logger.error("[ContactsContext] Falha ao aplicar message:new:", e);
            }
        });

        return () => {
            isMountedRef.current = false;
            unsub?.();
        };
    }, []);

    const value = useMemo<ContactsContextType>(
        () => ({
            contacts,
            loading,
            activeContactId,
            refreshContacts,
            updateContact,
            markAsRead,
            setActiveContactId,
        }),
        [contacts, loading, activeContactId]
    );

    return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export const useContacts = () => {
    const ctx = useContext(ContactsContext);
    if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
    return ctx;
};
