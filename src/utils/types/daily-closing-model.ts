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
  period: {
    start: string;
    end: string;
  };
  isAdvancePayment?: boolean;
  summary: {
    scheduled: {
      count: number;
      value: number;
      details: AppointmentDetail[];
    };
    attended: {
      count: number;
      value: number;
      details: AppointmentDetail[];
    };
    canceled: {
      count: number;
      value: number;
      details: AppointmentDetail[];
    };
    pending: {
      count: number;
      value: number;
      details: AppointmentDetail[];
    };
    patientsCount: number;
  };
  financial: {
    totalReceived: number;
    totalExpected: number;
    paymentMethods: {
      dinheiro: PaymentMethodSummary;
      pix: PaymentMethodSummary;
      cartão: PaymentMethodSummary;
    };
    packages: {
      total: number;
      details: PackageDetail[];
    };
  };
  byProfessional: ProfessionalSummary[];
  patients: string[];
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
