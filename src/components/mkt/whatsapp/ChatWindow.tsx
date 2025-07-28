import React, { useEffect, useRef, useState } from 'react';
import { BsCheck2, BsCheck2All } from 'react-icons/bs';
import { FiMic, FiPaperclip, FiSend } from 'react-icons/fi';

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
    status: 'sent' | 'delivered' | 'read';
    fromMe?: boolean;
}

interface ChatWindowProps {
    contact: Contact | null;
    sendMessage: (phone: string, text: string) => Promise<void>;
    className?: string;
}

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    return (
        <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${message.fromMe
                ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                : 'bg-gray-100 text-gray-800 self-start rounded-tl-none'
                }`}
        >
            <p className="whitespace-pre-wrap">{message.text}</p>
            <div className={`text-xs mt-1 flex items-center justify-end space-x-1 ${message.fromMe ? 'text-indigo-200' : 'text-gray-500'
                }`}>
                <span>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.fromMe && (
                    <span>
                        {message.status === 'read' ? (
                            <BsCheck2All className="text-blue-300" />
                        ) : message.status === 'delivered' ? (
                            <BsCheck2All />
                        ) : (
                            <BsCheck2 />
                        )}
                    </span>
                )}
            </div>
        </div>
    );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, sendMessage, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Simulação de mensagens iniciais
    useEffect(() => {
        if (!contact) return;

        setLoading(true);
        setError('');

        // Simulando requisição à API
        const timer = setTimeout(() => {
            try {
                const demoMessages: Message[] = [
                    {
                        id: '1',
                        text: 'Olá! Como você está?',
                        timestamp: new Date(Date.now() - 3600000),
                        status: 'read',
                        fromMe: false
                    },
                    {
                        id: '2',
                        text: 'Estou bem, obrigado! E você?',
                        timestamp: new Date(Date.now() - 1800000),
                        status: 'read',
                        fromMe: true
                    },
                    {
                        id: '3',
                        text: 'Também estou ótimo! Estava pensando em marcar aquela reunião para amanhã.',
                        timestamp: new Date(Date.now() - 1200000),
                        status: 'read',
                        fromMe: false
                    }
                ];
                setMessages(demoMessages);
            } catch (e) {
                setError('Erro ao carregar mensagens');
            } finally {
                setLoading(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [contact]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!draft.trim() || !contact) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: draft,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true
        };

        setMessages(prev => [...prev, newMessage]);
        setDraft('');
        inputRef.current?.focus();

        try {
            await sendMessage(contact.phone, draft);

            // Atualiza status da mensagem para "entregue"
            setMessages(prev => prev.map(msg =>
                msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
            ));
        } catch (e) {
            setError('Erro ao enviar mensagem');
        }
    };

    if (!contact) {
        return (
            <div className={`${className} flex flex-col items-center justify-center bg-gray-50`}>
                <div className="text-center p-8 max-w-md">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-700 mb-2">Nenhum contato selecionado</h3>
                    <p className="text-gray-500">Selecione um contato para começar a conversar</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className} flex flex-col bg-white`}>
            {/* Cabeçalho do chat */}
            <div className="p-4 border-b flex items-center bg-gray-50">
                <div className="relative">
                    {contact.avatar ? (
                        <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                                {contact.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    {contact.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                </div>

                <div className="ml-3 flex-1">
                    <h2 className="font-semibold text-gray-800">{contact.name}</h2>
                    <p className="text-xs text-gray-500">
                        {contact.status === 'online'
                            ? 'Online'
                            : contact.lastSeen
                                ? `Visto por último ${contact.lastSeen}`
                                : ''}
                    </p>
                </div>

                <div className="flex space-x-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Área de mensagens */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat bg-opacity-5">
                {loading && (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-pulse text-gray-500">Carregando mensagens...</div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg max-w-xs mx-auto text-center">
                        {error}
                    </div>
                )}

                {!loading && !error && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-1">Nenhuma mensagem</h3>
                        <p className="text-gray-500 max-w-xs">Envie uma mensagem para iniciar a conversa</p>
                    </div>
                )}

                <div className="space-y-2 flex flex-col">
                    {messages.map(message => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Área de input */}
            <div className="p-3 border-t bg-gray-50">
                <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200">
                        <FiPaperclip className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200">
                        <FiMic className="w-5 h-5" />
                    </button>

                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full py-2 px-4 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Digite uma mensagem"
                            aria-label="Mensagem"
                        />
                    </div>

                    <button
                        className={`p-2 rounded-full ${draft.trim() ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-gray-400 bg-gray-200 cursor-not-allowed'}`}
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