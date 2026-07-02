// src/services/__tests__/guidePresentationService.test.ts
import { describe, it, expect } from 'vitest';
import { buildGuidePresentation, buildGuidesPresentation } from '../guidePresentationService';
import type { InsuranceGuide, GuideLifecycleResult } from '../insuranceGuideApi';
import type { GuidePolicy } from '../insuranceService';

const makeGuide = (overrides: Partial<InsuranceGuide> = {}): InsuranceGuide => {
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 30);

  return {
    _id: '507f1f77bcf86cd799439011',
    number: '123',
    patientId: 'p1',
    specialty: 'fonoaudiologia',
    insurance: 'unimed-anapolis',
    totalSessions: 10,
    usedSessions: 3,
    expiresAt: future.toISOString(),
    status: 'active',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    remaining: 7,
    ...overrides
  };
};

const makeLifecycle = (eligibility: GuideLifecycleResult['eligibility'], alerts: GuideLifecycleResult['alerts'] = []): GuideLifecycleResult => ({
  state: { status: 'active' },
  eligibility,
  alerts
});

const activeEligibility: GuideLifecycleResult['eligibility'] = {
  canSchedule: true,
  canBill: true,
  canRenew: false,
  canEdit: true,
  canBeSuperseded: true
};

describe('buildGuidePresentation', () => {
  it('maps active guide with remaining sessions', () => {
    const guide = makeGuide({ lifecycle: makeLifecycle(activeEligibility) });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.id).toBe(guide._id);
    expect(presentation.number).toBe('123');
    expect(presentation.specialtyLabel).toBe('Fonoaudiologia');
    expect(presentation.insuranceLabel).toBe('Unimed Anápolis');
    expect(presentation.remaining).toBe(7);
    expect(presentation.usedSessions).toBe(3);
    expect(presentation.totalSessions).toBe(10);
    expect(presentation.statusLabel).toBe('Disponível');
    expect(presentation.canSchedule).toBe(true);
    expect(presentation.canEdit).toBe(true);
    expect(presentation.isUsable).toBe(true);
  });

  it('marks exhausted guide when remaining is zero', () => {
    const guide = makeGuide({
      usedSessions: 10,
      remaining: 0,
      lifecycle: makeLifecycle({ ...activeEligibility, canSchedule: false, canRenew: true }, [{ code: 'NO_SESSIONS', severity: 'error' }])
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.remaining).toBe(0);
    expect(presentation.statusLabel).toBe('Esgotada');
    expect(presentation.isExhausted).toBe(true);
    expect(presentation.isUsable).toBe(false);
    expect(presentation.alerts).toHaveLength(1);
    expect(presentation.alerts[0].message).toBe('A guia não possui mais sessões disponíveis.');
  });

  it('marks guide with few remaining sessions', () => {
    const guide = makeGuide({
      usedSessions: 8,
      remaining: 2,
      lifecycle: makeLifecycle(activeEligibility)
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.statusLabel).toBe('Poucas sessões');
  });

  it('marks expired guide from lifecycle alert', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);

    const guide = makeGuide({
      expiresAt: past.toISOString(),
      lifecycle: makeLifecycle({ ...activeEligibility, canSchedule: false, canRenew: true }, [{ code: 'EXPIRED', severity: 'error' }])
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.statusLabel).toBe('Vencida');
    expect(presentation.isExpired).toBe(true);
    expect(presentation.isUsable).toBe(false);
    expect(presentation.expiryLabel).toContain('Venceu em');
  });

  it('marks guide expiring soon based on warning days', () => {
    const near = new Date();
    near.setDate(near.getDate() + 3);

    const guide = makeGuide({
      expiresAt: near.toISOString(),
      guidePolicy: { renewalType: 'end_of_month', expirationWarningDays: 14 },
      lifecycle: makeLifecycle({ ...activeEligibility, canRenew: true }, [{ code: 'EXPIRING_SOON', severity: 'warning' }])
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.statusLabel).toBe('Vence em breve');
    expect(presentation.expiryColor).toBe('#EA580C');
  });

  it('handles until_consumed policy without date expiration', () => {
    const guide = makeGuide({
      expiresAt: '9999-12-31T00:00:00.000Z',
      guidePolicy: { renewalType: 'until_consumed' } as GuidePolicy,
      lifecycle: makeLifecycle(activeEligibility)
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.hasDateExpiration).toBe(false);
    expect(presentation.expiryLabel).toBeNull();
    expect(presentation.statusLabel).toBe('Disponível');
  });

  it('marks cancelled guide', () => {
    const guide = makeGuide({
      status: 'cancelled',
      lifecycle: makeLifecycle({ ...activeEligibility, canSchedule: false, canEdit: false })
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.isCancelled).toBe(true);
    expect(presentation.statusLabel).toBe('Cancelada');
    expect(presentation.canSchedule).toBe(false);
  });

  it('marks superseded guide', () => {
    const guide = makeGuide({
      status: 'superseded',
      supersededBy: 'nova-guia-id',
      lifecycle: makeLifecycle({ ...activeEligibility, canSchedule: false, canRenew: false, canEdit: false, canBeSuperseded: false }, [{ code: 'SUPERSEDED', severity: 'info' }])
    });
    const presentation = buildGuidePresentation(guide);

    expect(presentation.isSuperseded).toBe(true);
    expect(presentation.statusLabel).toBe('Substituída');
    expect(presentation.canBeSuperseded).toBe(false);
  });

  it('builds multiple presentations', () => {
    const guides = [
      makeGuide({ lifecycle: makeLifecycle(activeEligibility) }),
      makeGuide({ status: 'exhausted', usedSessions: 10, remaining: 0, lifecycle: makeLifecycle({ ...activeEligibility, canSchedule: false }, [{ code: 'NO_SESSIONS', severity: 'error' }]) })
    ];
    const presentations = buildGuidesPresentation(guides);

    expect(presentations).toHaveLength(2);
    expect(presentations[0].statusLabel).toBe('Disponível');
    expect(presentations[1].statusLabel).toBe('Esgotada');
  });
});
