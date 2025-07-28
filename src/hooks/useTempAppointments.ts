/* import { useState } from "react";

export type Appointment = {
    id: string;
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    profissional?: string; // Optional, used for display purposes
    tipoSessao?: string; // Optional, used for display purposes
    dataHora: string; // Optional, used for display purposes
    createdAt?: string; // Optional, used for tracking creation time
    updatedAt?: string; // Optional, used for tracking last update time

};

export const DEFAULT_APPOINTMENT = {
    patientId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    reason: '',
    status: '',
};


export const useTempAppointments = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    const addAppointment = (appt: Appointment) => {

        setAppointments((prev) => [...prev, appt]);
    };

    const removeAppointment = (id: string) => {
        setAppointments((prev) => prev.filter((a) => a.patientId !== id));
    };

    return { appointments, addAppointment, removeAppointment };
};
 */