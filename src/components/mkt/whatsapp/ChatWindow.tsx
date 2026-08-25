// src/components/whatsapp/ChatWindow.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiSend, FiUser, FiMoreVertical, FiMessageCircle, FiCalendar, FiCheckCircle, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { updateContactApi, MediaType } from '../../../services/whatsappService';
import { socketManager } from '../../../utils/socketManager';
import { logger } from '../../../utils/logger';
import { normalizeE164BR } from '../../../utils/phone';
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
import { enviarViaExtensao, type PreAgendamentoChat } from './extensionHelper';
import LeadJourneyPanel from './LeadJourneyPanel';
import { useChat } from '../../../contexts/ChatContext';

// Interface local (já importamos do helper)
type PreAgendamentoLocal = PreAgendamentoChat;

// 🆕 Tipo para mensagens de sistema/erro
export interface SystemMessage {
    id: string;
    text: string;
    type: 'error' | 'warning' | 'info' | 'success';
    timestamp: Date;
}

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
    const [preAgendamentos, setPreAgendamentos] = useState<PreAgendamentoChat[]>([]);
    const [loadingPreAgendamentos, setLoadingPreAgendamentos] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true); // 🆕 Controla se é primeira carga
    const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]); // 🆕 Mensagens de sistema/erro
    
    const { updateContact } = useContacts();
    const { registerChatWindow, unregisterChatWindow } = useChat(); // 🆕 Contexto do chat
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hasGenericNameValue = isGenericName(contact?.name, contact?.phone);
    const [isWindowOpen, setIsWindowOpen] = useState(true); // 🆕 Para verificar se está aberto

    // 🆕 Função para adicionar mensagem de sistema/erro no chat - DEFINIDA ANTES DE USAR
    const addSystemMessage = useCallback((text: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
        const newMessage: SystemMessage = {
            id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text,
            type,
            timestamp: new Date()
        };
        setSystemMessages(prev => [...prev, newMessage]);
        
        // Auto-remove após 10 segundos para infos e warnings, mantém erros por 30s
        const timeout = type === 'error' ? 30000 : 10000;
        setTimeout(() => {
            setSystemMessages(prev => prev.filter(m => m.id !== newMessage.id));
        }, timeout);
    }, []);

    // 🆕 Registrar no contexto quando montar (com isOpen)
    useEffect(() => {
        registerChatWindow({ 
            addSystemMessage: (msg) => addSystemMessage(msg.text, msg.type),
            isOpen: () => isWindowOpen && !!contact 
        });
        return () => {
            unregisterChatWindow();
        };
    }, [registerChatWindow, unregisterChatWindow, addSystemMessage]);

    // Sincronizar manualActive com contact
    useEffect(() => {
        syncWithContact(!!contact?.manualActive);
    }, [contact?.manualActive, syncWithContact]);

    // ✅ Marcar o contato ativo no socketManager para suprimir notificação do chat aberto
    useEffect(() => {
        if (!contact?.phone) return;
        const normalized = normalizeE164BR(contact.phone).replace(/^55/, '');
        socketManager.setActiveChatPhone(normalized);
        return () => {
            socketManager.setActiveChatPhone(null);
        };
    }, [contact?.phone]);

    // ✅ Monitorar status do socket via evento (instantâneo, sem polling)
    useEffect(() => {
        setSocketConnected(socketManager.isConnected());
        const unsubConnect = socketManager.onReconnect(() => {
            setSocketConnected(true);
        });
        const unsubDisconnect = socketManager.on("disconnect", () => {
            setSocketConnected(false);
        });
        return () => {
            unsubConnect();
            unsubDisconnect();
        };
    }, []);

    // ✅ Recarregar mensagens quando socket reconecta (busca gap)
    // 🛡️ DEBOUNCE: Evita reloads constantes se o socket estiver instável
    useEffect(() => {
        if (!contact?.phone) return;
        
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let lastReload = 0;
        const MIN_RELOAD_INTERVAL = 30000; // Máximo 1 reload a cada 30 segundos
        
        const unsub = socketManager.onReconnect(() => {
            const now = Date.now();
            const timeSinceLastReload = now - lastReload;
            
            // Se já recarregou recentemente, ignora
            if (timeSinceLastReload < MIN_RELOAD_INTERVAL) {
                logger.info(`[ChatWindow] Socket reconectado, mas ignorado (último reload há ${Math.round(timeSinceLastReload/1000)}s)`);
                return;
            }
            
            // Limpa timer anterior se existir
            if (debounceTimer) clearTimeout(debounceTimer);
            
            // Agenda reload com debounce de 2s (evita múltiplas reconexões seguidas)
            debounceTimer = setTimeout(() => {
                logger.info("[ChatWindow] Socket reconectado — recarregando mensagens para buscar gap");
                lastReload = Date.now();
                // 🔄 Recarrega SEM mostrar loading spinner (isInitialLoad = false)
                loadMessages(contact.phone);
            }, 2000);
        });
        
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            unsub();
        };
    }, [contact?.phone, loadMessages]);

    // Carregar mensagens quando muda de contato
    useEffect(() => {
        if (contact?.phone) {
            setIsInitialLoad(true); // Marca como carga inicial
            loadMessages(contact.phone).then(() => {
                setIsInitialLoad(false); // Após carregar, marca como não-inicial
            });
            setDraft('');
            setSystemMessages([]); // 🆕 Limpa mensagens de sistema ao trocar de contato
        }
    }, [contact?.phone, loadMessages]);

    // 🆕 Combina mensagens normais com mensagens de sistema
    const allMessages = React.useMemo(() => {
        console.log('[ChatWindow] Messages from API:', messages.length, messages);
        console.log('[ChatWindow] System messages:', systemMessages.length);
        const combined = [
            ...messages,
            ...systemMessages.map(sm => ({
                id: sm.id,
                text: sm.text,
                timestamp: sm.timestamp,
                status: 'sent' as const,
                fromMe: true,
                type: 'system' as const,
                caption: '',
                isSystem: true,
                systemType: sm.type
            }))
        ];
        console.log('[ChatWindow] Combined messages:', combined.length);
        // Ordena por timestamp
        return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }, [messages, systemMessages]);

    // 🆕 Buscar pré-agendamentos do contato
    useEffect(() => {
        if (!contact?.phone) {
            setPreAgendamentos([]);
            return;
        }
        
        const fetchPreAgendamentos = async () => {
            setLoadingPreAgendamentos(true);
            try {
                // Busca pré-agendamentos pelo telefone
                const phone = contact.phone.replace(/\D/g, '');
                const response = await fetch(`/api/v2/pre-appointments?phone=${phone}&operationalStatus=novo,em_analise,contatado`);
                if (response.ok) {
                    const data = await response.json();
                    setPreAgendamentos(data.data || []);
                }
            } catch (err) {
                console.error('Erro ao buscar pré-agendamentos:', err);
            } finally {
                setLoadingPreAgendamentos(false);
            }
        };
        
        fetchPreAgendamentos();
    }, [contact?.phone]);

    // ✅ Scroll para o final quando mensagens terminam de carregar
    useEffect(() => {
        if (!loading && messages.length > 0 && messagesContainerRef.current) {
            // Pequeno delay para garantir que o DOM foi atualizado
            setTimeout(() => {
                const container = messagesContainerRef.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                    console.log('[ChatWindow] Scroll para o final:', container.scrollHeight);
                }
            }, 150);
        }
    }, [loading, messages.length]);

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
                            {contact?.name || contact?.phone || "Sem nome"}
                            {!socketConnected && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-red-100 text-red-700">
                                    Offline
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{contact?.phone}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Botão Abrir no WhatsApp */}
                    <button
                        onClick={() => {
                            const phone = contact?.phone?.replace(/\D/g, '');
                            if (phone) {
                                const message = encodeURIComponent(`Olá ${contact?.name?.split(' ')[0] || ''}, aqui é da Clínica Fono Inova 💚`);
                                window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                            }
                        }}
                        className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        aria-label="Abrir no WhatsApp"
                        title="Abrir no WhatsApp"
                    >
                        <FiMessageCircle className="w-5 h-5" />
                    </button>

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

            {/* 🆕 Painel de Pré-Agendamentos */}
            {preAgendamentos.length > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <FiCalendar className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                            Pré-Agendamento Pendente
                        </span>
                    </div>
                    
                    {preAgendamentos.map((pre) => {
                        const data = new Date(pre.preferredDate + 'T12:00:00').toLocaleDateString('pt-BR');
                        
                        return (
                            <div key={pre._id} className="bg-white rounded-lg p-3 shadow-sm border border-amber-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {pre.patientInfo.fullName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            📅 {data} {pre.preferredTime && `às ${pre.preferredTime}`}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            🩺 {pre.specialty}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        pre.urgency === 'critica' ? 'bg-red-100 text-red-700' :
                                        pre.urgency === 'alta' ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {pre.urgency}
                                    </span>
                                </div>
                                
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={async () => {
                                            const result = await enviarViaExtensao({ ...pre, responsibleName: contact?.name || undefined }, 'confirmacao');
                                            if (result.success) {
                                                toast.success('✅ Mensagem injetada no WhatsApp Web! Pressione Enter para enviar.', {
                                                    position: 'bottom-right',
                                                    autoClose: 4000,
                                                    icon: '📨'
                                                });
                                            } else {
                                                toast.error(result.error, {
                                                    position: 'bottom-right',
                                                    autoClose: 6000
                                                });
                                            }
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                        <FiCheckCircle className="w-3 h-3" />
                                        Confirmar
                                    </button>
                                    
                                    <button
                                        onClick={async () => {
                                            const result = await enviarViaExtensao({ ...pre, responsibleName: contact?.name || undefined }, 'lembrete');
                                            if (result.success) {
                                                toast.success('🔔 Lembrete injetado no WhatsApp Web! Pressione Enter para enviar.', {
                                                    position: 'bottom-right',
                                                    autoClose: 4000,
                                                    icon: '⏰'
                                                });
                                            } else {
                                                toast.error(result.error, {
                                                    position: 'bottom-right',
                                                    autoClose: 6000
                                                });
                                            }
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg transition-colors"
                                    >
                                        <FiClock className="w-3 h-3" />
                                        Lembrete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Jornada do lead no site */}
            <LeadJourneyPanel leadId={leadId} />

            {/* 🆕 Mensagem de Erro */}
            {error && (
                <div className="bg-red-50 border-b border-red-200 p-3 flex items-start gap-2">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <div className="flex-1">
                        <p className="text-sm text-red-700 font-medium">Erro ao carregar mensagens</p>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                    <button 
                        onClick={() => contact?.phone && loadMessages(contact.phone)}
                        className="text-xs text-red-700 hover:text-red-800 font-medium px-2 py-1 bg-red-100 rounded hover:bg-red-200 transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            <ChatMessageList
                messages={allMessages} // 🆕 Usa allMessages (normais + sistema)
                contact={contact}
                loading={loading}
                loadingMore={loadingMore}
                hasMoreMessages={hasMoreMessages}
                pendingMessages={pendingMessages}
                onLoadMore={handleLoadMore}
                onRetry={handleRetry}
                messagesEndRef={messagesEndRef}
                messagesContainerRef={messagesContainerRef}
                isInitialLoad={isInitialLoad}
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
