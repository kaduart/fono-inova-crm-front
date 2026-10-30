// Aniversariantes do Dashboard do admin em lista compacta (mock aprovado em 30/10:
// https://claude.ai/artifact/MoYkuNDdaGko6QwwWTTqBS). O envio usa o mesmo serviço do cron
// das 10h: o back só manda no dia do aniversário e uma vez por ano (409 = já enviado).
import { Cake, Check, MessageCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { sendBirthdayMessage } from '../../services/whatsappService';

export interface BirthdayRow {
    _id: string;
    fullName: string;
    dateOfBirth: string;
    phone?: string;
    daysUntil: number;
    birthdayMessageSent?: boolean;
}

type Period = 'hoje' | 'semana' | 'mes';

// dateOfBirth é meia-noite UTC do dia pretendido: ler sempre em UTC (ver BirthdayCard)
const utcParts = (iso: string) => { const d = new Date(iso); return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }; };

const ageOn = (iso: string, daysUntil: number) => {
    const { year } = utcParts(iso);
    const ref = new Date(Date.now() + Math.max(0, daysUntil) * 86_400_000);
    return ref.getFullYear() - year;
};

const whenLabel = (iso: string, daysUntil: number) => {
    if (daysUntil === 0) return 'hoje';
    if (daysUntil === 1) return 'amanhã';
    const { day, month } = utcParts(iso);
    const d = new Date(new Date().getFullYear(), month, day);
    const s = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
    return daysUntil < 0 ? `${s} (já passou)` : s;
};

const fmtPhone = (p?: string) => {
    const d = String(p || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return p || '';
};

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button type="button" aria-pressed={active} onClick={onClick}
        className={`rounded-full border px-3 py-1 text-sm transition-colors ${active
            ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
        {children}
    </button>
);

const BirthdayList: React.FC<{ patients: BirthdayRow[]; onSent?: () => void }> = ({ patients, onSent }) => {
    const counts = useMemo(() => ({
        hoje: patients.filter(p => p.daysUntil === 0).length,
        semana: patients.filter(p => p.daysUntil >= 0 && p.daysUntil <= 7).length,
        mes: patients.length,
    }), [patients]);
    const [period, setPeriod] = useState<Period>(() => (patients.some(p => p.daysUntil === 0) ? 'hoje' : 'semana'));
    const [sending, setSending] = useState<string | null>(null);
    const [sent, setSent] = useState<Set<string>>(new Set());

    const rows = useMemo(() => {
        const list = period === 'hoje' ? patients.filter(p => p.daysUntil === 0)
            : period === 'semana' ? patients.filter(p => p.daysUntil >= 0 && p.daysUntil <= 7)
            : patients;
        // Hoje sem parabéns primeiro, depois os próximos, os que já passaram por último
        const rank = (p: BirthdayRow) => (p.daysUntil < 0 ? 1000 - p.daysUntil : p.daysUntil);
        return [...list].sort((a, b) => {
            const sa = Number(!!a.birthdayMessageSent || sent.has(a._id));
            const sb = Number(!!b.birthdayMessageSent || sent.has(b._id));
            if (a.daysUntil === 0 && b.daysUntil === 0 && sa !== sb) return sa - sb;
            return rank(a) - rank(b);
        });
    }, [patients, period, sent]);

    const send = async (p: BirthdayRow) => {
        const first = p.fullName.split(' ')[0];
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

    return (
        <div className="text-left">
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Chip active={period === 'hoje'} onClick={() => setPeriod('hoje')}>Hoje <span className="opacity-70">{counts.hoje}</span></Chip>
                <Chip active={period === 'semana'} onClick={() => setPeriod('semana')}>Próximos 7 dias <span className="opacity-70">{counts.semana}</span></Chip>
                <Chip active={period === 'mes'} onClick={() => setPeriod('mes')}>Mês <span className="opacity-70">{counts.mes}</span></Chip>
                <span className="text-xs text-gray-500 dark:text-gray-400">O parabéns sai sozinho às 10h no dia; o botão manda na hora.</span>
            </div>

            {rows.length === 0 ? (
                <p className="py-4 text-sm text-gray-600 dark:text-gray-400">
                    {period === 'hoje' ? 'Ninguém faz aniversário hoje.' : 'Nenhum aniversariante neste período.'}
                </p>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map(p => {
                        const done = !!p.birthdayMessageSent || sent.has(p._id);
                        const today = p.daysUntil === 0;
                        const age = ageOn(p.dateOfBirth, p.daysUntil);
                        return (
                            <li key={p._id} className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[36px_minmax(0,1.6fr)_minmax(0,1fr)_180px]">
                                <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-pink-50 font-bold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                                    {p.fullName.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className={`truncate font-semibold ${done && today ? 'text-gray-500 line-through dark:text-gray-400' : 'text-gray-900 dark:text-gray-50'}`} title={p.fullName}>{p.fullName}</p>
                                    <p className="text-[13px] text-gray-600 dark:text-gray-400">
                                        {today ? `Faz ${age} ${age === 1 ? 'ano' : 'anos'} hoje` : `${whenLabel(p.dateOfBirth, p.daysUntil)} · ${p.daysUntil < 0 ? 'fez' : 'faz'} ${age} ${age === 1 ? 'ano' : 'anos'}`}
                                        {today && !done && <span className="ml-1.5 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">hoje</span>}
                                        {done && <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">parabéns enviado</span>}
                                    </p>
                                </div>
                                <span className="col-start-2 text-[13px] tabular-nums text-gray-600 dark:text-gray-400 sm:col-start-auto">{fmtPhone(p.phone) || 'sem telefone'}</span>
                                <span className="col-span-2 sm:col-span-1 sm:justify-self-end">
                                    {done ? (
                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check size={14} aria-hidden /> Enviado</span>
                                    ) : today ? (
                                        <button type="button" onClick={() => send(p)} disabled={!p.phone || sending === p._id}
                                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto dark:disabled:bg-gray-700">
                                            <MessageCircle size={14} aria-hidden /> {sending === p._id ? 'Enviando…' : p.phone ? 'Enviar parabéns' : 'Sem telefone'}
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400"><Cake size={13} aria-hidden /> {p.daysUntil < 0 ? 'já passou' : 'envio no dia'}</span>
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
