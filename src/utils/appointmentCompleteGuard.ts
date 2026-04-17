/**
 * 🛡️ GUARD DE COMPLETE APPOINTMENT — V2
 *
 * Regra de ouro: Complete executa decisões já tomadas.
 * Se o valor da sessão não foi definido, bloqueia antes de bater na API.
 */

export interface AppointmentCompleteGuardPackage {
  _id?: string;
  sessionsRemaining?: number;
  totalSessions?: number;
  sessionsDone?: number;
}

export interface AppointmentCompleteGuardInput {
  billingType?: string;
  package?: AppointmentCompleteGuardPackage | string;
  sessionValue?: number | null;
}

export interface GuardResult {
  valid: boolean;
  errorCode?: string;
  message?: string;
}

export const GuardErrorCodes = {
  SESSION_VALUE_REQUIRED: 'SESSION_VALUE_REQUIRED',
  LIMINAR_VALUE_REQUIRED: 'LIMINAR_VALUE_REQUIRED',
  PACKAGE_EXHAUSTED: 'PACKAGE_EXHAUSTED',
} as const;

function getSessionValue(appointment: AppointmentCompleteGuardInput): { hasValue: boolean; value: number } {
  const raw = appointment.sessionValue;
  const hasValue = raw !== undefined && raw !== null;
  return { hasValue, value: hasValue ? Number(raw) : 0 };
}

function getPackageRemaining(pkg?: AppointmentCompleteGuardPackage | string): number | null {
  // 🛡️ CORREÇÃO: Se package vier como string (ObjectId não populado), não podemos calcular saldo
  if (!pkg || typeof pkg === 'string') {
    console.warn('[Guard] Package não populado - pulando validação de saldo');
    return null;
  }
  if (typeof pkg.sessionsRemaining === 'number') return pkg.sessionsRemaining;
  const total = typeof pkg.totalSessions === 'number' ? pkg.totalSessions : 0;
  const done = typeof pkg.sessionsDone === 'number' ? pkg.sessionsDone : 0;
  return total - done;
}

/**
 * Valida se o appointment pode ser completado com segurança financeira.
 */
export function validateAppointmentComplete(appointment: AppointmentCompleteGuardInput): GuardResult {
  const billingType = appointment.billingType || 'particular';
  const pkg = appointment.package;
  // 🛡️ CORREÇÃO: Considera pacote mesmo quando vier como string (ObjectId não populado)
  const hasPackage = !!pkg && (
    typeof pkg === 'string' ||
    (typeof pkg === 'object' && (
      typeof pkg.sessionsRemaining === 'number' ||
      typeof pkg.totalSessions === 'number' ||
      typeof pkg.sessionsDone === 'number'
    ))
  );
  const { hasValue: hasSessionValue, value: sessionValue } = getSessionValue(appointment);
  const remaining = getPackageRemaining(pkg);

  // 🏥 Convênio: sempre pode (faturamento batch, valor zero é OK)
  if (billingType === 'convenio') {
    return { valid: true };
  }

  // 📦 Pacotes pré-pagos/terapia (não liminar): verifica se tem sessões restantes
  if (hasPackage && billingType !== 'liminar') {
    if (remaining !== null && remaining <= 0) {
      return {
        valid: false,
        errorCode: GuardErrorCodes.PACKAGE_EXHAUSTED,
        message: '📦 Pacote esgotado. Não há sessões disponíveis para completar.',
      };
    }
    return { valid: true };
  }

  // ⚖️ Liminar: exige valor > 0 para consumir crédito judicial
  if (billingType === 'liminar') {
    if (hasSessionValue && sessionValue > 0) {
      return { valid: true };
    }
    return {
      valid: false,
      errorCode: GuardErrorCodes.LIMINAR_VALUE_REQUIRED,
      message: '⚖️ Liminar exige valor de sessão > 0 para consumo de crédito judicial. Edite o agendamento antes de completar.',
    };
  }

  // 💰 Particular / per-session: exige valor definido
  if (hasSessionValue && sessionValue > 0) {
    return { valid: true };
  }

  return {
    valid: false,
    errorCode: GuardErrorCodes.SESSION_VALUE_REQUIRED,
    message: '💰 Valor da sessão não definido. Edite o agendamento e informe o valor antes de completar.',
  };
}

/**
 * Wrapper para execução segura do complete.
 * Retorna true se passou no guard (e onValid foi executado), false se foi bloqueado.
 */
export function safeCompleteAppointment(
  appointment: AppointmentCompleteGuardInput,
  onValid: () => void | Promise<void>,
  onInvalid?: (result: GuardResult) => void
): boolean {
  const result = validateAppointmentComplete(appointment);
  if (!result.valid) {
    onInvalid?.(result);
    return false;
  }
  onValid();
  return true;
}
