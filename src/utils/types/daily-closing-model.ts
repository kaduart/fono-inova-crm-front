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

export interface DailyClosingData  {
    date: string;
    period: {
      start: string;
      end: string;
    };
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
  };
// Tipos auxiliares
export interface AppointmentDetail {
  id: string;
  patient: string;
  service: string;
  value: number;
  status: string;
  method: 'dinheiro' | 'pix' | 'cartão';
  paymentStatus: 'pending' | 'paid' | 'canceled';
  date: string;
  time: string;
}

export interface PaymentDetail {
  id: string;
  type: string;
  patient: string;
  value: number;
  method: 'dinheiro' | 'pix' | 'cartão';
  createdAt: string;
  doctor: string;
  status?: string;
  paymentStatus?: 'pending' | 'paid' | 'canceled';
}

export interface PackageDetail extends PaymentDetail {
  sessions: number;
}

export interface PaymentMethodSummary {
  amount: number;
  details: Array<AppointmentDetail | PaymentDetail>;
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

export interface ProfessionalSummary {
  id: string;
  name: string;
  specialty: string;
  metrics: ProfessionalMetrics;
  financial: ProfessionalFinancial;
  appointments: AppointmentDetail[];
}