// Aniversariantes do Dashboard do admin. Fica SEMPRE à vista (Kadu 10/11: um aniversário
// importante passou batido quando a lista estava escondida numa aba).
// O envio usa o mesmo serviço do cron das 10h: o back só manda no dia do aniversário e uma vez
// por ano (409 = já enviado). Quem passou sem parabéns nos últimos 7 dias aparece em vermelho,
// com a mensagem pronta para o WhatsApp; abrir o WhatsApp ou tocar "Já dei" grava no paciente
// (POST /patients/:id/birthday-message/mark) e ele sai da lista. Sem data fixa: vale todo ano.
import { Check, MessageCircle, Send } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from '../../utils/toast';
import { markBirthdayHandled, sendBirthdayMessage } from '../../services/whatsappService';

export interface BirthdayRow {
    _id: string;
    fullName: string;
    dateOfBirth: string;
    phone?: string;
    daysUntil?: number;
    birthdayMessageSent?: boolean;
}

type Period = 'atrasados' | 'hoje' | 'semana' | 'mes';
type Row = BirthdayRow & { daysUntil: number };

export const LATE_DAYS = 7;

// dateOfBirth é meia-noite UTC do dia pretendido: ler sempre em UTC (ver BirthdayCard)
const utcParts = (iso: string) => { const d = new Date(iso); return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }; };

const ageOn = (iso: string, daysUntil: number) => {
    const { year } = utcParts(iso);
    const ref = new Date(Date.now() + Math.max(0, daysUntil) * 86_400_000);
    return ref.getFullYear() - year;
};

const whenLabel = (daysUntil: number) => {
    if (daysUntil === 0) return 'hoje';
    if (daysUntil === 1) return 'amanhã';
    if (daysUntil === -1) return 'ontem';
    return daysUntil < 0 ? `há ${-daysUntil} dias` : `em ${daysUntil} dias`;
};

