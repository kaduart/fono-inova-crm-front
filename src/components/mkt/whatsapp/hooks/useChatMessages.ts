// hooks/useChatMessages.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getChatMessages, loadMoreMessages, sendWhatsAppMedia, deleteWhatsAppMessage } from '../../../../services/whatsappService';
import { socketManager } from '../../../../utils/socketManager';
import { logger } from '../../../../utils/logger';
import { uid } from '../../../../utils/uid';
import { formatMessage } from '../utils/messageHelpers';
import API from '../../../../services/api';
import type { Contact, Message, MediaType } from '../types/chat.types';

export function useChatMessages(contact: Contact | null, leadId?: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());
    
    const seenIdsRef = useRef<Set<string>>(new Set());
    const lastMessageTimeRef = useRef<Map<string, number>>(new Map());
    const previewUrlsRef = useRef<Set<string>>(new Set());
    const lastLoadRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Cleanup de URLs ao desmontar
    useEffect(() => {
        return () => {
            previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            previewUrlsRef.current.clear();
        };
    }, []);

    // 🔧 FIX: Escutar mensagens novas em tempo real (Socket.io)
    useEffect(() => {
        if (!contact?.phone) return;

        logger.info(`[useChatMessages] Registrando listener Socket.io para ${contact.phone}`);

        const unsubscribeNew = socketManager.onMessageNew((payload) => {
            // 🎯 Verifica se a mensagem é deste contato (prioriza contactId)
            const payloadContactId = payload.contactId || payload.contact?._id;
            const isSameContactById = payloadContactId && contact._id === payloadContactId;
            
            // Fallback: comparação por telefone
            const messagePhone = (payload.from || payload.to || '').replace(/\D/g, '');
            const contactPhone = (contact.phone || '').replace(/\D/g, '');
            const isMatchByPhone = messagePhone && contactPhone && (
                messagePhone.includes(contactPhone) || 
                contactPhone.includes(messagePhone) ||
                messagePhone.replace(/^55/, '').includes(contactPhone.replace(/^55/, '')) ||
                contactPhone.replace(/^55/, '').includes(messagePhone.replace(/^55/, ''))
            );
            
            const isMatch = isSameContactById || isMatchByPhone;
            
            if (!isMatch) {
                logger.debug(`[useChatMessages] Mensagem ignorada - não corresponde ao contato. ` +
                    `contactId: ${contact._id}, payloadContactId: ${payloadContactId}, ` +
                    `messagePhone: ${messagePhone}, contactPhone: ${contactPhone}`);
                return;
            }
            
            logger.info(`[useChatMessages] ✅ Mensagem corresponde ao contato: ${contactPhone}`);

            // Evita duplicatas
            const msgId = payload.id || payload.wamid || uid('msg');
            if (seenIdsRef.current.has(msgId)) {
                logger.debug(`[useChatMessages] Mensagem ${msgId} já existe, ignorando`);
                return;
            }

            logger.info(`[useChatMessages] ✅ Nova mensagem recebida via Socket: ${msgId}`);
            seenIdsRef.current.add(msgId);

            // Formata a mensagem
            const newMessage: Message = {
                id: msgId,
                text: payload.text || payload.content || payload.caption || '',
                timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
                status: payload.status || 'sent',
                fromMe: payload.direction === 'outbound',
                type: (payload.type as any) || 'text',
                caption: payload.caption,
                mediaUrl: payload.mediaUrl || payload.url,
            };

            // Adiciona à lista de mensagens
            setMessages(prev => {
                // Evita adicionar duplicata se já existir
                if (prev.some(m => m.id === msgId)) {
                    return prev;
                }
                return [...prev, newMessage];
            });
        });

        const unsubscribeDeleted = socketManager.onMessageDeleted((payload) => {
            if (payload.id) {
                logger.info(`[useChatMessages] ❌ Mensagem deletada: ${payload.id}`);
                setMessages(prev => prev.filter(m => m.id !== payload.id));
            }
        });

        return () => {
            logger.info(`[useChatMessages] Removendo listeners Socket.io para ${contact.phone}`);
            unsubscribeNew();
            unsubscribeDeleted();
        };
    }, [contact?.phone]);

    // Carregar mensagens
    const loadMessages = useCallback(async (phone: string) => {
        if (!phone) return;

        setLoading(true);
        setError('');

        try {
            let msgs = await getChatMessages(phone);

            if (!msgs) {
                setMessages([]);
                setHasMoreMessages(false);
                return;
            }

            msgs.sort((a: any, b: any) => {
                const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
                const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
                return ta - tb;
            });

            const formatted = msgs.map((m: any) => formatMessage(m, phone));
            
            formatted.forEach((msg: Message) => {
                seenIdsRef.current.add(msg.id);
            });

            setMessages(formatted);
            setHasMoreMessages(msgs.length >= 50);
        } catch (err: any) {
            logger.error("Erro ao carregar mensagens:", err);
            setError(err.message || "Erro ao carregar mensagens");
        } finally {
            setLoading(false);
        }
    }, []);

    // Carregar mais mensagens
    const handleLoadMore = useCallback(async () => {
        if (!contact?.phone || loadingMore || !hasMoreMessages) return;

        setLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            const before = oldestMessage?.timestamp?.toISOString();
            
            const older = await loadMoreMessages(contact.phone, before);
            
            if (!older || older.length === 0) {
                setHasMoreMessages(false);
                return;
            }

            const formatted = older.map((m: any) => formatMessage(m, contact.phone));
            setMessages(prev => [...formatted, ...prev]);
            setHasMoreMessages(older.length >= 50);
        } catch (err) {
            logger.error("Erro ao carregar mensagens antigas:", err);
        } finally {
            setLoadingMore(false);
        }
    }, [contact?.phone, loadingMore, hasMoreMessages, messages]);

    // Enviar mensagem de texto
    const handleSendText = useCallback(async (text: string) => {
        if (!text.trim() || !contact?.phone || sending) return;

        const cleanText = text.trim();
        const tempId = uid("temp");
        
        const optimisticMessage: Message = {
            id: tempId,
            text: cleanText,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true,
            type: 'text',
            caption: '',
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setSending(true);

        try {
            const { data } = await API.post("/whatsapp/send-text", {
                phone: contact.phone,
                text: cleanText,
            });
            
            if (data.success && data.messageId) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === tempId
                            ? { ...m, id: `m-${data.messageId}`, status: 'sent' }
                            : m
                    )
                );
            } else {
                throw new Error(data.error || 'Falha ao enviar');
            }
        } catch (err: any) {
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId ? { ...m, status: "error" } : m
                )
            );
            toast.error(err.message || "Erro ao enviar mensagem");
            throw err;
        } finally {
            setSending(false);
        }
    }, [contact?.phone, sending]);

    // Enviar mídia
    const handleSendMedia = useCallback(async (file: File, type: MediaType, caption?: string) => {
        if (!contact?.phone) {
            throw new Error('Contato sem telefone válido');
        }

        const tempId = uid("temp-media");
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        
        setPendingMessages(prev => new Set(prev).add(tempId));
        
        const optimisticMessage: Message = {
            id: tempId,
            text: caption || `[${type.toUpperCase()}]`,
            timestamp: new Date(),
            status: 'sent',
            fromMe: true,
            type,
            caption,
            mediaUrl: previewUrl,
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const result = await sendWhatsAppMedia(
                contact.phone,
                file,
                type,
                caption,
                leadId
            );

            if (result.success && result.messageId) {
                setMessages(prev => {
                    return prev.map(m =>
                        m.id === tempId
                            ? { 
                                ...m, 
                                id: `m-${result.messageId}`, 
                                status: 'sent', 
                                mediaId: result.mediaId 
                                // mediaUrl (preview local) é MANTIDO!
                            }
                            : m
                    );
                });
            } else {
                throw new Error(result.error || 'Falha ao enviar');
            }
        } catch (error) {
            setMessages(prev =>
                prev.map(m =>
                    m.id === tempId ? { ...m, status: 'error' } : m
                )
            );
            throw error;
        } finally {
            setPendingMessages(prev => {
                const next = new Set(prev);
                next.delete(tempId);
                return next;
            });
        }
    }, [contact?.phone, leadId]);

    // Retry de mensagem
    const handleRetry = useCallback((messageId: string, currentText: string) => {
        toast.info('Para reenviar, edite a mensagem e envie novamente');
        return currentText;
    }, []);

    // Deletar mensagem
    const handleDelete = useCallback(async (messageId: string) => {
        try {
            await deleteWhatsAppMessage(messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));
            toast.success('Mensagem deletada');
        } catch (err) {
            toast.error('Erro ao deletar mensagem');
        }
    }, []);

    return {
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
        handleDelete,
        seenIdsRef,
        lastMessageTimeRef,
    };
}
