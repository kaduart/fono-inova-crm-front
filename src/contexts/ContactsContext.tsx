import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchContacts, type Contact } from "../services/whatsappService";
import { logger } from "../utils/logger";
import { normalizeE164BR } from "../utils/phone";
import { socketManager, type MessageNewPayload } from "../utils/socketManager";

interface ContactsContextType {
    contacts: Contact[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    loadMoreContacts: () => Promise<void>;

    activeContactId: string | null;
    refreshContacts: () => Promise<void>;
    updateContact: (id: string, updates: Partial<Contact>) => void;
    markAsRead: (id: string) => void;
    setActiveContactId: (id: string | null) => void;
}

const ContactsContext = createContext<ContactsContextType | null>(null);

const LIMIT = 50;

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
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [activeContactId, setActiveContactId] = useState<string | null>(null);

    const isMountedRef = useRef(true);
    const activeContactIdRef = useRef<string | null>(null);
    const phoneIndexRef = useRef<Map<string, string>>(new Map());

    const rebuildIndex = (list: Contact[]) => {
        const m = new Map<string, string>();
        for (const c of list) {
            const p = normalizeE164BR(c.phone);
            if (p) m.set(p, c._id);
        }
        phoneIndexRef.current = m;
    };

    const mergeDedupe = (prev: Contact[], incoming: Contact[]) => {
        const map = new Map<string, Contact>();
        for (const c of prev) map.set(c._id, c);
        for (const c of incoming) {
            const old = map.get(c._id);
            map.set(c._id, old ? { ...old, ...c } : c);
        }
        return Array.from(map.values());
    };

    const refreshContacts = async () => {
        setLoading(true);
        try {
            const res = await fetchContacts({ page: 1, limit: LIMIT });
            const list = res.data;
            setContacts(list);
            rebuildIndex(list);
            setPage(1);
            setHasMore(res.pagination?.hasMore ?? list.length === LIMIT);
        } catch (err) {
            logger.error("[ContactsContext] Erro ao buscar contatos:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreContacts = async () => {
        if (loadingMore || loading || !hasMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const res = await fetchContacts({ page: nextPage, limit: LIMIT });
            const list = res.data;

            setContacts((prev) => {
                const next = mergeDedupe(prev, list);
                rebuildIndex(next);
                return next;
            });

            setPage(nextPage);
            setHasMore(res.pagination?.hasMore ?? list.length === LIMIT);
        } catch (err) {
            logger.error("[ContactsContext] Erro ao carregar mais contatos:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    const updateContact = (id: string, updates: Partial<Contact>) => {
        setContacts((prev) => {
            const next = prev.map((c) => (c._id === id ? { ...c, ...updates } : c));
            if (updates.phone) rebuildIndex(next);
            return next;
        });
    };

    const markAsRead = (id: string) => {
        updateContact(id, { unreadCount: 0, hasNewMessage: false });
    };

    useEffect(() => {
        activeContactIdRef.current = activeContactId;
    }, [activeContactId]);

    useEffect(() => {
        refreshContacts();
    }, []);

    // socket listener
    useEffect(() => {
        isMountedRef.current = true;
        socketManager.initialize();

        const unsub = socketManager.onMessageNew((payload) => {
            try {
                const from = normalizeE164BR(payload.from || "");
                const to = normalizeE164BR(payload.to || "");
                const phone = from || to;
                if (!phone) return;

                const contactId = phoneIndexRef.current.get(phone);
                if (!contactId) return;

                const dir = String(payload.direction || "").toLowerCase();
                const isInbound = dir ? dir === "inbound" : Boolean(from);

                const preview = buildPreview(payload);
                const ts = getEventTimestamp(payload);
                const activeId = activeContactIdRef.current;
                const incUnread = isInbound && activeId !== contactId;

                setContacts((prev) =>
                    prev.map((c) =>
                        c._id === contactId
                            ? {
                                ...c,
                                lastMessagePreview: preview,
                                lastMessage: preview,
                                lastMessageAt: ts,
                                hasNewMessage: incUnread ? true : c.hasNewMessage,
                                unreadCount: incUnread ? (c.unreadCount || 0) + 1 : c.unreadCount || 0,
                            }
                            : c
                    )
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
            loadingMore,
            hasMore,
            loadMoreContacts,
            activeContactId,
            refreshContacts,
            updateContact,
            markAsRead,
            setActiveContactId,
        }),
        [contacts, loading, loadingMore, hasMore, activeContactId]
    );

    return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export const useContacts = () => {
    const ctx = useContext(ContactsContext);
    if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
    return ctx;
};
