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

export interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
}

// =========================
// CONTATOS
// =========================

export async function fetchContacts(): Promise<Contact[]> {
    const response = await API.get("/whatsapp/contacts");
    return response.data;
}

export async function addContact(
    data: Omit<Contact, "_id">
): Promise<Contact> {
    const response = await API.post("/whatsapp/contacts", data);
    return response.data;
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

export async function getChatMessages(phone: string) {
    const p = normalizeE164BR(phone);
    const res = await API.get(`/whatsapp/chat/${p}`);
    return res.data?.data || [];
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
