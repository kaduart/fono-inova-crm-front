// src/components/doctor/overview/TodayAgendaPanel.tsx
// Agenda de hoje do terapeuta: coluna principal do Dashboard.
// Ações por sessão: Registrar evolução, WhatsApp do responsável e abrir a ficha.
// Concluir e Cancelar mudam o status OPERACIONAL (recepção/agenda); o terapeuta cuida do
// status clínico. Por decisão do Kadu (29/10/2026) os dois ficam visíveis e desativados até
// existir o fluxo próprio do terapeuta.
import { CheckCircle2, FileText, MessageCircle, MoreHorizontal, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    aptDateTime, isCanceled, isCompleted, isMissed, isOpen, minutesUntil, opStatus, patientOf, whatsappLink,
} from './agendaUtils';

type Patient = { _id: string; fullName: string };

interface Props {
    appointments: any[];
    nextAppointmentId?: string | null;
    pendingEvolutionIds: Set<string>;
    loading?: boolean;
    onRegisterEvolution: (patient: Patient) => void;
    onOpenPatient: (patient: Patient) => void;
}

const chip = {
    ok: 'border-green-200 bg-green-50 text-green-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    bad: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    pur: 'border-purple-200 bg-purple-50 text-purple-800',
    lim: 'border-orange-300 bg-orange-100 text-orange-800',
    neu: 'border-gray-300 bg-gray-50 text-gray-700',
};

const Chip = ({ tone, children }: { tone: keyof typeof chip; children: React.ReactNode }) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-xs font-semibold ${chip[tone]}`}>{children}</span>
);

export function statusChip(apt: any) {
    const s = opStatus(apt);
    if (s === 'completed') return <Chip tone="ok"><CheckCircle2 className="h-3 w-3" aria-hidden />Concluído</Chip>;
    if (s === 'confirmed') return <Chip tone="info">Confirmado</Chip>;
    if (s === 'pre_agendado') return <Chip tone="warn">Pré-agendado</Chip>;
    if (s === 'missed') return <Chip tone="bad">Falta</Chip>;
    if (s === 'suspended') return <Chip tone="neu">Suspenso</Chip>;
    if (isCanceled(apt)) return <Chip tone="bad">Cancelado</Chip>;
    if (s.startsWith('processing')) return <Chip tone="neu">Processando…</Chip>;
    return <Chip tone="warn">Não confirmado</Chip>;
}

export function billingChip(apt: any) {
    const type = apt.billingType || (apt.liminarContract ? 'liminar' : apt.insuranceProvider ? 'convenio' : 'particular');
    if (type === 'liminar') return <Chip tone="lim">Liminar</Chip>;
    if (type === 'convenio') return <Chip tone="info">Convênio{apt.insuranceProvider ? ` · ${apt.insuranceProvider}` : ''}</Chip>;
    if (apt.package) {
        const pk = typeof apt.package === 'object' ? apt.package : null;
        const total = Number(pk?.totalSessions) || 0;
        // Sessão de hoje = próxima depois das já feitas (ex.: 7/12).
        return <Chip tone="neu">Pacote{total ? ` · ${Math.min(total, (Number(pk?.sessionsDone) || 0) + 1)}/${total}` : ''}</Chip>;
    }
    const paid = apt.payment?.status === 'paid';
    return <Chip tone="neu">Particular{apt.payment?.status ? ` · ${paid ? 'pago' : 'pendente'}` : ''}</Chip>;
}

// Linha de sinais: o que o terapeuta precisa saber antes de entrar na sessão.
// Dados só de leitura vindos de /doctors/appointments/today (pacote, guia e sessão anterior).
const DAY_MS = 86_400_000;
export function sessionSignals(apt: any): string[] {
    const out: string[] = [];
    const pk = typeof apt.package === 'object' ? apt.package : null;
    const total = Number(pk?.totalSessions) || 0;
    const done = Number(pk?.sessionsDone) || 0;
    if (total && !isCompleted(apt) && done + 1 >= total) out.push('Última sessão do pacote: falar de renovação');
    const g = typeof apt.insuranceGuide === 'object' ? apt.insuranceGuide : null;
    if (g?.expiresAt) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(g.expiresAt));
        if (m) {
            const exp = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            const t = new Date(); t.setHours(0, 0, 0, 0);
            const days = Math.round((exp.getTime() - t.getTime()) / DAY_MS);
            if (days >= 0 && days <= 15) out.push(days === 0 ? 'Guia vence hoje' : `Guia vence em ${days} ${days === 1 ? 'dia' : 'dias'}`);
        }
        const left = (Number(g.totalSessions) || 0) - (Number(g.usedSessions) || 0);
        if (g.totalSessions && left <= 1) out.push(left <= 0 ? 'Guia sem sessões restantes' : 'Última sessão da guia');
    }
    if (apt.previousSession?.status === 'missed') out.push('Faltou na sessão anterior');
    return out;
}

function journeyChip(apt: any) {
    if (apt.patientJourneyType === 'new_patient') return <Chip tone="ok">Novo paciente</Chip>;
    if (apt.patientJourneyType === 'new_specialty') return <Chip tone="ok">Nova especialidade</Chip>;
    if (apt.patientJourneyType === 'returning_patient') return <Chip tone="neu">Retorno</Chip>;
    return null;
}

const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:opacity-60';
const btnPrimary = `${btn} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`;
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const btnIcon = `${btn} w-10 px-0 border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;


