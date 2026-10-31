// types/chat.types.ts
export interface Contact {
    _id: string;
    name: string;
    phone: string;
    leadId?: string | null;
    avatar?: string;
    status?: string;
    lastSeen?: string;
    manualActive?: boolean;
    autoReplyEnabled?: boolean;
    patientId?: string;
    lastDirection?: 'inbound' | 'outbound';
    lead?: { origin: string | null; stage: string | null; status: string | null; therapyArea: string | null; createdAt: string | null; age: number | null };
}

export interface Message {
    id: string;
    text: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'read' | 'received' | 'error' | 'failed' | 'pending';
    fromMe?: boolean;
    type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'template' | 'system';
    mediaUrl?: string;
    mediaId?: string;
    caption: string;
    isSystem?: boolean; // 🆕 Indica mensagem de sistema/erro
    systemType?: 'error' | 'warning' | 'info' | 'success'; // 🆕 Tipo de mensagem do sistema
}

export interface ChatWindowProps {
    contact: Contact | null;
    className?: string;
    leadId?: string;
}

export type MediaType = 'image' | 'audio' | 'video' | 'document';
