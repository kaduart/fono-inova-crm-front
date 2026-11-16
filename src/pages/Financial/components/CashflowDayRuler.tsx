import { useMemo } from 'react';

// Régua do dia (mock v3 aprovado em 04/11/2026): uma faixa por profissional, cada sessão é um bloco
// colorido pelo estado. Cor = estado em toda a tela do Caixa (mesma legenda das ações e do topo).
export type RulerState = 'pago' | 'pacote' | 'sem' | 'conv' | 'liminar' | 'falta' | 'futuro';

export const RULER_STATES: { key: RulerState; label: string; swatch: string; block: string }[] = [
    { key: 'pago', label: 'pagos', swatch: 'bg-emerald-700 dark:bg-emerald-500', block: 'bg-emerald-700 dark:bg-emerald-500' },
    { key: 'pacote', label: 'de pacote', swatch: 'bg-emerald-300 dark:bg-emerald-800', block: 'bg-emerald-300 dark:bg-emerald-800' },
    { key: 'sem', label: 'sem pagamento', swatch: 'bg-amber-500 dark:bg-amber-400', block: 'bg-amber-500 dark:bg-amber-400' },
    { key: 'conv', label: 'convênio', swatch: 'bg-blue-600 dark:bg-blue-500', block: 'bg-blue-600 dark:bg-blue-500' },
    { key: 'liminar', label: 'liminar', swatch: 'bg-violet-500 dark:bg-violet-400', block: 'bg-violet-500 dark:bg-violet-400' },
    { key: 'falta', label: 'faltas/cancel.', swatch: 'bg-red-600 dark:bg-red-500', block: 'bg-red-600 dark:bg-red-500' },
    { key: 'futuro', label: 'aguardando', swatch: 'border-[1.5px] border-dashed border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-900', block: 'border-[1.5px] border-dashed border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-900' },
];
const BLOCK_TEXT: Record<RulerState, string> = { pago: 'Pago', pacote: 'Pacote', sem: 'Sem pgto', conv: 'Conv.', liminar: 'Liminar', falta: 'Falta', futuro: '' };
const STATE_TEXT: Record<RulerState, string> = { pago: 'pago', pacote: 'pacote (já pago antes)', sem: 'atendido sem pagamento', conv: 'convênio', liminar: 'liminar', falta: 'falta ou cancelamento', futuro: 'aguardando' };

/** Campos que a régua lê de /v2/appointments (o resto da linha é ignorado). */
export interface RulerAppointment {
    id?: string; _id?: string; time?: string; duration?: number | string; operationalStatus?: string;
    billingType?: string; insuranceProvider?: unknown; package?: unknown; professionalName?: string;
    doctor?: { fullName?: string } | null; patientInfo?: { fullName?: string } | null; patient?: { fullName?: string } | null; patientName?: string;
}

const toMin = (t?: string) => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : NaN; };
const idOf = (a: RulerAppointment) => String(a?.id || a?._id || '');

/** Classifica uma sessão do dia. Mesma base da aba Agenda do Dia (effectiveStatus) + pendentes do backend. */
export function rulerState(a: RulerAppointment, completed: boolean, pendingIds: Set<string>): RulerState {
    if (a.operationalStatus === 'canceled' || a.operationalStatus === 'missed') return 'falta';
    if (!completed) return 'futuro';
    if (pendingIds.has(idOf(a))) return 'sem';
    if (a.billingType === 'convenio' || a.insuranceProvider) return 'conv';
    if (a.billingType === 'liminar') return 'liminar';
    if (a.package) return 'pacote';
    return 'pago';
}

interface Props {
    appointments: RulerAppointment[];
    /** effectiveStatus da tela (concluído pelo backend ou pelas listas de atendidos). */
    isCompleted: (a: RulerAppointment) => boolean;
    pendingIds: Set<string>;
    /** Data mostrada é hoje: desenha a linha "agora". */
    isToday: boolean;
    now?: Date;
    onState: (state: RulerState) => void;
    /** R$ do backend por estado (sem pagamento, convênio a faturar, faltas). */
    values?: Partial<Record<RulerState, string>>;
}

