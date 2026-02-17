// src/components/whatsapp/ChatWindow.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiSend, FiUser, FiMoreVertical } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { updateContactApi, MediaType } from '../../../services/whatsappService';
import { socketManager } from '../../../utils/socketManager';
import { logger } from '../../../utils/logger';
import { Button } from '../../ui/Button';
import { useContacts } from '../../../contexts/ContactsContext';
import EditContactModal from './EditContactModal';
import { MediaUpload } from './MediaUpload';
import { AudioRecorder } from './AudioRecorder';
import { ChatMessageList } from './ChatMessageList';
import { useChatMessages } from './hooks/useChatMessages';
import { useAmandaControl } from './hooks/useAmandaControl';
import { isGenericName } from './utils/messageHelpers';
import type { Contact, ChatWindowProps } from './types/chat.types';

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, className, leadId }) => {
    // Hooks personalizados
    const {
        messages,
        loading,
        loadingMore,
        hasMoreMessages,
        error,
        sending,
        pendingMessages,
        messagesEndRef,
        messagesContainerRef,
        loadMessages,
        handleLoadMore,
        handleSendText,
        handleSendMedia,
        handleRetry,
    } = useChatMessages(contact, leadId);

    const {
        manualActive,
        loading: amandaLoading,
        syncWithContact,
        handleResumeAmanda,
        handlePauseAmanda,
        handleCancelFollowup,
    } = useAmandaControl(contact);

    // Estados locais
    const [draft, setDraft] = useState('');
    const [showEditContact, setShowEditContact] = useState(false);
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const [socketConnected, setSocketConnected] = useState(true);
    
    const { updateContact } = useContacts();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hasGenericNameValue = isGenericName(contact?.name, contact?.phone);

    // Sincronizar manualActive com contact
    useEffect(() => {
        syncWithContact(!!contact?.manualActive);
    }, [contact?.manualActive, syncWithContact]);

    // Monitorar status do socket
    useEffect(() => {
        const checkSocketStatus = () => {
            setSocketConnected(socketManager.isConnected());
        };
        
        const interval = setInterval(checkSocketStatus, 5000);
        checkSocketStatus();
        
        return () => clearInterval(interval);
    }, []);

    // Carregar mensagens quando socket reconecta (com throttle)
    const lastLoadRef = useRef<number>(0);
    useEffect(() => {
        if (!socketConnected || !contact?.phone) return;
        
        const now = Date.now();
        if (now - lastLoadRef.current > 5000) {
            logger.info("[ChatWindow] Socket conectado, verificando mensagens...");
            lastLoadRef.current = now;
            loadMessages(contact.phone);
        }
    }, [socketConnected, contact?.phone, loadMessages]);

    // Carregar mensagens quando muda de contato
    useEffect(() => {
        if (contact?.phone) {
            loadMessages(contact.phone);
            setDraft('');
        }
    }, [contact?.phone, loadMessages]);

    // Fechar dropdown quando clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowActionsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-scroll para novas mensagens
    useEffect(() => {
        if (messagesContainerRef.current && messages.length > 0) {
            const container = messagesContainerRef.current;
            const isNearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 100;

            if (isNearBottom) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 50);
            }
        }
    }, [messages, messagesContainerRef, messagesEndRef]);

    // Focar input quando muda de contato
    useEffect(() => {
        inputRef.current?.focus();
    }, [contact]);

    // Handlers
    const handleSend = useCallback(async () => {
        if (!draft.trim()) return;
        
        const text = draft;
        setDraft('');
        
        try {
            await handleSendText(text);
            // 🔴 Atualiza estado local: Amanda foi pausada automaticamente
            syncWithContact(true);
        } catch {
            setDraft(text); // Restaura texto em caso de erro
        }
    }, [draft, handleSendText, syncWithContact]);

    const handleSaveName = async (newName: string) => {
        if (!contact?._id) throw new Error("Contato inválido");
        const updated = await updateContactApi(contact._id, { name: newName });
        updateContact(contact._id, { name: updated?.name ?? newName });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!contact) {
        return (
            <div className={`${className} flex flex-col h-full bg-white shadow-lg rounded-2xl overflow-hidden items-center justify-center text-gray-400`}>
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FiUser className="w-8 h-8" />
                </div>
                <p>Selecione um contato para iniciar a conversa</p>
            </div>
        );
    }

    return (
        <div className={`${className} flex flex-col h-full bg-white shadow-lg rounded-2xl overflow-hidden`}>
            {/* Header */}
            <div className="px-4 py-3 border-b bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                            {contact?.avatar ? (
                                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                                <FiUser className="w-5 h-5 text-emerald-600" />
                            )}
                        </div>
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
                        <div className="text-xs text-gray-500 truncate">{contact?.phone}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowEditContact(true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            hasGenericNameValue
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        aria-label={hasGenericNameValue ? "Adicionar nome" : "Editar"}
                    >
                        {hasGenericNameValue ? "Adicionar nome" : "Editar"}
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            aria-label="Mais ações"
                            aria-expanded={showActionsDropdown}
                            aria-haspopup="menu"
                        >
                            <FiMoreVertical className="w-5 h-5" />
                        </button>
                        
                        {showActionsDropdown && (
                            <div 
                                className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50"
                                role="menu"
                            >
                                {/* Botão Pausar/Reativar Amanda */}
                                {manualActive ? (
                                    <button
                                        onClick={() => { setShowActionsDropdown(false); handleResumeAmanda(); }}
                                        disabled={amandaLoading}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                                        role="menuitem"
                                    >
                                        <span>▶️</span>
                                        <div>
                                            <div className="font-medium">Reativar Amanda</div>
                                            <div className="text-xs text-gray-500">Retomar automação</div>
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setShowActionsDropdown(false); handlePauseAmanda(); }}
                                        disabled={amandaLoading}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                                        role="menuitem"
                                    >
                                        <span>⏸️</span>
                                        <div>
                                            <div className="font-medium">Pausar Amanda</div>
                                            <div className="text-xs text-gray-500">Modo manual</div>
                                        </div>
                                    </button>
                                )}
                                
                                <div className="h-px bg-gray-200 my-1" />
                                
                                <button
                                    onClick={() => { setShowActionsDropdown(false); handleCancelFollowup(); }}
                                    disabled={amandaLoading}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 disabled:opacity-50"
                                    role="menuitem"
                                >
                                    <span>⛔</span>
                                    <div>
                                        <div className="font-medium">Cancelar Follow-up</div>
                                        <div className="text-xs text-red-500">Parar automação</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <ChatMessageList
                messages={messages}
                contact={contact}
                loading={loading}
                loadingMore={loadingMore}
                hasMoreMessages={hasMoreMessages}
                pendingMessages={pendingMessages}
                onLoadMore={handleLoadMore}
                onRetry={handleRetry}
            />

            {/* Input Area */}
            <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-2">
                    <MediaUpload 
                        phone={contact?.phone || ''}
                        leadId={leadId}
                        onSend={async (file, type) => {
                            await handleSendMedia(file, type);
                            syncWithContact(true); // 🔴 Amanda pausada após envio
                        }}
                        disabled={sending}
                    />
                    
                    <AudioRecorder
                        onSend={async (blob) => {
                            const file = new File([blob], `audio_${Date.now()}.webm`, { 
                                type: 'audio/webm;codecs=opus' 
                            });
                            await handleSendMedia(file, 'audio');
                            syncWithContact(true); // 🔴 Amanda pausada após envio
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
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                            autoFocus
                        />
                    </div>
                    
                    <Button
                        className={`p-3 rounded-full transition-all ${
                            draft.trim() && !sending
                                ? 'text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm'
                                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        }`}
                        onClick={handleSend}
                        disabled={!draft.trim() || sending}
                        aria-label="Enviar"
                    >
                        <FiSend className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Modals */}
            {showEditContact && contact && (
                <EditContactModal
                    open={showEditContact}
                    initialName={contact.name}
                    phone={contact.phone}
                    onClose={() => setShowEditContact(false)}
                    onSave={handleSaveName}
                />
            )}
        </div>
    );
};

export default ChatWindow;
