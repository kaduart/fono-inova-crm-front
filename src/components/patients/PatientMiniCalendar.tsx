// components/patient/PatientMiniCalendar.tsx
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ptBR } from "date-fns/locale";
import { useRef } from 'react';
import { getStatusConfig } from '../../utils/statusHelper';
import { Appointment } from '../../utils/types';

interface PatientMiniCalendarProps {
    appointments: Appointment[];
}

export const PatientMiniCalendar: React.FC<PatientMiniCalendarProps> = ({ appointments }) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    //onDateClick: (arg: DateClickArg) => void;

    const events = appointments.map(appt => ({
        title: appt?.doctor?.fullName || '-',
        date: appt.date,
        backgroundColor:
            appt.operationalStatus === 'cancelado'
                ? '#f87171' // vermelho
                : appt.operationalStatus === 'realizado'
                    ? '#4ade80' // verde
                    : '#60a5fa', // azul
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
                locale={ptBR}
                initialView="dayGridMonth"
                weekends
                events={events}
                //  dateClick={onDateClick}
                /*   eventClick={handleEventClick} */
                height="auto"
                eventDisplay="block"
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventContent={(arg) => {
                    // Obter o status operacional do evento
                    const status = arg.event.extendedProps.operationalStatus || 'agendado';
                    const config = getStatusConfig(status);

                    return (
                        <div
                            className="flex flex-col p-1 rounded"
                            style={{
                                backgroundColor: config.backgroundColor,
                                color: config.textColor,
                                borderLeft: `3px solid ${config.backgroundColor}`
                            }}
                        >
                            <span className="text-xs font-medium">
                                {arg.timeText}
                            </span>
                            <span className="text-sm font-semibold truncate">
                                {arg.event.title.split(' - ')[0]}
                            </span>
                            <span className="text-xs truncate">
                                {arg.event.title.split(' - ')[1]}
                            </span>
                            <span className="text-xxs mt-1 font-semibold">
                                {config.label}
                            </span>
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
