import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const AppointmentCalendar = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        // 🚀 V2: Usa API otimizada
        api.get('/v2/appointments?limit=500&light=true')
            .then(res => {
                const data = res.data?.data?.appointments || res.data?.data || [];
                setEvents(data);
            })
            .catch(() => toast.error('Erro ao carregar agendamentos.'));
    }, []);

    const handleDateSelect = async (selectInfo) => {
        const title = prompt('Título do agendamento:') || 'Consulta';
        const calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();

        if (title) {
            const newEvent = {
                title,
                start: selectInfo.startStr,
                end: selectInfo.endStr,
            };

            try {
                // 🚀 V2: Cria via API V2
                const res = await api.post('/v2/appointments', newEvent);
                calendarApi.addEvent({ ...res.data.data });
                toast.success('Agendamento criado com sucesso!');
            } catch {
                toast.error('Erro ao criar agendamento.');
            }
        }
    };

    const handleEventClick = async (clickInfo) => {
        if (window.confirm(`Deseja excluir "${clickInfo.event.title}"?`)) {
            try {
                // 🚀 V2: Deleta via API V2
                await api.delete(`/v2/appointments/${clickInfo.event.id}`);
                clickInfo.event.remove();
                toast.success('Agendamento removido.');
            } catch {
                toast.error('Erro ao remover agendamento.');
            }
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Agendamentos</h2>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                editable={true}
                selectable={true}
                events={events.map(event => ({
                    id: event._id || event.id,
                    title: event.patient?.fullName || event.title || 'Consulta',
                    start: event.date,
                    end: event.endDate || event.date,
                }))}
                select={handleDateSelect}
                eventClick={handleEventClick}
                height="auto"
            />
        </div>
    );
};

export default AppointmentCalendar;
