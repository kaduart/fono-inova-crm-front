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

export interface TherapeuticObjective {
  area: 'language' | 'motor' | 'cognitive' | 'behavior' | 'social';
  description: string;
  targetScore?: number;
  currentScore?: number;
  targetDate?: string;
  achieved?: boolean;
  progress?: number;
  notes?: string;
}

export interface TherapeuticIntervention {
  description: string;
  frequency?: string;
  responsible?: 'therapist' | 'family' | 'school' | 'combined';
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface TherapeuticPlan {
  protocol?: {
    code?: string;
    name?: string;
    customNotes?: string;
  };
  objectives?: TherapeuticObjective[];
  interventions?: TherapeuticIntervention[];
  reviewDate?: string;
  lastReviewDate?: string;
  planVersion?: number;
}
