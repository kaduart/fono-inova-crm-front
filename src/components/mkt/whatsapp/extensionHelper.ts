/**
 * 🟢 Helper para comunicação com Extensão WhatsApp
 * Usa postMessage para enviar mensagens ao WhatsApp Web
 */

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
    responsibleName?: string; // nome do responsável/pai (quem mandou mensagem)
    doctorName?: string;      // nome do profissional agendado
}

function buildDiaSemana(dateStr: string): string {
    const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const d = new Date(dateStr + 'T12:00:00');
    return dias[d.getDay()];
}

export async function enviarViaExtensao(pre: PreAgendamentoChat, tipo: 'confirmacao' | 'lembrete'): Promise<{success: boolean; error?: string}> {
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nomeCompleto = pre.patientInfo.fullName;
    const nomeResponsavel = pre.responsibleName
        ? pre.responsibleName.split(' ')[0]
        : nomeCompleto.split(' ')[0];
    const dateObj = new Date(pre.preferredDate + 'T12:00:00');
    const dataCompleta = `${dateObj.toLocaleDateString('pt-BR')} (${buildDiaSemana(pre.preferredDate)})`;
    const dataShort = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const hora = pre.preferredTime || '';
    const profissionalLine = pre.doctorName ? `\n👨‍⚕️ Profissional: ${pre.doctorName}` : '';

    const message = tipo === 'confirmacao'
        ? `Oi, tudo certinho! 💚\n` +
          `O agendamento de *${nomeCompleto}* está confirmado para a avaliação inicial no dia *${dataCompleta}* às *${hora}*.\n` +
          `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
          `Qualquer dúvida antes da consulta, pode contar com a gente.\n` +
          `📋 No dia anterior, vamos te enviar uma mensagem para confirmar, combinado?\n` +
          `Até o dia e horário combinados! 😊💛`
        : `👋 Olá, ${nomeResponsavel}!\n\n` +
          `Estou passando para confirmar o atendimento de amanhã 😊\n\n` +
          `👶 Paciente: ${nomeCompleto}\n` +
          `📅 Data: ${dataShort}\n` +
          `⏰ Horário: ${hora}${profissionalLine}\n\n` +
          `Podemos confirmar?\n\n` +
          `Responda:\n` +
          `✅ SIM para confirmar\n` +
          `🔄 NÃO para remarcar`;
    
    return new Promise((resolve) => {
        const requestId = Date.now().toString();
        
        // Envia mensagem para extensão
        window.postMessage({
            type: 'WHATSAPP_SEND',
            id: requestId,
            payload: { phone, message, autoSend: false }
        }, '*');
        
        // Timeout
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handleResponse);
            resolve({
                success: false,
                error: 'Extensão não respondeu. Verifique se:\n1. Extensão está instalada\n2. WhatsApp Web está aberto em outra aba'
            });
        }, 5000);
        
        function handleResponse(event: MessageEvent) {
            if (event.data?.type === 'WHATSAPP_RESPONSE' && event.data.id === requestId) {
                clearTimeout(timeout);
                window.removeEventListener('message', handleResponse);
                resolve(event.data.result);
            }
        }
        
        window.addEventListener('message', handleResponse);
    });
}
