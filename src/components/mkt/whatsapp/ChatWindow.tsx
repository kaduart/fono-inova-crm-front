// src/components/whatsapp/ChatWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMic, FiPaperclip, FiSend, FiUser } from 'react-icons/fi';
import { IoCheckmark, IoCheckmarkDone, IoTime } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { deleteWhatsAppMessage, getChatMessages, loadMoreMessages, sendManualWhatsAppText, updateContactApi } from '../../../services/whatsappService';
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
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const { updateContact } = useContacts();
    const [showEditContact, setShowEditContact] = useState(false);
    const hasGenericName = isGenericName(contact?.name, contact?.phone);

    const [manualActive, setManualActive] = useState<boolean>(!!contact?.manualActive);
    
    // 🐛 NOVO: Estado de conexão do socket
    const [socketConnected, setSocketConnected] = useState<boolean>(true);

    useEffect(() => {
        setManualActive(!!contact?.manualActive);
    }, [contact?._id, contact?.manualActive]);
    
    // 🐛 NOVO: Monitorar status do socket e buscar mensagens pendentes
    useEffect(() => {
        let wasDisconnected = false;
        
        const checkSocketStatus = () => {
            const isConnected = socketManager.isConnected();
            
            // Detectou reconexão
            if (isConnected && wasDisconnected && contact?.phone) {
                logger.info("[ChatWindow] Socket reconectado, buscando mensagens pendentes...");
                loadMessages(contact.phone);
                wasDisconnected = false;
            }
            
            if (!isConnected) {
                wasDisconnected = true;
            }
            
            setSocketConnected(isConnected);
        };
        
        // Verifica a cada 5 segundos
        const interval = setInterval(checkSocketStatus, 5000);
        checkSocketStatus(); // Verificação inicial
        
        return () => clearInterval(interval);
    }, [contact?.phone, loadMessages]);

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
            socketManager.setActiveChatPhone(null);
            return;
        }

        const chatPhoneE164 = normalizeE164BR(phone);

        // 1️⃣ Define contato ativo
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
                    logger.debug("[ChatWindow] Mensagem duplicada ignorada:", msg.id);
                    return;
                }
                
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

        } catch (err: any) {
            logger.error("❌ Erro ao enviar:", err);
            setError(err.message || "Erro ao enviar mensagem");

            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId ? { ...m, status: "sent" } : m
                )
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [draft, contact, sending, leadId]);


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

            <div className="px-4 py-3 border-b bg-white">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: avatar + nome/telefone */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                            {contact?.avatar ? (
                                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                                <FiUser className="text-emerald-600" />
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                {contact?.name || "Sem nome"}
                                {/* 🐛 NOVO: Indicador de status do socket */}
                                {!socketConnected && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800" title="Conexão instável - recarregue a página se necessário">
                                        ⚠️ Offline
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                                {contact?.phone}
                                {leadId ? ` • Lead: ${leadId}` : ""}
                                {socketConnected && <span className="ml-2 text-green-500">●</span>}
                            </div>
                        </div>
                    </div>

                    {/* Right: botões */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={() => setShowEditContact(true)}
                            className={
                                hasGenericName
                                    ? "bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl"
                                    : "bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-xl"
                            }
                        >
                            {hasGenericName ? "Adicionar nome" : "Editar nome"}
                        </Button>
                        <Button
                            onClick={handleCancelFollowup}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            ⛔ Cancelar Follow-up
                        </Button>

                        <Button
                            onClick={handleAmandaResume}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            🤖  {label}
                        </Button>
                    </div>

                </div>


                {/* Aviso separado */}
                <div className="mt-2 text-xs text-amber-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    Mensagens não podem ser apagadas após o envio.
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

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                    <button className="p-3 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
                        <FiPaperclip className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
                        <FiMic className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            rows={3}
                            className="w-full py-3 px-4 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all placeholder:text-gray-500 resize-none"
                            placeholder="Digite uma mensagem..."
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
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
                        className={`p-3 rounded-2xl transition-all duration-200 ${draft.trim() && !sending
                            ? 'text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-sm'
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