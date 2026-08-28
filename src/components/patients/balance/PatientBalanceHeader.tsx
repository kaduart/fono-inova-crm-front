import { AlertTriangle, CheckCircle, ClipboardList, TrendingUp, Wallet } from 'lucide-react';
import type { FinancialSummary } from '../../../services/financialSummaryService';

interface Props {
  summary: FinancialSummary | null;
  patientName: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * PatientBalanceHeader
 *
 * Usa totalPending (soma dos payments pending legados) pois a migração V2
 * ainda está incompleta. sessionDebt será usado quando todos os appointments
 * gerarem session_charge V2 automaticamente.
 */
export const PatientBalanceHeader: React.FC<Props> = ({ summary, patientName }) => {
  const sessionDebt = summary?.totalPending || 0;
  const pendingCount = summary?.pendingCount || 0;
  const totalPaid = summary?.totalPaid || 0;
  const paidCount = summary?.paidCount || 0;
  const completedSessions = summary?.completedSessions || 0;
  const volume = sessionDebt + totalPaid;

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
            {pendingCount > 0 && (
              <p className="text-2xs text-red-200 mt-1">
                {pendingCount} sessão{pendingCount !== 1 ? 'ões' : ''} em aberto
              </p>
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
