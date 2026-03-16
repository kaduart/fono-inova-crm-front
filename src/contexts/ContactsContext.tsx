import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
    markAllAsRead: () => void;
    setActiveContactId: (id: string | null) => void;
}

export const ContactsContext = createContext<ContactsContextType | null>(null);

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

    const sortByLastMessage = (list: Contact[]): Contact[] => {
        return [...list].sort((a, b) => {
            const timeA = a.lastMessageAt || a.updatedAt || a.createdAt || '';
            const timeB = b.lastMessageAt || b.updatedAt || b.createdAt || '';
            return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
    };

    const refreshContacts = useCallback(async () => {
        // Verificar se tem token antes de carregar
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⏳ ContactsContext: Token não disponível, skip load');
            return;
        }

        setLoading(true);
        try {
            const res = await fetchContacts({ page: 1, limit: LIMIT });
            const list = res.data;
            setContacts(sortByLastMessage(list));
            rebuildIndex(list);
            setPage(1);
            setHasMore(res.pagination?.hasMore ?? list.length === LIMIT);
        } catch (err) {
            logger.error("[ContactsContext] Erro ao buscar contatos:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMoreContacts = useCallback(async () => {
        if (loadingMore || loading || !hasMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const res = await fetchContacts({ page: nextPage, limit: LIMIT });
            const list = res.data;

            setContacts((prev) => {
                const next = sortByLastMessage(mergeDedupe(prev, list));
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
    }, [loadingMore, loading, hasMore, page]);

    const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
        setContacts((prev) => {
            const next = prev.map((c) => (c._id === id ? { ...c, ...updates } : c));
            if (updates.phone) rebuildIndex(next);
            return next;
        });
    }, []);

    const markAsRead = useCallback((id: string) => {
        updateContact(id, { unreadCount: 0, hasNewMessage: false });
    }, [updateContact]);

    const markAllAsRead = useCallback(() => {
        setContacts((prev) =>
            prev.map((c) => ({ ...c, unreadCount: 0, hasNewMessage: false }))
        );
    }, []);

    useEffect(() => {
        activeContactIdRef.current = activeContactId;
    }, [activeContactId]);

    // 🔄 Escuta mudanças de autenticação para recarregar quando fizer login
    useEffect(() => {
        const handleAuthReady = () => {
            console.log('[ContactsContext] Auth ready, loading contacts...');
            refreshContacts();
        };

        const handleAuthLogout = () => {
            console.log('[ContactsContext] Logout detected, clearing contacts...');
            setContacts([]);
            setPage(1);
            setHasMore(true);
        };

        // Verifica se já tem token no mount
        const token = localStorage.getItem('token');
        if (token) {
            refreshContacts();
        }

        // Escuta eventos de auth
        window.addEventListener('authReady', handleAuthReady);
        window.addEventListener('authLogout', handleAuthLogout);

        // 🔄 FALLBACK: Polling a cada 10 segundos apenas se tiver token
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
                console.log('[ContactsContext] Polling: atualizando contatos...');
                refreshContacts();
            }
        }, 10000);

        return () => {
            window.removeEventListener('authReady', handleAuthReady);
            window.removeEventListener('authLogout', handleAuthLogout);
            clearInterval(pollInterval);
        };
    }, []);

    // socket listener
    useEffect(() => {
        console.log('[ContactsContext] 🔌 Registrando listener de socket...');
        isMountedRef.current = true;
        socketManager.initialize();

        const unsub = socketManager.onMessageNew((payload) => {
            console.log('[ContactsContext] ⭐⭐⭐ SOCKET EVENTO RECEBIDO:', {
                event: 'message:new',
                payload: {
                    id: payload.id,
                    direction: payload.direction,
                    from: payload.from,
                    to: payload.to,
                    text: payload.text?.substring(0, 30)
                }
            });
            
            try {
                const from = normalizeE164BR(payload.from || "");
                const to = normalizeE164BR(payload.to || "");
                const phone = from || to;
                
                // 🐛 DEBUG: Log para entender problemas de matching
                console.log('[ContactsContext] Processando mensagem:', {
                    from: payload.from,
                    to: payload.to,
                    fromNormalized: from,
                    toNormalized: to,
                    phone,
                    direction: payload.direction,
                    indexSize: phoneIndexRef.current.size,
                    indexHasPhone: phoneIndexRef.current.has(phone),
                });
                
                if (!phone) return;

                // 🎯 PRIORIZA contactId do payload (mais confiável que busca por telefone)
                let contactId: string | undefined = payload.contactId || payload.contact?._id;
                
                // Fallback: busca no índice por telefone se não tiver contactId no payload
                if (!contactId) {
                    contactId = phoneIndexRef.current.get(phone);
                }
                
                // Se não encontrou contato, faz refresh para buscar do servidor
                if (!contactId) {
                    console.warn('[ContactsContext] Contato não encontrado, fazendo refresh... Phone:', phone);
                    refreshContacts();
                    return;
                }

                const dir = String(payload.direction || "").toLowerCase();
                const isInbound = dir ? dir === "inbound" : Boolean(from);

                const preview = buildPreview(payload);
                const ts = getEventTimestamp(payload);
                const activeId = activeContactIdRef.current;
                const incUnread = isInbound && activeId !== contactId;

                console.log('[ContactsContext] ✅ Atualizando contato:', {
                    contactId,
                    incUnread,
                    isInbound,
                    activeId,
                    preview: preview?.substring(0, 30)
                });
                
                setContacts((prev) => {
                    const updated = prev.map((c) =>
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
                    );
                    // ✅ Reordena pra mensagem nova ir pro topop
                    const sorted = sortByLastMessage(updated);
                    console.log('[ContactsContext] ✅ Contatos atualizados:', sorted.length);
                    return sorted;
                });

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
            markAllAsRead,
            setActiveContactId,
        }),
        // Todas as funções são estáveis (useCallback)
        [contacts, loading, loadingMore, hasMore, activeContactId, loadMoreContacts, refreshContacts, updateContact, markAsRead, markAllAsRead]
    );

    return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export const useContacts = () => {
    const ctx = useContext(ContactsContext);
    if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
    return ctx;
};
