// src/services/whatsappService.ts - FUNÇÃO FALTANTE ADICIONADA
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

export interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
}

// ✅ ADICIONAR INTERFACE para sendTextMessage
export interface SendTextPayload {
    to: string;
    text: string;
    lead?: string;
}

// ========================================================
// 🟢 CONTATOS
// ========================================================

// Buscar todos os contatos
export async function fetchContacts(): Promise<Contact[]> {
    const response = await API.get("/whatsapp/contacts");
    return response.data;
}

// Adicionar novo contato
export async function addContact(
    data: Omit<Contact, "_id">
): Promise<Contact> {
    const response = await API.post("/whatsapp/contacts", data);
    return response.data;
}

// Editar contato existente
export async function editContact(
    id: string,
    data: Partial<Omit<Contact, "_id">>
): Promise<Contact> {
    const response = await API.put(`/whatsapp/contacts/${id}`, data);
    return response.data;
}

// Deletar contato
export async function deleteContact(id: string): Promise<void> {
    await API.delete(`/whatsapp/contacts/${id}`);
}

// ========================================================
// 💬 MENSAGENS - CORRIGIDO
// ========================================================

// Buscar histórico de mensagens com um número
export async function getChatMessages(phone: string) {
    const p = normalizeE164BR(phone);
    const res = await API.get(`/whatsapp/chat/${p}`);
    return res.data?.data || [];
}


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

export async function sendManualWhatsAppText(
    text: string,
    leadId: string,
    userId?: string
): Promise<any> {
    const res = await API.post("/whatsapp/send-manual", {
        leadId,
        text,
        userId: userId || localStorage.getItem("userId") || "admin",
    });
    return res.data; // { success, message, messageId }
}



// ========================================================
// 🧩 TEMPLATES E TOKEN META
// ========================================================

export const whatsappService = {
    sendTemplateMessage: async ({
        phone,
        template,
        parameters,
    }: WhatsAppPayload): Promise<WhatsAppResponse> => {
        const p = normalizeE164BR(phone);
        const paramsArray = Object.values(parameters).map((value) => ({ type: "text", text: value }));
        const response = await API.post("/whatsapp/send-template", { phone: p, template, params: paramsArray });

        return {
            success: true,
            data: response.data,
        };
    },

    // ✅ ADICIONAR: sendTextMessage no objeto whatsappService
    sendTextMessage: async (payload: SendTextPayload) => {
        return sendTextMessage(payload);
    }
};

// Trocar token de curta para longa duração (Meta)
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