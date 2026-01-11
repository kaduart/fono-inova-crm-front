// src/services/whatsappService.ts
import axios from "axios";
import { normalizeE164BR } from "../utils/phone";
import API from "./api";

export interface WhatsAppPayload {
    phone: string;
    template: string;
    parameters: Record<string, string>;
}

export interface WhatsAppResponse {
    success: boolean;
    data: any;
}

interface FetchContactsOptions {
    page?: number;
    limit?: number;
    search?: string;
}


interface GetMessagesOptions {
    limit?: number;
    before?: string; // ISO timestamp
}

interface MessagesResponse {
    data: any[];
    hasMore: boolean;
}

interface ContactsResponse {
    data: Contact[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    patientId?: string; // ✅ adicionar
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    hasNewMessage?: boolean;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
}

// =========================
// CONTATOS
// =========================

export async function fetchContacts(
    options: FetchContactsOptions = {}
): Promise<ContactsResponse> {
    const { page = 1, limit = 50, search = "" } = options;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
    });

    const res = await API.get(`/whatsapp/contacts?${params}`);

    // ✅ backend novo (correto)
    if (res.data?.success && Array.isArray(res.data.data)) {
        return {
            data: res.data.data,
            pagination: res.data.pagination,
        };
    }

    // ⚠️ fallback REAL (backend antigo)
    if (Array.isArray(res.data)) {
        return {
            data: res.data,
            pagination: {
                page: 1,
                limit: res.data.length,
                total: res.data.length,
                hasMore: false,
            },
        };
    }

    throw new Error("Formato inesperado ao buscar contatos");
}


export async function addContact(
    data: Omit<Contact, "_id">
): Promise<Contact> {
    const response = await API.post("/whatsapp/contacts", data);
    return response.data;
}

export async function updateContactApi(
    id: string,
    updates: { name?: string; phone?: string; avatar?: string }
) {
    const res = await API.put(`/whatsapp/contacts/${id}`, updates);
    console.log('hhhhhhhhhhhhhhhhhh', res)

    return res.data; // aqui é o contato atualizado direto (pelo seu backend)
}

export async function editContact(
    id: string,
    data: Partial<Omit<Contact, "_id">>
): Promise<Contact> {
    const response = await API.put(`/whatsapp/contacts/${id}`, data);
    return response.data;
}

export async function deleteContact(id: string): Promise<void> {
    await API.delete(`/whatsapp/contacts/${id}`);
}

// =========================
// MENSAGENS
// =========================

export async function getChatMessages(
    phone: string,
    options: GetMessagesOptions = {}
): Promise<any[]> {
    const { limit = 50, before } = options;
    const p = normalizeE164BR(phone);

    const params = new URLSearchParams({
        limit: String(limit),
        ...(before && { before })
    });

    const res = await API.get(`/whatsapp/chat/${p}?${params}`);
    return res.data?.data || [];
}


export async function loadMoreMessages(
    phone: string,
    before: string
): Promise<{ data: any[]; hasMore: boolean }> {
    const p = normalizeE164BR(phone);
    const params = new URLSearchParams({
        limit: '30',
        before
    });

    try {
        const res = await API.get(`/whatsapp/chat/${p}?${params}`);

        // Garante que sempre retorna o formato correto
        const data = res.data?.data || res.data || [];
        const hasMore = res.data?.hasMore ?? (Array.isArray(data) && data.length >= 30);

        return {
            data: Array.isArray(data) ? data : [],
            hasMore
        };
    } catch (err) {
        console.error('Erro em loadMoreMessages:', err);
        return { data: [], hasMore: false };
    }
}

// envia texto normal (NÃO pausa Amanda)
export async function sendWhatsAppText(
    phone: string,
    text: string,
    userId?: string
) {
    const p = normalizeE164BR(phone);
    const res = await API.post("/whatsapp/send-text", {
        phone: p,
        text,
        ...(userId && { userId }),
    });
    return res.data; // { success, result, messageId }
}

export async function sendManualWhatsAppText(payload: {
    leadId?: string | null;
    phone: string;
    text: string;
    userId: string;
}): Promise<any> {
    const res = await API.post("/whatsapp/send-manual", payload);
    return res.data; // { success, message, messageId }
}

export async function deleteWhatsAppMessage(messageId: string): Promise<any> {
    // se receber "m-<id>", tira o prefixo aqui
    const cleanId = messageId.startsWith('m-') ? messageId.slice(2) : messageId;

    const res = await API.delete(`/whatsapp/messages/${cleanId}`);
    return res.data; // { success, message }
}

// Busca contatos por texto em mensagens (server-side)
export async function searchContactsByMessage(query: string): Promise<Contact[]> {
    if (!query || query.length < 2) return [];

    const res = await API.get(`/whatsapp/contacts/search?q=${encodeURIComponent(query)}`);
    return res.data?.data || res.data || [];
}

// =========================
// TEMPLATE / TOKEN META
// =========================

export const whatsappService = {
    sendTemplateMessage: async ({
        phone,
        template,
        parameters,
    }: WhatsAppPayload): Promise<WhatsAppResponse> => {
        const p = normalizeE164BR(phone);
        const paramsArray = Object.values(parameters).map((value) => ({
            type: "text",
            text: value,
        }));
        const response = await API.post("/whatsapp/send-template", {
            phone: p,
            template,
            params: paramsArray,
        });

        return {
            success: true,
            data: response.data,
        };
    },
};

export async function exchangeLongLivedToken({
    appId,
    appSecret,
    shortLivedToken,
}: {
    appId: string;
    appSecret: string;
    shortLivedToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/v18.0/oauth/access_token`,
            {
                params: {
                    grant_type: "fb_exchange_token",
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: shortLivedToken,
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("Erro ao trocar token:", error?.response?.data || error);
        throw new Error("Falha ao obter token de longa duração");
    }
}

export default whatsappService;
