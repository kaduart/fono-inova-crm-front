import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchContacts, type Contact } from "../services/whatsappService";
import API from "../services/api";
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
    // 🆕 Prioriza timestampMs (número) se existir, senão usa timestamp
    const raw = payload.timestampMs ?? payload.timestamp ?? Date.now();
    const ms = typeof raw === "number" ? raw : new Date(raw).getTime();
    return new Date(ms).toISOString();
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
    const [contacts, setContactsState] = useState<Contact[]>([]);
    const contactsRef = useRef<Contact[]>([]);
    const setContacts = useCallback((arg: Contact[] | ((prev: Contact[]) => Contact[])) => {
        setContactsState(prev => {
            const next = typeof arg === 'function' ? arg(prev) : arg;
            contactsRef.current = next;
            return next;
        });
    }, []);
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
            const msA = timeA ? new Date(timeA).getTime() : 0;
            const msB = timeB ? new Date(timeB).getTime() : 0;
            // 🛡️ Defesa contra NaN — datas inválidas caem pro final
            if (Number.isNaN(msA) && Number.isNaN(msB)) return 0;
            if (Number.isNaN(msA)) return 1;
            if (Number.isNaN(msB)) return -1;
            return msB - msA;
        });
    };

    // 🆕 Flags para controle de carga
    const isInitialLoadRef = useRef(true);
    const lastRefreshRef = useRef(0);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const MIN_REFRESH_INTERVAL = 5000; // Mínimo 5s entre chamadas
    
    // 🆕 Só carrega contatos em rotas do WhatsApp (otimização)
    const shouldLoadContacts = () => {
        const path = window.location.pathname;
        // Só carrega em rotas de chat/whatsapp ou se já estiver com contatos carregados
        const isWhatsAppRoute = path.includes('/whatsapp') || 
                               path.includes('/chat') || 
                               path.includes('/atendimento') ||
                               path.includes('/gestao') ||
                               path.includes('/marketing');
        return isWhatsAppRoute;
    };

    const refreshContacts = useCallback(async (force = false) => {
        // Verificar se tem token antes de carregar
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⏳ ContactsContext: Token não disponível, skip load');
            return;
        }
        
        // 🛡️ Só carrega em rotas do WhatsApp (otimização) - MAS ignora se force=true
        if (!force && !shouldLoadContacts()) {
            console.log('[ContactsContext] Fora da rota WhatsApp, skip load (use force=true para ignorar)');
            return;
        }

        // 🛡️ Proteção contra chamadas muito frequentes (ignora se force=true)
        const now = Date.now();
        if (!force && !isInitialLoadRef.current && (now - lastRefreshRef.current) < MIN_REFRESH_INTERVAL) {
            console.log(`[ContactsContext] Chamada ignorada (muito frequente - última há ${now - lastRefreshRef.current}ms)`);
            return;
        }
        lastRefreshRef.current = now;

        // Só mostra loading na carga inicial ou quando forçado
        if (isInitialLoadRef.current || force) {
            setLoading(true);
        }
        
        try {
            const res = await fetchContacts({ page: 1, limit: LIMIT });
            const list = res.data;
            
            // 🛡️ Só atualiza se os dados realmente mudaram (compara por ID, não por índice)
            setContacts((prev) => {
                const prevMap = new Map(prev.map(c => [c._id, c]));
                const hasChanged =
                    prev.length !== list.length ||
                    list.some((newContact: Contact) => {
                        const oldContact = prevMap.get(newContact._id);
                        return (
                            !oldContact ||
                            oldContact.lastMessageAt !== newContact.lastMessageAt ||
                            oldContact.unreadCount !== newContact.unreadCount
                        );
                    });

                if (!hasChanged && !isInitialLoadRef.current) {
                    return prev; // Dados iguais, mantém referência anterior
                }

                console.log('[ContactsContext] Dados mudaram, atualizando...');
                rebuildIndex(list);
                return sortByLastMessage(list);
            });
            
            setPage(1);
            setHasMore(res.pagination?.hasMore ?? list.length === LIMIT);
        } catch (err) {
            logger.error("[ContactsContext] Erro ao buscar contatos:", err);
        } finally {
            if (isInitialLoadRef.current || force) {
                setLoading(false);
                isInitialLoadRef.current = false;
            }
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
        // Persiste no ChatProjection via V2 (fire-and-forget)
        const contact = contactsRef.current.find(c => c._id === id);
        if (contact?.leadId) {
            API.post(`/v2/chat/${contact.leadId}/read`).catch(() => {});
        }
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
        // 🛡️ Proteção contra múltiplos intervals (React StrictMode, remounts, etc)
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        const handleAuthReady = () => {
            console.log('[ContactsContext] Auth ready, loading contacts...');
            // 🔄 Reconecta socket agora que temos token
            socketManager.initialize();
            if (shouldLoadContacts()) {
                refreshContacts();
            }
        };

        const handleAuthLogout = () => {
            console.log('[ContactsContext] Logout detected, clearing contacts...');
            setContacts([]);
            setPage(1);
            setHasMore(true);
            isInitialLoadRef.current = true;
            lastRefreshRef.current = 0;
        };

        const handleVisibilityChange = () => {
            // Quando a aba volta a ficar visível, faz um refresh se passou tempo suficiente
            if (document.visibilityState === 'visible' && localStorage.getItem('token') && shouldLoadContacts()) {
                const now = Date.now();
                if (now - lastRefreshRef.current > MIN_REFRESH_INTERVAL) {
                    console.log('[ContactsContext] Tab visible, refreshing contacts...');
                    refreshContacts(false);
                }
            }
        };

        // Verifica se já tem token no mount (só em rotas WhatsApp)
        const token = localStorage.getItem('token');
        if (token && isInitialLoadRef.current && shouldLoadContacts()) {
            refreshContacts();
        }

        // Escuta eventos de auth
        window.addEventListener('authReady', handleAuthReady);
        window.addEventListener('authLogout', handleAuthLogout);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 🔄 FALLBACK: Polling a cada 30 segundos (apenas quando visível e na rota WhatsApp)
        // Socket já atualiza em tempo real, polling é só fallback
        pollingIntervalRef.current = setInterval(() => {
            if (document.visibilityState === 'visible' && localStorage.getItem('token') && shouldLoadContacts()) {
                console.log('[ContactsContext] Polling 30s: verificando atualizações...', new Date().toISOString());
                refreshContacts(false); // false = não força loading
            }
        }, 30000);

        return () => {
            window.removeEventListener('authReady', handleAuthReady);
            window.removeEventListener('authLogout', handleAuthLogout);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [refreshContacts]);

    // socket listener
    useEffect(() => {
        console.log('[ContactsContext] 🔌 Registrando listener de socket...');
        isMountedRef.current = true;
        socketManager.initialize();
        
        // 🛡️ Rate limiting para refreshContacts quando contato não encontrado
        let lastSocketRefresh = 0;
        const SOCKET_REFRESH_COOLDOWN = 3000; // Mínimo 3s entre refreshes de socket

        // 🆕 V2: chat:inbox:update vem do chatProjectionWorker após salvar ChatProjection no Mongo
        // Chega ligeiramente depois de message:new e confirma dados do DB (unreadCount preciso)
        const unsubInboxUpdate = socketManager.onChatInboxUpdate((data) => {
            // 🎯 Prioriza contactId do payload; fallback por telefone
            let contactId: string | undefined = data.leadId;
            if (!contactId) {
                const phone = normalizeE164BR(data.phone || '');
                contactId = phone ? phoneIndexRef.current.get(phone) : undefined;
            }
            if (!contactId) {
                // contato desconhecido — força refresh para aparecer na sidebar
                refreshContacts();
                return;
            }

            const activeId = activeContactIdRef.current;
            const isInbound = data.lastDirection === 'inbound';
            const incUnread = isInbound && activeId !== contactId;

            setContacts((prev) => {
                const updated = prev.map((c) =>
                    c._id === contactId
                        ? {
                            ...c,
                            lastMessage: data.lastMessage ?? c.lastMessage,
                            lastMessagePreview: data.lastMessage ?? c.lastMessagePreview,
                            lastMessageAt: data.lastMessageAt ?? c.lastMessageAt,
                            // usa unreadCount do DB apenas se for inbound e não estiver na conversa ativa
                            unreadCount: incUnread ? (data.unreadCount ?? c.unreadCount) : c.unreadCount,
                        }
                        : c
                );
                return sortByLastMessage(updated);
            });
        });

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
                
                // Se não encontrou contato, faz refresh para buscar do servidor (com rate limit, só em rotas WhatsApp)
                if (!contactId) {
                    if (!shouldLoadContacts()) {
                        console.log('[ContactsContext] Contato não encontrado, mas fora da rota WhatsApp, ignorando...');
                        return;
                    }
                    const now = Date.now();
                    if (now - lastSocketRefresh > SOCKET_REFRESH_COOLDOWN) {
                        lastSocketRefresh = now;
                        console.warn('[ContactsContext] Contato não encontrado, fazendo refresh... Phone:', phone);
                        refreshContacts();
                    } else {
                        // cooldown ativo, mas agenda refresh para garantir que apareça
                        setTimeout(() => {
                            console.warn('[ContactsContext] Refresh agendado pós-cooldown. Phone:', phone);
                            refreshContacts();
                        }, SOCKET_REFRESH_COOLDOWN);
                    }
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
                    console.log('[ContactsContext] 🔄 setContacts chamado:', {
                        prevCount: prev.length,
                        contactId,
                        found: prev.some(c => c._id === contactId)
                    });
                    
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
                    console.log('[ContactsContext] ✅ Contatos atualizados e ordenados:', {
                        total: sorted.length,
                        topContact: sorted[0]?._id,
                        targetPosition: sorted.findIndex(c => c._id === contactId)
                    });
                    return sorted;
                });

            } catch (e) {
                logger.error("[ContactsContext] Falha ao aplicar message:new:", e);
            }
        });

        return () => {
            isMountedRef.current = false;
            unsubInboxUpdate?.();
            unsub?.();
        };
    }, [refreshContacts]);

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
