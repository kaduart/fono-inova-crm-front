import { Box, Modal } from "@mui/material";
import { useEffect, useState } from "react";
import { IPatient, ISession } from "../../utils/types/types";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

interface DoctorSlotBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ISession) => void;
    availableTimes: string[];
    selectedDate: string;
    patients: IPatient[];
    selectedDoctorId: string;
    selectedBookingData?: {
        time: string;
        isBookingModalOpen: boolean;
    };
}

export const DoctorSlotBookingModal = ({
    isOpen,
    onClose,
    onSubmit,
    availableTimes,
    patients,
    selectedDoctorId,
    selectedBookingData

}: DoctorSlotBookingModalProps) => {
    const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>(selectedBookingData?.time || '');
    const handleBookingSubmit = () => {
        if (!selectedPatient || !selectedTime) {
            alert('Selecione um paciente e horário');
            return;
        }
        const sessionData: ISession = {
            _id: '',
            date: `${selectedTime}`, // concatena data com horário
            doctorId: selectedDoctorId,
            sessionType: 'fonoaudiologia',
            paymentAmount: 0,
            status: 'pending',
            patientId: selectedPatient._id,
            packages: selectedPatient.packages || [],
            notes: ''
        };
        onSubmit(sessionData);
        onClose();
        setSelectedPatient(null);
        setSelectedTime('');
    };

    const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedPatient(id);
        const found = patients.find((p) => p._id === id);
        setSelectedPatient(found || null);
    };
    useEffect(() => {
        if (isOpen && selectedBookingData?.time) {
            // Assumindo que availableTimes tem objetos com `date` e `slots`
            const matched = availableTimes
                .flatMap(({ date, slots }) =>
                    slots.map((slot) => `${date} ${slot}`)
                )
                .find((t) => t.includes(selectedBookingData.time)); // ajusta conforme a formatação

            if (matched) setSelectedTime(matched);
        }
    }, [isOpen, selectedBookingData, availableTimes]);

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box>
                <div className="bg-white rounded-lg p-6 w-96 mx-auto mt-20 outline-none">
                    <h3 className="text-xl font-bold mb-4">Selecione um Paciente</h3>

                    <div className="space-y-4">
                        <Select value={selectedPatient?._id || ''} onChange={handlePatientChange}>
                            <option value="">Selecione o paciente</option>
                            {patients.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.fullName}
                                </option>
                            ))}
                        </Select>

                        <Select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                            <option value="">Selecione o horário</option>
                            {availableTimes.flatMap(({ date, slots }) =>
                                slots.map((t: string) => {
                                    const rawDate = new Date(`${date}T${t}`); // Garante parse válido
                                    const formatted = `${rawDate.getDate().toString().padStart(2, '0')}/${(rawDate.getMonth() + 1).toString().padStart(2, '0')
                                        }/${rawDate.getFullYear()} - ${t}`;

                                    const value = `${date} ${t}`;
                                    return (
                                        <option key={value} value={value}>
                                            {formatted}
                                        </option>
                                    );
                                })
                            )}

                        </Select>
                    </div>

                    <div className="flex justify-end mt-6 gap-2">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleBookingSubmit}>Agendar</Button>
                    </div>
                </div>
            </Box>
        </Modal>
    );
};
