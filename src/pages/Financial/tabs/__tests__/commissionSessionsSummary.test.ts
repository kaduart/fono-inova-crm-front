import { describe, it, expect } from 'vitest';
import { summarizeCommissionSessions, type CommissionSessionItem } from '../commissionSessionsSummary';

const item = (over: Partial<CommissionSessionItem>): CommissionSessionItem => ({
  sessionId: Math.random().toString(36).slice(2),
  date: '2026-09-10',
  time: '10:00',
  patientName: 'Paciente',
  value: 80,
  commissionValue: 50,
  isPackage: false,
  packageSessionType: null,
  origin: 'convenio',
  professionalPaymentStatus: 'payable',
  ...over
});

describe('summarizeCommissionSessions', () => {
  it('conta por tipo e fecha total = com repasse + sem repasse', () => {
    const items = [
      ...Array.from({ length: 9 }, () => item({ origin: 'convenio' })),
      ...Array.from({ length: 3 }, () => item({ origin: 'particular' })),
      ...Array.from({ length: 2 }, () => item({ origin: 'liminar' }))
    ];
    const s = summarizeCommissionSessions(items);
    expect(s.byOrigin).toEqual({ convenio: 9, particular: 3, liminar: 2 });
    expect(s.total).toBe(14);
    expect(s.payable + s.nonPayable).toBe(s.total);
  });

  it('sessão non_payable conta no total e no tipo, mas fica separada do repasse', () => {
    const late = item({ professionalPaymentStatus: 'non_payable', commissionValue: 0, nonPayableReason: 'só assinatura' });
    const s = summarizeCommissionSessions([item({}), item({}), late]);
    expect(s.total).toBe(3);
    expect(s.payable).toBe(2);
    expect(s.nonPayable).toBe(1);
    expect(s.byOrigin.convenio).toBe(3);
    expect(s.byOriginPayable.convenio).toBe(2);
    expect(s.nonPayableItems[0].nonPayableReason).toBe('só assinatura');
  });

  it('dado antigo sem professionalPaymentStatus é tratado como com repasse', () => {
    const legacy = item({});
    delete legacy.professionalPaymentStatus;
    expect(summarizeCommissionSessions([legacy]).payable).toBe(1);
  });

  it('lista vazia', () => {
    const s = summarizeCommissionSessions([]);
    expect(s.total).toBe(0);
    expect(s.byOrigin).toEqual({ convenio: 0, particular: 0, liminar: 0 });
  });
});
