// src/components/whatsapp/ChatWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMic, FiPaperclip, FiRefreshCw, FiSend, FiTrash2, FiUser } from 'react-icons/fi';
import { IoCheckmark, IoCheckmarkDone, IoTime } from 'react-icons/io5';
import { deleteWhatsAppMessage, getChatMessages, sendManualWhatsAppText } from '../../../services/whatsappService';
import { confirmToast } from '../../../utils/confirmToast';
import { normalizeE164BR } from '../../../utils/phone';
import { uid } from '../../../utils/uid';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import MessageBubble from './MessageBubble';

interface Contact {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    status?: string;
    lastSeen?: string;
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
    sendMessage: (phone: string, text: string) => Promise<void>;
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

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, sendMessage, className, leadId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // 📨 Carrega histórico - Função estável que não muda
    const loadMessages = useCallback(async (phone: string) => {
        if (!phone) return;

        setLoading(true);
        setError('');

        try {
            console.log('📂 Carregando mensagens para:', phone);
            let msgs = await getChatMessages(phone);

            if (!msgs) {
                console.log('⚠️ Nenhuma mensagem encontrada');
                setMessages([]);
                return;
            }

            if (!Array.isArray(msgs)) {
                console.log('🔄 Convertendo resposta para array');
                const possibleArrays = msgs.data || msgs.messages || msgs.chat || [msgs];
                msgs = Array.isArray(possibleArrays) ? possibleArrays : [];
            }

            console.log(`📨 ${msgs.length} mensagens carregadas`);

            const formatted = msgs.map((m: any) => {
                let fromMe = false;
                if (m.direction === 'outbound' || m.fromMe === true || m.type === 'outgoing') {
                    fromMe = true;
                }

                let text = '';
                if (typeof m === 'string') {
                    text = m;
                } else {
                    text = m.text || m.content || m.body || m.message || m.caption || '';
                }

                let timestamp = new Date();
                if (m.timestamp) {
                    timestamp = new Date(m.timestamp);
                } else if (m.createdAt) {
                    timestamp = new Date(m.createdAt);
                } else if (m.date) {
                    timestamp = new Date(m.date);
                } else if (m.time) {
                    timestamp = new Date(m.time);
                }

                const id = pickMsgId(m);
                const msgType =
                    m.type === 'sticker'
                        ? 'sticker'
                        : (m.type || 'text');

                return {
                    id,
                    text,
                    type: msgType,
                    timestamp,
                    fromMe,
                    status: m.status || (fromMe ? 'sent' : 'received'),
                    mediaUrl: m.mediaUrl || m.url || m.media || m.fileUrl || '',
                    mediaId: m.mediaId || undefined,     // 👈 IMPORTANTE
                    caption: m.caption || m.text || '',
                };

            });

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
            console.error('❌ Erro ao buscar histórico:', err);
            setError('Erro ao carregar mensagens: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    }, []);

    // 🔄 Efeito principal para troca de contato
    useEffect(() => {
        if (!contact?.phone) {
            setMessages([]);
            (window as any).activeChatPhone = null;
            return;
        }

        (window as any).activeChatPhone = normalizeE164BR(contact.phone);
        loadMessages(contact.phone);

        return () => {
            (window as any).activeChatPhone = null;
        };
    }, [contact?.phone, loadMessages]);

    // 📡 Escuta direta de eventos do Socket.IO em tempo real
    useEffect(() => {
        const socket = (window as any).globalSocket;
        if (!socket || !contact?.phone) return;

        const normalize = (v: string) => (v || "").replace(/\D/g, "").replace(/^55/, "");
        const chatPhone = normalize(contact.phone);

        const onNew = (data: any) => {
            console.log('🔔 Socket recebeu mensagem:', {
                from: data.from,
                to: data.to,
                direction: data.direction,
                content: data.content?.substring(0, 50),
                timestamp: data.timestamp
            });

            try {
                const from = normalize(data.from);
                const to = normalize(data.to);

                console.log('🔍 Verificando se pertence ao chat:', {
                    from,
                    to,
                    chatPhone,
                    match: from === chatPhone || to === chatPhone
                });

                if (from !== chatPhone && to !== chatPhone) {
                    console.log('⏭️ Mensagem ignorada - não pertence a este chat');
                    return;
                }

                const isMedia = data.type && data.type !== "text" && data.type !== "template";
                const body = isMedia
                    ? (data.caption || `[${String(data.type).toUpperCase()}]`)
                    : (data.content ?? data.text ?? "");

                const id = pickMsgId(data);

                // ✅ AQUI define o tipo, incluindo sticker
                const msgType =
                    data.type === 'sticker'
                        ? 'sticker'
                        : (data.type || 'text');

                const newMessage: Message = {
                    id,
                    text: body,
                    type: msgType,
                    mediaUrl: data.mediaUrl || data.url || '',
                    mediaId: data.mediaId || undefined,
                    caption: data.caption || "",
                    timestamp: new Date(data.timestamp || Date.now()),
                    fromMe: data.direction ? data.direction === "outbound" : (from !== chatPhone),
                    status: data.status || "received",
                };

                console.log('[onNew] tipo=', newMessage.type, 'mediaId=', newMessage.mediaId, 'mediaUrl=', newMessage.mediaUrl);

                setMessages(prev => {
                    if (prev.some(m => m.id === id)) {
                        return prev;
                    }

                    const optimisticIndex = prev.findIndex(m =>
                        m.fromMe &&
                        newMessage.fromMe &&
                        !m.id.startsWith("m-") &&
                        m.text === newMessage.text
                    );

                    if (optimisticIndex !== -1) {
                        const updated = [...prev];
                        const oldTemp = updated[optimisticIndex];

                        updated[optimisticIndex] = {
                            ...oldTemp,
                            id,
                            status: newMessage.status || "delivered",
                            timestamp: newMessage.timestamp,
                        };

                        seenIdsRef.current.delete(oldTemp.id);
                        seenIdsRef.current.add(id);

                        return updated;
                    }

                    seenIdsRef.current.add(id);
                    return [...prev, newMessage];
                });

            } catch (e) {
                console.error("❌ [ChatWindow] Falha ao processar message:new:", e);
            }
        };

        const onDeleted = (data: any) => {
            console.log('🗑️ Socket recebeu delete:', data);

            try {
                const from = normalize(data.from);
                const to = normalize(data.to);

                if (from !== chatPhone && to !== chatPhone) {
                    return;
                }

                const cleanId = data.id;
                const prefixedId = `m-${data.id}`;

                setMessages(prev => {
                    const filtered = prev.filter(m => m.id !== cleanId && m.id !== prefixedId);
                    if (filtered.length < prev.length) {
                        console.log('✅ Mensagem removida da UI via socket');
                    }
                    return filtered;
                });

                seenIdsRef.current.delete(cleanId);
                seenIdsRef.current.delete(prefixedId);

            } catch (e) {
                console.error("❌ [ChatWindow] Falha ao processar message:deleted:", e);
            }
        };

        socket.on("message:new", onNew);
        socket.on("message:deleted", onDeleted);

        return () => {
            socket.off("message:new", onNew);
            socket.off("message:deleted", onDeleted);
        };
    }, [contact?.phone]);


    // 🗑️ DELETAR mensagem
    const handleDeleteMessage = useCallback(async (messageId: string) => {
        if (deletingMessageId) return;

        const confirmed = await confirmToast('Deseja realmente deletar esta mensagem?');
        if (!confirmed) return;

        setDeletingMessageId(messageId);

        try {
            const data = await deleteWhatsAppMessage(messageId);

            if (!data.success) {
                throw new Error(data.error || 'Erro ao deletar mensagem');
            }

            setMessages(prev => prev.filter(m => m.id !== messageId));
            seenIdsRef.current.delete(messageId);

        } catch (err: any) {
            console.error('❌ Erro ao deletar:', err);
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
                    console.warn("Erro ao parsear userData:", e);
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
            console.log("📤 Resposta do backend (service):", data);

            if (!data?.success) {
                throw new Error(data?.message || data?.error || "Erro ao enviar");
            }


            console.log("✅ Mensagem enviada com sucesso");

        } catch (err: any) {
            console.error("❌ Erro ao enviar:", err);
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
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            {contact?.avatar ? (
                                <img
                                    src={contact.avatar}
                                    alt={contact.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                    <FiUser className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-gray-800 text-lg truncate">{contact.name}</h2>
                            <p className="text-sm text-green-600 font-medium">Online</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => loadMessages(contact.phone)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                            title="Recarregar histórico"
                        >
                            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
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
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className="flex flex-col group"
                                            onMouseEnter={() => setHoveredMessageId(message.id)}
                                            onMouseLeave={() => setHoveredMessageId(null)}
                                        >
                                            <div className="flex items-start gap-2">
                                                {message.fromMe && hoveredMessageId === message.id && (
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
                                                )}
                                                <div className="flex-1">
                                                    <MessageBubble
                                                        text={message.text}
                                                        isMine={message.fromMe || false}
                                                        type={message.type}
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
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full py-3 px-4 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all placeholder:text-gray-500"
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
                    <button
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
                    </button>
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
        </div>
    );
};

export default React.memo(ChatWindow);