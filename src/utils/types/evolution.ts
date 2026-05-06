/**
 * Tipagens completas do domínio de Evolução Terapêutica
 *
 * Substitui/evolui as interfaces básicas de types/index.ts
 */

export interface EvolutionDoctor {
  _id: string;
  fullName: string;
  specialty: string;
}

export interface EvolutionPatient {
  _id: string;
  fullName: string;
  dateOfBirth?: string | Date;
}

export interface EvolutionMetric {
  name: string;
  value: number;
  unit?: string;
  notes?: string;
}

export interface EvolutionArea {
  id: string;
  name: string;
  score: number;
}

export interface TherapeuticObjective {
  area: string;
  description: string;
  targetScore?: number;
  currentScore?: number;
  targetDate?: string | Date;
  achieved?: boolean;
  achievedDate?: string | Date;
  progress?: number;
  notes?: string;
}

export interface TherapeuticIntervention {
  description: string;
  frequency?: string;
  responsible?: 'therapist' | 'family' | 'school' | 'combined';
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate?: string | Date;
  endDate?: string | Date;
  notes?: string;
}

export interface TherapeuticProtocol {
  code: string;
  name: string;
  customNotes?: string;
}

export interface TherapeuticPlan {
  protocol?: TherapeuticProtocol;
  objectives?: TherapeuticObjective[];
  interventions?: TherapeuticIntervention[];
  reviewDate?: string | Date;
  lastReviewDate?: string | Date;
  planVersion?: number;
  versionHistory?: Array<{
    version: number;
    changedAt: string | Date;
    changedBy?: string;
    changes?: string;
    previousData?: any;
  }>;
}

export interface Evolution {
  _id: string;
  patient: string | EvolutionPatient;
  doctor: string | EvolutionDoctor;
  date: string | Date;
  time?: string;
  specialty: string;
  content?: string;
  observations?: string;
  treatmentStatus?: 'initial_evaluation' | 'in_progress' | 'improving' | 'stable' | 'regressing' | 'completed';
  evaluationTypes?: string[];
  metrics?: EvolutionMetric[];
  evaluationAreas?: EvolutionArea[];
  plan?: string;
  therapeuticPlan?: TherapeuticPlan;
  protocolCode?: string;
  activeProtocols?: string[];
  appointmentId?: string;
  pdfUrl?: string;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface EvolutionChartData {
  dates: string[];
  metrics: Record<string, { values: number[]; config?: any }>;
  evaluationTypes?: Record<string, number[]>;
}

export interface EvolutionProgressData {
  patient?: string | EvolutionPatient;
  currentPlan?: {
    protocol?: TherapeuticProtocol;
    version?: number;
    reviewDate?: string | Date;
  };
  objectives?: Array<TherapeuticObjective & {
    target: number;
    current?: number;
    trend?: 'improving' | 'stable' | 'regressing';
    history?: Array<{ date: string | Date; score: number }>;
    projectedCompletion?: string | Date;
  }>;
  protocolEffectiveness?: {
    code: string;
    name: string;
    sessionsCompleted: number;
    overallImprovement: number;
    usageCount: number;
    successRate: number;
  } | null;
  totalSessions?: number;
  treatmentStatus?: string;
}

export interface CreateEvolutionPayload {
  patient: string;
  date: string | Date;
  time?: string;
  specialty: string;
  content?: string;
  observations?: string;
  metrics?: EvolutionMetric[];
  evaluationAreas?: EvolutionArea[];
  evaluationTypes?: string[];
  plan?: string;
  treatmentStatus?: string;
  therapeuticPlan?: TherapeuticPlan;
  protocolCode?: string;
  appointmentId?: string;
}

export interface UpdateEvolutionPayload extends Partial<CreateEvolutionPayload> {}
