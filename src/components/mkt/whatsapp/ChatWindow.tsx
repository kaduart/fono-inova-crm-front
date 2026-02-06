// src/components/whatsapp/ChatWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiSend, FiUser, FiMoreVertical, FiPause, FiPlay, FiStopCircle } from 'react-icons/fi';
import { IoCheckmark, IoCheckmarkDone, IoTime } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { deleteWhatsAppMessage, getChatMessages, loadMoreMessages, sendManualWhatsAppText, updateContactApi, sendWhatsAppMedia, MediaType } from '../../../services/whatsappService';
import { confirmToast } from '../../../utils/confirmToast';
import { socketManager } from '../../../utils/socketManager';
import { logger } from '../../../utils/logger';
import { normalizeE164BR } from '../../../utils/phone';
import { uid } from '../../../utils/uid';
import { Button } from '../../ui/Button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import MessageBubble from './MessageBubble';
import { useContacts } from '../../../contexts/ContactsContext';
import EditContactModal from './EditContactModal';
import API from '../../../services/api';
import { MediaUpload } from './MediaUpload';
import { AudioRecorder } from './AudioRecorder';

interface Contact {
    _id: string;
    name: string;
    phone: string;
    leadId?: string | null;
    avatar?: string;
    status?: string;
    lastSeen?: string;
    manualActive?: boolean;
    autoReplyEnabled?: boolean;
}


interface Message {
    id: string;
    text: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'read' | 'received';
    fromMe?: boolean;
    type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
    mediaUrl?: string;
    mediaId?: string;
    caption: string;
}

interface ChatWindowProps {
    contact: Contact | null;
    className?: string;
    leadId?: string;
}

// ✅ Mover função helper para FORA do componente
function pickMsgId(src: any) {
    const raw =
        src?.id ||
        src?._id ||
        src?.messageId ||
        `${src?.direction || "in"}-${src?.timestamp || ""}-${src?.from || ""}-${src?.to || ""}-${src?.type || "text"}-${src?.text || src?.content || src?.caption || ""}`.slice(0, 80);

    const base = String(raw && raw.length ? raw : uid("m"));
    return base.startsWith("m-") ? base : `m-${base}`;
}

// ChatWindow.tsx - Adicione ANTES do componente ou no início

function formatMessage(m: any, chatPhoneE164?: string): Message {
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
        caption: m.caption || m.text || "",
    };
}


