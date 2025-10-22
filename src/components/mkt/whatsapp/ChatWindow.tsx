// src/components/whatsapp/ChatWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMic, FiPaperclip, FiRefreshCw, FiSend, FiUser } from 'react-icons/fi';
import { IoCheckmark, IoCheckmarkDone, IoTime } from 'react-icons/io5';
import { Socket } from 'socket.io-client';
import { useNotification } from '../../../contexts/NotificationContext';
import { getChatMessages, sendWhatsAppText } from '../../../services/whatsappService';
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
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const socketRef = useRef<Socket | null>(null);

    const {
        chatNotification,
        mediaNotification,
        closeChatNotification,
        closeMediaNotification,
    } = useNotification();

    // 🔧 Função de normalização CONSISTENTE
    const normalizePhone = (phone: string): string => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('55')) cleaned = cleaned.substring(2);
        if (cleaned.length === 10) cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
        return cleaned;
    };

    // 🔄 DEBUG: Monitorar todas as notificações
    useEffect(() => {
        console.log('🔔 ChatWindow - Notificações recebidas:', {
            chatNotification,
            mediaNotification,
            contactAtual: contact?.name
        });
    }, [chatNotification, mediaNotification, contact]);

    // 🔄 Efeito para sincronizar notificações com o chat - CORRIGIDO
    useEffect(() => {
        if (!chatNotification || !contact?.phone) {
            console.log('❌ ChatWindow: Sem notificação de chat ou contato');
            return;
        }

        console.log('🔔 ChatWindow: Processando notificação de chat:', chatNotification);

        const cleanPhone = normalizePhone(contact.phone);
        const notificationPhone = normalizePhone(chatNotification.from);

        console.log('🔍 Comparando números:', {
            chat: cleanPhone,
            notification: notificationPhone,
            match: cleanPhone === notificationPhone
        });

        if (cleanPhone === notificationPhone) {
            console.log('✅ ChatWindow: Adicionando mensagem ao chat');

            const newMessage: Message = {
                id: chatNotification.id || `chat-${Date.now()}`,
                text: chatNotification.text,
                timestamp: new Date(chatNotification.timestamp),
                status: 'received',
                fromMe: false,
                type: 'text',
                caption: '',
            };

            setMessages(prev => {
                // Verifica se a mensagem já existe para evitar duplicatas
                const exists = prev.find(m => 
                    m.id === newMessage.id || 
                    (m.text === newMessage.text && m.fromMe === newMessage.fromMe)
                );
                if (exists) {
                    console.log('⚠️ Mensagem duplicada, ignorando');
                    return prev;
                }
                console.log('➕ Nova mensagem adicionada ao estado do chat');
                return [...prev, newMessage];
            });

            // Fecha a notificação após processar
            closeChatNotification();
        } else {
            console.log('❌ Mensagem não é para este contato');
        }
    }, [chatNotification, contact?.phone, closeChatNotification]);

    // 🔄 Efeito para mídias - CORRIGIDO
    useEffect(() => {
        if (!mediaNotification || !contact?.phone) {
            console.log('❌ ChatWindow: Sem notificação de mídia ou contato');
            return;
        }

        console.log('🔔 ChatWindow: Processando notificação de mídia:', mediaNotification);

        const cleanPhone = normalizePhone(contact.phone);
        const notificationPhone = normalizePhone(mediaNotification.from);

        console.log('🔍 Comparando números para mídia:', {
            chat: cleanPhone,
            notification: notificationPhone,
            match: cleanPhone === notificationPhone
        });

        if (cleanPhone === notificationPhone) {
            console.log('✅ ChatWindow: Adicionando mídia ao chat');

            const newMessage: Message = {
                id: mediaNotification.id || `media-${Date.now()}`,
                text: mediaNotification.caption || `[${mediaNotification.type?.toUpperCase()}]`,
                type: mediaNotification.type as any,
                mediaUrl: mediaNotification.url,
                timestamp: new Date(mediaNotification.timestamp),
                fromMe: false,
                status: 'received',
                caption: mediaNotification.caption || '',
            };

            setMessages(prev => {
                const exists = prev.find(m => m.id === newMessage.id);
                if (exists) {
                    console.log('⚠️ Mídia duplicada, ignorando');
                    return prev;
                }
                console.log('➕ Nova mídia adicionada ao estado do chat');
                return [...prev, newMessage];
            });

            closeMediaNotification();
        }
    }, [mediaNotification, contact?.phone, closeMediaNotification]);

    // 📨 Carrega histórico
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

            const formatted = msgs.map((m: any, index: number) => {
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

                return {
                    id: m.id || m._id || `msg-${Date.now()}-${index}`,
                    text: text,
                    type: m.type || 'text',
                    timestamp: timestamp,
                    fromMe: fromMe,
                    status: m.status || (fromMe ? 'sent' : 'received'),
                    mediaUrl: m.mediaUrl || m.url || m.media || m.fileUrl || '',
                    caption: m.caption || m.text || '',
                };
            });

            setMessages(formatted);

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
            console.log('❌ Nenhum contato selecionado');
            setMessages([]);
            return;
        }

        console.log('🔄 Contato alterado para:', contact.name);
        loadMessages(contact.phone);
    }, [contact?.phone, loadMessages]);

    // 📨 Envio de mensagem aprimorado
    const handleSend = async () => {
        if (!draft.trim() || !contact || sending) return;

        const tempId = `temp-${Date.now()}`;
        const newMessage: Message = {
            id: tempId,
            text: draft,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true,
            type: 'text',
            caption: '',
        };

        setSending(true);
        setMessages(prev => [...prev, newMessage]);
        const messageText = draft;
        setDraft('');

        try {
            await sendWhatsAppText(contact.phone, messageText);
            
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: 'delivered', id: `delivered-${Date.now()}` }
                        : m
                )
            );
        } catch (err) {
            console.error('❌ Erro ao enviar mensagem:', err);
            setError('Erro ao enviar mensagem');

            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: 'sent' }
                        : m
                )
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    // 🔄 Auto-scroll para novas mensagens
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        });
    }, [messages]);

    // 🎨 Componente de Status Indicator
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
                    className={`p-3 rounded-2xl transition-all duration-200 ${
                        draft.trim() && !sending
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