function RowMenu({ onOpen, onEvolution }: { onOpen: () => void; onEvolution: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, [open]);
    const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none';
    const pick = (fn: () => void) => () => { setOpen(false); fn(); };
    return (
        <div className="relative" ref={ref}>
            <button type="button" className={btnIcon} aria-label="Mais ações" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-11 z-20 min-w-[210px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                    <button role="menuitem" type="button" className={`${item} text-gray-700`} onClick={pick(onOpen)}><UserRound className="h-4 w-4" aria-hidden />Abrir ficha do paciente</button>
                    <button role="menuitem" type="button" className={`${item} text-gray-700`} onClick={pick(onEvolution)}><FileText className="h-4 w-4" aria-hidden />Evolução do paciente</button>
                </div>
            )}
        </div>
    );
}

export default function TodayAgendaPanel({
    appointments, nextAppointmentId, pendingEvolutionIds, loading, onRegisterEvolution, onOpenPatient,
}: Props) {
    const sorted = [...appointments].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const first = sorted[0]?.time;
    const last = sorted[sorted.length - 1];
    const lastEnd = (() => {
        const d = last ? aptDateTime(last) : null;
        if (!d) return null;
        d.setMinutes(d.getMinutes() + (Number(last.duration) || 40));
        return d.toTimeString().slice(0, 5);
    })();

    return (
        <section aria-labelledby="today-agenda-title" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                <h2 id="today-agenda-title" className="text-base font-semibold text-gray-900">Agenda de hoje</h2>
                {sorted.length > 0 && (
                    <span className="text-sm text-gray-600">
                        {sorted.length} {sorted.length === 1 ? 'sessão' : 'sessões'}{first && lastEnd ? ` · ${first} às ${lastEnd}` : ''}
                    </span>
                )}
            </div>

            {loading && sorted.length === 0 ? (
                <div className="space-y-px" aria-busy="true">
                    {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse bg-gray-50" />)}
                </div>
            ) : sorted.length === 0 ? (
                <div className="px-4 py-8 text-left">
                    <p className="font-medium text-gray-800">Nenhuma sessão marcada para hoje.</p>
                    <p className="text-sm text-gray-600">Quando a recepção agendar, a sessão aparece aqui com o status, o faturamento e o atalho para a evolução.</p>
                </div>
            ) : (
                <ol>
                    {sorted.map(apt => {
                        const patient = patientOf(apt);
                        const isNext = apt._id === nextAppointmentId;
                        const mins = minutesUntil(aptDateTime(apt));
                        const late = isOpen(apt) && mins !== null && mins < -10;
                        const evolutionPending = isCompleted(apt) && pendingEvolutionIds.has(patient._id);
                        const wa = whatsappLink(patient.phone);
                        const dim = isCanceled(apt) || isMissed(apt);
                        return (
                            <li
                                key={apt._id}
                                className={`grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-gray-100 px-4 py-3 last:border-b-0 sm:grid-cols-[64px_minmax(0,1fr)_auto] ${isNext ? 'bg-emerald-50/70 shadow-[inset_3px_0_0_theme(colors.emerald.600)]' : ''}`}
                            >
                                <div className="text-lg font-bold leading-tight tabular-nums text-gray-900">
                                    {apt.time || '--:--'}
                                    {isNext && <span className="block text-xs font-semibold text-emerald-800">próxima</span>}
                                    {!isNext && late && <span className="block text-xs font-semibold text-amber-800">atrasada</span>}
                                </div>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onOpenPatient(patient)}
                                        className={`w-fit text-left text-base font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${dim ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                                    >
                                        {patient.fullName}
                                    </button>
                                    <div className="flex flex-wrap gap-1.5">
                                        {statusChip(apt)}
                                        {billingChip(apt)}
                                        {journeyChip(apt)}
                                        {evolutionPending && <Chip tone="warn">Evolução pendente</Chip>}
                                    </div>
                                    {!dim && sessionSignals(apt).length > 0 && (
                                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{sessionSignals(apt).join(' · ')}</p>
                                    )}
                                </div>
                                <div className="col-start-2 flex flex-wrap items-center gap-1.5 sm:col-start-3 sm:justify-end">
                                    {isCompleted(apt) ? (
                                        <button type="button" className={evolutionPending ? btnPrimary : btnGhost} onClick={() => onRegisterEvolution(patient)}>
                                            <FileText className="h-4 w-4" aria-hidden />{evolutionPending ? 'Registrar evolução' : 'Ver evolução'}
                                        </button>
                                    ) : null}
                                    {/* Concluir e cancelar são da recepção (decisão do Kadu, 01/11/2026): sem botão para o terapeuta. */}
                                    {wa && !dim && (
                                        <a href={wa} target="_blank" rel="noreferrer" className={btnIcon} aria-label={`WhatsApp de ${patient.fullName}`} title={patient.phone}>
                                            <MessageCircle className="h-4 w-4" aria-hidden />
                                        </a>
                                    )}
                                    <RowMenu
                                        onOpen={() => onOpenPatient(patient)}
                                        onEvolution={() => onRegisterEvolution(patient)}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
