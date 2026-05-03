/**
 * 💰 EXTRATO FINANCEIRO DO PACIENTE
 *
 * Fonte de verdade: Payment records (não Package, não PatientBalance)
 *
 * Principios:
 *   - Toda movimentação financeira vive em Payment
 *   - Estado é derivado, nunca armazenado duplicado
 *   - Legível como extrato bancário
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Wallet,
  X,
} from 'lucide-react';
import { getPatientFinancialSummary, getPatientPendingPayments, FinancialSummary, PendingPayment } from '../../services/financialSummaryService';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Props {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

type FilterStatus = 'all' | 'paid' | 'pending';

export default function PatientFinancialStatement({ patientId, patientName, onClose }: Props) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    Promise.all([
      getPatientFinancialSummary(patientId),
      getPatientPendingPayments(patientId),
    ])
      .then(([sum, pending]) => {
        setSummary(sum);
        setPendingPayments(pending);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  const paidCount = summary?.paidCount || 0;
  const pendingCount = summary?.pendingCount || 0;

  // 🎨 Movimentações para o extrato (apenas pending hoje; paid virá de novo endpoint futuro)
  const movements = useMemo(() => {
    const items = pendingPayments.map((p) => ({
      id: p.id,
      date: p.createdAt,
      description: p.description || 'Sessão particular',
      amount: p.amount,
      status: 'pending' as const,
      appointment: p.appointment,
    }));

    if (filter === 'all') return items;
    return items.filter((i) => i.status === filter);
  }, [pendingPayments, filter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Carregando extrato...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Extrato Financeiro</h2>
            <p className="text-sm text-gray-500">{patientName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Resumo Cards */}
        <div className="p-6 grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Recebido</span>
            </div>
            <div className="text-lg font-bold text-emerald-800">
              {formatCurrency(summary?.totalPaid || 0)}
            </div>
            <div className="text-xs text-emerald-600">{paidCount} pagamentos</div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Pendente</span>
            </div>
            <div className="text-lg font-bold text-amber-800">
              {formatCurrency(summary?.totalPending || 0)}
            </div>
            <div className="text-xs text-amber-600">{pendingCount} a receber</div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Sessões</span>
            </div>
            <div className="text-lg font-bold text-blue-800">
              {summary?.completedSessions || 0}
            </div>
            <div className="text-xs text-blue-600">realizadas</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 pb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(['all', 'paid', 'pending'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'paid' ? 'Recebidas' : 'Pendentes'}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border transition-all ${
                    m.status === 'pending'
                      ? 'bg-amber-50/50 border-amber-100'
                      : 'bg-emerald-50/50 border-emerald-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      {m.status === 'pending' ? (
                        <ArrowDownCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{m.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(m.date)}
                          {m.appointment?.time && ` às ${m.appointment.time}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          m.status === 'pending' ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(m.amount)}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          m.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {m.status === 'pending' ? 'Pendente' : 'Recebido'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
