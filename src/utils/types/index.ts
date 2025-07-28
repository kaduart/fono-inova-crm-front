// Tipos básicos
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'professional' | 'patient' | 'financial' | 'marketing';
    specialties?: string[];
}

export interface Specialty {
    id: string;
    name: string;
    icon: string;
    color: string;
    sessionDuration: number;
}

export interface Appointment {
    id: string;
    patientId: string;
    date: Date;
    duration: number;
    specialty: string;
    reason: string;
    status: 'scheduled' | 'completed' | 'canceled';
}

export interface Evolution {
    id: string;
    appointmentId: string;
    specialty: string;
    content: Record<string, any>;
    createdAt: Date;
}

// Props para componentes
export interface SpecialtySelectorProps {
    value: string;
    onChange: (value: string) => void;
    showIcon?: boolean;
}

export interface DynamicEvolutionFormProps {
    appointment: Appointment;
}

export interface CalendarViewProps {
    specialty?: string;
}

export interface SpecialtyCardProps {
    specialty: Specialty;
    stats: {
        scheduled: number;
        completed: number;
        canceled: number;
        revenue: number;
    };
}