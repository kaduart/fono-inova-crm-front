export interface DailyClosingResponse {
  success: boolean;
  data: DailyClosingData;
  meta: {
    generatedAt: string;
    recordCount: {
      appointments: number;
      payments: number;
      professionals: number;
      patients: number;
    };
    // 🔥 NOVO: Contagem por tipo de paciente
    byPatientType?: {
      novos: number;
      recorrentes: number;
    };
  };
}





export interface ProfessionalMetrics {
  attendanceRate: string;
  averageTicket: string;
}

export interface ProfessionalFinancial {
  received: number;
  expected: number;
  methods: {
    dinheiro: PaymentMethodSummary;
    pix: PaymentMethodSummary;
    cartão: PaymentMethodSummary;
  };
}

// types/dailyClosing.ts

export interface DailyClosingData {
  date: string;
  period?: {
    start: string;
    end: string;
  };
  isAdvancePayment?: boolean;
  summary: {
    appointments: {
      total: number;
      attended: number;
      canceled: number;
      pending: number;
      expectedValue: number;
      pendingValue: number;
      pendingCount: number;
      // 🔥 NOVO: Contadores de novos vs recorrentes
      novos?: number;
      recorrentes?: number;
    };
    payments: {
      totalReceived: number;
      byMethod: {
        dinheiro: number;
        pix: number;
        cartão: number;
      };
    };
    // 🏥 NOVO: Seção de convênio
    insurance?: {
      production: number;
      sessionsCount: number;
      received: number;
      pending: number;
      byProvider: InsuranceProviderSummary[];
    };
  };
  financial: {
    totalReceived: number;
    totalExpected: number;
    totalRevenue?: number;
    totalInsuranceProduction?: number;  // 🏥 NOVO
    totalInsurancePending?: number;      // 🏥 NOVO
    grandTotal?: number;                 // 🏥 NOVO
    paymentMethods: {
      dinheiro: PaymentMethodSummary;
      pix: PaymentMethodSummary;
      cartão: PaymentMethodSummary;
    };
    packages: {
      total: number;
      details: PackageDetail[];
    };
    insurance?: {                        // 🏥 NOVO
      total: number;
      byProvider: InsuranceProviderSummary[];
    };
  };
  timelines?: {
    appointments: TimelineAppointment[];
    payments: TimelinePayment[];
    insuranceSessions?: InsuranceSessionDetail[];  // 🏥 NOVO
  };
  professionals: ProfessionalSummary[];
  timeSlots?: TimeSlotSummary[];
  // 🔥 NOVO: Agendamentos separados por tipo
  appointmentsByType?: {
    novos: AppointmentByType[];
    recorrentes: AppointmentByType[];
  };
}

// 🔥 NOVO: Tipo para agendamentos por tipo (novos/recorrentes)
export interface AppointmentByType {
  id: string;
  patient: string;
  phone?: string;
  time: string;
  specialty: string;
  doctor: string;
  serviceType: string;
}

// 🏥 NOVO: Tipos para convênio
export interface InsuranceProviderSummary {
  provider: string;
  value: number;
  sessions: number;
}

export interface InsuranceSessionDetail {
  id: string;
  time: string;
  patient: string;
  provider: string;
  insuranceValue: number;
  status: string;
  paymentStatus: string;
  isPaid: boolean;
  guideNumber?: string | null;
}

export interface TimelineAppointment {
  id: string;
  patient: string;
  service: string;
  doctor: string;
  sessionValue: number;
  method: string;
  paidStatus: string;
  operationalStatus: string;
  clinicalStatus: string;
  displayStatus: string;
  date: string;
  time: string;
  isPackage: boolean;
  paymentMethod: string;
  packageId: string | null;
  isConvenio?: boolean;           // 🏥 NOVO
  insuranceProvider?: string | null;  // 🏥 NOVO
  insuranceValue?: number | null;     // 🏥 NOVO
  // 🔥 NOVO: Flag de primeiro agendamento
  isFirstAppointment?: boolean;
}

export interface TimelinePayment {
  id: string;
  patient: string;
  type: string;
  method: string;
  value: number;
  paymentDate: string;
  doctor: string;
  serviceType: string | null;
}

export interface TimeSlotSummary {
  time: string;
  appointments: TimelineAppointment[];
  count: number;
  totalSessions?: number;
  stats: {
    confirmed: number;
    canceled: number;
    scheduled: number;
    revenueReceived: number;
    professionals: string[];
    confirmationRate?: number;
    occupancy?: number;
  };
}

/* ────────────────────────────────
   Subtipos auxiliares
──────────────────────────────── */

export interface AppointmentDetail {
  id: string;
  patient: string;
  service: string;
  value: number;
  effectiveValue: number;
  sessionValue: number;
  status: string;
  method: string;
  paymentStatus: string;
  date: string;
  time: string;
  isPackage: boolean;
  isPackageContractedToday: boolean;
  packageId?: string | null;
  paymentDate?: string;
  isAdvancePayment?: boolean;
}

export interface PaymentMethodSummary {
  amount: number;
  details: PaymentDetail[];
}

export interface PaymentDetail {
  id: string;
  type: string;
  patient: string;
  value: number;
  method: string;
  createdAt: string;
  doctor: string;
  status: string;
  paymentDate: string;
  referenceDate?: string | null;
  isAdvancePayment?: boolean;
}

export interface PackageDetail {
  id: string;
  patient: string;
  value: number;
  method: string;
  sessions: number;
  sessionValue: number;
  date: string;
}

export interface ProfessionalSummary {
  id: string;
  name: string;
  specialty: string;
  metrics: {
    attendanceRate: string;
    averageTicket: string;
  };
  financial: {
    received: number;
    expected: number;
    methods: {
      dinheiro: PaymentMethodSummary;
      pix: PaymentMethodSummary;
      cartão: PaymentMethodSummary;
    };
  };
  appointments: AppointmentDetail[];
}
