// src/components/whatsapp/ChatWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMic, FiPaperclip, FiSend } from 'react-icons/fi';
import { Socket } from 'socket.io-client';
import { useNotification } from '../../../contexts/NotificationContext';
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

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, sendMessage, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ✅ Use useRef para socket para evitar reconexões
    const socketRef = useRef<Socket | null>(null);

    const { chatNotification, closeChatNotification, showChatNotification } = useNotification();

    // 🔄 Efeito para sincronizar notificações com o chat
    useEffect(() => {
        if (!chatNotification || !contact?.phone) return;

        console.log('🔔 ChatWindow: Verificando notificação de chat...', { chatNotification, contact });

        // Função para normalizar números - CORRIGIDA para adicionar o nono dígito
        const normalizePhone = (phone) => {
            let cleaned = phone.replace(/\D/g, '');

            // Remove o "55" do início se existir
            if (cleaned.startsWith('55')) {
                cleaned = cleaned.substring(2);
            }

            // SE o número tem 10 dígitos (DDD + 8 dígitos), adiciona o nono dígito "9"
            if (cleaned.length === 10) {
                cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
            }

            return cleaned;
        };

        const cleanPhone = normalizePhone(contact.phone);
        const notificationPhone = normalizePhone(chatNotification.from);

        console.log('🔍 Comparando números NORMALIZADOS:', {
            chat: cleanPhone,
            notification: notificationPhone,
            match: cleanPhone === notificationPhone
        });

        console.log('📞 DEBUG NÚMEROS:', {
            contactPhoneOriginal: contact.phone,
            notificationOriginal: chatNotification.from,
            cleanPhone: cleanPhone,
            notificationPhone: notificationPhone,
            lengthContact: cleanPhone.length,
            lengthNotification: notificationPhone.length
        });

        if (cleanPhone === notificationPhone) {
            console.log('✅ ChatWindow: Adicionando mensagem ao chat');

            const newMessage: Message = {
                id: `notification-${chatNotification.id}`,
                text: chatNotification.text,
                timestamp: new Date(chatNotification.timestamp),
                status: 'received',
                fromMe: false,
                type: 'text',
            };

            setMessages(prev => {
                const exists = prev.find(m => m.id === newMessage.id);
                if (exists) {
                    console.log('⚠️ Mensagem duplicada, ignorando');
                    return prev;
                }
                console.log('➕ Nova mensagem adicionada ao estado');
                return [...prev, newMessage];
            });

            // Fecha a notificação após processar
            closeChatNotification();
        } else {
            console.log('❌ Mensagem não é para este contato');
        }
    }, [chatNotification, contact?.phone, closeChatNotification]);


    // ======================================================
    // 🔹 Carrega histórico ao trocar contato - CORRIGIDO
    // ======================================================
    // ======================================================
    // 🔹 Carrega histórico ao trocar contato - CORRIGIDO
    // ======================================================
    const loadMessages = useCallback(async (phone: string) => {
        if (!phone) {
            console.log('❌ Phone vazio para carregar histórico');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('📂 Carregando mensagens para:', phone);

            // NÃO normalize o phone aqui - a API pode esperar o formato original
            const msgs = await getChatMessages(phone);

            console.log('📨 Resposta bruta da API:', {
                rawResponse: msgs,
                type: typeof msgs,
                isArray: Array.isArray(msgs),
                length: msgs?.length,
                firstItem: msgs?.[0]
            });

            if (!msgs) {
                console.log('⚠️ API retornou null/undefined');
                setMessages([]);
                return;
            }

            if (!Array.isArray(msgs)) {
                console.log('⚠️ API não retornou array, convertendo:', msgs);
                // Tenta extrair array de propriedades comuns
                const possibleArrays = msgs.data || msgs.messages || msgs.chat || [msgs];
                if (Array.isArray(possibleArrays)) {
                    msgs = possibleArrays;
                } else {
                    console.log('❌ Não foi possível extrair array de mensagens');
                    setMessages([]);
                    return;
                }
            }

            if (msgs.length === 0) {
                console.log('ℹ️ Nenhuma mensagem no histórico');
                setMessages([]);
                return;
            }

            // Converte as mensagens - versão mais flexível
            const formatted = msgs.map((m: any, index: number) => {
                console.log(`📝 Mensagem ${index}:`, m);

                // Determina se a mensagem é do usuário atual
                let fromMe = false;
                if (m.direction === 'outbound' || m.fromMe === true || m.type === 'outgoing') {
                    fromMe = true;
                }

                // Tenta extrair o texto de várias propriedades possíveis
                let text = '';
                if (typeof m === 'string') {
                    text = m;
                } else {
                    text = m.text || m.content || m.body || m.message || m.caption || '';
                }

                // Tenta extrair timestamp de várias propriedades possíveis
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
                    mediaUrl: m.mediaUrl || m.url || m.media || '',
                };
            });

            console.log('✅ Mensagens formatadas:', formatted);
            setMessages(formatted);

        } catch (err: any) {
            console.error('❌ Erro ao buscar histórico:', err);
            console.log('🔧 Detalhes do erro:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Erro ao carregar mensagens: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    }, []);

    // ======================================================
    // 🔹 Efeito principal para troca de contato
    // ======================================================
    useEffect(() => {
        if (!contact?.phone) {
            setMessages([]);
            return;
        }

        console.log('🔄 Contato alterado:', contact.phone);
        loadMessages(contact.phone);

    }, [contact?.phone, loadMessages]);

    // No ChatWindow.tsx - Adicione este useEffect de debug
    useEffect(() => {
        console.log('🔍 DEBUG ChatWindow:', {
            hasContact: !!contact,
            contactPhone: contact?.phone,
            messagesCount: messages.length,
            hasChatNotification: !!chatNotification,
            chatNotification: chatNotification
        });
    }, [contact, messages, chatNotification]);


    // ======================================================
    // 🔹 Funções de tratamento de mensagens - CORRIGIDAS
    // ======================================================
    const handleIncomingMessage = useCallback((data: any) => {
        if (!contact?.phone) return;

        const cleanPhone = contact.phone.replace(/\D/g, '');
        const incoming = data.from?.replace(/\D/g, '') || '';

        console.log('🔍 Comparando números:', { incoming, cleanPhone });

        // ✅ Verifica se a mensagem é para este contato
        if (incoming.endsWith(cleanPhone)) {
            console.log('✅ Mensagem para este contato, adicionando...');

            const newMessage: Message = {
                id: data.id || `incoming-${Date.now()}`,
                text: data.text || data.content || '',
                type: data.type || 'text',
                timestamp: new Date(data.timestamp || Date.now()),
                fromMe: false,
                status: 'received',
            };

            setMessages(prev => {
                // ✅ Evita duplicatas
                const exists = prev.find(m => m.id === newMessage.id);
                if (exists) return prev;

                return [...prev, newMessage];
            });
        }
    }, [contact?.phone]);

    const handleIncomingMedia = useCallback((data: any) => {
        if (!contact?.phone) return;

        const cleanPhone = contact.phone.replace(/\D/g, '');
        const incoming = data.from?.replace(/\D/g, '') || '';

        if (incoming.endsWith(cleanPhone)) {
            const newMessage: Message = {
                id: data.id || `media-${Date.now()}`,
                text: data.caption || `[${data.type?.toUpperCase()}]`,
                type: data.type,
                mediaUrl: data.url || '',
                timestamp: new Date(data.timestamp || Date.now()),
                fromMe: false,
                status: 'received',
            };

            setMessages(prev => {
                const exists = prev.find(m => m.id === newMessage.id);
                if (exists) return prev;

                return [...prev, newMessage];
            });
        }
    }, [contact?.phone]);

    const handleStatusUpdate = useCallback((data: any) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, status: data.status }
                    : msg
            )
        );
    }, []);

    // ======================================================
    // 📨 Envio de mensagem - CORRIGIDO
    // ======================================================
    const handleSend = async () => {
        if (!draft.trim() || !contact) return;

        const tempId = `temp-${Date.now()}`;
        const newMessage: Message = {
            id: tempId,
            text: draft,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true,
            type: 'text',
        };

        // ✅ Adiciona mensagem localmente IMEDIATAMENTE
        setMessages(prev => [...prev, newMessage]);
        setDraft('');

        try {
            await sendWhatsAppText(contact.phone, draft);
            console.log('✅ Mensagem enviada com sucesso');

            // ✅ Atualiza status para entregue
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: 'delivered' }
                        : m
                )
            );

        } catch (err) {
            console.error('❌ Erro ao enviar mensagem:', err);
            setError('Erro ao enviar mensagem');

            // ✅ Marca como erro
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: 'sent' } // mantém como sent se falhou
                        : m
                )
            );
        }
    };

    // ======================================================
    // 🔄 Auto-scroll para novas mensagens
    // ======================================================
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        });
    }, [messages]);

    // ======================================================
    // 🧹 Cleanup do socket ao desmontar
    // ======================================================
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    // Debug do estado das mensagens
    useEffect(() => {
        console.log('💾 ESTADO DAS MENSAGENS:', {
            total: messages.length,
            messages: messages.map(m => ({
                id: m.id,
                text: m.text.substring(0, 50) + '...',
                fromMe: m.fromMe,
                timestamp: m.timestamp.toISOString()
            }))
        });
    }, [messages]);
    // ======================================================
    // 🎨 Renderização
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
                    <p className="text-sm text-gray-500">{contact.phone}</p>
                </div>
            </div>

            {/* Botão de recarregar histórico */}
            <button
                onClick={() => loadMessages(contact.phone)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                title="Recarregar histórico"
            >
                🔄
            </button>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat bg-opacity-5">
                {loading && (
                    <div className="flex justify-center items-center h-20">
                        <LoadingSpinner />
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <p>Nenhuma mensagem ainda</p>
                        <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
                    </div>
                )}

                <div className="space-y-2 flex flex-col">
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
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

                {error && (
                    <div className="mt-2 text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;