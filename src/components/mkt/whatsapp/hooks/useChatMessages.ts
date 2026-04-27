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
    const previewUrlsRef = useRef<Set<string>>(new Set());
    const lastLoadRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<string | null>(null);

    // 🔧 Socket: mensagens em tempo real
    useEffect(() => {
        if (!contact?._id) return;

        const handler = (payload: any) => {
            console.log('[useChatMessages] 📥 RAW payload recebido:', JSON.stringify(payload).substring(0, 200));
            console.log('[useChatMessages] 🔍 contact._id:', contact._id, 'contact.phone:', contact.phone);
            
            // Match por contactId (prioridade) ou por telefone
            const byId = payload.contactId && String(contact._id) === String(payload.contactId);
            const byPhone = contact.phone && (
                String(payload.from || '').includes(contact.phone.replace(/\D/g, '')) ||
                String(payload.to || '').includes(contact.phone.replace(/\D/g, ''))
            );
            console.log('[useChatMessages] 🔍 byId:', byId, 'byPhone:', byPhone, 'payload.contactId:', payload.contactId, 'payload.from:', payload.from, 'payload.to:', payload.to);
            if (!byId && !byPhone) {
                console.log('[useChatMessages] ❌ Não bateu com contato atual, ignorando');
                return;
            }

            const msgId = payload.id || payload.wamid || uid('msg');
            if (seenIdsRef.current.has(msgId)) return;
            seenIdsRef.current.add(msgId);

            console.log('[useChatMessages] 💬 Nova mensagem no chat:', msgId, payload.text?.slice(0, 30));

            const newMessage: Message = {
                id: msgId,
                text: payload.text || payload.content || '',
                timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
                status: payload.status || 'sent',
                fromMe: payload.direction === 'outbound',
                type: (payload.type as any) || 'text',
                caption: payload.caption,
                mediaUrl: payload.mediaUrl || payload.url,
            };

            setMessages(prev => prev.some(m => m.id === msgId) ? prev : [...prev, newMessage]);
        };

        const unsub = socketManager.onMessageNew(handler);
        return () => unsub();
    }, [contact?._id]);

    const loadMessages = useCallback(async (phone: string) => {
        if (!phone && !leadId) return;
        setLoading(true);
        setError('');
        cursorRef.current = null;
        try {
            let msgs: any[];
            let hasMore = false;
            if (leadId) {
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
            msgs.sort((a: any, b: any) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime());
            const formatted = msgs.map((m: any) => formatMessage(m, phone));
            formatted.forEach((msg: Message) => seenIdsRef.current.add(msg.id));
            setMessages(formatted);
            setHasMoreMessages(hasMore);
        } catch (err: any) {
            logger.error("Erro ao carregar mensagens:", err);
            setError(err.message || "Erro ao carregar mensagens");
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasMoreMessages) return;
        if (!leadId && !contact?.phone) return;
        setLoadingMore(true);
        try {
            if (leadId) {
                const result = await getChatMessagesByLeadId(leadId, { cursor: cursorRef.current || undefined, limit: 30 });
                const older = result.data || [];
                cursorRef.current = result.nextCursor;
                if (!older.length) { setHasMoreMessages(false); return; }
                const formatted = older.map((m: any) => formatMessage(m, contact?.phone || ''));
                setMessages(prev => [...formatted, ...prev]);
                setHasMoreMessages(result.hasMore);
            } else {
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
            const { data } = await API.post("/whatsapp/send-text", { phone: contact.phone, text: cleanText, ...(leadId && { leadId }) });
            if (data.success && data.messageId) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: `m-${data.messageId}`, status: 'sent' } : m));
            } else {
                throw new Error(data.error || 'Falha ao enviar');
            }
        } catch (err: any) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m));
            toast.error(err.message || "Erro ao enviar mensagem");
            throw err;
        } finally {
            setSending(false);
        }
    }, [contact?.phone, sending]);

    const handleSendMedia = useCallback(async (file: File, type: MediaType, caption?: string) => {
        if (!contact?.phone) throw new Error('Contato sem telefone válido');
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
            const result = await sendWhatsAppMedia(contact.phone, file, type, caption, leadId);
            if (result.success && result.messageId) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: `m-${result.messageId}`, status: 'sent', mediaId: result.mediaId } : m));
            } else {
                throw new Error(result.error || 'Falha ao enviar');
            }
        } catch (error) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
            throw error;
        } finally {
            setPendingMessages(prev => { const next = new Set(prev); next.delete(tempId); return next; });
        }
    }, [contact?.phone, leadId]);

    const handleRetry = useCallback((messageId: string, currentText: string) => {
        toast.info('Para reenviar, edite a mensagem e envie novamente');
        return currentText;
    }, []);

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
    };
}
