// components/patient/PatientMiniCalendar.tsx
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useRef } from 'react';
import { Appointment } from '../../utils/types';

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

interface PatientMiniCalendarProps {
    appointments: Appointment[];
    onEventClick?: (appt: any) => void;
}

export const PatientMiniCalendar: React.FC<PatientMiniCalendarProps> = ({ appointments, onEventClick }) => {
    const calendarRef = useRef<FullCalendar | null>(null);

    const events = appointments.map(appt => ({
        id: appt._id || appt.id,
        title: `${appt.patient?.fullName || appt.doctor?.fullName || '—'}`,
        start: appt.start || `${(appt.date || '').substring(0, 10)}T${appt.time || '08:00'}`,
        end: appt.end,
        extendedProps: {
            operationalStatus: appt.operationalStatus,
            appt,
        }
    }));
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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

                    return (
                        <div
                            className="flex flex-col p-1 rounded overflow-hidden"
                            style={{
                                backgroundColor: cfg.bg,
                                color: cfg.text,
                                borderLeft: `3px solid ${cfg.text}`,
                                cursor: clickable ? 'pointer' : 'default',
                            }}
                        >
                            {arg.timeText && (
                                <span className="text-xs font-medium">{arg.timeText}</span>
                            )}
                            <span className="text-xs font-semibold truncate">{arg.event.title}</span>
                            {cfg.label && (
                                <span className="text-xs mt-0.5 opacity-70">{cfg.label}</span>
                            )}
                        </div>
                    );
                }}
                dayHeaderContent={(arg) => (
                    <span className="text-sm font-medium text-gray-600">
                        {arg.text.substring(0, 3)}
                    </span>
                )}
                dayCellContent={(arg) => (
                    <div className="flex justify-end p-1">
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
