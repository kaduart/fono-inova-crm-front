/**
 * 🟢 Helper para enviar mensagens via Baileys (API backend)
 * Substitui o wa.me por envio direto pelo backend
 */

import api from '../../../services/api';

export interface PreAgendamentoChat {
    _id: string;
    patientInfo: {
        fullName: string;
        phone: string;
    };
    specialty: string;
    preferredDate: string;
    preferredTime?: string;
    status: string;
    urgency: string;
}

export async function enviarConfirmacaoBaileys(pre: PreAgendamentoChat): Promise<{success: boolean; error?: string}> {
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nome = pre.patientInfo.fullName.split(' ')[0];
    const data = new Date(pre.preferredDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const hora = pre.preferredTime || '';
    
    const message = `Olá, avaliação está CONFIRMADA! 💚\n\n` +
        `O agendamento de *${nome}* está confirmado para a avaliação inicial.\n\n` +
        `📅 Data: ${data}\n` +
        `⏰ Horário: ${hora}\n` +
        `🏥 Clínica Fono Inova\n\n` +
        `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
        `Qualquer dúvida antes da consulta, pode contar com a gente.\n\n` +
        `Um dia antes enviaremos uma mensagem de confirmação.\n\n` +
        `Até o dia e horário combinados! 😊💚`;
    
    try {
        const response = await api.post('/baileys/send', { phone, message });
        return { success: response.data.success, error: response.data.error };
    } catch (err: any) {
        return { success: false, error: err.response?.data?.error || 'Erro ao enviar mensagem' };
    }
}

export async function enviarLembreteBaileys(pre: PreAgendamentoChat): Promise<{success: boolean; error?: string}> {
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nome = pre.patientInfo.fullName.split(' ')[0];
    const data = new Date(pre.preferredDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const hora = pre.preferredTime || '';
    
    const message = `Olá ${nome}! 💚\n\n` +
        `Lembrete: sua avaliação é *AMANHÃ*! 🔔\n\n` +
        `📅 Data: ${data}\n` +
        `⏰ Horário: ${hora}\n` +
        `🏥 Clínica Fono Inova\n\n` +
        `Estamos te esperando! ✨\n\n` +
        `Precisa remarcar? Responda aqui.`;
    
    try {
        const response = await api.post('/baileys/send', { phone, message });
        return { success: response.data.success, error: response.data.error };
    } catch (err: any) {
        return { success: false, error: err.response?.data?.error || 'Erro ao enviar mensagem' };
    }
}