const fmtPhone = (p?: string) => {
    const d = String(p || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return p || '';
};

const firstName = (name: string) => {
    const f = name.trim().split(/\s+/)[0] || '';
    return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
};

/** wa.me com a mensagem de parabéns atrasado já escrita; null sem telefone válido. */
const lateWhatsapp = (p: Row): string | null => {
    const digits = String(p.phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    const text = `Oi! Aqui é da Clínica Fono Inova. Passando para desejar um feliz aniversário (atrasadinho) para ${firstName(p.fullName)}! 🎉 Que esse novo ano venha cheio de conquistas. Um abraço de toda a equipe 💚`;
    return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
};

// O back (/patients/aniversariantes) não manda daysUntil: calcula aqui pelo dia UTC do
// nascimento contra o dia de hoje (mesmo critério do BirthdayCard). Negativo = já passou no mês.
export const withDaysUntil = (list: BirthdayRow[]): Row[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return list
        .filter(p => p.dateOfBirth && !Number.isNaN(new Date(p.dateOfBirth).getTime()))
        .map(p => {
            const { day, month } = utcParts(p.dateOfBirth);
            const bday = new Date(now.getFullYear(), month, day).getTime();
            return { ...p, daysUntil: typeof p.daysUntil === 'number' ? p.daysUntil : Math.round((bday - today) / 86_400_000) };
        });
};

/** Passou nos últimos 7 dias e ninguém deu parabéns (nem o automático, nem a equipe por fora). */
export const isLateBirthday = (p: { daysUntil: number; birthdayMessageSent?: boolean }) =>
    p.daysUntil < 0 && p.daysUntil >= -LATE_DAYS && !p.birthdayMessageSent;

const Chip: React.FC<{ active: boolean; onClick: () => void; tone?: 'red'; children: React.ReactNode }> = ({ active, onClick, tone, children }) => (
    <button type="button" aria-pressed={active} onClick={onClick}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${active
            ? tone === 'red'
                ? 'border-red-600 bg-red-50 font-semibold text-red-700 dark:border-red-400 dark:bg-red-500/10 dark:text-red-300'
                : 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300'
            : tone === 'red'
                ? 'border-red-200 bg-white font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-500/10'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
        {children}
    </button>
);

// Bloco de data à esquerda: dia grande + dia da semana. Cor diz o estado (vermelho atrasado, rosa hoje).
const DateTile: React.FC<{ iso: string; daysUntil: number; late: boolean; done: boolean }> = ({ iso, daysUntil, late, done }) => {
    const { day, month } = utcParts(iso);
    const d = new Date(new Date().getFullYear(), month, day);
    const wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const tone = late
        ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30'
        : daysUntil === 0 && !done
            ? 'bg-pink-600 text-white ring-pink-600 dark:bg-pink-500 dark:text-gray-950 dark:ring-pink-500'
            : 'bg-white text-gray-800 ring-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700';
    return (
        <span aria-hidden className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ring-1 ring-inset ${tone}`}>
            <span className="text-lg font-bold leading-none tabular-nums">{String(day).padStart(2, '0')}</span>
            <span className="mt-0.5 text-[11px] font-semibold uppercase leading-none opacity-80">{wd}</span>
        </span>
    );
};

const BirthdayList: React.FC<{ patients: BirthdayRow[]; onSent?: () => void }> = ({ patients: raw, onSent }) => {
    const patients = useMemo(() => withDaysUntil(raw || []), [raw]);
    const [sent, setSent] = useState<Set<string>>(new Set());
    const counts = useMemo(() => ({
        atrasados: patients.filter(p => isLateBirthday(p) && !sent.has(p._id)).length,
        hoje: patients.filter(p => p.daysUntil === 0).length,
        semana: patients.filter(p => p.daysUntil >= 0 && p.daysUntil <= 7).length,
        mes: patients.length,
    }), [patients, sent]);
    // Abre no que precisa de ação: hoje sem parabéns > atrasados > próximos 7 dias.
    const [period, setPeriod] = useState<Period>(() => (
        patients.some(p => p.daysUntil === 0 && !p.birthdayMessageSent) ? 'hoje'
            : patients.some(p => isLateBirthday(p)) ? 'atrasados'
            : patients.some(p => p.daysUntil === 0) ? 'hoje' : 'semana'
    ));
    const [sending, setSending] = useState<string | null>(null);
    const [marking, setMarking] = useState(false);

    const rows = useMemo(() => {
        const list = period === 'atrasados' ? patients.filter(p => isLateBirthday(p))
            : period === 'hoje' ? patients.filter(p => p.daysUntil === 0)
            : period === 'semana' ? patients.filter(p => p.daysUntil >= 0 && p.daysUntil <= 7)
            : patients;
        // Hoje sem parabéns primeiro, depois os próximos; os que já passaram por último (atrasado mais recente antes)
        const rank = (p: Row) => (p.daysUntil < 0 ? 1000 - p.daysUntil : p.daysUntil);
        return [...list].sort((a, b) => {
            const sa = Number(!!a.birthdayMessageSent || sent.has(a._id));
            const sb = Number(!!b.birthdayMessageSent || sent.has(b._id));
            if (a.daysUntil === b.daysUntil && sa !== sb) return sa - sb;
            return rank(a) - rank(b);
        });
    }, [patients, period, sent]);

    const send = async (p: Row) => {
        const first = firstName(p.fullName);
        if (!p.phone) { toast.error('Paciente sem telefone cadastrado'); return; }
        if (sending) return;
        setSending(p._id);
        try {
            await sendBirthdayMessage(p._id);
            setSent(s => new Set(s).add(p._id));
            toast.success(`Parabéns enviado para ${first}`);
            onSent?.();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                setSent(s => new Set(s).add(p._id));
                toast.info(`O parabéns de ${first} já tinha sido enviado hoje.`);
                onSent?.();
            } else {
                toast.error(err?.response?.data?.message || err?.message || 'Não foi possível enviar');
            }
        } finally {
            setSending(null);
        }
    };

    // "Já dei parabéns": grava no paciente (1x por ano, mesma trava do automático) e some da lista.
    const mark = async (ids: string[], silent = false) => {
        if (!ids.length || marking) return;
        setMarking(true);
        const ok: string[] = [];
        for (const id of ids) {
            try { await markBirthdayHandled(id); ok.push(id); } catch { /* conta abaixo */ }
        }
        setMarking(false);
        if (ok.length) { setSent(s => { const n = new Set(s); ok.forEach(id => n.add(id)); return n; }); onSent?.(); }
        if (ok.length < ids.length) toast.error(`Não consegui marcar ${ids.length - ok.length} paciente(s). Tente de novo.`);
        else if (!silent) toast.success(ok.length === 1 ? 'Marcado como parabenizado' : `${ok.length} marcados como parabenizados`);
    };
    const lateIds = rows.filter(p => isLateBirthday(p) && !sent.has(p._id)).map(p => p._id);

    const empty = period === 'atrasados' ? 'Nenhum aniversário passou sem parabéns nos últimos 7 dias.'
        : period === 'hoje' ? 'Ninguém faz aniversário hoje.'
        : 'Nenhum aniversariante neste período.';

    return (
        <div className="text-left">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {counts.atrasados > 0 && (
                    <Chip tone="red" active={period === 'atrasados'} onClick={() => setPeriod('atrasados')}>
                        Passaram sem parabéns <b className="tabular-nums">{counts.atrasados}</b>
                    </Chip>
                )}
                <Chip active={period === 'hoje'} onClick={() => setPeriod('hoje')}>Hoje <b className="tabular-nums">{counts.hoje}</b></Chip>
                <Chip active={period === 'semana'} onClick={() => setPeriod('semana')}>Próximos 7 dias <b className="tabular-nums">{counts.semana}</b></Chip>
                <Chip active={period === 'mes'} onClick={() => setPeriod('mes')}>Mês todo <b className="tabular-nums">{counts.mes}</b></Chip>
            </div>

            {period === 'atrasados' && lateIds.length > 1 && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50/60 px-3 py-2 text-[13px] text-red-800 dark:bg-red-500/[0.06] dark:text-red-200">
                    <span>Já deu parabéns por fora? Marque para sair da lista.</span>
                    <button type="button" onClick={() => mark(lateIds)} disabled={marking}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100 disabled:opacity-60 dark:bg-gray-900 dark:text-red-300 dark:ring-red-500/30">
                        <Check size={14} aria-hidden /> {marking ? 'Marcando…' : `Marcar os ${lateIds.length} como parabenizados`}
                    </button>
                </div>
            )}

            {rows.length === 0 ? (
                <p className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:bg-gray-800/40 dark:text-gray-400">{empty}</p>
            ) : (
                <ul className="grid gap-2 lg:grid-cols-2">
                    {rows.map(p => {
                        const done = !!p.birthdayMessageSent || sent.has(p._id);
                        const today = p.daysUntil === 0;
                        const isLate = isLateBirthday(p) && !sent.has(p._id);
                        const age = ageOn(p.dateOfBirth, p.daysUntil);
                        const wa = isLate ? lateWhatsapp(p) : null;
                        const phone = fmtPhone(p.phone);
                        return (
                            <li key={p._id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl p-2.5 sm:flex-nowrap ring-1 ring-inset ${isLate
                                ? 'bg-red-50/60 ring-red-100 dark:bg-red-500/[0.06] dark:ring-red-500/20'
                                : today && !done
                                    ? 'bg-pink-50/70 ring-pink-100 dark:bg-pink-500/[0.07] dark:ring-pink-500/20'
                                    : 'bg-gray-50 ring-transparent dark:bg-gray-800/40'}`}>
                                <DateTile iso={p.dateOfBirth} daysUntil={p.daysUntil} late={isLate} done={done} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-gray-900 dark:text-gray-50" title={p.fullName}>{p.fullName}</p>
                                    <p className="truncate text-[13px] text-gray-600 dark:text-gray-400">
                                        <span className={isLate ? 'font-semibold text-red-700 dark:text-red-300' : today && !done ? 'font-semibold text-pink-700 dark:text-pink-300' : ''}>{whenLabel(p.daysUntil)}</span>
                                        {' · '}{p.daysUntil < 0 ? 'fez' : today ? 'faz' : 'vai fazer'} {age} {age === 1 ? 'ano' : 'anos'}
                                        {' · '}<span className="tabular-nums">{phone || 'sem telefone'}</span>
                                    </p>
                                </div>
                                <span className="w-full shrink-0 pl-[60px] sm:w-auto sm:pl-0">
                                    {done ? (
                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check size={15} aria-hidden /> Enviado</span>
                                    ) : today ? (
                                        <button type="button" onClick={() => send(p)} disabled={!p.phone || sending === p._id}
                                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700">
                                            <Send size={14} aria-hidden /> {sending === p._id ? 'Enviando…' : p.phone ? 'Enviar parabéns' : 'Sem telefone'}
                                        </button>
                                    ) : isLate ? (
                                        <span className="inline-flex flex-wrap items-center gap-2">
                                        {wa ? (
                                            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => mark([p._id], true)}
                                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-gray-900 dark:text-red-300 dark:ring-red-500/30 dark:hover:bg-red-500 dark:hover:text-gray-950">
                                                <MessageCircle size={14} aria-hidden /> Mandar no WhatsApp
                                            </a>
                                        ) : <span className="text-[13px] font-semibold text-red-700 dark:text-red-300">sem telefone</span>}
                                            <button type="button" onClick={() => mark([p._id])} disabled={marking}
                                                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-800">
                                                <Check size={14} aria-hidden /> Já dei
                                            </button>
                                        </span>
                                    ) : p.daysUntil < 0 ? (
                                        <span className="text-[13px] text-gray-500 dark:text-gray-400">já passou</span>
                                    ) : (
                                        <span className="text-right text-[13px] leading-tight text-gray-500 dark:text-gray-400">automático<br className="hidden sm:inline" /> no dia, 10h</span>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default BirthdayList;
