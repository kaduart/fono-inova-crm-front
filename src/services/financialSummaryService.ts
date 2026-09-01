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

// 🚨 FIX (2026-09-01): tela de pacotes do paciente (TherapyPackageCard, 1 instância
// por pacote) chamava getPatientFinancialSummary uma vez por card — paciente com 11
// pacotes inativos disparava 11 requisições HTTP simultâneas pro mesmo endpoint,
// travadas pelo limite de conexões do navegador (até 2s pra carregar a aba, achado
// real em produção). Em vez de reescrever a árvore de componentes pra levantar o
// fetch pro pai, agrupa (dataloader-style) as chamadas com packageId feitas na
// mesma janela de tempo e resolve todas com 1 request pro endpoint em lote
// (/summary/batch) — assinatura e contrato desta função continuam idênticos pra
// quem já chama (TherapyPackageCard, PatientBalanceModal, etc).
interface PendingSummaryWaiter {
  resolve: (value: FinancialSummary) => void;
  reject: (reason: unknown) => void;
}

const BATCH_WINDOW_MS = 15;
const pendingByPatient = new Map<string, Map<string, PendingSummaryWaiter[]>>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function flushPatientBatch(patientId: string) {
  const perPatient = pendingByPatient.get(patientId);
  pendingByPatient.delete(patientId);
  if (!perPatient || perPatient.size === 0) return;

  const packageIds = Array.from(perPatient.keys());

  // Só 1 pacote nessa janela — vai direto no endpoint singular, sem overhead do lote.
  if (packageIds.length === 1) {
    const packageId = packageIds[0];
    const waiters = perPatient.get(packageId) || [];
    try {
      const res = await API.get(`/v2/financial/patient/${patientId}/summary`, { params: { packageId } });
      const summary = res.data.data as FinancialSummary;
      waiters.forEach((w) => w.resolve(summary));
    } catch (err) {
      waiters.forEach((w) => w.reject(err));
    }
    return;
  }

  try {
    const res = await API.get(`/v2/financial/patient/${patientId}/summary/batch`, {
      params: { packageIds: packageIds.join(',') },
    });
    const data = res.data.data as Record<string, (FinancialSummary & { error?: undefined }) | { error: string }>;
    for (const packageId of packageIds) {
      const waiters = perPatient.get(packageId) || [];
      const entry = data[packageId];
      if (entry && !('error' in entry)) {
        waiters.forEach((w) => w.resolve(entry));
      } else {
        waiters.forEach((w) => w.reject(new Error(entry?.error || 'Resumo financeiro não encontrado para o pacote')));
      }
    }
  } catch (err) {
    for (const waiters of perPatient.values()) {
      waiters.forEach((w) => w.reject(err));
    }
  }
}

export async function getPatientFinancialSummary(patientId: string, packageId?: string): Promise<FinancialSummary> {
  // Sem packageId = resumo global do paciente (chamada rara, fora do padrão N+1) —
  // segue direto, não participa do agrupamento.
  if (!packageId) {
    const res = await API.get(`/v2/financial/patient/${patientId}/summary`);
    return res.data.data;
  }

  return new Promise<FinancialSummary>((resolve, reject) => {
    if (!pendingByPatient.has(patientId)) pendingByPatient.set(patientId, new Map());
    const perPatient = pendingByPatient.get(patientId)!;
    if (!perPatient.has(packageId)) perPatient.set(packageId, []);
    perPatient.get(packageId)!.push({ resolve, reject });

    if (!flushTimers.has(patientId)) {
      const timer = setTimeout(() => {
        flushTimers.delete(patientId);
        flushPatientBatch(patientId);
      }, BATCH_WINDOW_MS);
      flushTimers.set(patientId, timer);
    }
  });
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
