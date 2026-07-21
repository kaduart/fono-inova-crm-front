// src/services/guidePresentationService.ts
/**
 * Camada de apresentação de guias de convênio.
 *
 * Responsabilidade única: transformar o contrato de domínio `{ guide, lifecycle }`
 * vindo do backend em um view model consumível pela UI.
 *
 * Regras de negócio NÃO devem ser adicionadas aqui. Este serviço apenas traduz
 * `lifecycle.eligibility` e `lifecycle.alerts` em labels, cores e flags visuais.
 */

import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InsuranceGuide, GuideLifecycleResult, LifecycleAlert } from './insuranceGuideApi';
import type { GuidePolicy } from './insuranceService';
import { getSpecialtyLabel } from '../constants/specialties';
import { getProviderName } from '../constants/insuranceProviders';

export interface GuideTheme {
  from: string;
  to: string;
  light: string;
  border: string;
  text: string;
}

export interface PresentationAlert {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface GuidePresentation {
  id: string;
  number: string;
  specialty: string;
  specialtyLabel: string;
  insurance: string;
  insuranceLabel: string;
  status: string;
  statusLabel: string;
  statusBg: string;
  statusColor: string;
  statusSeverity: GuideStatusSeverity;
  remaining: number;
  usedSessions: number;
  totalSessions: number;
  progressPct: number;
  isUsable: boolean;
  isExpired: boolean;
  isExhausted: boolean;
  isCancelled: boolean;
  isSuperseded: boolean;
  hasDateExpiration: boolean;
  isExpiringSoon: boolean;
  expiryLabel: string | null;
  expiryColor: string;
  daysUntilExpiration: number | null;
  canSchedule: boolean;
  canBill: boolean;
  canRenew: boolean;
  canEdit: boolean;
  canBeSuperseded: boolean;
  alerts: PresentationAlert[];
  theme: GuideTheme;
  rawGuide: InsuranceGuide;
}

const DEFAULT_THEME: GuideTheme = {
  from: '#1B4D6E',
  to: '#2E7A5E',
  light: '#F0FFF4',
  border: '#A7F3D0',
  text: '#1B4D6E'
};

const SPECIALTY_THEMES: Record<string, GuideTheme> = {
  fonoaudiologia: { from: '#1D4ED8', to: '#38BDF8', light: '#EFF6FF', border: '#BAE6FD', text: '#1D4ED8' },
  psicologia: { from: '#7C3AED', to: '#C084FC', light: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
  fisioterapia: { from: '#059669', to: '#34D399', light: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  psicomotricidade: { from: '#D97706', to: '#FCD34D', light: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  terapia_ocupacional: { from: '#EA580C', to: '#FB923C', light: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  psicopedagogia: { from: '#0D9488', to: '#2DD4BF', light: '#F0FDFA', border: '#99F6E4', text: '#0F766E' },
  neuropsicologia: { from: '#4338CA', to: '#818CF8', light: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  musicoterapia: { from: '#B45309', to: '#FBBF24', light: '#FFFBEB', border: '#FDE68A', text: '#92400E' }
};

const ALERT_MESSAGES: Record<string, string> = {
  EXPIRING_SOON: 'A guia está próxima do vencimento.',
  EXPIRED: 'A guia está vencida.',
  NO_SESSIONS: 'A guia não possui mais sessões disponíveis.',
  SUPERSEDED: 'A guia foi substituída por outra.'
};

function getTheme(specialty: string): GuideTheme {
  return SPECIALTY_THEMES[specialty] || DEFAULT_THEME;
}

function getGuidePolicy(guide: InsuranceGuide): GuidePolicy | null {
  return guide.guidePolicy || null;
}

function hasDateExpiration(guide: InsuranceGuide): boolean {
  const policy = getGuidePolicy(guide);
  if (!policy) return true; // comportamento conservador quando não há política
  return policy.renewalType !== 'until_consumed';
}

function getDaysUntilExpiration(guide: InsuranceGuide): number | null {
  if (!guide.expiresAt || !hasDateExpiration(guide)) return null;
  const expiry = parseISO(guide.expiresAt);
  if (!isValid(expiry)) return null;
  return differenceInDays(expiry, new Date());
}

function translateAlerts(lifecycle: GuideLifecycleResult | undefined): PresentationAlert[] {
  if (!lifecycle?.alerts?.length) return [];
  return lifecycle.alerts.map((alert: LifecycleAlert) => ({
    code: alert.code,
    severity: alert.severity,
    message: ALERT_MESSAGES[alert.code] || alert.code,
    metadata: alert.metadata
  }));
}

function buildExpiryLabel(days: number | null, expiresAt: string | undefined): string | null {
  if (days === null || !expiresAt) return null;
  const expiry = parseISO(expiresAt);
  if (!isValid(expiry)) return null;

  const formatted = format(expiry, 'dd/MM/yyyy', { locale: ptBR });

  if (days < 0) return `⚠️ Venceu em ${formatted}`;
  if (days === 0) return '🔴 Vence hoje';
  if (days <= 7) return `🟠 Expira em ${formatted} (${days}d)`;
  if (days <= 30) return `🟡 Expira em ${formatted}`;
  return `Expira em ${formatted}`;
}

function buildExpiryColor(days: number | null): string {
  if (days === null) return '#8A99B0';
  if (days < 0) return '#C75146';
  if (days <= 7) return '#EA580C';
  if (days <= 30) return '#D97706';
  return '#8A99B0';
}

function isGuideExpiringSoon(
  guide: InsuranceGuide,
  lifecycle: GuideLifecycleResult | undefined,
  daysUntilExpiration: number | null
): boolean {
  const policy = getGuidePolicy(guide);
  const warningDays = policy?.expirationWarningDays ?? 14;
  const alertCodes = new Set(lifecycle?.alerts?.map(a => a.code) || []);
  return alertCodes.has('EXPIRING_SOON') || (hasDateExpiration(guide) && daysUntilExpiration !== null && daysUntilExpiration <= warningDays);
}

export type GuideStatusSeverity = 'success' | 'warning' | 'critical' | 'neutral';

function resolveStatus(
  guide: InsuranceGuide,
  lifecycle: GuideLifecycleResult | undefined,
  daysUntilExpiration: number | null,
  expiringSoon: boolean
): { label: string; bg: string; color: string; severity: GuideStatusSeverity } {
  const remaining = guide.remaining ?? Math.max(0, guide.totalSessions - (guide.usedSessions || 0));

  // Status fixos do backend
  if (guide.status === 'cancelled') {
    return { label: 'Cancelada', bg: 'rgba(255,255,255,0.15)', color: '#FFFFFF', severity: 'neutral' };
  }

  if (guide.status === 'superseded') {
    return { label: 'Substituída', bg: 'rgba(255,255,255,0.15)', color: '#FFFFFF', severity: 'neutral' };
  }

  // Alertas de domínio têm precedência para vencimento/esgotamento
  const alertCodes = new Set(lifecycle?.alerts?.map(a => a.code) || []);

  if (alertCodes.has('EXPIRED') || guide.status === 'expired' || (hasDateExpiration(guide) && daysUntilExpiration !== null && daysUntilExpiration < 0)) {
    return { label: 'Vencida', bg: 'rgba(255,255,255,0.15)', color: '#FFFFFF', severity: 'critical' };
  }

  if (alertCodes.has('NO_SESSIONS') || remaining === 0 || guide.status === 'exhausted') {
    return { label: 'Esgotada', bg: 'rgba(239,68,68,0.35)', color: '#FFFFFF', severity: 'critical' };
  }

  // Vencimento tem precedência sobre saldo baixo: sessão não usada a tempo é sessão perdida,
  // mesmo que ainda existam sessões restantes no saldo
  if (expiringSoon) {
    return { label: 'Vence em breve', bg: 'rgba(249,115,22,0.35)', color: '#FFFFFF', severity: 'warning' };
  }

  if (remaining <= 2) {
    return { label: 'Poucas sessões', bg: 'rgba(249,115,22,0.35)', color: '#FFFFFF', severity: 'warning' };
  }

  return { label: 'Disponível', bg: 'rgba(255,255,255,0.25)', color: '#FFFFFF', severity: 'success' };
}

export function buildGuidePresentation(guide: InsuranceGuide): GuidePresentation {
  const lifecycle = guide.lifecycle;
  const remaining = guide.remaining ?? Math.max(0, guide.totalSessions - (guide.usedSessions || 0));
  const usedSessions = guide.usedSessions || 0;
  const totalSessions = guide.totalSessions || 0;
  const progressPct = totalSessions > 0 ? Math.min((usedSessions / totalSessions) * 100, 100) : 0;
  const daysUntilExpiration = getDaysUntilExpiration(guide);
  const expiringSoon = isGuideExpiringSoon(guide, lifecycle, daysUntilExpiration);
  const status = resolveStatus(guide, lifecycle, daysUntilExpiration, expiringSoon);
  const theme = getTheme(guide.specialty);

  const eligibility = lifecycle?.eligibility;

  return {
    id: guide._id,
    number: guide.number,
    specialty: guide.specialty,
    specialtyLabel: getSpecialtyLabel(guide.specialty),
    insurance: guide.insurance,
    insuranceLabel: getProviderName(guide.insurance),
    status: guide.status,
    statusLabel: status.label,
    statusBg: status.bg,
    statusColor: status.color,
    statusSeverity: status.severity,
    remaining,
    usedSessions,
    totalSessions,
    progressPct,
    isUsable: eligibility?.canSchedule ?? ((guide.status === 'active' || guide.status === 'linked') && remaining > 0 && (daysUntilExpiration === null || daysUntilExpiration >= 0)),
    isExpired: guide.status === 'expired' || lifecycle?.alerts?.some(a => a.code === 'EXPIRED') || (daysUntilExpiration !== null && daysUntilExpiration < 0),
    isExhausted: guide.status === 'exhausted' || remaining === 0 || lifecycle?.alerts?.some(a => a.code === 'NO_SESSIONS'),
    isCancelled: guide.status === 'cancelled',
    isSuperseded: guide.status === 'superseded' || !!guide.supersededBy,
    hasDateExpiration: hasDateExpiration(guide),
    isExpiringSoon: expiringSoon,
    expiryLabel: hasDateExpiration(guide) ? buildExpiryLabel(daysUntilExpiration, guide.expiresAt) : null,
    expiryColor: buildExpiryColor(daysUntilExpiration),
    daysUntilExpiration,
    canSchedule: eligibility?.canSchedule ?? false,
    canBill: eligibility?.canBill ?? false,
    canRenew: eligibility?.canRenew ?? false,
    canEdit: eligibility?.canEdit ?? false,
    canBeSuperseded: eligibility?.canBeSuperseded ?? false,
    alerts: translateAlerts(lifecycle),
    theme,
    rawGuide: guide
  };
}

export function buildGuidesPresentation(guides: InsuranceGuide[]): GuidePresentation[] {
  return guides.map(buildGuidePresentation);
}

export const guidePresentationService = {
  buildGuidePresentation,
  buildGuidesPresentation
};

export default guidePresentationService;
