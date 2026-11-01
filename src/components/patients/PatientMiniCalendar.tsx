// components/patient/PatientMiniCalendar.tsx
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useRef } from 'react';
import { Appointment } from '../../utils/types';
import { getSpecialtyLabel } from '../../constants/specialties';
import { AppointmentOrigin } from './AppointmentOrigin';

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  completed:    { bg: '#D1FAE5', text: '#065F46', label: 'Realizado' },
  paid:         { bg: '#D1FAE5', text: '#065F46', label: 'Realizado' },
  confirmed:    { bg: '#DBEAFE', text: '#1E40AF', label: 'Confirmado' },
  scheduled:    { bg: '#FEF3C7', text: '#92400E', label: 'Agendado' },
  pre_agendado: { bg: '#E0E7FF', text: '#3730A3', label: 'Pré-agendado' },
  canceled:     { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelado' },
  cancelled:    { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelado' },
  missed:       { bg: '#FEE2E2', text: '#991B1B', label: 'Faltou' },
};
const DEFAULT_STYLE = { bg: '#F3F4F6', text: '#374151', label: '' };

// Theming do FullCalendar via CSS custom properties (suportado nativamente desde
// o v6) — aplicado só no wrapper deste componente, nunca em `.fc` global.
const CALENDAR_THEME_VARS = {
    '--fc-border-color': '#E5E7EB',
    '--fc-page-bg-color': '#FFFFFF',
    '--fc-neutral-bg-color': '#F9FAFB',
    '--fc-today-bg-color': '#EFF6FF',
    '--fc-now-indicator-color': '#2563EB',
} as React.CSSProperties;

interface PatientMiniCalendarProps {
    appointments: Appointment[];
    onEventClick?: (appt: any) => void;
    initialDate?: string | Date;
}

export const PatientMiniCalendar: React.FC<PatientMiniCalendarProps> = ({ appointments, onEventClick, initialDate }) => {
    const calendarRef = useRef<FullCalendar | null>(null);

    const events = appointments.map(appt => ({
        id: appt._id || appt.id,
        title: `${(appt as any).serviceType === 'evaluation' ? 'Avaliação · ' : ''}${getSpecialtyLabel(appt.specialty || (appt as any).sessionType)}${appt.doctor?.fullName ? ` — ${appt.doctor.fullName}` : ''}`,
        start: appt.start || `${(appt.date || '').substring(0, 10)}T${appt.time || '08:00'}`,
        end: appt.end,
        extendedProps: {
            operationalStatus: appt.operationalStatus,
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
                [&_.fc-toolbar-title]:text-[0.95rem] [&_.fc-toolbar-title]:sm:text-lg [&_.fc-toolbar-title]:font-semibold [&_.fc-toolbar-title]:capitalize [&_.fc-toolbar-title]:text-gray-800 dark:[&_.fc-toolbar-title]:text-slate-100
                [&_.fc-button]:!rounded-lg [&_.fc-button]:!shadow-none [&_.fc-button]:!border-gray-200 [&_.fc-button]:!bg-white [&_.fc-button]:!text-gray-600 [&_.fc-button]:!text-xs [&_.fc-button]:!font-semibold [&_.fc-button]:!px-2.5 [&_.fc-button]:!py-1.5 [&_.fc-button]:!capitalize
                [&_.fc-button:hover]:!bg-gray-50 dark:[&_.fc-button]:!bg-slate-800 dark:[&_.fc-button]:!border-slate-700 dark:[&_.fc-button]:!text-slate-200
                [&_.fc-button:focus]:!shadow-none
                [&_.fc-button-active]:!bg-emerald-600 [&_.fc-button-active]:!border-emerald-600 [&_.fc-button-active]:!text-white
                [&_.fc-daygrid-day-frame]:min-h-[76px] dark:[&_.fc-theme-standard_td]:!border-slate-700 dark:[&_.fc-theme-standard_th]:!border-slate-700 dark:[&_.fc-scrollgrid]:!border-slate-700 dark:[&_.fc-day-today]:!bg-emerald-500/10 [&_.fc-day-today]:!bg-emerald-50/60 [&_.fc-daygrid-more-link]:text-xs [&_.fc-daygrid-more-link]:font-semibold [&_.fc-daygrid-more-link]:text-emerald-700
                [&_.fc-col-header-cell-cushion]:py-2 [&_.fc-col-header-cell-cushion]:text-gray-500
                [&_.fc-scrollgrid]:!rounded-lg [&_.fc-scrollgrid]:!border-gray-200
                [&_.fc-event]:!border-0"
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
                dayMaxEvents={2}
                buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana' }}
                weekends
                events={events}
                eventClick={onEventClick ? (arg) => onEventClick(arg.event.extendedProps.appt) : undefined}
                height="auto"
                eventDisplay="block"
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventContent={(arg) => {
                    const status = arg.event.extendedProps.operationalStatus || '';
                    const cfg = STATUS_STYLE[status] || DEFAULT_STYLE;
                    const clickable = Boolean(onEventClick);
                    const appt = arg.event.extendedProps.appt as Appointment & { sessionType?: string; serviceType?: string };
                    const specialtyLabel = getSpecialtyLabel(appt?.specialty || appt?.sessionType);
                    const doctorName = appt?.doctor?.fullName;

                    return (
                        <div
                            className="flex flex-col gap-0.5 px-1.5 py-1 rounded-md overflow-hidden w-full"
                            style={{
                                backgroundColor: cfg.bg,
                                color: cfg.text,
                                borderLeft: `3px solid ${cfg.text}`,
                                cursor: clickable ? 'pointer' : 'default',
                            }}
                        >
                            {arg.timeText && (
                                <span className="text-[0.7rem] font-semibold leading-tight opacity-80">{arg.timeText}</span>
                            )}
                            {appt.serviceType === 'evaluation' && (
                                <span className="text-xs font-bold leading-tight">Avaliação</span>
                            )}
                            <span className="text-xs font-bold leading-tight truncate">{specialtyLabel}</span>
                            {doctorName && (
                                <span className="text-[0.68rem] leading-tight opacity-80 truncate">{doctorName}</span>
                            )}
                            {cfg.label && (
                                <span className="text-[0.68rem] leading-tight opacity-75">{cfg.label}</span>
                            )}
                            <AppointmentOrigin appointment={appt} />
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
        </div>
    );
};
