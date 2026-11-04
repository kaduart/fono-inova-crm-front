// components/patient/PatientMiniCalendar.tsx
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useMemo, useRef } from 'react';
import { Appointment } from '../../utils/types';
import { getSpecialtyLabel } from '../../constants/specialties';
import { getInsuranceGuideNumber } from '../../utils/insuranceGuideNumber';

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  completed:    { bg: 'var(--fx-emerald-100)', text: 'var(--fx-emerald-800)', label: 'Realizado' },
  paid:         { bg: 'var(--fx-emerald-100)', text: 'var(--fx-emerald-800)', label: 'Realizado' },
  confirmed:    { bg: 'var(--fx-blue-100)', text: 'var(--fx-blue-800)', label: 'Confirmado' },
  scheduled:    { bg: 'var(--fx-amber-100)', text: 'var(--fx-amber-800)', label: 'Agendado' },
  pre_agendado: { bg: 'var(--fx-indigo-100)', text: 'var(--fx-indigo-800)', label: 'Pré-agendado' },
  canceled:     { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)', label: 'Cancelado' },
  cancelled:    { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)', label: 'Cancelado' },
  missed:       { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)', label: 'Faltou' },
  no_show:      { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)', label: 'Faltou' },
  force_cancelled: { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)', label: 'Cancelado' },
};
const OPEN_STATUS = new Set(['scheduled', 'confirmed', 'pre_agendado']);
// Passou do horário (1h de folga) e segue aberto: ninguém concluiu nem marcou falta.
const NO_CLOSURE_STYLE = { bg: 'var(--fx-amber-50)', text: 'var(--fx-amber-800)', label: 'Sem baixa' };
const LEGEND = [
  { label: 'Realizado', style: STATUS_STYLE.completed },
  { label: 'Confirmado', style: STATUS_STYLE.confirmed },
  { label: 'Agendado', style: STATUS_STYLE.scheduled },
  { label: 'Pré-agendado', style: STATUS_STYLE.pre_agendado },
  { label: 'Falta ou cancelado', style: STATUS_STYLE.missed },
];
const DEFAULT_STYLE = { bg: 'var(--fx-gray-100)', text: 'var(--fx-gray-700)', label: '' };

type CardAppt = Appointment & {
  sessionType?: string; serviceType?: string; billingType?: string; paymentMethod?: string; paymentStatus?: string;
  insuranceGuide?: { _id?: string; number?: string | number; totalSessions?: number } | string;
  package?: { _id?: string; totalSessions?: number } | string;
  liminarContract?: { _id?: string } | string;
  session?: { isPaid?: boolean } | string;
  attendanceConfirmation?: { status?: string };
};
const refId = (v: unknown): string => (v && typeof v === 'object' ? String((v as { _id?: string })._id || '') : v ? String(v) : '');
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const shortName = (full: string) => { const p = full.trim().split(/\s+/); return p.length > 2 ? `${p[0]} ${p[p.length - 1]}` : full; };
const CANCELED_STATUS = new Set(['canceled', 'cancelled', 'force_cancelled']);

/** Posição da sessão dentro da guia ou do pacote (canceladas não contam), em ordem de data. */
function sequenceByAppointment(list: CardAppt[]): Map<string, number> {
  const out = new Map<string, number>();
  const counters = new Map<string, number>();
  const when = (a: CardAppt) => new Date(a.start || `${String(a.date || '').substring(0, 10)}T${a.time || '00:00'}`).getTime();
  [...list].sort((x, y) => when(x) - when(y)).forEach(a => {
    if (CANCELED_STATUS.has(String(a.operationalStatus || a.status || ''))) return;
    const key = refId(a.insuranceGuide) ? `g:${refId(a.insuranceGuide)}` : refId(a.package) ? `p:${refId(a.package)}` : '';
    if (!key) return;
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    out.set(String(a._id || a.id), n);
  });
  return out;
}

