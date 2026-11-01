// Peças das filas comerciais: painel lateral, encaixe de horário livre, filas de pacote
// acabando e reativação, e a faixa de lead sem resposta. Regras: back/docs/COMMERCIAL_QUEUES.md.
import { CalendarPlus, Check, Clock, MessageCircle, RefreshCw, X } from 'lucide-react';
import { createSharedPoll, PollState } from '../../utils/sharedPoll';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ChurnItem, commercialService, ContactKind, EvaluationQueue, FitLead, NextDayItem, NextDayQueue, PackageEndingItem, QueuePatient, WaitingLead,
} from '../../services/commercialService';
import {
    confirmationNudgeMessage, daysText, evaluationMessage, fitLeadMessage, fitPatientMessage, genericWhen, leadReplyMessage, openWhatsApp,
    reactivationMessage, renewalMessage, specialtyText, waitingText, waLink,
} from './commercialCopy';

// ── Painel lateral ──────────────────────────────────────────────────────────

export const SidePanel: React.FC<{ title: string; kicker?: string; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({ title, kicker, subtitle, onClose, children }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return createPortal(
        <div className="fixed inset-0 z-[1400] flex justify-end bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <aside role="dialog" aria-modal="true" aria-label={title}
                className="flex h-full w-full max-w-md flex-col bg-white text-left shadow-2xl dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="min-w-0">
                        {kicker && <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{kicker}</p>}
                        <h3 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h3>
                        {subtitle && <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</div>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </aside>
        </div>,
        document.body,
    );
};

// ── Linha de fila com WhatsApp + "Contatado" ───────────────────────────────

export const useContact = () => {
    const [done, setDone] = useState<Record<string, 'saving' | 'ok' | 'err'>>({});
    const mark = useCallback(async (targetType: 'patient' | 'lead', targetId: string, kind: ContactKind, note?: string, until?: string) => {
        setDone(d => ({ ...d, [targetId]: 'saving' }));
        try {
            await commercialService.registerContact({ targetType, targetId, kind, note, ...(until ? { until } : {}) });
            setDone(d => ({ ...d, [targetId]: 'ok' }));
            return true;
        } catch (e) {
            console.error('[commercial] falha ao registrar contato', e);
            setDone(d => ({ ...d, [targetId]: 'err' }));
            return false;
        }
    }, []);
    return { done, mark };
};

export const QueueRow: React.FC<{
    title: string;
    lines: React.ReactNode[];
    phone?: string | null;
    message: string;
    contactLabel?: string;
    state?: 'saving' | 'ok' | 'err';
    contactedBefore?: string | null;
    /** Sem onContacted o botão "Contatado" não aparece (ex.: perfil sem permissão de registrar). */
    onContacted?: () => void;
    extra?: React.ReactNode;
}> = ({ title, lines, phone, message, contactLabel = 'Contatado', state, contactedBefore, onContacted, extra }) => {
    const hasPhone = !!waLink(phone);
    return (
        <li className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="font-semibold text-gray-900 dark:text-gray-50">{title}</p>
            {lines.filter(Boolean).map((l, i) => <p key={i} className="text-sm text-gray-600 dark:text-gray-400">{l}</p>)}
            {contactedBefore && state !== 'ok' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Contatado {daysText(Math.floor((Date.now() - new Date(contactedBefore).getTime()) / 86_400_000))}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => openWhatsApp(phone, message)} disabled={!hasPhone}
                    title={hasPhone ? 'Abre o WhatsApp com a mensagem pronta' : 'Sem telefone no cadastro'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700">
                    <MessageCircle size={14} aria-hidden /> {hasPhone ? 'WhatsApp' : 'Sem telefone'}
                </button>
                {!onContacted ? null : state === 'ok' ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check size={14} aria-hidden /> Registrado</span>
                ) : (
                    <button type="button" onClick={onContacted} disabled={state === 'saving'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                        <Check size={14} aria-hidden /> {state === 'saving' ? 'Salvando…' : contactLabel}
                    </button>
                )}
                {extra}
                {state === 'err' && <span className="text-xs text-red-600 dark:text-red-400">Não salvou. Tente de novo.</span>}
            </div>
            <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">Ver mensagem</summary>
                <p className="mt-1 whitespace-pre-line rounded-md bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{message}</p>
            </details>
        </li>
    );
};

const ListState: React.FC<{ loading: boolean; error: string | null; empty: boolean; emptyText: string; onRetry: () => void }> = ({ loading, error, empty, emptyText, onRetry }) => {
    if (loading) return <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}</div>;
    if (error) return (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p className="font-semibold text-gray-900 dark:text-gray-50">Não foi possível carregar</p>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"><RefreshCw size={14} aria-hidden /> Tentar de novo</button>
        </div>
    );
    if (empty) return <p className="text-sm text-gray-600 dark:text-gray-400">{emptyText}</p>;
    return null;
};

const errText = (e: any) => e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Erro desconhecido';

// ── 1. Encaixe inteligente ──────────────────────────────────────────────────

export interface FitSlot {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    doctorId: string;
    doctorName: string;
    specialty: string;
}

export const FitSlotPanel: React.FC<{ slot: FitSlot; onClose: () => void; onSchedule?: (patientId?: string) => void }> = ({ slot, onClose, onSchedule }) => {
    const [data, setData] = useState<{ leads: FitLead[]; patients: QueuePatient[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);
    const { done, mark } = useContact();
    const when = genericWhen(slot.date, slot.time);
    const dateLabel = new Date(`${slot.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

    useEffect(() => {
        let alive = true;
        setData(null); setError(null);
        commercialService.fitCandidates(slot.specialty)
            .then(d => { if (alive) setData(d); })
            .catch(e => { if (alive) setError(errText(e)); });
        return () => { alive = false; };
    }, [slot.specialty, nonce]);

    const total = (data?.leads.length || 0) + (data?.patients.length || 0);

    return (
        <SidePanel
            kicker={`${dateLabel} · ${slot.time}`}
            title="Encaixar neste horário"
            subtitle={<>{slot.doctorName} · {specialtyText(slot.specialty)}. A mensagem fala “{when}”, sem a hora exata.</>}
            onClose={onClose}>
            {onSchedule && (
                <button type="button" onClick={() => onSchedule()}
                    className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800">
                    <CalendarPlus size={15} aria-hidden /> Agendar outra pessoa
                </button>
            )}
            <ListState loading={!data && !error} error={error} empty={!!data && total === 0} onRetry={() => setNonce(n => n + 1)}
                emptyText={`Nenhum lead aberto de ${specialtyText(slot.specialty)} nos últimos 60 dias e nenhum paciente dessa especialidade sem próxima sessão.`} />
            {data && data.patients.length > 0 && (
                <>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pacientes sem próxima sessão · {data.patients.length}</h4>
                    <ul className="mb-4 flex flex-col gap-2">
                        {data.patients.map(p => (
                            <QueueRow key={p.patientId} title={p.name}
                                lines={[`Última sessão ${daysText(p.daysSince)}${p.doctorName ? ` com ${p.doctorName}` : ''}`]}
                                phone={p.phone} state={done[p.patientId]} contactedBefore={p.lastContactAt}
                                message={fitPatientMessage({ name: p.name, specialty: slot.specialty, when, doctorName: slot.doctorName })}
                                onContacted={() => mark('patient', p.patientId, 'fit')}
                                extra={onSchedule && (
                                    <button type="button" onClick={() => onSchedule(p.patientId)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                                        <CalendarPlus size={14} aria-hidden /> Agendar
                                    </button>
                                )} />
                        ))}
                    </ul>
                </>
            )}
            {data && data.leads.length > 0 && (
                <>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Leads interessados · {data.leads.length}</h4>
                    <ul className="flex flex-col gap-2">
                        {data.leads.map(l => (
                            <QueueRow key={l.leadId} title={l.name}
                                lines={[`${LEAD_STATUS[l.status] || 'Lead aberto'} · último contato ${daysText(l.lastInteractionAt ? Math.floor((Date.now() - new Date(l.lastInteractionAt).getTime()) / 86_400_000) : null)}`]}
                                phone={l.phone} state={done[l.leadId]} contactedBefore={l.lastContactAt}
                                message={fitLeadMessage({ name: l.name, specialty: slot.specialty, when })}
                                onContacted={() => mark('lead', l.leadId, 'fit')} />
                        ))}
                    </ul>
                </>
            )}
        </SidePanel>
    );
};

const LEAD_STATUS: Record<string, string> = {
    lista_espera: 'Lista de espera', lead_quente: 'Lead quente', lead_frio: 'Lead frio', novo: 'Lead novo', new: 'Lead novo',
    engajado: 'Em conversa', atendimento: 'Em atendimento', em_andamento: 'Em andamento', pendencia_documentacao: 'Pendência de documento',
};

// ── 2 e 3. Filas de pacote acabando e reativação ───────────────────────────

export const PackageEndingPanel: React.FC<{ items: PackageEndingItem[]; onClose: () => void; onChanged: () => void }> = ({ items, onClose, onChanged }) => {
    const { done, mark } = useContact();
    return (
        <SidePanel kicker="Precisa de você" title="Pacote acabando"
            subtitle="Pacotes com 80% ou mais das sessões feitas (10 de 12, 3 de 4). A mensagem explica o valor antes do preço (R$ 180 por sessão no pacote semanal)."
            onClose={onClose}>
            <ListState loading={false} error={null} empty={items.length === 0} onRetry={onChanged} emptyText="Nenhum pacote no fim agora." />
            <ul className="flex flex-col gap-2">
                {items.map(i => (
                    <QueueRow key={i.packageId} title={i.name}
                        lines={[
                            `${i.remaining <= 0 ? 'Pacote sem sessões' : i.remaining === 1 ? '1 sessão restante' : `${i.remaining} sessões restantes`} de ${i.totalSessions} · ${specialtyText(i.specialty) || 'especialidade não informada'}`,
                            i.nextSessionAt ? `Próxima: ${new Date(i.nextSessionAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).replace('.', '')}${i.nextSessionTime ? ` às ${i.nextSessionTime}` : ''}${i.doctorName ? ` com ${i.doctorName}` : ''}` : 'Sem próxima sessão marcada',
                        ]}
                        phone={i.phone} state={done[i.patientId]} contactedBefore={i.lastContactAt}
                        message={renewalMessage({ name: i.name, specialty: i.specialty, remaining: i.remaining })}
                        extra={<RenewalChip stage={i.stage} remaining={i.remaining} />}
                        onContacted={async () => { if (await mark('patient', i.patientId, 'renewal')) onChanged(); }} />
                ))}
            </ul>
        </SidePanel>
    );
};

// Chip do estágio de renovação: amarelo = gerar cobrança do próximo mês; laranja = última sessão.
const RenewalChip: React.FC<{ stage?: PackageEndingItem['stage']; remaining: number }> = ({ stage, remaining }) => {
    const s = stage || (remaining <= 1 ? 'ultima' : 'renovar');
    if (s === 'ok') return null;
    return s === 'ultima' ? (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Última sessão · falar hoje</span>
    ) : (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Renovar · gerar cobrança</span>
    );
};

const PAUSE_OPTIONS = [15, 30, 60];
const pauseUntil = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export const ChurnPanel: React.FC<{ items: ChurnItem[]; onClose: () => void; onChanged: () => void }> = ({ items, onClose, onChanged }) => {
    const { done, mark } = useContact();
    return (
        <SidePanel kicker="Precisa de você" title="Risco de evasão"
            subtitle="Pacientes ativos sem nada marcado há 14 dias ou mais (21 no quinzenal). Quem avisou que ia faltar ou está em pausa combinada não aparece."
            onClose={onClose}>
            <ListState loading={false} error={null} empty={items.length === 0} onRetry={onChanged} emptyText="Nenhum paciente em risco agora." />
            <ul className="flex flex-col gap-2">
                {items.map(p => (
                    <QueueRow key={p.patientId} title={p.name}
                        lines={[`Sem agendamento há ${p.daysSince} dias${p.specialty ? ` · ${specialtyText(p.specialty)}` : ''}${p.doctorName ? ` com ${p.doctorName}` : ''}`]}
                        phone={p.phone} state={done[p.patientId]} contactedBefore={p.lastContactAt}
                        message={p.message}
                        onContacted={async () => { if (await mark('patient', p.patientId, 'churn')) onChanged(); }}
                        extra={done[p.patientId] === 'ok' ? null : (
                            <label className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                                <span className="sr-only">Pausar alerta</span>
                                <select defaultValue="" aria-label={`Pausar alerta de ${p.name}`}
                                    onChange={async e => {
                                        const days = Number(e.target.value);
                                        if (!days) return;
                                        if (await mark('patient', p.patientId, 'churn_pause', `Pausa de ${days} dias`, pauseUntil(days))) onChanged();
                                    }}
                                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900">
                                    <option value="" disabled>Pausar…</option>
                                    {PAUSE_OPTIONS.map(d => <option key={d} value={d}>{d} dias (férias, saúde)</option>)}
                                </select>
                            </label>
                        )} />
                ))}
            </ul>
        </SidePanel>
    );
};

export const ReactivationPanel: React.FC<{ items: QueuePatient[]; onClose: () => void; onChanged: () => void }> = ({ items, onClose, onChanged }) => {
    const { done, mark } = useContact();
    return (
        <SidePanel kicker="Precisa de você" title="Sem próxima sessão"
            subtitle="Atendidos nos últimos 120 dias, sem nada marcado e sem vir há 7 dias ou mais. Quem já foi contatado nesta semana fica no fim."
            onClose={onClose}>
            <ListState loading={false} error={null} empty={items.length === 0} onRetry={onChanged} emptyText="Todo mundo atendido recentemente já tem próxima sessão." />
            <ul className="flex flex-col gap-2">
                {items.map(p => (
                    <QueueRow key={p.patientId} title={p.name}
                        lines={[`Última sessão ${daysText(p.daysSince)}${p.specialty ? ` · ${specialtyText(p.specialty)}` : ''}${p.doctorName ? ` com ${p.doctorName}` : ''}`]}
                        phone={p.phone} state={done[p.patientId]} contactedBefore={p.lastContactAt}
                        message={reactivationMessage({ name: p.name, specialty: p.specialty })}
                        onContacted={async () => { if (await mark('patient', p.patientId, 'reactivation')) onChanged(); }} />
                ))}
            </ul>
        </SidePanel>
    );
};

// ── 4. Lead novo sem resposta ───────────────────────────────────────────────

const useNow = (ms: number) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
    return now;
};

export const LeadsWaitingStrip: React.FC<{ items: WaitingLead[]; onOpenLeads?: () => void; onChanged: () => void }> = ({ items, onOpenLeads, onChanged }) => {
    const now = useNow(30_000);
    const { done, mark } = useContact();
    const [showAll, setShowAll] = useState(false);
    const pending = items.filter(i => done[i.leadId] !== 'ok');
    if (pending.length === 0) return null;
    const shown = showAll ? pending : pending.slice(0, 3);
    const minutesOf = (l: WaitingLead) => Math.max(l.waitingMinutes, Math.floor((now - new Date(l.waitingSince).getTime()) / 60_000));

    return (
        <section aria-labelledby="leads-esperando" className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 id="leads-esperando" className="flex items-center gap-2 text-base font-bold text-red-900 dark:text-red-200">
                    <Clock size={18} aria-hidden />
                    {pending.length === 1 ? '1 lead novo esperando resposta há mais de 2h' : `${pending.length} leads novos esperando resposta há mais de 2h`}
                </h2>
                {onOpenLeads && (
                    <button type="button" onClick={onOpenLeads} className="text-sm font-semibold text-red-800 hover:underline dark:text-red-300">Abrir leads</button>
                )}
            </div>
            <ul className="flex flex-col divide-y divide-red-200/70 dark:divide-red-500/20">
                {shown.map(l => {
                    const hasPhone = !!waLink(l.phone);
                    return (
                        <li key={l.leadId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-gray-900 dark:text-gray-50">{l.name}</span>
                                <span className="block truncate text-sm text-gray-700 dark:text-gray-300">
                                    {[specialtyText(l.therapyArea), l.lastMessage ? `“${l.lastMessage}”` : 'ainda sem mensagem'].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-sm font-semibold tabular-nums text-red-800 dark:bg-gray-900 dark:text-red-300" title={`Esperando desde ${new Date(l.waitingSince).toLocaleString('pt-BR')}`}>
                                <Clock size={13} aria-hidden /> {waitingText(minutesOf(l))}
                            </span>
                            <span className="flex items-center gap-2">
                                <button type="button" onClick={() => openWhatsApp(l.phone, leadReplyMessage({ name: l.name }))} disabled={!hasPhone}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                                    <MessageCircle size={14} aria-hidden /> {hasPhone ? 'Responder' : 'Sem telefone'}
                                </button>
                                <button type="button" disabled={done[l.leadId] === 'saving'}
                                    onClick={async () => { if (await mark('lead', l.leadId, 'lead_reply')) onChanged(); }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-60 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-200">
                                    <Check size={14} aria-hidden /> {done[l.leadId] === 'saving' ? 'Salvando…' : 'Respondido'}
                                </button>
                            </span>
                        </li>
                    );
                })}
            </ul>
            {pending.length > 3 && (
                <button type="button" onClick={() => setShowAll(v => !v)} className="mt-1 text-sm font-semibold text-red-800 hover:underline dark:text-red-300">
                    {showAll ? 'Mostrar menos' : `Ver os ${pending.length}`}
                </button>
            )}
        </section>
    );
};

// ── 5. Avaliou e não fechou pacote ──────────────────────────────────────────

const LOST_REASONS = ['Preço', 'Vai usar o convênio', 'Distância ou horário', 'Vai pensar', 'Outro'];

export const EvaluationPanel: React.FC<{ queue: EvaluationQueue; onClose: () => void; onChanged: () => void }> = ({ queue, onClose, onChanged }) => {
    const { done, mark } = useContact();
    const [range, setRange] = useState<'recent' | 'older'>('recent');
    const [lostFor, setLostFor] = useState<string | null>(null);
    const recent = queue.items.filter(i => i.daysSince <= 10);
    const older = queue.items.filter(i => i.daysSince > 10);
    const shown = range === 'recent' ? recent : older;
    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    return (
        <SidePanel kicker="Precisa de você" title="Avaliou e não fechou"
            subtitle={<>Avaliação particular feita nos últimos 30 dias, sem pacote e sem sessão marcada depois. Potencial: <b>{brl(queue.potentialMonthly)}/mês</b>.</>}
            onClose={onClose}>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Período">
                {([['recent', '3 a 10 dias', recent.length], ['older', '11 a 30 dias', older.length]] as const).map(([k, label, n]) => (
                    <button key={k} type="button" aria-pressed={range === k} onClick={() => setRange(k)}
                        className={`rounded-full border px-3 py-1 text-sm ${range === k ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                        {label} <b className="tabular-nums">{n}</b>
                    </button>
                ))}
            </div>
            <ListState loading={false} error={null} empty={shown.length === 0} onRetry={onChanged} emptyText="Ninguém nesta faixa agora." />
            <ul className="flex flex-col gap-2">
                {shown.map(i => (
                    <QueueRow key={i.patientId} title={`${i.name}${i.specialty ? ` · ${specialtyText(i.specialty)}` : ''}`}
                        lines={[
                            `Avaliou ${daysText(i.daysSince)}${i.doctorName ? ` com ${i.doctorName}` : ''}`,
                            i.lastContactNote ? `Último contato: ${i.lastContactNote}` : '',
                        ]}
                        phone={i.phone} state={done[i.patientId]} contactedBefore={i.lastContactAt}
                        message={evaluationMessage({ name: i.name, specialty: i.specialty, doctorName: i.doctorName })}
                        onContacted={async () => { if (await mark('patient', i.patientId, 'evaluation')) onChanged(); }}
                        extra={lostFor === i.patientId ? (
                            <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Motivo">
                                {LOST_REASONS.map(r => (
                                    <button key={r} type="button" disabled={done[i.patientId] === 'saving'}
                                        onClick={async () => { if (await mark('patient', i.patientId, 'evaluation_lost', r)) { setLostFor(null); onChanged(); } }}
                                        className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200">{r}</button>
                                ))}
                                <button type="button" onClick={() => setLostFor(null)} className="text-xs text-gray-500 hover:underline">voltar</button>
                            </span>
                        ) : (
                            <button type="button" onClick={() => setLostFor(i.patientId)}
                                className="rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">Não vai fechar</button>
                        )} />
                ))}
            </ul>
        </SidePanel>
    );
};

// ── 6. Próximo dia útil sem confirmação ─────────────────────────────────────

const STATE_LABEL: Record<NextDayItem['state'], string> = {
    not_sent: 'lembrete não enviado',
    no_reply: 'sem resposta',
    change_requested: 'pediu para remarcar',
    review_required: 'quer falar com a recepção',
    no_phone: 'sem telefone',
};

export const NextDayConfirmPanel: React.FC<{ queue: NextDayQueue; onClose: () => void; onChanged: () => void; onOpenAgenda?: () => void }> = ({ queue, onClose, onChanged, onOpenAgenda }) => {
    const [filter, setFilter] = useState<'waiting' | 'change' | 'no_phone'>('waiting');
    const [bulk, setBulk] = useState<'idle' | 'confirm' | 'sending' | { queued: number; failed: number; paused: boolean } | 'error'>('idle');
    const [confirmed, setConfirmed] = useState<Record<string, 'saving' | 'ok' | 'err'>>({});
    const groups = {
        waiting: queue.items.filter(i => i.state === 'not_sent' || i.state === 'no_reply'),
        change: queue.items.filter(i => i.state === 'change_requested' || i.state === 'review_required'),
        no_phone: queue.items.filter(i => i.state === 'no_phone'),
    };
    const notSent = queue.items.filter(i => i.state === 'not_sent').length;
    const dayText = queue.date
        ? new Date(`${queue.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
        : '';
    const sendAll = async () => {
        if (!queue.date) return;
        setBulk('sending');
        try {
            const r = await commercialService.sendConfirmationReminders(queue.date);
            setBulk({ queued: r?.queued ?? 0, failed: r?.failed ?? 0, paused: !!r?.queuePaused });
            onChanged();
        } catch (e) {
            console.error('[commercial] lembretes', e);
            setBulk('error');
        }
    };
    const confirmOne = async (id: string) => {
        setConfirmed(c => ({ ...c, [id]: 'saving' }));
        try { await commercialService.confirmAttendance(id); setConfirmed(c => ({ ...c, [id]: 'ok' })); onChanged(); }
        catch { setConfirmed(c => ({ ...c, [id]: 'err' })); }
    };
    const shown = groups[filter];
    return (
        <SidePanel kicker="Precisa de você" title="Sessões sem confirmação"
            subtitle={queue.date ? <><span className="capitalize">{dayText}</span> · {queue.total} sessões, {queue.confirmed} já confirmadas.</> : 'Nenhuma sessão nos próximos 7 dias.'}
            onClose={onClose}>
            {notSent > 0 && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10">
                    {bulk === 'idle' && <><span>{notSent} {notSent === 1 ? 'paciente ainda não recebeu' : 'pacientes ainda não receberam'} o lembrete.</span>
                        <button type="button" onClick={() => setBulk('confirm')} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">Enviar lembrete para {notSent}</button></>}
                    {bulk === 'confirm' && <><span>Enviar o lembrete de confirmação pelo WhatsApp da clínica para {notSent}?</span>
                        <span className="flex gap-2"><button type="button" onClick={sendAll} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">Enviar</button>
                        <button type="button" onClick={() => setBulk('idle')} className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-gray-600">Cancelar</button></span></>}
                    {bulk === 'sending' && <span>Enviando…</span>}
                    {bulk === 'error' && <><span className="text-red-700 dark:text-red-300">Não foi possível enfileirar os lembretes.</span><button type="button" onClick={sendAll} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Tentar de novo</button></>}
                </div>
            )}
            {typeof bulk === 'object' && (
                <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10" role="status">
                    {bulk.queued} {bulk.queued === 1 ? 'lembrete entrou' : 'lembretes entraram'} na fila de envio{bulk.failed ? `, ${bulk.failed} com falha` : ''}.
                    {bulk.paused ? ' A fila do WhatsApp está pausada: eles saem quando ela voltar.' : ' A resposta aparece aqui quando o paciente responder.'}
                </p>
            )}
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtro">
                {([['waiting', 'Sem resposta', groups.waiting.length], ['change', 'Pediu remarcar', groups.change.length], ['no_phone', 'Sem telefone', groups.no_phone.length]] as const).map(([k, label, n]) => (
                    <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
                        className={`rounded-full border px-3 py-1 text-sm ${filter === k ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                        {label} <b className="tabular-nums">{n}</b>
                    </button>
                ))}
            </div>
            <ListState loading={false} error={null} empty={shown.length === 0} onRetry={onChanged} emptyText="Ninguém neste filtro." />
            <ul className="flex flex-col gap-2">
                {shown.map(i => {
                    const st = confirmed[i.appointmentId];
                    const hasPhone = !!waLink(i.phone);
                    return (
                        <li key={i.appointmentId} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="font-semibold text-gray-900 dark:text-gray-50"><span className="tabular-nums">{i.time}</span> · {i.name}{i.specialty ? ` · ${specialtyText(i.specialty)}` : ''}</p>
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{STATE_LABEL[i.state]}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {[i.doctorName, i.sentAt ? `lembrete ${new Date(i.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '', i.responseText ? `respondeu "${i.responseText.slice(0, 60)}"` : '', i.missed30 ? `${i.missed30} ${i.missed30 === 1 ? 'falta' : 'faltas'} em 30 dias` : ''].filter(Boolean).join(' · ')}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button type="button" disabled={!hasPhone} onClick={() => openWhatsApp(i.phone, confirmationNudgeMessage({ name: i.name, when: queue.date ? genericWhen(queue.date, i.time) : 'amanhã' }))}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700">
                                    <MessageCircle size={14} aria-hidden /> {hasPhone ? 'WhatsApp' : 'Sem telefone'}
                                </button>
                                {st === 'ok' ? (
                                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check size={14} aria-hidden /> Confirmada</span>
                                ) : (
                                    <button type="button" disabled={st === 'saving'} onClick={() => confirmOne(i.appointmentId)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                                        <Check size={14} aria-hidden /> {st === 'saving' ? 'Salvando…' : 'Confirmar manualmente'}
                                    </button>
                                )}
                                {(i.state === 'change_requested' || i.state === 'review_required') && onOpenAgenda && (
                                    <button type="button" onClick={onOpenAgenda} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                                        <CalendarPlus size={14} aria-hidden /> Remarcar na Agenda
                                    </button>
                                )}
                                {st === 'err' && <span className="text-xs text-red-600 dark:text-red-400">Não salvou. Tente de novo.</span>}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </SidePanel>
    );
};

// ── Dados das filas do Dashboard ────────────────────────────────────────────

// Lead esperando muda rápido: uma busca a cada 2 min, compartilhada e pausada com a aba oculta.
const leadsWaitingPoll = createSharedPoll<WaitingLead[]>(() => commercialService.leadsWaiting(2), 120_000);

export function useCommercialQueues() {
    const [packageEnding, setPackageEnding] = useState<PackageEndingItem[] | null>(null);
    const [reactivation, setReactivation] = useState<QueuePatient[] | null>(null);
    const [churn, setChurn] = useState<ChurnItem[] | null>(null);
    // Erro ≠ zero: o "Precisa de você" mostra "não carregou" em vez de esconder a fila.
    const [evaluation, setEvaluation] = useState<EvaluationQueue | null>(null);
    const [nextDay, setNextDay] = useState<NextDayQueue | null>(null);
    const [queueErrors, setQueueErrors] = useState<{ packageEnding: boolean; reactivation: boolean; churn: boolean; evaluation: boolean; nextDay: boolean }>({ packageEnding: false, reactivation: false, churn: false, evaluation: false, nextDay: false });
    const [leadsState, setLeadsState] = useState<PollState<WaitingLead[]>>(leadsWaitingPoll.getState());

    const loadQueues = useCallback(() => {
        commercialService.packageEnding()
            .then(d => { setPackageEnding(d); setQueueErrors(e => ({ ...e, packageEnding: false })); })
            .catch(e => { console.error('[commercial] pacote acabando', e); setPackageEnding([]); setQueueErrors(x => ({ ...x, packageEnding: true })); });
        commercialService.reactivation()
            .then(d => { setReactivation(d); setQueueErrors(e => ({ ...e, reactivation: false })); })
            .catch(e => { console.error('[commercial] reativação', e); setReactivation([]); setQueueErrors(x => ({ ...x, reactivation: true })); });
        commercialService.churnRisk()
            .then(d => { setChurn(d); setQueueErrors(e => ({ ...e, churn: false })); })
            .catch(e => { console.error('[commercial] risco de evasão', e); setChurn([]); setQueueErrors(x => ({ ...x, churn: true })); });
        commercialService.evaluationNoPackage()
            .then(d => { setEvaluation(d); setQueueErrors(e => ({ ...e, evaluation: false })); })
            .catch(e => { console.error('[commercial] avaliação sem pacote', e); setQueueErrors(x => ({ ...x, evaluation: true })); });
        commercialService.unconfirmedNextDay()
            .then(d => { setNextDay(d); setQueueErrors(e => ({ ...e, nextDay: false })); })
            .catch(e => { console.error('[commercial] sem confirmação', e); setQueueErrors(x => ({ ...x, nextDay: true })); });
    }, []);
    const loadLeads = useCallback(() => { leadsWaitingPoll.refresh(); }, []);

    useEffect(() => { loadQueues(); }, [loadQueues]);
    useEffect(() => leadsWaitingPoll.subscribe(setLeadsState), []);

    const reload = useCallback(() => { loadQueues(); loadLeads(); }, [loadQueues, loadLeads]);
    // Quem está no risco de evasão não aparece de novo em "Sem próxima sessão" (um card por paciente).
    const reactivationOnly = React.useMemo(() => {
        if (!reactivation || !churn?.length) return reactivation;
        const inChurn = new Set(churn.map(c => c.patientId));
        return reactivation.filter(r => !inChurn.has(r.patientId));
    }, [reactivation, churn]);
    return { packageEnding, reactivation: reactivationOnly, churn, evaluation, nextDay, leadsWaiting: leadsState.data || [], queueErrors, reload, reloadQueues: loadQueues, reloadLeads: loadLeads };
}
