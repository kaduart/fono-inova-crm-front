/**
 * Calendar Capabilities — Feature flags e permissions para o EnhancedCalendar
 *
 * Arquitetura: engine compartilhada com capability-based rendering.
 * NÃO duplicar componentes. Usar mode + permissions + featureFlags.
 */

export type CalendarMode = 'admin' | 'doctor' | 'doctor_private';

export interface CalendarPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canComplete: boolean;
  canSeeFinancial: boolean;
  canEditFinancial: boolean;
  canSeeDebt: boolean;
  canConvertPreAgendamento: boolean;
  canChangePatient: boolean;
}

export interface CalendarFeatureFlags {
  showCarteiraView: boolean;
  showRecorrenciaView: boolean;
  showLegendas: boolean;
  showNovoAgendamentoButton: boolean;
}

/** Permissions padrão para admin (tudo liberado) */
export const ADMIN_PERMISSIONS: CalendarPermissions = {
  canCreate: true,
  canEdit: true,
  canCancel: true,
  canComplete: true,
  canSeeFinancial: true,
  canEditFinancial: true,
  canSeeDebt: true,
  canConvertPreAgendamento: true,
  canChangePatient: true,
};

/** Permissions para modo doctor (clínica compartilhada) */
export const DOCTOR_PERMISSIONS: CalendarPermissions = {
  canCreate: true,
  canEdit: true,
  canCancel: false,
  canComplete: true,
  canSeeFinancial: false,
  canEditFinancial: false,
  canSeeDebt: false,
  canConvertPreAgendamento: false,
  canChangePatient: false,
};

/** Permissions para modo doctor_private */
export const DOCTOR_PRIVATE_PERMISSIONS: CalendarPermissions = {
  canCreate: true,
  canEdit: true,
  canCancel: true,
  canComplete: true,
  canSeeFinancial: true,
  canEditFinancial: true,
  canSeeDebt: true,
  canConvertPreAgendamento: true,
  canChangePatient: false,
};

/** Feature flags padrão para admin */
export const ADMIN_FEATURE_FLAGS: CalendarFeatureFlags = {
  showCarteiraView: true,
  showRecorrenciaView: true,
  showLegendas: true,
  showNovoAgendamentoButton: true,
};

/** Feature flags para modo doctor */
export const DOCTOR_FEATURE_FLAGS: CalendarFeatureFlags = {
  showCarteiraView: false,
  showRecorrenciaView: false,
  showLegendas: true,
  showNovoAgendamentoButton: true,
};

export function getDefaultPermissions(mode: CalendarMode = 'admin'): CalendarPermissions {
  switch (mode) {
    case 'doctor':
      return DOCTOR_PERMISSIONS;
    case 'doctor_private':
      return DOCTOR_PRIVATE_PERMISSIONS;
    case 'admin':
    default:
      return ADMIN_PERMISSIONS;
  }
}

export function getDefaultFeatureFlags(mode: CalendarMode = 'admin'): CalendarFeatureFlags {
  switch (mode) {
    case 'doctor':
      return DOCTOR_FEATURE_FLAGS;
    case 'doctor_private':
      return ADMIN_FEATURE_FLAGS; // private tem visão completa do próprio negócio
    case 'admin':
    default:
      return ADMIN_FEATURE_FLAGS;
  }
}