/** De onde sai o pagamento da sessão, com a posição na guia/pacote e se o particular está pago. */
function originOf(a: CardAppt, seq?: number): { short: string; full: string; dot?: string } | null {
  const guide = typeof a.insuranceGuide === 'object' ? a.insuranceGuide : undefined;
  const guideNumber = getInsuranceGuideNumber(a);
  if (refId(a.insuranceGuide) || a.billingType === 'convenio') {
    const total = guide?.totalSessions;
    const pos = seq ? ` · ${seq}${total ? ` de ${total}` : 'ª'}` : '';
    const label = guideNumber ? `Guia ${guideNumber}` : 'Convênio, guia não identificada';
    return { short: `${label}${pos}`, full: `Convênio: ${label}${pos}` };
  }
  if (refId(a.liminarContract) || a.billingType === 'liminar') return { short: 'Liminar', full: 'Debita do saldo da liminar' };
  if (refId(a.package)) {
    const pk = typeof a.package === 'object' ? a.package : undefined;
    const total = pk?.totalSessions;
    const pos = seq ? ` · ${seq}${total ? ` de ${total}` : 'ª'}` : '';
    return { short: `Pacote${pos}`, full: `Pacote particular${pos}` };
  }
  const paid = a.paymentStatus === 'paid' || (typeof a.session === 'object' && a.session?.isPaid === true);
  if (a.billingType === 'particular' || a.paymentStatus) {
    return paid
      ? { short: 'Particular · pago', full: 'Particular avulso, pago', dot: 'var(--fx-text-emerald)' }
      : { short: 'Particular · a pagar', full: 'Particular avulso, pagamento pendente', dot: 'var(--fx-text-amber)' };
  }
  return null;
}

/** Sinal para a recepção: resposta do paciente no WhatsApp e primeira consulta. */
function signalOf(a: CardAppt, status: string): { label: string; bg: string; fg: string } | null {
  const conf = a.attendanceConfirmation?.status;
  if (OPEN_STATUS.has(status)) {
    if (conf === 'change_requested') return { label: 'Pediu para remarcar', bg: 'var(--fx-red-100)', fg: 'var(--fx-red-800)' };
    if (conf === 'confirmed' && status !== 'confirmed') return { label: 'Confirmou no WhatsApp', bg: 'var(--fx-emerald-100)', fg: 'var(--fx-emerald-800)' };
    if (conf === 'no_response') return { label: 'Sem resposta no WhatsApp', bg: 'var(--fx-gray-100)', fg: 'var(--fx-gray-700)' };
  }
  if (a.isFirstVisit) return { label: '1ª consulta', bg: 'var(--fx-violet-100)', fg: 'var(--fx-violet-800)' };
  return null;
}

// Theming do FullCalendar via CSS custom properties (suportado nativamente desde
// o v6) — aplicado só no wrapper deste componente, nunca em `.fc` global.
const CALENDAR_THEME_VARS = {
    '--fc-border-color': 'var(--fx-gray-200)',
    '--fc-page-bg-color': '#FFFFFF',
    '--fc-neutral-bg-color': 'var(--fx-gray-50)',
    '--fc-today-bg-color': 'var(--fx-blue-50)',
    '--fc-now-indicator-color': '#2563EB',
    // O cartão pinta o próprio fundo; o azul padrão do FullCalendar vazava por baixo
    // das cores translúcidas do tema escuro.
    '--fc-event-bg-color': 'transparent',
    '--fc-event-border-color': 'transparent',
} as React.CSSProperties;

interface PatientMiniCalendarProps {
    appointments: Appointment[];
    onEventClick?: (appt: any) => void;
    initialDate?: string | Date;
}

