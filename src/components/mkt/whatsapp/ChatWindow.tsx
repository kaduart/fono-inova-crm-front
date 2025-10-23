// src/components/whatsapp/ChatWindow.tsx
import React, { useEffect, useRef, useState } from 'react';
import { FiMic, FiPaperclip, FiRefreshCw, FiSend, FiUser } from 'react-icons/fi';
import { IoCheckmark, IoCheckmarkDone, IoTime } from 'react-icons/io5';
import { getChatMessages, sendWhatsAppText } from '../../../services/whatsappService';
import { toUIMsg, UIMsg } from '../../../utils/chat';
import { normalizeE164BR } from '../../../utils/phone';
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
    type?: 'text' | 'image' | 'audio' | 'video' | 'document';
    mediaUrl?: string;
    caption: string;
}

interface ChatWindowProps {
    contact: Contact | null;
    sendMessage: (phone: string, text: string) => Promise<void>;
    className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, sendMessage, className }) => {
    // dentro de: const ChatWindow: React.FC<ChatWindowProps> = ({ contact, sendMessage, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // 🔹 Carregar histórico (formato E.164 + normalização para o UI)
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!contact?.phone) {
                setMessages([]);
                return;
            }
            const chatPhone = normalizeE164BR(contact.phone);
            const data = await getChatMessages(chatPhone);
            // data: { from, to, type, content, caption, timestamp, direction, ... }
            const list: UIMsg[] = (Array.isArray(data) ? data : []).map((r: any) => toUIMsg(r, chatPhone));

            // mapeia UIMsg -> Message (shape que o <MessageBubble> espera)
            const formatted: Message[] = list.map((u) => ({
                id: u.id,
                text: u.text,                                  // sempre preenchido via toUIMsg
                type: (u.type as any) || 'text',
                mediaUrl: u.mediaUrl,
                caption: u.caption || '',
                timestamp: u.timestamp,
                fromMe: !!u.fromMe,
                status: (u.status as any) || (u.fromMe ? 'sent' : 'received'),
            }));

            if (mounted) setMessages(formatted);
        })();
        return () => { mounted = false; };
    }, [contact?.phone]);

    // 📡 Tempo real via Socket.IO — 1 único evento (texto + mídia) + reconciliação de "temp-*"
    useEffect(() => {
        const socket = (window as any).globalSocket;
        if (!socket || !contact?.phone) return;

        const chatPhone = normalizeE164BR(contact.phone);
        console.log("🔗 [ChatWindow] ouvindo message:new p/", chatPhone);

        const onNew = (data: any) => {
            try {
                const from = normalizeE164BR(data.from);
                const to = normalizeE164BR(data.to);
                if (from !== chatPhone && to !== chatPhone) return;

                const isMedia = data.type && data.type !== "text" && data.type !== "template";
                const body = isMedia
                    ? (data.caption || `[${String(data.type).toUpperCase()}]`)
                    : (data.content ?? data.text ?? "");

                const incoming: Message = {
                    id: data.id || `sock-${Date.now()}`,
                    text: body,
                    type: data.type || "text",
                    mediaUrl: data.mediaUrl,
                    caption: data.caption || "",
                    timestamp: new Date(data.timestamp || Date.now()),
                    fromMe: data.direction ? data.direction === "outbound" : (from !== chatPhone),
                    status: data.status || "received",
                };

                setMessages(prev => {
                    // 1) dedupe por id
                    if (prev.some(m => m.id === incoming.id)) return prev;

                    // 2) reconciliação: se for outbound do back, substitui a "temp-*" otimista
                    if (incoming.fromMe && incoming.type === "text") {
                        const idxTemp = prev.findIndex(m =>
                            m.fromMe === true &&
                            m.type === "text" &&
                            (m.text?.trim() || "") === (incoming.text?.trim() || "") &&
                            String(m.id).startsWith("temp-") &&
                            Math.abs(incoming.timestamp.getTime() - m.timestamp.getTime()) < 15_000
                        );
                        if (idxTemp >= 0) {
                            const clone = [...prev];
                            clone[idxTemp] = { ...incoming, status: "delivered" };
                            return clone;
                        }
                    }

                    return [...prev, incoming];
                });
            } catch (e) {
                console.error("❌ [ChatWindow] Falha ao processar message:new:", e);
            }
        };

        socket.on("message:new", onNew);
        return () => socket.off("message:new", onNew);
    }, [contact?.phone]);

    // 📨 Envio de mensagem com pré-visualização "temp-*"
    const handleSend = async () => {
        if (!draft.trim() || !contact || sending) return;

        const tempId = `temp-${Date.now()}`;
        const optimistic: Message = {
            id: tempId,
            text: draft,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true,
            type: 'text',
            caption: '',
        };

        setSending(true);
        setMessages(prev => [...prev, optimistic]);
        const messageText = draft;
        setDraft('');

        try {
            await sendWhatsAppText(contact.phone, messageText);
            // 👇 opcional: deixar que o evento do back faça a reconciliação.
            // Se quiser manter o "delivered" instantâneo, descomente abaixo.
            // setMessages(prev =>
            //   prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m)
            // );
        } catch (err) {
            console.error('❌ Erro ao enviar mensagem:', err);
            setError('Erro ao enviar mensagem');
            setMessages(prev =>
                prev.map(m => (m.id === tempId ? { ...m, status: 'sent' } : m))
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    // 🔄 Auto-scroll para novas mensagens
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages]);

    // ✅ Status indicator (igual ao seu)
    const StatusIndicator = ({ status }: { status: Message['status'] }) => {
        switch (status) {
            case 'read':
                return <IoCheckmarkDone className="w-4 h-4 text-green-500" />;
            case 'delivered':
                return <IoCheckmarkDone className="w-4 h-4 text-gray-500" />;
            case 'sent':
                return <IoCheckmark className="w-4 h-4 text-gray-400" />;
            default:
                return <IoTime className="w-4 h-4 text-gray-300" />;
        }
    };

    // 🎨 Componente de Contact Header
    const ContactHeader = () => (
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
                        <h2 className="font-semibold text-gray-800 text-lg truncate">{contact?.name}</h2>
                        <p className="text-sm text-green-600 font-medium">Online</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => contact && loadMessages(contact.phone)}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                        title="Recarregar histórico"
                    >
                        <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );

    // 🎨 Componente de Message Input
    const MessageInput = () => (
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
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        disabled={sending}
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
    );

    // 🎨 Componente de Empty State
    const EmptyState = () => (
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

    // 🎨 Componente de Loading State
    const LoadingState = () => (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <LoadingSpinner />
                <p className="text-gray-500 mt-3">Carregando mensagens...</p>
            </div>
        </div>
    );

    if (!contact) {
        return <EmptyState />;
    }

    return (
        <div className={`${className} flex flex-col h-full bg-white shadow-lg rounded-2xl overflow-hidden`}>
            <ContactHeader />

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-green-50/30 relative">
                {/* Pattern sutil de fundo */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,#000_1px,transparent_0)] bg-[length:20px_20px]"></div>

                <div className="relative z-10 h-full">
                    {loading ? (
                        <LoadingState />
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
                                    {messages.map((message, index) => (
                                        <div key={message.id} className="flex flex-col">
                                            <MessageBubble
                                                text={message.text}
                                                isMine={message.fromMe || false}
                                                type={message.type}
                                                mediaUrl={message.mediaUrl}
                                                caption={message.caption}
                                            />
                                            {message.fromMe && (
                                                <div className={`self-end mr-2 mt-1 ${message.fromMe ? 'text-right' : 'text-left'}`}>
                                                    <StatusIndicator status={message.status} />
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

            <MessageInput />
        </div>
    );
};

export default ChatWindow;