const ChatWindow: React.FC<ChatWindowProps> = ({ contact, className, leadId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const seenIdsRef = useRef<Set<string>>(new Set());
    // 🆕 PROTEÇÃO: Timestamp da última vez que cada mensagem foi processada (evita duplicatas do socket)
    const lastMessageTimeRef = useRef<Map<string, number>>(new Map());
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const { updateContact } = useContacts();
    const [showEditContact, setShowEditContact] = useState(false);
    const hasGenericName = isGenericName(contact?.name, contact?.phone);

    const [manualActive, setManualActive] = useState<boolean>(!!contact?.manualActive);
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // 🐛 NOVO: Estado de conexão do socket
    const [socketConnected, setSocketConnected] = useState<boolean>(true);

    useEffect(() => {
        setManualActive(!!contact?.manualActive);
    }, [contact?._id, contact?.manualActive]);
    
    // 🐛 NOVO: Monitorar status do socket
    useEffect(() => {
        const checkSocketStatus = () => {
            const isConnected = socketManager.isConnected();
            setSocketConnected(isConnected);
        };
        
        // Verifica a cada 5 segundos
        const interval = setInterval(checkSocketStatus, 5000);
        checkSocketStatus(); // Verificação inicial
        
        return () => clearInterval(interval);
    }, []); // Sem dependências - roda sempre
    
    // 🐛 NOVO: Buscar mensagens quando socket reconecta
    useEffect(() => {
        if (socketConnected && contact?.phone) {
            logger.info("[ChatWindow] Socket conectado, verificando mensagens...");
            loadMessages(contact.phone);
        }
    }, [socketConnected, contact?.phone]);

    // 🐛 NOVO: Fechar dropdown quando clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowActionsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const label = manualActive ? "Reativar AmandaAI" : "Pausar AmandaAI";

    function isGenericName(name?: string, phone?: string) {
        const n = (name || "").trim().toLowerCase();
        if (!n) return true;
        if (n.startsWith("whatsapp")) return true;

        const last4 = String(phone || "").replace(/\D/g, "").slice(-4);
        if (last4 && n.includes(last4)) return true;

        return false;
    }

    const handleSaveName = async (newName: string) => {
        if (!contact?._id) throw new Error("Contato inválido");

        const updated = await updateContactApi(contact._id, { name: newName });

        updateContact(contact._id, { name: updated?.name ?? newName });
    };

    // 📨 Carrega histórico - Função estável que não muda
    const loadMessages = useCallback(async (phone: string) => {
        if (!phone) return;

        setLoading(true);
        setError('');

        try {
            let msgs = await getChatMessages(phone);

            if (!msgs) {
                setMessages([]);
                return;
            }

            if (!Array.isArray(msgs)) {
                const possibleArrays = msgs.data || msgs.messages || msgs.chat || [msgs];
                msgs = Array.isArray(possibleArrays) ? possibleArrays : [];
            }

            const chatPhoneE164 = normalizeE164BR(phone);
            const formatted = msgs.map((m: any) => formatMessage(m, chatPhoneE164));


            const unique = [];
            const seenLocal = new Set<string>();
            for (const m of formatted) {
                if (seenLocal.has(m.id)) continue;
                seenLocal.add(m.id);
                unique.push(m);
            }

            setMessages(unique);
            seenIdsRef.current = new Set(unique.map(m => m.id));

            requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({
                        behavior: "auto",
                        block: "end",
                    });
                } else if (messagesContainerRef.current) {
                    const container = messagesContainerRef.current;
                    container.scrollTop = container.scrollHeight;
                }
            });

        } catch (err: any) {
            logger.error('❌ Erro ao buscar histórico:', err);
            setError('Erro ao carregar mensagens: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const phone = contact?.phone;
        if (!phone) {
            setMessages([]);
            seenIdsRef.current.clear();
            lastMessageTimeRef.current.clear();
            socketManager.setActiveChatPhone(null);
            return;
        }

        const chatPhoneE164 = normalizeE164BR(phone);

        // 1️⃣ Define contato ativo + limpa estado
        seenIdsRef.current.clear();
        lastMessageTimeRef.current.clear();
        socketManager.setActiveChatPhone(chatPhoneE164);

        // 2️⃣ Carrega histórico
        loadMessages(phone);

        // 3️⃣ Listener de mensagens novas e deletadas
        const onNew = (data: any) => {
            try {
                const fromE164 = normalizeE164BR(data?.from || "");
                const toE164 = normalizeE164BR(data?.to || "");
                
                // 🐛 DEBUG: Log detalhado para rastrear filtragem
                if (fromE164 !== chatPhoneE164 && toE164 !== chatPhoneE164) {
                    logger.debug("[ChatWindow] Mensagem filtrada (não é deste chat)", {
                        expected: chatPhoneE164,
                        received_from: fromE164,
                        received_to: toE164,
                        raw_from: data?.from,
                        raw_to: data?.to
                    });
                    return;
                }
                
                logger.debug("[ChatWindow] Mensagem recebida via socket", {
                    from: fromE164,
                    to: toE164,
                    text: data?.text?.substring(0, 50)
                });

                const msg = formatMessage(data, chatPhoneE164);

                // 🐛 FIX: Verificação atômica com seenIdsRef
                const alreadyExists = seenIdsRef.current.has(msg.id);
                if (alreadyExists) {
                    logger.debug("[ChatWindow] Mensagem duplicada ignorada (seenIds):", msg.id);
                    return;
                }
                
                // 🆕 PROTEÇÃO: Ignora se processou a mesma mensagem nos últimos 2 segundos
                // (evita duplicatas quando backend emite múltiplos eventos)
                const now = Date.now();
                const lastTime = lastMessageTimeRef.current.get(msg.id);
                if (lastTime && (now - lastTime) < 2000) {
                    logger.debug("[ChatWindow] Mensagem duplicada ignorada (debounce):", msg.id);
                    return;
                }
                
                lastMessageTimeRef.current.set(msg.id, now);
                seenIdsRef.current.add(msg.id);
                setMessages(prev => [...prev, msg]);
            } catch (e) {
                logger.error("❌ [ChatWindow] Falha ao processar message:new:", e);
            }
        };


        const onDeleted = (data: any) => {
            try {
                const fromE164 = normalizeE164BR(data?.from || "");
                const toE164 = normalizeE164BR(data?.to || "");
                if (fromE164 !== chatPhoneE164 && toE164 !== chatPhoneE164) return;

                const cleanId = data.id;
                const prefixedId = `m-${data.id}`;

                setMessages(prev => prev.filter(m => m.id !== cleanId && m.id !== prefixedId));
                seenIdsRef.current.delete(cleanId);
                seenIdsRef.current.delete(prefixedId);
            } catch (e) {
                logger.error("❌ [ChatWindow] Falha ao processar message:deleted:", e);
            }
        };

        const unsubNew = socketManager.onMessageNew(onNew);
        const unsubDel = socketManager.onMessageDeleted(onDeleted);

        // 4️⃣ Reconectar quando aba volta ao foco
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                logger.debug("[ChatWindow] Aba visível, verificando socket...");
                if (!socketManager.isConnected()) {
                    logger.info("[ChatWindow] Socket desconectado, reconectando...");
                    socketManager.reconnect();
                    // Recarrega mensagens após reconectar
                    setTimeout(() => loadMessages(phone), 500);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // 5️⃣ Cleanup
        return () => {
            unsubNew();
            unsubDel();
            socketManager.setActiveChatPhone(null);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [contact?.phone, loadMessages]);



    useEffect(() => {
        const handleForceReload = (e: CustomEvent) => {
            const a = normalizeE164BR(e.detail?.phone || "");
            const b = normalizeE164BR(contact?.phone || "");
            if (a && b && a === b) {
                logger.debug("🔄 Force reload recebido, recarregando mensagens...");
                loadMessages(contact!.phone);
            }
        };

        window.addEventListener("force-chat-reload", handleForceReload as EventListener);
        return () => window.removeEventListener("force-chat-reload", handleForceReload as EventListener);
    }, [contact?.phone, loadMessages]);


    // Carregar mensagens mais antigas ao scrollar pro topo
    // Carregar mensagens mais antigas ao scrollar pro topo
    const handleScroll = useCallback(async () => {
        const container = messagesContainerRef.current;
        if (!container || loadingMore || !hasMoreMessages || !contact?.phone) return;

        // Se scrollou perto do topo, carrega mais
        if (container.scrollTop < 100) {
            const oldestMessage = messages[0];
            if (!oldestMessage?.timestamp) return;

            setLoadingMore(true);

            try {
                const response = await loadMoreMessages(
                    contact.phone,
                    oldestMessage.timestamp instanceof Date
                        ? oldestMessage.timestamp.toISOString()
                        : String(oldestMessage.timestamp)
                );

                // 🔥 FIX: Extrair data do response
                const olderMsgs = response?.data || response || [];

                if (!Array.isArray(olderMsgs) || olderMsgs.length === 0) {
                    setHasMoreMessages(false);
                    return;
                }

                // Preserva posição do scroll
                const prevScrollHeight = container.scrollHeight;

                setMessages(prev => {
                    const chatPhoneE164 = normalizeE164BR(contact.phone);
                    const formatted = olderMsgs.map((x: any) => formatMessage(x, chatPhoneE164));

                    const existingIds = new Set(prev.map(m => m.id));
                    const newMsgs = formatted.filter(m => !existingIds.has(m.id));
                    return [...newMsgs, ...prev];
                });

                // Atualiza hasMore
                setHasMoreMessages(response?.hasMore ?? olderMsgs.length >= 30);

                // Restaura posição do scroll
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight - prevScrollHeight;
                });
            } catch (err) {
                logger.error('Erro ao carregar histórico:', err);
            } finally {
                setLoadingMore(false);
            }
        }
    }, [messages, loadingMore, hasMoreMessages, contact?.phone]);

    // Adicionar listener de scroll
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const handleCancelFollowup = async () => {
        const key = contact?.leadId;
        if (!key) return toast.error("Este contato não possui lead ativo");

        const confirm = await confirmToast("Deseja realmente cancelar o follow-up e travar automação?");
        if (!confirm) return;

        try {
            const { data } = await API.post(`/followups/cancel-followup/${key}`);
            if (data?.success) {
                toast.success(data.message);
                updateContact(contact._id, { stopAutomation: true });
            } else {
                toast.error(data?.error || "Erro ao cancelar follow-up");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || err?.message || "Erro inesperado");
        }
    };

    // 🗑️ DELETAR mensagem
    const handleDeleteMessage = useCallback(async (messageId: string) => {
        if (deletingMessageId) return; // evita múltiplos cliques

        const confirmed = await confirmToast('Deseja realmente deletar esta mensagem?');
        if (!confirmed) return;

        setDeletingMessageId(messageId);

        try {
            // 1) Se for mensagem temporária (não existe no banco), só remove da UI
            if (messageId.startsWith('temp')) {

                setMessages(prev => prev.filter(m => m.id !== messageId));
                seenIdsRef.current.delete(messageId);
                return;
            }

            // 2) Mensagem persistida: remove o prefixo "m-" pra mandar o ObjectId real
            const cleanId = messageId.startsWith('m-') ? messageId.substring(2) : messageId;

            const data = await deleteWhatsAppMessage(cleanId);

            if (!data?.success) {
                throw new Error(data.error || data.message || 'Erro ao deletar mensagem');
            }

            // 3) Remove da UI considerando possíveis formas do id
            setMessages(prev =>
                prev.filter(m =>
                    m.id !== messageId &&
                    m.id !== cleanId &&
                    m.id !== `m-${cleanId}`
                )
            );

            seenIdsRef.current.delete(messageId);
            seenIdsRef.current.delete(cleanId);
            seenIdsRef.current.delete(`m-${cleanId}`);

        } catch (err: any) {
            logger.error('❌ Erro ao deletar:', err);
            setError(err.message || 'Erro ao deletar mensagem');
        } finally {
            setDeletingMessageId(null);
        }
    }, [deletingMessageId]);



    // 📨 Envio de mensagem
    const handleSend = useCallback(async () => {
        if (!draft.trim() || !contact || sending) return;

        const tempId = uid("temp");
        const optimistic: Message = {
            id: tempId,
            text: draft,
            timestamp: new Date(),
            status: "sent",
            fromMe: true,
            type: "text",
            caption: "",
        };

        setSending(true);
        setMessages(prev => {
            seenIdsRef.current.add(tempId);
            return [...prev, optimistic];
        });

        const messageText = draft;
        setDraft("");

        try {
            const effectiveLeadId = leadId || undefined;
            const userDataStr = localStorage.getItem("user");
            let userId: string | null = null;

            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    userId = userData.userId || userData._id || userData.id;
                } catch (e) {
                    logger.warn("Erro ao parsear userData:", e);
                }
            }

            if (!contact?.phone) {
                throw new Error("Contato sem telefone válido");
            }

            const data = await sendManualWhatsAppText({
                leadId: effectiveLeadId || null,
                phone: contact.phone,
                text: messageText,
                userId: userId || "admin",
            });

            if (!data?.success) {
                throw new Error(data?.message || data?.error || "Erro ao enviar");
            }

            // ✅ Atualiza a mensagem temporária com o ID real do servidor
            if (data?.messageId) {
                const realId = `m-${data.messageId}`;
                
                // Verifica se o socket já não adicionou essa mensagem (evita duplicata)
                if (seenIdsRef.current.has(realId)) {
                    // Socket chegou primeiro, remove a mensagem temporária
                    setMessages(prev => prev.filter(m => m.id !== tempId));
                    seenIdsRef.current.delete(tempId);
                } else {
                    // Atualiza o ID da mensagem temporária para o real
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === tempId
                                ? { ...m, id: realId, status: "sent" }
                                : m
                        )
                    );
                    seenIdsRef.current.add(realId);
                    lastMessageTimeRef.current.set(realId, Date.now());
                }
                seenIdsRef.current.delete(tempId);
            }

        } catch (err: any) {
            logger.error("❌ Erro ao enviar:", err);
            setError(err.message || "Erro ao enviar mensagem");

            // Em caso de erro, marca a mensagem como falha
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId ? { ...m, status: "error" } : m
                )
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [draft, contact, sending, leadId]);

    // 🎬 Enviar mídia
    const handleSendMedia = useCallback(async (file: File, type: MediaType, caption?: string) => {
        if (!contact?.phone) {
            throw new Error('Contato sem telefone válido');
        }

        const tempId = uid("temp-media");
        const previewUrl = URL.createObjectURL(file);
        
        // Mensagem otimista
        const optimisticMessage: Message = {
            id: tempId,
            text: caption || `[${type.toUpperCase()}]`,
            timestamp: new Date(),
            status: 'sent' as const,
            fromMe: true,
            type,
            caption,
            mediaUrl: previewUrl,
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const result = await sendWhatsAppMedia(
                contact.phone,
                file,
                type,
                caption,
                leadId,
                (progress) => {
                    // Opcional: mostrar progresso na UI
                    console.log(`Upload progress: ${progress}%`);
                }
            );

            if (result.success && result.messageId) {
                // Atualizar com ID real
                setMessages(prev =>
                    prev.map(m =>
                        m.id === tempId
                            ? { ...m, id: `m-${result.messageId}`, status: 'sent' as const }
                            : m
                    )
                );
            } else {
                throw new Error(result.error || 'Falha ao enviar');
            }
        } catch (error) {
            // Marcar como erro
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: 'error' as const }
                        : m
                )
            );
            throw error;
        }
    }, [contact, leadId]);

    // 🔄 Auto-scroll para novas mensagens
    useEffect(() => {
        if (messagesContainerRef.current && messages.length > 0) {
            const container = messagesContainerRef.current;
            const isNearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 100;

            if (isNearBottom) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }, 50);
            }
        }
    }, [messages]);
    useEffect(() => {
        inputRef.current?.focus();
    }, [contact]);

    const handleAmandaResume = async () => {
        const key = contact?.leadId;
        if (!key) {
            toast.error("Este contato não possui lead ativo");
            return;
        }

        try {
            setLoading(true);

            // BASE_URL já termina com "/api"
            // então aqui é só "/whatsapp/..."
            const { data } = await API.post(`/whatsapp/amanda-resume/${key}`, {});

            if (data?.success) {
                toast.success(data.message || "Amanda reativada");

                // alterna o valor imediatamente no clique
                const newValue = !manualActive;
                setManualActive(newValue);
                updateContact(contact._id, { manualActive: newValue });

            } else {
                toast.error(data?.error || "Falha ao reativar");
            }
        } catch (err: any) {
            console.error("Erro amanda-resume:", err?.response?.data || err?.message);
            toast.error(err?.response?.data?.error || err?.message || "Erro ao reativar Amanda");
        } finally {
            setLoading(false);
        }
    };


    if (!contact) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
                <div className="text-center p-8 max-w-md">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiUser className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum contato selecionado</h3>
                    <p className="text-gray-500 mb-6">Selecione um contato para começar uma conversa</p>
                    <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className} flex flex-col h-full bg-white shadow-lg rounded-2xl overflow-hidden`}>

            {/* Header - NOVO DESIGN */}
            <div className="px-4 py-3 border-b bg-white flex items-center justify-between gap-4">
                {/* Left: avatar + nome/telefone */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                            {contact?.avatar ? (
                                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                                <FiUser className="w-5 h-5 text-emerald-600" />
                            )}
                        </div>
                        {/* Status online indicator */}
                        {socketConnected && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                            {contact?.name || "Sem nome"}
                            {!socketConnected && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                    Offline
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {contact?.phone}
                        </div>
                    </div>
                </div>

                {/* Right: botões de ação */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Editar contato */}
                    <button
                        onClick={() => setShowEditContact(true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            hasGenericName
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                        {hasGenericName ? "Adicionar nome" : "Editar"}
                    </button>

                    {/* Dropdown de ações */}
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                            className={`p-2 rounded-lg transition-colors ${
                                showActionsDropdown 
                                    ? 'text-gray-700 bg-gray-100' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <FiMoreVertical className="w-5 h-5" />
                        </button>
                        
                        {/* Dropdown menu */}
                        <div className={`absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 transition-all z-50 ${
                            showActionsDropdown ? 'opacity-100 visible' : 'opacity-0 invisible'
                        }`}>
                            <button
                                onClick={() => {
                                    setShowActionsDropdown(false);
                                    handleAmandaResume();
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                            >
                                <span className="text-lg">{manualActive ? "▶️" : "⏸️"}</span>
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {manualActive ? "Reativar Amanda" : "Pausar Amanda"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {manualActive ? "Retomar respostas automáticas" : "Assumir conversa manualmente"}
                                    </div>
                                </div>
                            </button>
                            
                            <div className="h-px bg-gray-200 my-1" />
                            
                            <button
                                onClick={() => {
                                    setShowActionsDropdown(false);
                                    handleCancelFollowup();
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                            >
                                <span className="text-lg">⛔</span>
                                <div>
                                    <div className="font-medium">Cancelar Follow-up</div>
                                    <div className="text-xs text-red-500">Parar automação deste lead</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-green-50/30 relative"
            >
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,#000_1px,transparent_0)] bg-[length:20px_20px]"></div>

                <div className="relative z-10 h-full">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                                <LoadingSpinner />
                                <p className="text-gray-500 mt-3">Carregando mensagens...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 h-full">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                                        <FiSend className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma mensagem</h3>
                                    <p className="text-gray-500 max-w-sm">
                                        Envie uma mensagem para iniciar a conversa com {contact.name}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 flex flex-col">
                                    {loadingMore && (
                                        <div className="flex justify-center py-2">
                                            <div className="text-xs text-gray-500">Carregando mensagens antigas...</div>
                                        </div>
                                    )}

                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className="flex flex-col group"
                                            onMouseEnter={() => setHoveredMessageId(message.id)}
                                            onMouseLeave={() => setHoveredMessageId(null)}
                                        >
                                            <div className="flex items-start gap-2">
                                                {/* {message.fromMe && hoveredMessageId === message.id && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id)}
                                                        disabled={deletingMessageId === message.id}
                                                        className="mt-2 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Deletar mensagem"
                                                    >
                                                        {deletingMessageId === message.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <FiTrash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )} */}
                                                <div className="flex-1">
                                                    <MessageBubble
                                                        text={message.text}
                                                        isMine={message.fromMe || false}
                                                        type={message.type}
                                                        senderName={!message.fromMe ? (contact?.name || "Paciente") : "Você"}
                                                        mediaUrl={message.mediaUrl}
                                                        mediaId={message.mediaId}
                                                        caption={message.caption}
                                                        timestamp={message.timestamp}
                                                    />
                                                </div>
                                            </div>
                                            {message.fromMe && (
                                                <div className="self-end mr-2 mt-1 text-right">
                                                    {message.status === 'read' && <IoCheckmarkDone className="w-4 h-4 text-green-500" />}
                                                    {message.status === 'delivered' && <IoCheckmarkDone className="w-4 h-4 text-gray-500" />}
                                                    {message.status === 'sent' && <IoCheckmark className="w-4 h-4 text-gray-400" />}
                                                    {!['read', 'delivered', 'sent'].includes(message.status) && <IoTime className="w-4 h-4 text-gray-300" />}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} className="h-4" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area - NOVO DESIGN */}
            <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-2">
                    <MediaUpload 
                        phone={contact?.phone || ''}
                        leadId={leadId}
                        onSend={handleSendMedia}
                        disabled={sending}
                    />
                    
                    <AudioRecorder
                        onSend={async (blob, duration) => {
                            // ✅ FIX: Usar audio/webm;codecs=opus para garantir o tipo correto
                            const file = new File([blob], `audio_${Date.now()}.webm`, { 
                                type: 'audio/webm;codecs=opus' 
                            });
                            await handleSendMedia(file, 'audio');
                        }}
                        disabled={sending}
                    />
                    
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            className="w-full py-3 px-4 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-gray-500 resize-none min-h-[48px] max-h-[120px]"
                            placeholder="Digite uma mensagem..."
                            value={draft}
                            onChange={(e) => {
                                setDraft(e.target.value);
                                // Auto-resize
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={sending}
                            autoFocus
                        />
                    </div>
                    
                    <Button
                        className={`p-3 rounded-full transition-all duration-200 ${draft.trim() && !sending
                            ? 'text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm'
                            : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                            }`}
                        onClick={handleSend}
                        disabled={!draft.trim() || sending}
                    >
                        {sending ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FiSend className="w-5 h-5" />
                        )}
                    </Button>

                </div>

                {error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <div className="flex items-center justify-between">
                            <span>{error}</span>
                            <button
                                onClick={() => setError('')}
                                className="text-red-500 hover:text-red-700"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <EditContactModal
                open={showEditContact}
                initialName={contact?.name}
                phone={contact?.phone}
                onClose={() => setShowEditContact(false)}
                onSave={handleSaveName}
            />
        </div>
    );
};

export default React.memo(ChatWindow);