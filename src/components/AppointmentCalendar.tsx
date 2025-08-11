import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const AppointmentCalendar = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        axios.get('/api/appointments')
            .then(res => setEvents(res.data))
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
                const res = await axios.post('/api/appointments', newEvent);
                calendarApi.addEvent({ ...res.data });
                toast.success('Agendamento criado com sucesso!');
            } catch {
                toast.error('Erro ao criar agendamento.');
            }
        }
    };

    const handleEventClick = async (clickInfo) => {
        if (window.confirm(`Deseja excluir "${clickInfo.event.title}"?`)) {
            try {
                await axios.delete(`/api/appointments/${clickInfo.event.id}`);
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
                    ...event,
                    title: event.title?.split(' - ')[0] || 'Sem motivo' // ← Split seguro
                }))}
                select={handleDateSelect}
                eventClick={handleEventClick}
                height="auto"
            />
        </div>
    );
};

export default AppointmentCalendar;
