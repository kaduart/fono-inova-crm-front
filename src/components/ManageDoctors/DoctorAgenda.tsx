'use client';

import { CardHeader } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
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
        const today = dayjs(); // objeto dayjs, não string
        setSelectedDate(today); // sincroniza estado do calendário
        fetchSlotsForDate(today.format('YYYY-MM-DD')); // busca slots
    }
}, [selectedDoctor]);

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

    const handleSlotBooking = (bookingData: {
        patientId: string;
        doctorId: string;
        date: string; // ISO string com data + hora
    }) => {
        console.log('boooooo ', bookingData)
        setSelectedBooking(bookingData);
        setShowPackageFlow(true);
    };

    return (
        <Card className="mb-4 mt-4">
                <CardTitle>Agenda por Profissional</CardTitle>
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
