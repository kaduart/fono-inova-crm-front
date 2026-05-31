// src/components/patients/PatientBalanceModal.tsx
// Orquestrador enxuto — delega UI para subcomponentes em balance/

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, ArrowDownCircle, CheckCircle, Plus, Banknote } from 'lucide-react';
import {
  getPatientPendingPayments,
  getPatientPaidPayments,
  getPatientFinancialSummary,
  receivePayment,
  type FinancialSummary,
} from '../../services/financialSummaryService';
import API from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';
import { ModalSpinner } from '../ui/LoadingSpinner';
import { PatientBalanceHeader } from './balance/PatientBalanceHeader';
import { PatientBalancePendingTab } from './balance/PatientBalancePendingTab';
import { PatientBalancePaidTab } from './balance/PatientBalancePaidTab';
import { PatientBalanceAddTab } from './balance/PatientBalanceAddTab';
import { PaymentConfirmModal } from './balance/PaymentConfirmModal';

export interface PaymentItem {
  id: string;
  source: 'payment' | 'package';
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  description: string | null;
  appointment: { id: string; date: string; time: string } | null;
  packageId?: string | null;
  packageName?: string | null;
  specialty?: string | null;
}

const mapToPaymentItem = (p: any): PaymentItem => ({
  id: p.id,
  source: p.source || 'payment',
  amount: p.amount,
  status: p.status,
  createdAt: p.createdAt,
  paidAt: p.paidAt,
  description: p.description,
  appointment: p.appointment
    ? { id: p.appointment.id, date: p.appointment.date, time: p.appointment.time }
    : null,
  packageId: p.packageId || null,
  packageName: p.packageName || null,
  specialty: p.specialty || null,
});

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onRefresh?: () => void;
}

type Tab = 'pending' | 'paid' | 'add' | 'receive';
type ConfirmMode = 'quick' | 'bulk';