export default function CashflowDayRuler({ appointments, isCompleted, pendingIds, isToday, now = new Date(), onState, values = {} }: Props) {
    const { lanes, start, end, counts } = useMemo(() => {
        const items = appointments
            .filter(a => a.operationalStatus !== 'converted' && Number.isFinite(toMin(a.time)))
            .map(a => ({ a, min: toMin(a.time), dur: Number(a.duration) > 0 ? Number(a.duration) : 40, state: rulerState(a, isCompleted(a), pendingIds) }));
        const s = Math.min(8 * 60, ...items.map(i => Math.floor(i.min / 60) * 60));
        const e = Math.max(19 * 60, ...items.map(i => Math.ceil((i.min + i.dur) / 60) * 60));
        const byProf = new Map<string, typeof items>();
        items.forEach(i => {
            const name = i.a.professionalName || i.a.doctor?.fullName || 'Sem profissional';
            byProf.set(name, [...(byProf.get(name) || []), i]);
        });
        const c = {} as Record<RulerState, number>;
        items.forEach(i => { c[i.state] = (c[i.state] || 0) + 1; });
        return { lanes: [...byProf.entries()].sort((x, y) => x[0].localeCompare(y[0], 'pt-BR')), start: s, end: e, counts: c };
    }, [appointments, isCompleted, pendingIds]);
    if (!lanes.length) return null;
    const span = end - start;
    const pct = (m: number) => `${((m - start) / span) * 100}%`;
    const hours: number[] = [];
    for (let h = start / 60; h <= end / 60; h++) hours.push(h);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const showNow = isToday && nowMin >= start && nowMin <= end;
    return <section aria-labelledby="cashflow-ruler" className="space-y-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="cashflow-ruler" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Régua do dia</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Cada bloco é uma sessão. Passe o mouse para ver o paciente e clique para ver a lista.</span>
        </div>
        <div className="overflow-x-auto overflow-y-hidden py-1">
            <div className="grid min-w-[640px] grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                <span />
                <div className="relative h-5 pt-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500" aria-hidden>
                    {hours.map((h, i) => <span key={h} className={`absolute tabular-nums ${i === 0 ? '' : i === hours.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: pct(h * 60) }}>{h}h</span>)}
                </div>
                {lanes.map(([name, items]) => <div key={name} className="contents">
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200" title={name}>{name}</span>
                    <div className="relative h-9 rounded-lg bg-gray-50 ring-1 ring-inset ring-gray-100 dark:bg-gray-800/60 dark:ring-gray-800">
                        {items.map(({ a, min, dur, state }, i) => {
                            const meta = RULER_STATES.find(s => s.key === state)!;
                            const label = `${a.time} ${a.patientInfo?.fullName || a.patient?.fullName || a.patientName || ''}: ${STATE_TEXT[state]}`;
                            return <button key={idOf(a) || i} type="button" title={label} aria-label={label} onClick={() => onState(state)}
                                className={`absolute inset-y-1.5 grid place-items-center overflow-hidden rounded-md p-0 text-[10.5px] font-bold leading-none ${state === 'pacote' ? 'text-emerald-900 dark:text-emerald-100' : state === 'futuro' ? 'text-gray-500 dark:text-gray-400' : 'text-white'} shadow-sm ring-1 ring-inset ring-black/5 transition-all hover:-translate-y-px duration-quick motion-reduce:transition-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${meta.block}`}
                                style={{ left: pct(min), width: `calc(${(dur / span) * 100}% - 3px)` }}>{state === 'futuro' ? a.time : BLOCK_TEXT[state]}</button>;
                        })}
                        {showNow && <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-gray-900/70 dark:bg-gray-100/70" style={{ left: pct(nowMin) }} />}
                    </div>
                </div>)}
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
            {RULER_STATES.filter(s => counts[s.key]).map(s => <button key={s.key} type="button" onClick={() => onState(s.key)}
                className="inline-flex min-h-8 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-[13px] text-gray-800 transition-colors duration-quick motion-reduce:transition-none hover:border-gray-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-[3px] ${s.swatch}`} />
                <b className="tabular-nums">{counts[s.key]}</b>{s.label}
                {values[s.key] && <span className="tabular-nums text-gray-600 dark:text-gray-300">{values[s.key]}</span>}
            </button>)}
        </div>
    </section>;
}
