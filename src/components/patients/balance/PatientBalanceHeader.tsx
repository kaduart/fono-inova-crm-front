import { AlertTriangle, Banknote, CheckCircle2, ClipboardList, TrendingUp, Wallet, X } from 'lucide-react';
import { IconButton } from '@mui/material';
import type { FinancialSummary } from '../../../services/financialSummaryService';
import { sessoes } from '../../../utils/plural';
import AnimatedValue from '../../ui/insight/AnimatedValue';

interface Props {
  summary: FinancialSummary | null;
  patientName: string;
  onClose?: () => void;
  /** Abre a aba Receber já com o saldo devedor total pré-preenchido (Assunto 3: navegabilidade de baixa de débitos). */
  onOpenReceive?: (amount: number) => void;
  titleId?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * PatientBalanceHeader
 *
 * Exibe o saldo líquido calculado no backend; os valores das sessões
 * continuam brutos para preservar a composição do débito.
 */
export const PatientBalanceHeader: React.FC<Props> = ({ summary, patientName, onClose, onOpenReceive, titleId }) => {
  const grossDebt = summary?.totalPending || 0;
  const sessionDebt = summary?.totalPendingNet ?? grossDebt;
  const appliedCredit = summary?.appliedCredit || 0;
  const pendingCount = summary?.pendingCount || 0;
  const totalPaid = summary?.totalPaid || 0;
  const paidCount = summary?.paidCount || 0;
  const completedSessions = summary?.completedSessions || 0;
  const volume = grossDebt + totalPaid;

  return (
    <div className="flex-shrink-0 border-b border-gray-100 px-5 pb-5 pt-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-tight text-gray-900">Sessões em aberto</h2>
            <p className="truncate text-sm text-gray-500">{patientName}</p>
          </div>
        </div>
        {onClose && (
          <IconButton onClick={onClose} aria-label="Fechar" className="shrink-0" sx={{ width: 44, height: 44 }}>
            <X size={18} />
          </IconButton>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Saldo devedor */}
        <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Saldo devedor
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-red-700">
            <AnimatedValue value={formatCurrency(sessionDebt)} />
          </p>
          {appliedCredit > 0 && (
            <div className="mt-2 space-y-0.5 text-xs text-red-700/90">
              <p>Sessões em aberto: {formatCurrency(grossDebt)}</p>
              <p>Crédito abatido: − {formatCurrency(appliedCredit)}</p>
            </div>
          )}
          {pendingCount > 0 && (
            <p className="mt-1 text-xs text-red-700/80">{pendingCount} {sessoes(pendingCount)} em aberto</p>
          )}
          {sessionDebt > 0 && onOpenReceive && (
            <button
              type="button"
              onClick={() => onOpenReceive(sessionDebt)}
              title="Ir para a aba Receber com o saldo devedor já preenchido"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white transition-colors duration-quick hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <Banknote className="h-4 w-4" /> Registrar recebimento
            </button>
          )}
        </div>

        {/* Total pago */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Total pago
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">
            <AnimatedValue value={formatCurrency(totalPaid)} />
          </p>
          {paidCount > 0 && (
            <p className="mt-1 text-xs text-emerald-700/80">
              {paidCount} pagamento{paidCount !== 1 ? 's' : ''} quitado{paidCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3.5 py-2.5">
          <ClipboardList className="h-4 w-4 shrink-0 text-sky-500" />
          <div>
            <dt className="text-xs text-gray-500">Sessões realizadas</dt>
            <dd className="font-bold tabular-nums text-gray-900">{completedSessions}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3.5 py-2.5">
          <TrendingUp className="h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <dt className="text-xs text-gray-500">Volume total</dt>
            <dd className="font-bold tabular-nums text-gray-900">{formatCurrency(volume)}</dd>
          </div>
        </div>
      </dl>
    </div>
  );
};
