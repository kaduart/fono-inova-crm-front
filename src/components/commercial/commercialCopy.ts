// Textos prontos do WhatsApp das filas comerciais. Regras da clínica:
// valor antes do preço, só horários genéricos ("amanhã à tarde", "quinta de manhã"),
// um 💚 no final e nada de link cru.

const SPECIALTY_TEXT: Record<string, string> = {
    fonoaudiologia: 'fonoaudiologia',
    terapia_ocupacional: 'terapia ocupacional',
    psicologia: 'psicologia',
    fisioterapia: 'fisioterapia',
    psicomotricidade: 'psicomotricidade',
    musicoterapia: 'musicoterapia',
    psicopedagogia: 'psicopedagogia',
    neuropsicologia: 'neuropsicologia',
    neuroped: 'neuropediatria',
    neuropediatria: 'neuropediatria',
    pediatria: 'pediatria',
};

export const specialtyText = (s?: string | null) => (s ? SPECIALTY_TEXT[s] || s.replace(/_/g, ' ') : '');

export const firstName = (name?: string | null) => {
    const n = String(name || '').trim().split(/\s+/)[0] || '';
    return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : '';
};

const WEEKDAY = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "hoje à tarde", "amanhã de manhã", "quinta à tarde". Nunca a hora exata. */
export function genericWhen(ymd: string, time: string, now = new Date()): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const target = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    const h = parseInt(String(time).slice(0, 2), 10);
    const period = Number.isFinite(h) ? (h < 12 ? 'de manhã' : h < 18 ? 'à tarde' : 'no fim da tarde') : '';
    const day = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : WEEKDAY[target.getDay()];
    return period ? `${day} ${period}` : day;
}

