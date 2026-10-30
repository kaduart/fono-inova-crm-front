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

export const openWhatsApp = (phone?: string | null, text?: string) => {
    const url = waLink(phone, text);
    if (url) window.open(url, '_blank', 'noopener');
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
