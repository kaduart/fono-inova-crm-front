import axios from 'axios';
import API from './api';

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

// Buscar todos os contatos
export async function fetchContacts(): Promise<Contact[]> {
    const response = await API.get('/wpp/contacts');
    return response.data;
}

// Adicionar novo contato
export async function addContact(data: Omit<Contact, '_id'>): Promise<Contact> {
    const response = await API.post('/wpp/contacts', data);
    return response.data;
}

// Editar contato existente
export async function editContact(id: string, data: Partial<Omit<Contact, '_id'>>): Promise<Contact> {
    const response = await API.put(`/wpp/contacts/${id}`, data);
    return response.data;
}

// Deletar contato
export async function deleteContact(id: string): Promise<void> {
    await API.delete(`/wpp/contacts/${id}`);
}

export const whatsappService = {
    sendTemplateMessage: async ({
        phone,
        template,
        parameters,
    }: WhatsAppPayload): Promise<WhatsAppResponse> => {
        const paramsArray = Object.values(parameters).map((value) => ({
            type: 'text',
            text: value,
        }));

        const response = await API.post('wpp/send-whatsapp', {
            phone,
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
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: shortLivedToken,
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Erro ao trocar token:', error?.response?.data || error);
        throw new Error('Falha ao obter token de longa duração');
    }
}

export default whatsappService;
