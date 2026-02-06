// ChatMessageList.tsx
import React, { useRef } from 'react';
import { IoCheckmark, IoCheckmarkDone, IoTime } from 'react-icons/io5';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import MessageBubble from './MessageBubble';
import type { Message, Contact } from './types/chat.types';

interface ChatMessageListProps {
    messages: Message[];
    contact: Contact | null;
    loading: boolean;
    loadingMore: boolean;
    hasMoreMessages: boolean;
    pendingMessages: Set<string>;
    onLoadMore: () => void;
    onRetry: (messageId: string, text: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
    messages,
    contact,
    loading,
    loadingMore,
    hasMoreMessages,
    pendingMessages,
    onLoadMore,
    onRetry,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-gray-500 mt-3">Carregando mensagens...</p>
                </div>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">💬</span>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma mensagem</h3>
                <p className="text-gray-500 max-w-sm">
                    Envie uma mensagem para iniciar a conversa com {contact?.name || 'este contato'}
                </p>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-green-50/30 relative"
        >
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,#000_1px,transparent_0)] bg-[length:20px_20px]" />

            <div className="relative z-10 p-4 space-y-3 flex flex-col">
                {/* Botão carregar mais */}
                {hasMoreMessages && (
                    <div className="flex justify-center py-2">
                        <button
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            className="text-sm text-gray-500 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                        >
                            {loadingMore ? 'Carregando...' : 'Carregar mensagens antigas'}
                        </button>
                    </div>
                )}

                {messages.map((message) => (
                    <MessageItem
                        key={message.id}
                        message={message}
                        contact={contact}
                        isPending={pendingMessages.has(message.id)}
                        onRetry={onRetry}
                    />
                ))}
                <div ref={messagesEndRef} className="h-4" />
            </div>
        </div>
    );
};

// Item individual de mensagem
interface MessageItemProps {
    message: Message;
    contact: Contact | null;
    isPending: boolean;
    onRetry: (messageId: string, text: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, contact, isPending, onRetry }) => {
    return (
        <div className="flex flex-col group">
            <div className="flex items-start gap-2">
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
            
            {/* Status da mensagem */}
            {message.fromMe && (
                <div className="self-end mr-2 mt-1 text-right flex items-center gap-1">
                    {isPending ? (
                        <div 
                            className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" 
                            title="Enviando..."
                        />
                    ) : (
                        <>
                            {message.status === 'read' && (
                                <IoCheckmarkDone className="w-4 h-4 text-green-500" aria-label="Lida" />
                            )}
                            {message.status === 'delivered' && (
                                <IoCheckmarkDone className="w-4 h-4 text-gray-500" aria-label="Entregue" />
                            )}
                            {message.status === 'sent' && (
                                <IoCheckmark className="w-4 h-4 text-gray-400" aria-label="Enviada" />
                            )}
                            {message.status === 'error' && (
                                <button
                                    onClick={() => onRetry(message.id, message.text)}
                                    className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                                    title="Falha ao enviar - clique para tentar novamente"
                                    aria-label="Reenviar mensagem"
                                >
                                    <IoTime className="w-4 h-4" />
                                    <span className="text-xs">Falha</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatMessageList;
