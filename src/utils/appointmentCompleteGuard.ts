/**
 * 🛡️ GUARD DE COMPLETE APPOINTMENT — V2.1 (Desacoplado por domínio)
 *
 * Regra de ouro: Complete executa decisões já tomadas.
 * Se o valor da sessão não foi definido, bloqueia antes de bater na API.
 *
 * ORDEM DE PRIORIDADE (domínio financeiro):
 *   1. Liminar    → valida creditBalance do LiminarContract
 *   2. Convênio   → sempre permite (guia controla no backend)
 *   3. Particular → valida sessões do package (se houver) ou valor da sessão
 */

export interface AppointmentCompleteGuardPackage {
  _id?: string;
  sessionsRemaining?: number;
  totalSessions?: number;
  sessionsDone?: number;
  liminarCreditBalance?: number; // 🏷️ LEGADO: mantido para compatibilidade com packages antigos
}

export interface AppointmentCompleteGuardLiminar {
  _id?: string;
  creditBalance?: number;
  status?: string;
}

export interface AppointmentCompleteGuardInput {
  billingType?: string;
  package?: AppointmentCompleteGuardPackage | string;
  liminarContract?: AppointmentCompleteGuardLiminar;
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
  LIMINAR_INSUFFICIENT_BALANCE: 'LIMINAR_INSUFFICIENT_BALANCE',
  LIMINAR_DATA_INCOMPLETE: 'LIMINAR_DATA_INCOMPLETE',
  PACKAGE_EXHAUSTED: 'PACKAGE_EXHAUSTED',
} as const;

function getSessionValue(appointment: AppointmentCompleteGuardInput): { hasValue: boolean; value: number } {
  const raw = appointment.sessionValue;
  const hasValue = raw !== undefined && raw !== null;
  return { hasValue, value: hasValue ? Number(raw) : 0 };
}

function getPackageRemaining(pkg?: AppointmentCompleteGuardPackage | string): number | null {
  if (!pkg || typeof pkg === 'string') {
    console.warn('[Guard] Package não populado - pulando validação de saldo');
    return null;
  }
  if (typeof pkg.sessionsRemaining === 'number') return pkg.sessionsRemaining;
  // Pacote antigo sem campos de contagem → não podemos calcular, permite passar
  if (typeof pkg.totalSessions !== 'number' && typeof pkg.sessionsDone !== 'number') {
    console.warn('[Guard] Package sem campos de sessão (formato antigo) - pulando validação de saldo');
    return null;
  }
  const total = typeof pkg.totalSessions === 'number' ? pkg.totalSessions : 0;
  const done = typeof pkg.sessionsDone === 'number' ? pkg.sessionsDone : 0;
  return total - done;
}

/**
 * Valida se o appointment pode ser completado com segurança financeira.
 *
 * ORDEM DE DECISÃO (sem misturar domínios):
 *   1. LiminarContract presente → valida crédito judicial
 *   2. billingType === 'convenio' → sempre permite
 *   3. Package particular → valida sessões restantes
 *   4. Particular avulso → exige valor definido
 */
export function validateAppointmentComplete(appointment: AppointmentCompleteGuardInput): GuardResult {
  const billingType = appointment.billingType || 'particular';
  const { hasValue: hasSessionValue, value: sessionValue } = getSessionValue(appointment);

  // ═══════════════════════════════════════════════════════════════
  // 1️⃣ LIMINAR — prioridade máxima (domínio judicial)
  // ═══════════════════════════════════════════════════════════════
  if (billingType === 'liminar' || appointment.liminarContract) {
    if (!hasSessionValue || sessionValue <= 0) {
      return {
        valid: false,
        errorCode: GuardErrorCodes.LIMINAR_VALUE_REQUIRED,
        message: '⚖️ Liminar exige valor de sessão > 0 para consumo de crédito judicial. Edite o agendamento antes de completar.',
      };
    }

    // 🆕 NOVO: usa LiminarContract como fonte de verdade
    const contractBalance = typeof appointment.liminarContract?.creditBalance === 'number'
      ? appointment.liminarContract.creditBalance
      : null;

    // 🏷️ LEGADO: fallback para packages liminar antigos (será removido após migração)
    const pkgBalance = typeof (appointment.package as AppointmentCompleteGuardPackage)?.liminarCreditBalance === 'number'
      ? (appointment.package as AppointmentCompleteGuardPackage).liminarCreditBalance!
      : null;

    const balance = contractBalance ?? pkgBalance;

    if (balance === null) {
      // 🛡️ FIX: Não permitir complete quando não temos saldo do contrato.
      // Isso evita que o usuário clique no botão, tome erro 500 no backend,
      // e gere experiência ruim. Força o frontend a popular liminarContract.
      return {
        valid: false,
        errorCode: GuardErrorCodes.LIMINAR_DATA_INCOMPLETE,
        message: '⚖️ Dados do contrato liminar incompletos. Recarregue o agendamento antes de completar.',
      };
    }

    if (balance < sessionValue) {
      return {
        valid: false,
        errorCode: GuardErrorCodes.LIMINAR_INSUFFICIENT_BALANCE,
        message: `⚖️ Saldo insuficiente. Disponível: R$ ${balance.toFixed(2)} | Sessão: R$ ${sessionValue.toFixed(2)}. Adicione crédito ao contrato para continuar.`,
      };
    }

    return { valid: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2️⃣ CONVÊNIO — sempre pode (faturamento batch, valor zero é OK)
  // ═══════════════════════════════════════════════════════════════
  if (billingType === 'convenio') {
    return { valid: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3️⃣ PARTICULAR COM PACKAGE — valida sessões restantes
  // ═══════════════════════════════════════════════════════════════
  const pkg = appointment.package;
  const hasPackage = !!pkg && (
    typeof pkg === 'string' ||
    (typeof pkg === 'object' && (
      !!pkg._id ||                                    // pacote populado (qualquer formato)
      typeof pkg.sessionsRemaining === 'number' ||
      typeof pkg.totalSessions === 'number' ||
      typeof pkg.sessionsDone === 'number'
    ))
  );

  if (hasPackage) {
    const remaining = getPackageRemaining(pkg);
    if (remaining !== null && remaining <= 0) {
      return {
        valid: false,
        errorCode: GuardErrorCodes.PACKAGE_EXHAUSTED,
        message: '📦 Pacote esgotado. Não há sessões disponíveis para completar.',
      };
    }
    // Package com sessões disponíveis (ou não populado) → permite
    // Valor da sessão não é obrigatório para package prepaid
    return { valid: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // 4️⃣ PARTICULAR AVULSO / PER-SESSION — exige valor definido
  // ═══════════════════════════════════════════════════════════════
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
