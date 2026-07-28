import API from './api';

export interface FinancialSummary {
  patientId: string;
  packageId: string | null;
  totalPaid: number;
  paidCount: number;
  totalPending: number;
  pendingCount: number;
  completedSessions: number;
  sessionDebt: number;
  // Breakdown por billingType (SSOT)
  particularPaid: number;
  particularCount: number;
  liminarPaid: number;
  liminarCount: number;
  convenioPaid: number;
  convenioCount: number;
}

export interface PendingPayment {
  id: string;
  source?: 'payment' | 'package';
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  appointment: {
    id: string;
    date: string;
    time: string;
    sessionValue: number;
  } | null;
  description: string | null;
  packageId?: string | null;
  packageName?: string | null;
  specialty?: string | null;
  paymentMethod?: string | null;
  splitMethods?: { method: string; amount: number; date?: string }[] | null;
}

export async function getPatientFinancialSummary(patientId: string, packageId?: string): Promise<FinancialSummary> {
  const params = packageId ? { packageId } : {};
  const res = await API.get(`/v2/financial/patient/${patientId}/summary`, { params });
  return res.data.data;
}

export async function getPatientPendingPayments(patientId: string): Promise<PendingPayment[]> {
  const res = await API.get(`/v2/financial/patient/${patientId}/pending-payments`);
  return res.data.data;
}

export async function getPatientPaidPayments(patientId: string): Promise<PendingPayment[]> {
  const res = await API.get(`/v2/financial/patient/${patientId}/paid-payments`);
  return res.data.data;
}

export interface ReceivePaymentRequest {
  patientId: string;
  amount: number;
  method: string;
  mode?: string;
  metadata?: Record<string, any>;
}

export interface ReceivePaymentResponse {
  success: boolean;
  receiptId: string;
  jobId: string;
  status: string;
  message: string;
  amount: number;
  patientId: string;
}

export async function receivePayment(data: ReceivePaymentRequest): Promise<ReceivePaymentResponse> {
  const res = await API.post('/v2/financial/receive', data);
  return res.data;
}
