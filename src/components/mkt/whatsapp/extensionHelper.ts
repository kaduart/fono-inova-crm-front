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
}

export async function enviarViaExtensao(pre: PreAgendamentoChat, tipo: 'confirmacao' | 'lembrete'): Promise<{success: boolean; error?: string}> {
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nome = pre.patientInfo.fullName.split(' ')[0];
    const data = new Date(pre.preferredDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const hora = pre.preferredTime || '';
    
    const message = tipo === 'confirmacao' 
        ? `Olá, avaliação está CONFIRMADA! 💚\n\n` +
          `O agendamento de *${nome}* está confirmado para a avaliação inicial.\n\n` +
          `📅 Data: ${data}\n` +
          `⏰ Horário: ${hora}\n` +
          `🏥 Clínica Fono Inova\n\n` +
          `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
          `Qualquer dúvida antes da consulta, pode contar com a gente.\n\n` +
          `Um dia antes enviaremos uma mensagem de confirmação.\n\n` +
          `Até o dia e horário combinados! 😊💚`
        : `Olá ${nome}! 💚\n\n` +
          `Lembrete: sua avaliação é *AMANHÃ*! 🔔\n\n` +
          `📅 Data: ${data}\n` +
          `⏰ Horário: ${hora}\n` +
          `🏥 Clínica Fono Inova\n\n` +
          `Estamos te esperando! ✨\n\n` +
          `Precisa remarcar? Responda aqui.`;
    
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