export function waLink(phone?: string | null, text?: string): string | null {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

// Nome fixo da aba do WhatsApp: ao reusar o mesmo "target", o navegador
// reaproveita a aba já aberta em vez de abrir uma nova a cada clique
// (pedido do comercial 31/10). Sem "noopener" de propósito — ele faria o
// navegador ignorar o nome e criar aba nova toda vez.
export const WA_TAB = 'fonoinovaWhatsApp';

export const openWhatsApp = (phone?: string | null, text?: string) => {
    const url = waLink(phone, text);
    if (url) window.open(url, WA_TAB);
    return !!url;
};

export const fitLeadMessage = (p: { name?: string | null; specialty: string; when: string }) => {
    const n = firstName(p.name);
    return `Oi${n ? `, ${n}` : ''}! Aqui é da Clínica Fono Inova. Abriu um horário de ${specialtyText(p.specialty)} ${p.when} e lembramos de vocês. Começar logo faz diferença no desenvolvimento, e a gente consegue fazer a avaliação nesse horário. Quer que eu reserve? 💚`;
};

export const fitPatientMessage = (p: { name?: string | null; specialty: string; when: string; doctorName?: string | null }) => {
    const n = firstName(p.name);
    const doc = p.doctorName ? ` com ${p.doctorName.split(/\s+/).slice(0, 2).join(' ')}` : '';
    return `Oi! Aqui é da Clínica Fono Inova. Abriu um horário de ${specialtyText(p.specialty)}${doc} ${p.when}. Manter a sequência das sessões ajuda ${n || 'o paciente'} a não perder o que já conquistou. Posso reservar para vocês? 💚`;
};

export const renewalMessage = (p: { name?: string | null; specialty?: string | null; remaining: number }) => {
    const n = firstName(p.name);
    const left = p.remaining <= 0 ? 'chegou ao fim' : p.remaining === 1 ? 'está na última sessão' : `está nas ${p.remaining} últimas sessões`;
    const spec = p.specialty ? ` de ${specialtyText(p.specialty)}` : '';
    return `Oi! Aqui é da Clínica Fono Inova. O pacote${spec} de ${n || 'vocês'} ${left}. A frequência semanal é o que consolida a evolução que já estamos vendo, então o ideal é não ter pausa. Renovando o pacote de 1x por semana, cada sessão sai por R$ 180 (cerca de R$ 720 por mês). Posso renovar e manter o mesmo horário? 💚`;
};

export const reactivationMessage = (p: { name?: string | null; specialty?: string | null }) => {
    const n = firstName(p.name);
    const spec = p.specialty ? ` de ${specialtyText(p.specialty)}` : '';
    return `Oi! Aqui é da Clínica Fono Inova. Sentimos falta de ${n || 'vocês'} nas sessões${spec}. Retomar logo ajuda a manter o que já foi conquistado. Posso ver um horário para vocês ainda nesta semana? 💚`;
};

export const leadReplyMessage = (p: { name?: string | null }) => {
    const n = firstName(p.name);
    return `Oi${n ? `, ${n}` : ''}! Aqui é da Clínica Fono Inova, desculpe a demora. Vi sua mensagem e já vou te ajudar. Me conta um pouco do que vocês estão buscando? 💚`;
};

/** "há 2h 15min", "há 45min", "há 1 dia". */
export function waitingText(minutes: number): string {
    if (minutes < 60) return `há ${minutes}min`;
    if (minutes < 24 * 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `há ${h}h${m ? ` ${String(m).padStart(2, '0')}min` : ''}`;
    }
    const d = Math.floor(minutes / 1440);
    return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

export const daysText = (d: number | null) => (d == null ? 'sem data' : d === 0 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`);

/**
 * Próximo passo da fila de leads, a partir do motivo e da etapa do acompanhamento.
 * Valor antes do preço; só horário genérico; 1 💚 no final.
 */
export function leadNextStep(p: { name?: string | null; reason?: string; pipeline?: string; overdueDays?: number }): { text: string; message: string } {
    const n = firstName(p.name);
    const oi = `Oi${n ? `, ${n}` : ''}! Aqui é da Clínica Fono Inova.`;
    if (p.pipeline === 'agendado' || p.reason === 'confirmar_agendamento') {
        return { text: 'Confirmar a avaliação e lembrar o que levar', message: `${oi} Passando para confirmar a avaliação. Se tiverem relatório da escola ou de outro profissional, vale levar. Podemos confirmar? 💚` };
    }
    if (p.reason === 'enviar_proposta' || p.pipeline === 'interessado') {
        return { text: 'Explicar o valor da avaliação e depois o preço (R$ 220)', message: `${oi} Na avaliação a terapeuta conhece a criança, entende a queixa e já sai com um plano do que trabalhar. Ela custa R$ 220. Tenho horário amanhã à tarde ou quinta de manhã, qual fica melhor? 💚` };
    }
    if (p.reason === 'aguardando_decisao_familia' || p.pipeline === 'aguardando_decisao') {
        return (p.overdueDays ?? 0) >= 7
            ? { text: 'Último toque: oferecer uma vaga genérica desta semana', message: `${oi} Ainda temos vaga nesta semana, quinta de manhã. Começar cedo faz diferença no desenvolvimento. Querem que eu reserve? 💚` }
            : { text: 'Retomar: perguntar se conseguiram conversar', message: `${oi} Conseguiram conversar sobre a avaliação? Fico à disposição para tirar qualquer dúvida. 💚` };
    }
    if (p.reason === 'aguardando_documentacao') {
        return { text: 'Lembrar dos documentos pendentes', message: `${oi} Só lembrando dos documentos para seguirmos com o atendimento. Pode me mandar por aqui mesmo. 💚` };
    }
    if (p.pipeline === 'novo_contato' || p.pipeline === 'aguardando_clinica') {
        return { text: 'Responder e entender a queixa antes de falar de preço', message: `${oi} Vi sua mensagem e já vou te ajudar. Me conta um pouco do que vocês estão buscando? 💚` };
    }
    return { text: 'Retomar o contato', message: `${oi} Passando para saber como vocês estão e se posso ajudar em algo. 💚` };
}

/** Avaliou e não fechou: valor antes do preço, horário genérico, um 💚. */
export const evaluationMessage = (p: { name?: string | null; specialty?: string | null; doctorName?: string | null }) => {
    const n = firstName(p.name);
    const doc = p.doctorName ? p.doctorName.split(/\s+/).slice(0, 2).join(' ') : 'a terapeuta';
    const area = specialtyText(p.specialty);
    return `Oi! Aqui é da Clínica Fono Inova. ${doc} gostou muito de conhecer ${n || 'vocês'} na avaliação${area ? ` de ${area}` : ''} e já tem um plano para as próximas semanas. Com sessões semanais a evolução aparece mais rápido. No pacote 1x/semana cada sessão sai por R$ 180 (cerca de R$ 720/mês). Posso reservar um horário para começar, quinta de manhã ou sexta à tarde? 💚`;
};

/** Contato manual com quem não respondeu a confirmação (horário genérico). */
export const confirmationNudgeMessage = (p: { name?: string | null; when: string }) => {
    const n = firstName(p.name);
    return `Oi! Aqui é da Clínica Fono Inova. Só confirmando a sessão${n ? ` de ${n}` : ''} ${p.when}. Podemos contar com vocês? 💚`;
};
