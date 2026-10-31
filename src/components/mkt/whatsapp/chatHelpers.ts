// Apoio da tela de Conversas (mock aprovado em 31/10:
// https://claude.ai/artifact/4g374rvjrDyzGG5VgVJf2A).
import type { Contact } from '../../../services/whatsappService';
import { firstName, specialtyText } from '../../commercial/commercialCopy';

/** "5562998100003" → "(62) 99810-0003". Sem DDD reconhecível, devolve como veio. */
export function formatPhoneBR(phone?: string | null): string {
    const d = String(phone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone || '';
}

const PATIENT_STATUS = ['virou_paciente', 'convertido'];

/** Lead convertido (convertedToPatient) ou marcado como paciente no funil */
export const isPatientContact = (c: Pick<Contact, 'patientId' | 'lead'>) =>
    Boolean(c.patientId) || c.lead?.stage === 'paciente' || PATIENT_STATUS.includes(String(c.lead?.status || ''));

const STAGE_LABEL: Record<string, string> = {
    novo: 'Novo contato',
    pesquisando_preco: 'Pediu preço',
    triagem_agendamento: 'Triagem para agendar',
    engajado: 'Conversando',
    interessado_agendamento: 'Quer agendar',
    paciente: 'Virou paciente',
    parceria_profissional: 'Parceria profissional',
};

export const stageLabel = (stage?: string | null) => (stage ? STAGE_LABEL[stage] || stage.replace(/_/g, ' ') : '—');

/** Próximo passo sugerido pela etapa do lead */
export function nextStep(stage?: string | null, waiting?: boolean): string {
    if (waiting) return 'Responder a família. Quem responde rápido agenda mais.';
    switch (stage) {
        case 'pesquisando_preco': return 'Explicar o que a avaliação entrega e só então o valor, já oferecendo um horário.';
        case 'triagem_agendamento':
        case 'interessado_agendamento': return 'Oferecer um horário de avaliação e agendar.';
        case 'engajado': return 'Entender a queixa e convidar para a avaliação.';
        case 'paciente': return 'Acompanhar a próxima sessão.';
        default: return 'Apresentar a clínica e entender o que a família procura.';
    }
}

export interface QuickReply { key: string; label: string; text: string }

/**
 * Respostas prontas. Regras da clínica: valor antes do preço, só horário genérico
 * ("quinta de manhã"), um 💚 no fim. Clicar só preenche; a equipe revisa antes de enviar.
 */
export function quickReplies(p: { name?: string | null; therapyArea?: string | null }): QuickReply[] {
    const n = firstName(p.name);
    const oi = `Oi${n ? `, ${n}` : ''}!`;
    const area = specialtyText(p.therapyArea) || 'a terapeuta';
    const quem = p.therapyArea ? `a profissional de ${area}` : 'a terapeuta';
    return [
        {
            key: 'valor', label: 'Valor da avaliação',
            text: `${oi} Na avaliação, ${quem} observa com calma como a criança se comunica e interage e vocês já saem com um plano do que fazer. Ela custa R$ 220. Tenho um horário quinta de manhã, quer que eu reserve? 💚`,
        },
        {
            key: 'convenio', label: 'Atende convênio?',
            text: `${oi} Me conta qual é o plano de vocês que eu já confirmo a cobertura. Se não cobrir, a avaliação particular já sai com um plano do que fazer, e custa R$ 220. 💚`,
        },
        {
            key: 'horarios', label: 'Horários',
            text: `${oi} Consigo um horário amanhã à tarde ou quinta de manhã. Qual fica melhor para vocês? 💚`,
        },
        {
            key: 'pacote', label: 'Pacote mensal',
            text: `${oi} Com uma sessão por semana a evolução fica constante, que é o que mais faz diferença. No pacote de 1x por semana cada sessão sai por R$ 180 (cerca de R$ 720 por mês). Posso montar para vocês? 💚`,
        },
        {
            key: 'retomar', label: 'Retomar contato',
            text: `${oi} Passando para saber se ainda posso ajudar vocês. Começar cedo faz diferença no desenvolvimento, e tenho horário nesta semana. Quer que eu reserve? 💚`,
        },
    ];
}
