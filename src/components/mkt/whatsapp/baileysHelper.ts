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
    responsibleName?: string;
    doctorName?: string;
}

function buildDiaSemana(dateStr: string): string {
    const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const d = new Date(dateStr + 'T12:00:00');
    return dias[d.getDay()];
}

export async function enviarConfirmacaoBaileys(pre: PreAgendamentoChat): Promise<{success: boolean; error?: string}> {
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nomeCompleto = pre.patientInfo.fullName;
    const dateObj = new Date(pre.preferredDate + 'T12:00:00');
    const dataCompleta = `${dateObj.toLocaleDateString('pt-BR')} (${buildDiaSemana(pre.preferredDate)})`;
    const hora = pre.preferredTime || '';

    const message =
        `Oi, tudo certinho! 💚\n` +
        `O agendamento de *${nomeCompleto}* está confirmado para a avaliação inicial no dia *${dataCompleta}* às *${hora}*.\n` +
        `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
        `Qualquer dúvida antes da consulta, pode contar com a gente.\n` +
        `📋 No dia anterior, vamos te enviar uma mensagem para confirmar, combinado?\n` +
        `Até o dia e horário combinados! 😊💛`;
    
    try {
        const response = await api.post('/baileys/send', { phone, message });
        return { success: response.data.success, error: response.data.error };
    } catch (err: any) {
        return { success: false, error: err.response?.data?.error || 'Erro ao enviar mensagem' };
    }
}

export async function enviarLembreteBaileys(pre: PreAgendamentoChat): Promise<{success: boolean; error?: string}> {
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nomeCompleto = pre.patientInfo.fullName;
    const nomeResponsavel = pre.responsibleName
        ? pre.responsibleName.split(' ')[0]
        : nomeCompleto.split(' ')[0];
    const dateObj = new Date(pre.preferredDate + 'T12:00:00');
    const dataShort = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const hora = pre.preferredTime || '';
    const profissionalLine = pre.doctorName ? `\n👨‍⚕️ Profissional: ${pre.doctorName}` : '';

    const message =
        `👋 Olá, ${nomeResponsavel}!\n\n` +
        `Estou passando para confirmar o atendimento de amanhã 😊\n\n` +
        `👶 Paciente: ${nomeCompleto}\n` +
        `📅 Data: ${dataShort}\n` +
        `⏰ Horário: ${hora}${profissionalLine}\n\n` +
        `Podemos confirmar?\n\n` +
        `Responda:\n` +
        `✅ SIM para confirmar\n` +
        `🔄 NÃO para remarcar`;
    
    try {
        const response = await api.post('/baileys/send', { phone, message });
        return { success: response.data.success, error: response.data.error };
    } catch (err: any) {
        return { success: false, error: err.response?.data?.error || 'Erro ao enviar mensagem' };
    }
}