export const PatientBalanceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onRefresh,
}) => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PaymentItem[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [confirmMode, setConfirmMode] = useState<ConfirmMode | null>(null);
  const [confirmMethod, setConfirmMethod] = useState('dinheiro');
  const [quickPaymentId, setQuickPaymentId] = useState<string | null>(null);

  const [addAmount, setAddAmount] = useState(0);
  const [addDescription, setAddDescription] = useState('');

  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveMethod, setReceiveMethod] = useState('pix');
  const [receiveResult, setReceiveResult] = useState<{ receiptId: string; jobId: string; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [summaryRes, pendingRes, paidRes] = await Promise.all([
        getPatientFinancialSummary(patientId),
        getPatientPendingPayments(patientId),
        getPatientPaidPayments(patientId),
      ]);
      setSummary(summaryRes);
      setPendingPayments(pendingRes.map(mapToPaymentItem));
      setPaidPayments(paidRes.map(mapToPaymentItem));
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setActiveTab('pending');
      setSelectedPayments(new Set());
      setConfirmMode(null);
      setQuickPaymentId(null);
      setReceiveResult(null);
      setReceiveAmount('');
      setReceiveMethod('pix');
    }
  }, [isOpen, fetchData]);

  const selectablePending = useMemo(
    () => pendingPayments.filter((p) => p.source === 'payment'),
    [pendingPayments]
  );

  const selectedTotal = useMemo(
    () =>
      selectablePending
        .filter((p) => selectedPayments.has(p.id))
        .reduce((sum, p) => sum + p.amount, 0),
    [selectablePending, selectedPayments]
  );

  const confirmItems = useMemo(() => {
    if (confirmMode === 'quick' && quickPaymentId) {
      const p = pendingPayments.find((x) => x.id === quickPaymentId);
      return p ? [{ id: p.id, description: p.description, amount: p.amount }] : [];
    }
    if (confirmMode === 'bulk') {
      return selectablePending
        .filter((p) => selectedPayments.has(p.id))
        .map((p) => ({ id: p.id, description: p.description, amount: p.amount }));
    }
    return [];
  }, [confirmMode, quickPaymentId, pendingPayments, selectablePending, selectedPayments]);

  const confirmTotal = useMemo(
    () => confirmItems.reduce((sum, p) => sum + p.amount, 0),
    [confirmItems]
  );

  const toggleSelection = (id: string) => {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPayments.size === selectablePending.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(selectablePending.map((p) => p.id)));
    }
  };

  const handleQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaymentId) return;
    setIsSubmitting(true);
    try {
      await API.patch(`/v2/payments/${quickPaymentId}/mark-as-paid`, {
        paymentMethod: confirmMethod,
      });
      setConfirmMode(null);
      setQuickPaymentId(null);
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      alert(extractErrorMessage(error, 'Erro ao registrar pagamento'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayments.size === 0) {
      alert('Selecione pelo menos um pagamento');
      return;
    }
    if (selectedTotal <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/v2/payments/bulk-settle', {
        paymentIds: Array.from(selectedPayments),
        paymentMethod: confirmMethod,
        totalAmount: selectedTotal,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Erro ao quitar pagamentos');
      }
      setConfirmMode(null);
      setSelectedPayments(new Set());
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      alert(extractErrorMessage(error, 'Erro ao registrar pagamento em lote'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addAmount <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }
    setIsSubmitting(true);
    try {
      await API.post('/v2/payments', {
        patient: patientId,
        amount: addAmount,
        status: 'pending',
        description: addDescription || 'Débito manual',
      });
      setAddAmount(0);
      setAddDescription('');
      setActiveTab('pending');
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      alert(extractErrorMessage(error, 'Erro ao criar pagamento pendente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(receiveAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await receivePayment({
        patientId,
        amount,
        method: receiveMethod,
        mode: 'auto',
      });
      setReceiveResult({
        receiptId: res.receiptId,
        jobId: res.jobId,
        message: res.message,
      });
      setReceiveAmount('');
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      alert(extractErrorMessage(error, 'Erro ao registrar recebimento'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQuickPayment = (id: string) => {
    setQuickPaymentId(id);
    setConfirmMethod('dinheiro');
    setConfirmMode('quick');
  };

  const openBulkPayment = () => {
    setConfirmMethod('dinheiro');
    setConfirmMode('bulk');
  };

  const closeConfirm = () => {
    setConfirmMode(null);
    setQuickPaymentId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
        {/* Header */}
        <PatientBalanceHeader summary={summary} patientName={patientName} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors text-white z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            icon={<ArrowDownCircle className="w-4 h-4" />}
            label="Pendentes"
            activeClass="text-red-600 border-red-500 bg-red-50 dark:bg-red-900/20"
            badge={pendingPayments.length > 0 ? pendingPayments.length : undefined}
          />
          <TabButton
            active={activeTab === 'paid'}
            onClick={() => setActiveTab('paid')}
            icon={<CheckCircle className="w-4 h-4" />}
            label="Quitados"
            activeClass="text-green-600 border-green-500 bg-green-50 dark:bg-green-900/20"
          />
          <TabButton
            active={activeTab === 'add'}
            onClick={() => setActiveTab('add')}
            icon={<Plus className="w-4 h-4" />}
            label="Registrar"
            activeClass="text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-900/20"
          />
          <TabButton
            active={activeTab === 'receive'}
            onClick={() => setActiveTab('receive')}
            icon={<Banknote className="w-4 h-4" />}
            label="Receber"
            activeClass="text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
          />
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <ModalSpinner />
          ) : activeTab === 'pending' ? (
            <PatientBalancePendingTab
              payments={pendingPayments}
              selectablePending={selectablePending}
              selectedPayments={selectedPayments}
              selectedTotal={selectedTotal}
              isSubmitting={isSubmitting}
              onToggleSelection={toggleSelection}
              onSelectAll={selectAll}
              onOpenQuickPayment={openQuickPayment}
              onOpenBulkPayment={openBulkPayment}
            />
          ) : activeTab === 'paid' ? (
            <PatientBalancePaidTab payments={paidPayments} />
          ) : activeTab === 'add' ? (
            <PatientBalanceAddTab
              amount={addAmount}
              description={addDescription}
              isSubmitting={isSubmitting}
              onAmountChange={setAddAmount}
              onDescriptionChange={setAddDescription}
              onSubmit={handleCreatePending}
            />
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Registrar Recebimento
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                O valor será alocado automaticamente contra os débitos pendentes (FIFO).
              </p>
              <form onSubmit={handleReceivePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor Recebido (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-white"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Método
                  </label>
                  <select
                    value={receiveMethod}
                    onChange={(e) => setReceiveMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-white"
                    disabled={isSubmitting}
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão Crédito</option>
                    <option value="cartao_debito">Cartão Débito</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar Recebimento'}
                </button>
              </form>
              {receiveResult && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    ✅ Recebimento registrado!
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    {receiveResult.message}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    Receipt: {receiveResult.receiptId}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    O worker está processando a alocação automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm modal (quick / bulk) */}
        <PaymentConfirmModal
          title={confirmMode === 'quick' ? 'Registrar Pagamento' : 'Pagamento em Lote'}
          accentColor={confirmMode === 'quick' ? 'blue' : 'amber'}
          isOpen={confirmMode !== null}
          items={confirmItems}
          totalAmount={confirmTotal}
          paymentMethod={confirmMethod}
          isSubmitting={isSubmitting}
          onMethodChange={setConfirmMethod}
          onConfirm={confirmMode === 'quick' ? handleQuickPayment : handleBulkPayment}
          onCancel={closeConfirm}
        />
      </div>
    </div>
  );
};

/* ---------- helpers ---------- */

function TabButton({
  active,
  onClick,
  icon,
  label,
  activeClass,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
        active
          ? `border-b-2 ${activeClass}`
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{badge}</span>
      )}
    </button>
  );
}

export default PatientBalanceModal;
