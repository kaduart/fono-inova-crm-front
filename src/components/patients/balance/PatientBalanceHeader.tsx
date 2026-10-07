import { AlertTriangle, Banknote, CheckCircle, ClipboardList, TrendingUp, Wallet } from 'lucide-react';
import type { FinancialSummary } from '../../../services/financialSummaryService';

interface Props {
  summary: FinancialSummary | null;
  patientName: string;
  /** Abre a aba Receber já com o saldo devedor total pré-preenchido (Assunto 3: navegabilidade de baixa de débitos). */
  onOpenReceive?: (amount: number) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * PatientBalanceHeader
 *
 * Exibe o saldo líquido calculado no backend; os valores das sessões
 * continuam brutos para preservar a composição do débito.
 */
export const PatientBalanceHeader: React.FC<Props> = ({ summary, patientName, onOpenReceive }) => {
  const grossDebt = summary?.totalPending || 0;
  const sessionDebt = summary?.totalPendingNet ?? grossDebt;
  const appliedCredit = summary?.appliedCredit || 0;
  const pendingCount = summary?.pendingCount || 0;
  const totalPaid = summary?.totalPaid || 0;
  const paidCount = summary?.paidCount || 0;
  const completedSessions = summary?.completedSessions || 0;
  const volume = grossDebt + totalPaid;

  return (
    <div className="bg-white p-5 text-gray-900 flex-shrink-0 border-b border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-500" />
            Sessões em aberto
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">{patientName}</p>
        </div>
      </div>

      {/* Cards principais */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Saldo Devedor */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-600 to-red-700 p-4 shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1 text-red-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-3xs font-bold uppercase tracking-wider">Saldo Devedor</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(sessionDebt)}</p>
            {appliedCredit > 0 && (
              <div className="mt-2 space-y-0.5 text-xs text-red-100 text-left">
                <p>Sessões em aberto: {formatCurrency(grossDebt)}</p>
                <p>Crédito abatido: − {formatCurrency(appliedCredit)}</p>
                <p className="font-medium">Restante a receber: {formatCurrency(sessionDebt)}</p>
              </div>
            )}
            {pendingCount > 0 && (
              <p className="text-2xs text-red-200 mt-1">
                {pendingCount} sessão{pendingCount !== 1 ? 'ões' : ''} em aberto
              </p>
            )}
            {sessionDebt > 0 && onOpenReceive && (
              <button
                onClick={() => onOpenReceive(sessionDebt)}
                className="relative z-20 mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-2 py-1.5 text-2xs font-semibold text-white transition-colors"
                title="Ir para a aba Receber com o saldo devedor já preenchido"
              >
                <Banknote className="w-3.5 h-3.5" />
                Registrar recebimento
              </button>
            )}
          </div>
          <AlertTriangle className="absolute -bottom-3 -right-3 w-20 h-20 text-white/10" />
        </div>

        {/* Total Pago */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 p-4 shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1 text-emerald-100">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-3xs font-bold uppercase tracking-wider">Total Pago</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(totalPaid)}</p>
            {paidCount > 0 && (
              <p className="text-2xs text-emerald-200 mt-1">
                {paidCount} pagamento{paidCount !== 1 ? 's' : ''} quitado{paidCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <CheckCircle className="absolute -bottom-3 -right-3 w-20 h-20 text-white/10" />
        </div>
      </div>

      {/* Sessões realizadas + Volume */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-500 flex-shrink-0" />
          <div>
            <p className="text-3xs text-gray-500 uppercase tracking-wider">Sessões Realizadas</p>
            <p className="text-sm font-bold text-gray-900">{completedSessions}</p>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-3xs text-gray-500 uppercase tracking-wider">Volume Total</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(volume)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
