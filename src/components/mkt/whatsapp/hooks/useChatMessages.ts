// hooks/useChatMessages.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getChatMessages, getChatMessagesByLeadId, loadMoreMessages, sendWhatsAppMedia, deleteWhatsAppMessage } from '../../../../services/whatsappService';
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
    const cursorRef = useRef<string | null>(null); // V2 cursor para paginação por leadId

    // Cleanup de URLs ao desmontar
    useEffect(() => {
        return () => {
            previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            previewUrlsRef.current.clear();
        };
    }, []);

    // 🔧 FIX: Escutar mensagens novas em tempo real (Socket.io)
    useEffect(() => {
        if (!contact?._id) return;

        console.log(`[useChatMessages] 📡 Registrando listener para contactId=${contact._id} phone=${contact.phone}`);

        const unsubscribeNew = socketManager.onMessageNew((payload) => {
            console.log(`[useChatMessages] 📨 message:new recebido:`, {
                payloadContactId: payload.contactId,
                payloadContact_id: payload.contact?._id,
                myContactId: contact._id,
                myPhone: contact.phone,
                from: payload.from,
                to: payload.to,
                direction: payload.direction,
            });
            
            // 🎯 PRIORIDADE 1: Match por contactId (mais confiável)
            const payloadContactId = payload.contactId || payload.contact?._id;
            if (payloadContactId && String(contact._id) === String(payloadContactId)) {
                console.log(`[useChatMessages] ✅ Match por contactId: ${contact._id}`);
                // cai para adicionar mensagem abaixo
            } else {
                // Fallback: comparação por telefone (com normalização extra)
                const msgFrom = String(payload.from || '').replace(/\D/g, '');
                const msgTo = String(payload.to || '').replace(/\D/g, '');
                const myPhone = String(contact.phone || '').replace(/\D/g, '');
                
                // Normaliza removendo prefixo 55 e trailing digits para comparar núcleo
                const normalizeForMatch = (p: string) => p.replace(/^55/, '').replace(/\D/g, '');
                const cores = [normalizeForMatch(msgFrom), normalizeForMatch(msgTo)];
                const myCore = normalizeForMatch(myPhone);
                
                const isMatchByPhone = myCore.length >= 9 && cores.some(c => 
                    c === myCore || c.includes(myCore) || myCore.includes(c)
                );
                
                if (!isMatchByPhone) {
                    console.log(`[useChatMessages] ❌ Não match por telefone. myCore=${myCore}, cores=${cores.join('|')}`);
                    return;
                }
                console.log(`[useChatMessages] ✅ Match por telefone`);
            }

            // Evita duplicatas
            const msgId = payload.id || payload.wamid || uid('msg');
            if (seenIdsRef.current.has(msgId)) {
                console.log(`[useChatMessages] ⚠️ Mensagem ${msgId} já existe, ignorando`);
                return;
            }

            console.log(`[useChatMessages] 🆕 Nova mensagem aceita: ${msgId}`);
            seenIdsRef.current.add(msgId);

            const msgTimestamp = payload.timestampMs 
                ? new Date(payload.timestampMs) 
                : payload.timestamp ? new Date(payload.timestamp) : new Date();
            
            const newMessage: Message = {
                id: msgId,
                text: payload.text || payload.content || payload.caption || '',
                timestamp: msgTimestamp,
                status: payload.status || 'sent',
                fromMe: payload.direction === 'outbound',
                type: (payload.type as any) || 'text',
                caption: payload.caption,
                mediaUrl: payload.mediaUrl || payload.url,
            };

            setMessages(prev => {
                if (prev.some(m => m.id === msgId)) return prev;
                console.log(`[useChatMessages] 💾 Adicionando mensagem ao chat. Total antes: ${prev.length}`);
                return [...prev, newMessage];
            });
        });

        const unsubscribeDeleted = socketManager.onMessageDeleted((payload) => {
            if (payload.id) {
                console.log(`[useChatMessages] 🗑️ Mensagem deletada: ${payload.id}`);
                setMessages(prev => prev.filter(m => m.id !== payload.id));
            }
        });

        return () => {
            console.log(`[useChatMessages] 🧹 Removendo listeners para ${contact._id}`);
            unsubscribeNew();
            unsubscribeDeleted();
        };
    }, [contact?._id, contact?.phone]);

    // Carregar mensagens — usa V2 (leadId) quando disponível
    const loadMessages = useCallback(async (phone: string) => {
        if (!phone && !leadId) return;

        setLoading(true);
        setError('');
        cursorRef.current = null;

        try {
            let msgs: any[];
            let hasMore = false;

            if (leadId) {
                // V2: cursor-based, sem aggregation pesada
                const result = await getChatMessagesByLeadId(leadId, { limit: 30 });
                msgs = result.data;
                hasMore = result.hasMore;
                cursorRef.current = result.nextCursor;
            } else {
                msgs = await getChatMessages(phone);
                hasMore = msgs.length >= 50;
            }

            if (!msgs || msgs.length === 0) {
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
            setHasMoreMessages(hasMore);
        } catch (err: any) {
            logger.error("Erro ao carregar mensagens:", err);
            setError(err.message || "Erro ao carregar mensagens");
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    // Carregar mais mensagens (V2 cursor / V1 timestamp fallback)
    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasMoreMessages) return;
        if (!leadId && !contact?.phone) return;

        setLoadingMore(true);
        try {
            if (leadId) {
                // V2: cursor-based
                const result = await getChatMessagesByLeadId(leadId, {
                    cursor: cursorRef.current || undefined,
                    limit: 30,
                });
                const older = result.data || [];
                cursorRef.current = result.nextCursor;

                if (!older.length) { setHasMoreMessages(false); return; }

                const formatted = older.map((m: any) => formatMessage(m, contact?.phone || ''));
                setMessages(prev => [...formatted, ...prev]);
                setHasMoreMessages(result.hasMore);
            } else {
                // V1 fallback
                const before = messages[0]?.timestamp?.toISOString();
                const result = await loadMoreMessages(contact!.phone, before);
                const older = result.data || [];

                if (!older.length) { setHasMoreMessages(false); return; }

                const formatted = older.map((m: any) => formatMessage(m, contact!.phone));
                setMessages(prev => [...formatted, ...prev]);
                setHasMoreMessages(result.hasMore);
            }
        } catch (err) {
            logger.error("Erro ao carregar mensagens antigas:", err);
        } finally {
            setLoadingMore(false);
        }
    }, [leadId, contact?.phone, loadingMore, hasMoreMessages, messages]);

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
                ...(leadId && { leadId }),
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
