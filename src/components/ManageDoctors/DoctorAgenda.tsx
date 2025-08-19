'use client';

import { CardHeader } from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { BASE_URL } from '../../constants/constants';
import appointmentService, { AvailableSlotsParams } from '../../services/appointmentService';
import { IDoctor, IPatient, ScheduleAppointment } from '../../utils/types/types';
import { Card, CardContent, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import DoctorAgendaCalendar from './DoctorAgendaCalendar';
import { ScheduleWithPackageFlow } from './ScheduleWithPackageFlow';

interface IDoctorAgendaProps {
    doctors: IDoctor[];
    patients: IPatient[];
    selectedDoctor: IDoctor;
    onDaySlotsChange?: (slots: { date: string; slots: string[] }[]) => void;
    updateSlots: ScheduleAppointment;
    onSubmitSlotBooking?: (data: {
        time: string,
        isBookingModalOpen: boolean
    }) => void;
}

const DoctorAgenda = ({ doctors = [], updateSlots, patients, onDaySlotsChange, selectedDoctor, onSubmitSlotBooking }: IDoctorAgendaProps) => {
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [daySlots, setDaySlots] = useState<{ date: string; slots: string[] }[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<{
        patientId: string;
        doctorId: string;
        date: string;
    } | null>(null);
    const [showPackageFlow, setShowPackageFlow] = useState(false);

    useEffect(() => {
        if (!updateSlots) return;

        if (!updateSlots?.date || !updateSlots?.doctorId) return;

        setSelectedDoctorId(updateSlots.doctorId);

        fetchSlotsForDate(new Date(updateSlots.date).toISOString().split('T')[0]);

    }, [updateSlots?._syncKey]);

    useEffect(() => {
        if (selectedDoctor && selectedDoctor._id) {
            setSelectedDoctorId(selectedDoctor._id);
            // Opcional: já busca os horários ao trocar o doutor
            const today = dayjs().format('YYYY-MM-DD');
            fetchSlotsForDate(today);
        }
    }, [selectedDoctor]);


    const handleSlotClick = (date: string, time: string) => {
        setSelectedTime(time);
        setSelectedDate(dayjs(date));
        setIsModalOpen(true);
    };
    const onDateChange = (date: dayjs.Dayjs) => {
        setSelectedDate(date);
    };

    const fetchSlotsForDate = async (date: string) => {
        if (!selectedDoctorId) return;
        try {
            const payload: AvailableSlotsParams = {
                doctorId: selectedDoctorId,
                date: date
            };
            const response = await appointmentService.getAvailableSlots(payload)
            const slots = await response.data;
            setDaySlots([{ date, slots }]);
            onDaySlotsChange?.([{ date, slots }]);

        } catch (error) {
            console.error(error);
            setDaySlots([]);
        }
    };

    const handleSaveAppointment = async () => {
        if (!selectedDoctorId || !selectedDate || !selectedSlot) return;
        try {
            const [hour, minute] = selectedSlot.split(':');
            const finalDate = dayjs(selectedDate)
                .hour(Number(hour))
                .minute(Number(minute))
                .second(0)
                .millisecond(0);

            const payload = {
                doctorId: selectedDoctorId,
                date: finalDate.toISOString(),
                // Adicione aqui os outros campos necessários como patientId, motivo, status, etc.
                reason: 'Consulta padrão',
                status: 'scheduled',
                patientId: 'EXEMPLO_ID_PACIENTE', // pode vir de props, contexto ou outro state
            };

            await axios.post(`${BASE_URL}/appointments`, payload);
            alert('Agendamento realizado com sucesso!');
        } catch (error) {
            console.error('Erro ao agendar horário:', error);
            alert('Erro ao agendar. Tente novamente.');
        }
    };

    const handleSlotBooking = (bookingData: {
        patientId: string;
        doctorId: string;
        date: string; // ISO string com data + hora
    }) => {
        setSelectedBooking(bookingData);
        setShowPackageFlow(true);
    };

    return (
        <Card className="mb-4 mt-4">
            <CardHeader>
                <CardTitle>Agenda por Profissional</CardTitle>
            </CardHeader>
            <CardContent>

                <div className="space-y-2">
                    <Label htmlFor="doctor">Selecione um Doutor</Label>
                    <Select
                        id="patient"
                        name="patientId"
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                    >
                        <option value="">Escolha um doutor</option>
                        {doctors.map((d: IDoctor) => (
                            <option key={d._id} value={d._id}>
                                {d.fullName}
                            </option>
                        ))}
                    </Select>

                    {selectedDoctorId && (
                        <DoctorAgendaCalendar
                            availability={daySlots}
                            selectedDate={selectedDate}
                            selectedDoctorId={selectedDoctorId}
                            onDateChange={onDateChange}
                            onDaySelect={fetchSlotsForDate}
                            patients={patients}
                            daySlots={daySlots}
                            onSlotSelect={handleSlotBooking}
                            onSubmitSlotBooking={onSubmitSlotBooking}

                        />
                    )}


                    {showPackageFlow && selectedBooking && (
                        <ScheduleWithPackageFlow
                            patientId={selectedBooking.patientId}
                            doctorId={selectedBooking.doctorId}
                            datetime={selectedBooking.date}
                            onClose={() => {
                                setShowPackageFlow(false);
                                setSelectedBooking(null);
                            }}
                            onConfirm={(sessionData) => {
                                createAppointment(sessionData);
                                setShowPackageFlow(false);
                                setSelectedBooking(null);
                            }}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default DoctorAgenda;
