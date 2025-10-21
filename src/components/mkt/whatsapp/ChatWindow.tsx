// src/components/whatsapp/ChatWindow.tsx
import React, { useEffect, useRef, useState } from 'react';
import { FiMic, FiPaperclip, FiSend } from 'react-icons/fi';
import { io } from 'socket.io-client';
import { getChatMessages, sendWhatsAppText } from '../../../services/whatsappService';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

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
    type?: 'text' | 'image' | 'audio' | 'video';
    mediaUrl?: string;
}

interface ChatWindowProps {
    contact: Contact | null;
    sendMessage: (phone: string, text: string) => Promise<void>;
    className?: string;
}

// ======================================================
// 💬 Bolha da mensagem
// ======================================================
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => (
    <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${message.fromMe
                ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                : 'bg-gray-100 text-gray-800 self-start rounded-tl-none'
            }`}
    >
        {message.type === 'image' && message.mediaUrl ? (
            <img src={message.mediaUrl} alt="Imagem" className="rounded-lg mb-2 max-w-[220px]" />
        ) : message.type === 'audio' && message.mediaUrl ? (
            <audio controls className="w-full mb-1">
                <source src={message.mediaUrl} />
            </audio>
        ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
        )}

        <div
            className={`text-xs mt-1 flex items-center justify-end space-x-1 ${message.fromMe ? 'text-indigo-200' : 'text-gray-500'
                }`}
        >
            <span>
                {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </span>
        </div>
    </div>
);

// ======================================================
// 🧠 Componente principal
// ======================================================
const ChatWindow: React.FC<ChatWindowProps> = ({ contact, sendMessage, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ✅ Cria conexão com Socket.IO corretamente
    const socket = useRef(
        io(import.meta.env.VITE_BASE_URL || 'http://localhost:5000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })
    ).current;

    // ======================================================
    // 🔹 Carrega histórico ao trocar contato
    // ======================================================
    useEffect(() => {
        if (!contact?.phone) return;

        const normalized = contact.phone.replace(/\D/g, '');
        setMessages([]);
        setLoading(true);
        setError('');

        getChatMessages(normalized)
            .then((msgs) => {
                const formatted = msgs.map((m: any) => ({
                    id: m._id,
                    text: m.content || '',
                    type: m.type || 'text',
                    timestamp: new Date(m.timestamp),
                    fromMe: m.direction === 'outbound',
                    status: m.status,
                    mediaUrl: m.mediaUrl || '',
                }));
                setMessages(formatted);
            })
            .catch((err) => {
                console.error('❌ Erro ao buscar histórico:', err);
                setError('Erro ao carregar mensagens');
            })
            .finally(() => setLoading(false));
    }, [contact?.phone]);

    // ======================================================
    // ⚡ Recebe mensagens/mídias em tempo real via Socket.IO
    // ======================================================
    useEffect(() => {
        if (!contact?.phone) return;
        const cleanPhone = contact.phone.replace(/\D/g, '');

        const handleNewMessage = (data: any) => {
            console.log('📨 Nova mensagem recebida via socket:', data);
            const incoming = data.from?.replace(/\D/g, '') || '';
            if (incoming.endsWith(cleanPhone)) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        text: data.text || data.content || '',
                        type: data.type || 'text',
                        timestamp: new Date(data.timestamp || Date.now()),
                        fromMe: false,
                        status: 'received',
                    },
                ]);
            }
        };

        const handleNewMedia = (data: any) => {
            console.log('🖼️ Nova mídia recebida via socket:', data);
            const incoming = data.from?.replace(/\D/g, '') || '';
            if (incoming.endsWith(cleanPhone)) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        text: data.caption || `[${data.type.toUpperCase()}]`,
                        type: data.type,
                        mediaUrl: data.url || '',
                        timestamp: new Date(data.timestamp || Date.now()),
                        fromMe: false,
                        status: 'received',
                    },
                ]);
            }
        };

        socket.on('whatsapp:new_message', handleNewMessage);
        socket.on('whatsapp:new_media', handleNewMedia);

        return () => {
            socket.off('whatsapp:new_message', handleNewMessage);
            socket.off('whatsapp:new_media', handleNewMedia);
        };
    }, [contact?.phone]);

    // ======================================================
    // 📨 Envio de mensagem
    // ======================================================
    const handleSend = async () => {
        if (!draft.trim() || !contact) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: draft,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true,
            type: 'text',
        };

        setMessages((prev) => [...prev, newMessage]);
        setDraft('');

        try {
            await sendWhatsAppText(contact.phone, draft);
            console.log('✅ Mensagem enviada com sucesso');

            setMessages((prev) =>
                prev.map((m) => (m.id === newMessage.id ? { ...m, status: 'delivered' } : m))
            );

            setTimeout(() => {
                const normalized = contact.phone.replace(/\D/g, '');
                getChatMessages(normalized).then((msgs) => {
                    const formatted = msgs.map((m: any) => ({
                        id: m._id,
                        text: m.content || '',
                        type: m.type || 'text',
                        timestamp: new Date(m.timestamp),
                        fromMe: m.direction === 'outbound',
                        status: m.status,
                        mediaUrl: m.mediaUrl || '',
                    }));
                    setMessages(formatted);
                });
            }, 800);
        } catch (err) {
            console.error('❌ Erro ao enviar mensagem:', err);
            setError('Erro ao enviar mensagem');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ======================================================
    // UI
    // ======================================================
    if (!contact) {
        return (
            <div className={`${className} flex flex-col items-center justify-center bg-gray-50`}>
                <div className="text-center p-8 max-w-md">
                    <h3 className="text-xl font-medium text-gray-700 mb-2">Nenhum contato selecionado</h3>
                    <p className="text-gray-500">Selecione um contato para começar a conversar</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className} flex flex-col bg-white`}>
            {/* Cabeçalho */}
            <div className="p-4 border-b flex items-center bg-gray-50">
                <div className="relative">
                    {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                                {contact.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                <div className="ml-3 flex-1">
                    <h2 className="font-semibold text-gray-800">{contact.name}</h2>
                </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat bg-opacity-5">
                {loading && (
                    <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                    </div>
                )}
                {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <p>Nenhuma mensagem</p>
                    </div>
                )}
                <div className="space-y-2 flex flex-col">
                    {messages.map((m) => (
                        <MessageBubble key={m.id} message={m} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-gray-50">
                <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200">
                        <FiPaperclip className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200">
                        <FiMic className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        className="flex-1 py-2 px-4 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Digite uma mensagem"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        className={`p-2 rounded-full ${draft.trim()
                                ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                            }`}
                        onClick={handleSend}
                        disabled={!draft.trim()}
                    >
                        <FiSend className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
