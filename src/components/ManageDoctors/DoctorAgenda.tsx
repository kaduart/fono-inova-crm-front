'use client';

import { CardHeader } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import appointmentService, { AvailableSlotsParams, SlotAvailability } from '../../services/appointmentService';
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
    onDaySlotsChange?: (slots: { date: string; slots: (string | SlotAvailability)[] }[]) => void;
    updateSlots: ScheduleAppointment;
    onSubmitSlotBooking?: (data: {
        time: string,
        isBookingModalOpen: boolean
    }) => void;
}

const DoctorAgenda = ({ doctors = [], updateSlots, patients, onDaySlotsChange, selectedDoctor, onSubmitSlotBooking }: IDoctorAgendaProps) => {
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [daySlots, setDaySlots] = useState<{ date: string; slots: (string | SlotAvailability)[] }[]>([]);
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
        const today = dayjs();
        setSelectedDate(today);
        // 🔄 Busca slots diretamente com o ID do selectedDoctor
        fetchSlotsForDate(today.format('YYYY-MM-DD'), selectedDoctor._id);
    }
}, [selectedDoctor]);

    const onDateChange = (date: dayjs.Dayjs) => {
        setSelectedDate(date);
    };

    const fetchSlotsForDate = async (date: string, doctorId?: string) => {
        const targetDoctorId = doctorId || selectedDoctorId;
        if (!targetDoctorId) {
            console.warn('🚨 fetchSlotsForDate: sem doctorId');
            return;
        }
        try {
            const payload: AvailableSlotsParams = {
                doctorId: targetDoctorId,
                date: date
            };
            console.log('🔄 Buscando slots:', payload);
            const response = await appointmentService.getAvailableSlots(payload);
            // 🆕 Suporta tanto formato antigo (string[]) quanto novo (SlotAvailability[])
            const slots: (string | SlotAvailability)[] = response.data;
            console.log('✅ Slots recebidos:', slots);
            setDaySlots([{ date, slots }]);
            onDaySlotsChange?.([{ date, slots }]);
        } catch (error) {
            console.error('❌ Erro ao buscar slots:', error);
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
