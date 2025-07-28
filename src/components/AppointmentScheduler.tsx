/* import { Container, Typography } from '@mui/material';
import axios from 'axios';
import React, { useState } from 'react';
import { BASE_URL } from '../constants/constants';
import { Appointment, useTempAppointments } from '../hooks/useTempAppointments';
import EnhancedCalendar from './calendar/EnhancedCalendar';
import ScheduleModal from './calendar/ScheduleModal';
import { IDoctor } from '../utils/types/types';

// Estado base para um agendamento “vazio”
const EMPTY_APPOINTMENT: Appointment = {
    id: '',
    profissional: '',
    date: new Date().toISOString().slice(0, 16), // “YYYY-MM-DDTHH:mm”
    sessionType: '',
    status: 'agendado',
    anotacoes: '',
    reason: '',
    patientName: '',
    doctorId: ''
};

const AppointmentScheduler: React.FC = () => {
    // Hook local que mantém a lista e as funções de mutação
    const { appointments, addAppointment, updateAppointment } = useTempAppointments();

    // Controle do modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [doctors] = useState<IDoctor[]>([
        { id: '1', name: 'Dr. Silva', specialty: 'Cardiologia' },
        { id: '2', name: 'Dra. Souza', specialty: 'Pediatria' }
    ]);

    // Ao clicar em um dia/hora no calendário, abre o modal para criação
    const handleDateSelect = (date: string) => {
        setSelectedAppointment({ 
            ...EMPTY_APPOINTMENT, 
            date: `${date}T09:00` 
        });
        setIsModalOpen(true);
    };

    // Ao clicar em um evento, abre o modal para edição
    const handleEdit = (appt: Appointment) => {
        setSelectedAppointment(appt);
        setIsModalOpen(true);
    };

    // Salva no servidor e atualiza o estado local
    const handleSave = async (data: Appointment | Omit<Appointment, 'id'>) => {
        try {
            if ('id' in data && data.id) {
                // edição
                //await axios.put(`${BASE_URL}/appointments/${data.id}`, data);
                updateAppointment(data as Appointment);
            } else {
                // criação
              //  const response = await axios.post(`${BASE_URL}/appointments`, data);
                addAppointment(response.data);
            }
        } catch (err) {
            console.error('Falha ao salvar agendamento:', err);
        } finally {
            setIsModalOpen(false);
            setSelectedAppointment(null);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Gerenciamento de Agendamentos
            </Typography>

            <EnhancedCalendar
                appointments={appointments}
                doctors={doctors}
                onDateSelect={handleDateSelect}
                onEdit={handleEdit}
            />

            <ScheduleModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                mode={selectedAppointment?.id ? 'edit' : 'create'}
                initialData={selectedAppointment ?? EMPTY_APPOINTMENT}
                doctors={doctors}
            />
        </Container>
    );
};

export default AppointmentScheduler; */