export const PatientMiniCalendar: React.FC<PatientMiniCalendarProps> = ({ appointments, onEventClick, initialDate }) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    const seqById = useMemo(() => sequenceByAppointment(appointments as CardAppt[]), [appointments]);

    const events = appointments.map(appt => ({
        id: appt._id || appt.id,
        title: `${(appt as any).serviceType === 'evaluation' ? 'Avaliação · ' : ''}${getSpecialtyLabel(appt.specialty || (appt as any).sessionType)}${appt.doctor?.fullName ? ` — ${appt.doctor.fullName}` : ''}`,
        start: appt.start || `${(appt.date || '').substring(0, 10)}T${appt.time || '08:00'}`,
        end: appt.end,
        extendedProps: {
            operationalStatus: appt.operationalStatus || appt.status,
            appt,
        }
    }));

    // Abre no mês que interessa: a próxima sessão; sem futuras, a última realizada.
    const smartInitialDate = (() => {
        if (initialDate) return initialDate;
        const now = Date.now();
        const times = events.map(e => new Date(e.start as string).getTime()).filter(Number.isFinite);
        if (!times.length) return undefined;
        const future = times.filter(t => t >= now).sort((a, b) => a - b);
        if (future.length) return new Date(future[0]);
        return new Date(Math.max(...times));
    })();

    return (
        // Estilo do FullCalendar aqui é 100% escopado a esta div (via CSS vars +
        // seletores descendentes [&_.fc-...]) — nunca toca `.fc` global, então não
        // afeta a agenda principal (EnhancedCalendar/CalendarView).
        <div
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4
                [&_.fc]:font-sans
                [&_.fc-toolbar]:flex [&_.fc-toolbar]:flex-wrap [&_.fc-toolbar]:items-center [&_.fc-toolbar]:gap-2 [&_.fc-toolbar]:mb-3
                [&_.fc-toolbar-title]:text-[0.95rem] [&_.fc-toolbar-title]:sm:text-lg [&_.fc-toolbar-title]:font-semibold [&_.fc-toolbar-title]:text-gray-800 dark:[&_.fc-toolbar-title]:text-slate-100
                [&_.fc-button]:!rounded-lg [&_.fc-button]:!shadow-none [&_.fc-button]:!border-gray-200 [&_.fc-button]:!bg-white [&_.fc-button]:!text-gray-600 [&_.fc-button]:!text-xs [&_.fc-button]:!font-semibold [&_.fc-button]:!px-2.5 [&_.fc-button]:!py-1.5 [&_.fc-button]:!capitalize
                [&_.fc-button:hover]:!bg-gray-50 dark:[&_.fc-button]:!bg-slate-800 dark:[&_.fc-button]:!border-slate-700 dark:[&_.fc-button]:!text-slate-200
                [&_.fc-button:focus]:!shadow-none
                [&_.fc-button-active]:!bg-emerald-600 [&_.fc-button-active]:!border-emerald-600 [&_.fc-button-active]:!text-white
                [&_.fc-daygrid-day-frame]:min-h-[76px] dark:[&_.fc-theme-standard_td]:!border-slate-700 dark:[&_.fc-theme-standard_th]:!border-slate-700 dark:[&_.fc-scrollgrid]:!border-slate-700 dark:[&_.fc-day-today]:!bg-emerald-500/10 [&_.fc-day-today]:!bg-emerald-50/60 [&_.fc-daygrid-more-link]:text-xs [&_.fc-daygrid-more-link]:font-semibold [&_.fc-daygrid-more-link]:text-emerald-700
                [&_.fc-col-header-cell-cushion]:py-2 [&_.fc-col-header-cell-cushion]:text-gray-500
                [&_.fc-scrollgrid]:!rounded-lg [&_.fc-scrollgrid]:!border-gray-200
                [&_.fc-event]:!border-0 [&_.fc-event]:!bg-transparent [&_.fc-event]:!shadow-none"
            style={CALENDAR_THEME_VARS}
        >
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek",
                }}
                locale={ptBrLocale}
                initialView="dayGridMonth"
                initialDate={smartInitialDate}
                dayMaxEvents={3}
                buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana' }}
                weekends
                events={events}
                eventClick={onEventClick ? (arg) => {
                    if (OPEN_STATUS.has(String(arg.event.extendedProps.operationalStatus || ''))) onEventClick(arg.event.extendedProps.appt);
                } : undefined}
                height="auto"
                eventDisplay="block"
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventContent={(arg) => {
                    const status = arg.event.extendedProps.operationalStatus || '';
                    const startMs = arg.event.start ? arg.event.start.getTime() : NaN;
                    const noClosure = OPEN_STATUS.has(status) && startMs < Date.now() - 3600000;
                    const cfg = noClosure ? NO_CLOSURE_STYLE : (STATUS_STYLE[status] || DEFAULT_STYLE);
                    const clickable = Boolean(onEventClick) && OPEN_STATUS.has(status);
                    const appt = arg.event.extendedProps.appt as CardAppt;
                    const specialtyLabel = getSpecialtyLabel(appt?.specialty || appt?.sessionType);
                    const origin = originOf(appt, seqById.get(String(appt._id || appt.id)));
                    const signal = signalOf(appt, status);
                    const startD = arg.event.start;
                    const endD = startD && appt.duration ? new Date(startD.getTime() + Number(appt.duration) * 60000) : null;
                    const range = startD ? `${hhmm(startD)}${endD ? `–${hhmm(endD)}` : ''}` : arg.timeText;
                    const tip = [range, specialtyLabel, appt.doctor?.fullName, cfg.label, origin?.full, signal?.label, clickable ? 'Clique para mudar data ou horário' : ''].filter(Boolean).join(' · ');

                    return (
                        <div
                            className="flex w-full flex-col gap-0.5 overflow-hidden rounded-md px-1.5 py-1"
                            title={tip}
                            style={{
                                backgroundColor: cfg.bg,
                                color: cfg.text,
                                borderLeft: `3px solid ${cfg.text}`,
                                cursor: clickable ? 'pointer' : 'default',
                                ...(noClosure ? { outline: `1.5px dashed ${cfg.text}`, outlineOffset: '-1.5px' } : {}),
                            }}
                        >
                            <span className="flex items-baseline justify-between gap-1 text-[0.7rem] leading-tight">
                                <span className="font-semibold tabular-nums">{range}</span>
                                {cfg.label && <span className={`truncate ${noClosure ? 'font-bold' : 'font-medium opacity-80'}`}>{cfg.label}</span>}
                            </span>
                            <span className="truncate text-xs font-bold leading-tight">
                                {appt.serviceType === 'evaluation' ? 'Avaliação · ' : ''}{specialtyLabel}
                            </span>
                            {appt.doctor?.fullName && (
                                <span className="truncate text-[0.68rem] leading-tight opacity-80">{shortName(appt.doctor.fullName)}</span>
                            )}
                            {origin && (
                                <span className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] font-semibold leading-tight">
                                    {origin.dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: origin.dot }} aria-hidden />}
                                    <span className="truncate">{origin.short}</span>
                                </span>
                            )}
                            {signal && (
                                <span className="truncate rounded px-1 text-[0.64rem] font-bold leading-snug" style={{ backgroundColor: signal.bg, color: signal.fg }}>{signal.label}</span>
                            )}
                        </div>
                    );
                }}
                dayHeaderContent={(arg) => (
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        {arg.text.substring(0, 3)}
                    </span>
                )}
                dayCellContent={(arg) => (
                    <div className="flex justify-end p-1.5">
                        <span className={`text-sm ${arg.isToday ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-slate-300'}`}>
                            {arg.dayNumberText}
                        </span>
                    </div>
                )}
                eventClassNames="cursor-pointer"
            />
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-2xs text-gray-600 dark:text-slate-400" aria-label="Legenda do calendário">
                {LEGEND.map(l => (
                    <li key={l.label} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.style.bg, borderLeft: `3px solid ${l.style.text}` }} aria-hidden />
                        {l.label}
                    </li>
                ))}
                <li className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NO_CLOSURE_STYLE.bg, outline: `1.5px dashed ${NO_CLOSURE_STYLE.text}`, outlineOffset: '-1.5px' }} aria-hidden />
                    Sem baixa (passou e ninguém fechou)
                </li>
            </ul>
        </div>
    );
};
