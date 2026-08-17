// components/patient/PatientMiniCalendar.tsx
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useRef } from 'react';
import { Appointment } from '../../utils/types';
import { getSpecialtyLabel } from '../../constants/specialties';

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
        title: `${getSpecialtyLabel(appt.specialty || (appt as any).sessionType)}${appt.doctor?.fullName ? ` — ${appt.doctor.fullName}` : ''}`,
        start: appt.start || `${(appt.date || '').substring(0, 10)}T${appt.time || '08:00'}`,
        end: appt.end,
        extendedProps: {
            operationalStatus: appt.operationalStatus,
            appt,
        }
    }));
    return (
        // Estilo do FullCalendar aqui é 100% escopado a esta div (via CSS vars +
        // seletores descendentes [&_.fc-...]) — nunca toca `.fc` global, então não
        // afeta a agenda principal (EnhancedCalendar/CalendarView).
        <div
            className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm
                [&_.fc]:font-sans
                [&_.fc-toolbar]:flex [&_.fc-toolbar]:flex-wrap [&_.fc-toolbar]:items-center [&_.fc-toolbar]:gap-2 [&_.fc-toolbar]:mb-3
                [&_.fc-toolbar-title]:text-[0.95rem] [&_.fc-toolbar-title]:sm:text-lg [&_.fc-toolbar-title]:font-bold [&_.fc-toolbar-title]:text-gray-800
                [&_.fc-button]:!rounded-lg [&_.fc-button]:!shadow-none [&_.fc-button]:!border-gray-200 [&_.fc-button]:!bg-white [&_.fc-button]:!text-gray-600 [&_.fc-button]:!text-xs [&_.fc-button]:!font-semibold [&_.fc-button]:!px-2.5 [&_.fc-button]:!py-1.5 [&_.fc-button]:!capitalize
                [&_.fc-button:hover]:!bg-gray-50
                [&_.fc-button:focus]:!shadow-none
                [&_.fc-button-active]:!bg-gray-800 [&_.fc-button-active]:!border-gray-800 [&_.fc-button-active]:!text-white
                [&_.fc-daygrid-day-frame]:min-h-[92px]
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
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                locale={ptBrLocale}
                initialView="dayGridMonth"
                initialDate={initialDate}
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
                    const appt = arg.event.extendedProps.appt as Appointment & { sessionType?: string };
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
                            <span className="text-xs font-bold leading-tight truncate">{specialtyLabel}</span>
                            {doctorName && (
                                <span className="text-[0.68rem] leading-tight opacity-80 truncate">{doctorName}</span>
                            )}
                            {cfg.label && (
                                <span className="text-[0.68rem] leading-tight opacity-75">{cfg.label}</span>
                            )}
                        </div>
                    );
                }}
                dayHeaderContent={(arg) => (
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {arg.text.substring(0, 3)}
                    </span>
                )}
                dayCellContent={(arg) => (
                    <div className="flex justify-end p-1.5">
                        <span className={`text-sm ${arg.isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                            {arg.dayNumberText}
                        </span>
                    </div>
                )}
                eventClassNames="cursor-pointer"
            />
        </div>
    );
};
