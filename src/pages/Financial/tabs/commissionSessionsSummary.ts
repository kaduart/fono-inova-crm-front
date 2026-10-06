// Resumo dos atendimentos que compõem uma comissão — usado no card da despesa
// (ExpensesTab) para conferir com a folha assinada diariamente.
//
// Regra: sessão `non_payable` (ex.: cancelamento tardio com assinatura) é atendimento
// da clínica — conta no total e no valor atendido — mas não gera repasse ao profissional.
// Por isso aparece separada: total = remuneradas + sem repasse.

export type CommissionOrigin = 'particular' | 'convenio' | 'liminar';

export interface CommissionSessionItem {
  sessionId: string;
  date: string;
  time: string | null;
  patientName: string;
  value: number;
  commissionValue: number;
  isPackage: boolean;
  packageSessionType: string | null;
  origin: CommissionOrigin;
  professionalPaymentStatus?: 'payable' | 'non_payable';
  nonPayableReason?: string | null;
}

export interface CommissionSessionsSummary {
  total: number;
  payable: number;
  nonPayable: number;
  nonPayableItems: CommissionSessionItem[];
  /** Contagem por tipo, considerando TODOS os atendimentos (inclui sem repasse). */
  byOrigin: Record<CommissionOrigin, number>;
  /** Mesma contagem, só das sessões com repasse. */
  byOriginPayable: Record<CommissionOrigin, number>;
}

export function summarizeCommissionSessions(items: CommissionSessionItem[]): CommissionSessionsSummary {
  const byOrigin: Record<CommissionOrigin, number> = { convenio: 0, particular: 0, liminar: 0 };
  const byOriginPayable: Record<CommissionOrigin, number> = { convenio: 0, particular: 0, liminar: 0 };
  const nonPayableItems: CommissionSessionItem[] = [];

  for (const item of items) {
    // origem desconhecida cai em particular (mesmo default do backend)
    const origin: CommissionOrigin = item.origin in byOrigin ? item.origin : 'particular';
    byOrigin[origin]++;
    if (item.professionalPaymentStatus === 'non_payable') {
      nonPayableItems.push(item);
    } else {
      byOriginPayable[origin]++;
    }
  }

  return {
    total: items.length,
    payable: items.length - nonPayableItems.length,
    nonPayable: nonPayableItems.length,
    nonPayableItems,
    byOrigin,
    byOriginPayable
  };
}
