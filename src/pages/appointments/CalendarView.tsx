import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from 'react';
import { Appointment } from '../../hooks/useTempAppointments';
import API from '../../services/api';
import { Specialty } from '../../utils/types';

interface CalendarViewProps {
    specialty?: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        status: string;
        specialty: string;
    };
}

const CalendarView: React.FC<CalendarViewProps> = ({ specialty }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const specialtiesRes = await API.get<Specialty[]>('/specialties');
                setSpecialties(specialtiesRes.data);

                const params = specialty && specialty !== 'all' ? { specialty } : {};
                const appointmentsRes = await API.get<Appointment[]>('/appointments', { params });

                const calendarEvents: CalendarEvent[] = appointmentsRes.data.map((appointment) => {
                    const spec = specialtiesRes.data.find(s => s.id === appointment.specialty);
                    const color = spec?.color || '#cccccc';
                    const icon = spec?.icon ?? '📌';

                    return {
                        id: appointment.id,
                        title: `${icon} ${appointment.reason} - ${appointment.patient?.fullName || 'Paciente'}`,
                        start: appointment.date,
                        end: new Date(new Date(appointment.date).getTime() + appointment.duration * 60000).toISOString(),
                        backgroundColor: color,
                        borderColor: color,
                        extendedProps: {
                            status: appointment.status,
                            specialty: spec?.name || 'Especialidade',
                        },
                    };
                });

                setEvents(calendarEvents);
            } catch (error) {
                console.error('Erro ao carregar eventos:', error);
            }
        };

        fetchData();
    }, [specialty]);

    return (
        <div className="h-[80vh] p-4 bg-white rounded-lg shadow-md">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                locale={ptBR}
                height="100%"
                slotMinTime="07:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                selectable={true}
                events={events}
                eventContent={renderEventContent}
            />
        </div>
    );
};

function renderEventContent(arg: any) {
    const { event } = arg;
    return (
        <div className="text-sm">
            <div><strong>{event.title}</strong></div>
            <div className="text-xs italic">{event.extendedProps.status}</div>
        </div>
    );
}

export default CalendarView;
