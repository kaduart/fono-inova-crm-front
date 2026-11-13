// src/components/patients/PatientBalanceModal.tsx
// Orquestrador enxuto — delega UI para subcomponentes em balance/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownCircle, CheckCircle, Plus, Banknote } from 'lucide-react';
import {
  getPatientPendingSnapshot,
  getPatientPaidPayments,
  getPatientFinancialSummary,
  receivePayment,
  type FinancialSummary,
} from '../../services/financialSummaryService';
import { toast } from '../../utils/toast';
import API from '../../services/api';

import { ModalSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { motion } from 'framer-motion';
import { ChoiceChips, Field, MoneyInput } from '../../pages/Financial/components/formKit';
import { PatientBalanceHeader } from './balance/PatientBalanceHeader';
import { PatientBalancePendingTab } from './balance/PatientBalancePendingTab';
import { PatientBalancePaidTab } from './balance/PatientBalancePaidTab';
import { PatientBalanceAddTab } from './balance/PatientBalanceAddTab';
import { PaymentConfirmModal } from './balance/PaymentConfirmModal';
import { notifyApiError } from '../../utils/notifyApiError';
import { invalidateCache } from '../../utils/cacheManager';

export interface PaymentItem {
  id: string;
  source: 'payment' | 'package' | 'balance' | 'session';
  canSettle?: boolean;
  countInDebt?: boolean;
  requiresReview?: boolean;
  reviewReason?: string | null;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  description: string | null;
  appointment: { id: string; date: string; time: string } | null;
  packageId?: string | null;
  packageName?: string | null;
  specialty?: string | null;
  paymentMethod?: string | null;
  splitMethods?: { method: string; amount: number; date?: string }[] | null;
  doctorName?: string | null;
  serviceDate?: string | null;
  settlement?: {
    id: string;
    paidAt: string | null;
    paymentMethod: string | null;
    splitMethods: { method: string; amount: number; date?: string }[] | null;
    totalAmount: number;
    sessionCount: number;
    notes: string | null;
  } | null;
}

const mapToPaymentItem = (p: any): PaymentItem => ({
  id: p.id,
  source: p.source || 'payment',
  canSettle: p.canSettle,
  countInDebt: p.countInDebt,
  requiresReview: p.requiresReview,
  reviewReason: p.reviewReason,
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
  paymentMethod: p.paymentMethod || null,
  splitMethods: p.splitMethods || null,
  doctorName: p.doctorName || null,
  serviceDate: p.serviceDate || null,
  settlement: p.settlement || null,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState(false);
  const paidCache = useRef({ loaded: false, loading: false, version: 0 });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [confirmMode, setConfirmMode] = useState<ConfirmMode | null>(null);
  const [confirmMethod, setConfirmMethod] = useState('dinheiro');
  const [splitMethods, setSplitMethods] = useState<{ method: string; amount: number }[]>([]);
  const [quickPaymentId, setQuickPaymentId] = useState<string | null>(null);

  const [addAmount, setAddAmount] = useState(0);
  const [addDescription, setAddDescription] = useState('');

  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveMethod, setReceiveMethod] = useState('pix');
  const [receiveResult, setReceiveResult] = useState<{ receiptId: string; jobId: string; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    paidCache.current = { loaded: false, loading: false, version: paidCache.current.version + 1 };
    setPaidPayments([]);
    setPaidLoading(false);
    setPaidError(false);
    setLoading(true);
    try {
      const [summaryRes, pendingRes] = await Promise.all([
        getPatientFinancialSummary(patientId),
        getPatientPendingSnapshot(patientId),
      ]);
      setSummary({ ...summaryRes,
        totalPending: pendingRes.meta.totalPending,
        pendingCount: pendingRes.meta.collectibleCount ?? pendingRes.meta.count,
        totalPendingNet: pendingRes.meta.totalPendingNet ?? pendingRes.meta.totalPending,
        availableCredit: pendingRes.meta.availableCredit ?? 0,
        appliedCredit: pendingRes.meta.appliedCredit ?? 0,
      });
      setPendingPayments(pendingRes.data.map(mapToPaymentItem));
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const loadPaidPayments = async () => {
    if (paidCache.current.loaded || paidCache.current.loading) return;
    const version = paidCache.current.version;
    paidCache.current.loading = true;
    setPaidLoading(true);
    setPaidError(false);
    try {
      const payments = await getPatientPaidPayments(patientId);
      if (paidCache.current.version !== version) return;
      setPaidPayments(payments.map(mapToPaymentItem));
      paidCache.current.loaded = true;
    } catch (error) {
      if (paidCache.current.version === version) {
        setPaidError(true);
        console.error('Erro ao carregar pagamentos quitados:', error);
      }
    } finally {
      if (paidCache.current.version === version) {
        paidCache.current.loading = false;
        setPaidLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setActiveTab('pending');
      setSelectedPayments(new Set());
      setConfirmMode(null);
      setQuickPaymentId(null);
      setReceiveResult(null);
      setReceiveAmount(0);
      setReceiveMethod('pix');
    }
    return () => { paidCache.current.version += 1; };
  }, [isOpen, fetchData]);

  const selectablePending = useMemo(
    () => pendingPayments.filter((p) => p.source === 'payment' && p.canSettle !== false && !p.requiresReview && p.countInDebt !== false),
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
    if (!selectablePending.some(p => p.id === id)) return;
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
    if (!quickPaymentId || !selectablePending.some(p => p.id === quickPaymentId)) return;
    setIsSubmitting(true);
    try {
      await API.patch(`/v2/payments/${quickPaymentId}`, {
        status: 'paid',
        paymentMethod: confirmMethod,
      });
      setConfirmMode(null);
      setQuickPaymentId(null);
      await fetchData();
      invalidateCache('payments');
      onRefresh?.();
      toast.success('Pagamento registrado com sucesso');
    } catch (error: unknown) {
      notifyApiError(error, 'Erro ao registrar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayments.size === 0) {
      toast.error('Selecione pelo menos um pagamento');
      return;
    }
    if (selectedTotal <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    const useSplit = splitMethods && splitMethods.length > 0;
    if (useSplit) {
      const splitTotal = splitMethods.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      if (Math.abs(splitTotal - selectedTotal) > 0.01) {
        toast.error(`Total do split (${formatCurrency(splitTotal)}) não corresponde ao valor dos débitos (${formatCurrency(selectedTotal)})`);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const payload: any = {
        paymentIds: Array.from(selectedPayments),
        paymentMethod: confirmMethod,
        totalAmount: selectedTotal,
      };
      if (useSplit) {
        payload.splitMethods = splitMethods.map(s => ({ method: s.method, amount: Number(s.amount) }));
      }
      const res = await API.post('/v2/payments/bulk-settle', payload, { timeout: 60000 });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Erro ao quitar pagamentos');
      }
      const settledCount = res.data?.data?.settledCount || selectedPayments.size;
      setConfirmMode(null);
      setSelectedPayments(new Set());
      setSplitMethods([]);
      await fetchData();
      invalidateCache('payments');
      onRefresh?.();
      toast.success(`${settledCount} pagamento(s) quitado(s) com sucesso`);
    } catch (error: unknown) {
      notifyApiError(error, 'Erro ao registrar pagamento em lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addAmount <= 0) {
      toast.error('Valor deve ser maior que zero');
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
      invalidateCache('payments');
      onRefresh?.();
      toast.success('Débito pendente registrado com sucesso');
    } catch (error: unknown) {
      notifyApiError(error, 'Erro ao criar pagamento pendente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveAmount || receiveAmount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await receivePayment({
        patientId,
        amount: receiveAmount,
        method: receiveMethod,
        mode: 'auto',
      });
      setReceiveResult({
        receiptId: res.receiptId,
        jobId: res.jobId,
        message: res.message,
      });
      setReceiveAmount(0);
      await fetchData();
      invalidateCache('payments');
      onRefresh?.();
      toast.success('Recebimento registrado com sucesso');
    } catch (error: unknown) {
      notifyApiError(error, 'Erro ao registrar recebimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Abre a aba Receber com o valor sugerido já preenchido (Assunto 3:
   * navegabilidade de baixa de débitos). Usado tanto pelo CTA do card "Saldo
   * Devedor" (header) quanto pelo botão "Receber valor diferente" da aba
   * Pendentes, para o caso comum em que o valor de fato pago pela paciente
   * não bate 1:1 com a soma de sessões escolhidas manualmente.
   */
  const goToReceiveTab = (suggestedAmount: number) => {
    setActiveTab('receive');
    setReceiveResult(null);
    if (suggestedAmount > 0) {
      setReceiveAmount(suggestedAmount);
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
    setSplitMethods([]);
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={() => { if (!confirmMode) onClose(); }}
        labelledBy="patient-balance-title"
        zIndexClass="z-[1200]"
        panelClassName="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
      >
        <PatientBalanceHeader summary={summary} patientName={patientName} onClose={onClose} onOpenReceive={goToReceiveTab} titleId="patient-balance-title" />

        {/* Tabs */}
        <div role="tablist" aria-label="Seções do saldo" className="flex border-b border-gray-100 flex-shrink-0 px-2 sm:px-4">
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            icon={<ArrowDownCircle className="w-4 h-4" />}
            label="Pendentes"
            activeClass="text-red-600"
            badge={pendingPayments.length > 0 ? pendingPayments.length : undefined}
          />
          <TabButton
            active={activeTab === 'paid'}
            onClick={() => { setActiveTab('paid'); void loadPaidPayments(); }}
            icon={<CheckCircle className="w-4 h-4" />}
            label="Quitados"
            activeClass="text-emerald-600"
          />
          <TabButton
            active={false}
            onClick={() => {}}
            icon={<Plus className="w-4 h-4" />}
            label="Registrar"
            activeClass="text-amber-600"
            disabled
            title="Registro manual de débito temporariamente indisponível"
          />
          <TabButton
            active={activeTab === 'receive'}
            onClick={() => setActiveTab('receive')}
            icon={<Banknote className="w-4 h-4" />}
            label="Receber"
            activeClass="text-emerald-600"
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
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
              onOpenReceive={goToReceiveTab}
            />
          ) : activeTab === 'paid' ? (
            paidLoading ? <ModalSpinner /> : paidError ? (
              <div className="py-6 text-center text-sm text-gray-600" role="alert">
                <p>Não foi possível carregar os pagamentos quitados.</p>
                <button type="button" onClick={() => void loadPaidPayments()}
                  className="mt-2 font-medium text-emerald-700 underline">Tentar novamente</button>
              </div>
            ) : <PatientBalancePaidTab payments={paidPayments} />
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
              <h3 className="text-lg font-semibold text-gray-900">
                Registrar Recebimento
              </h3>
              <p className="text-sm text-gray-500">
                O valor será alocado automaticamente contra os débitos pendentes, da sessão mais antiga
                para a mais nova (FIFO). Sobrou valor além das dívidas? Vira crédito na conta corrente
                da paciente, disponível para abater sessões futuras.
              </p>
              {(summary?.totalPending || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Saldo devedor atual</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(summary?.totalPendingNet ?? summary?.totalPending ?? 0)}</p>
                    {(summary?.appliedCredit || 0) > 0 && (
                      <p className="text-xs text-red-700">{formatCurrency(summary?.totalPending || 0)} em sessões − {formatCurrency(summary?.appliedCredit || 0)} de crédito</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiveAmount(summary?.totalPendingNet ?? summary?.totalPending ?? 0)}
                    className="text-xs font-semibold text-red-700 hover:text-red-800 bg-white hover:bg-red-100 border border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Usar este valor
                  </button>
                </div>
              )}
              <form onSubmit={handleReceivePayment} className="space-y-4">
                <Field label="Valor recebido" required>
                  <MoneyInput
                    large
                    accent="emerald"
                    value={receiveAmount > 0 ? Number(receiveAmount).toFixed(2) : ''}
                    onChange={(v) => setReceiveAmount(parseFloat(v) || 0)}
                  />
                </Field>
                <div>
                  <span className="mb-2 block text-xs font-semibold text-gray-600">Forma de pagamento</span>
                  <ChoiceChips
                    fill
                    label="Forma de pagamento"
                    value={receiveMethod}
                    onChange={setReceiveMethod}
                    options={[
                      { value: 'pix', label: 'Pix' },
                      { value: 'dinheiro', label: 'Dinheiro' },
                      { value: 'cartao_credito', label: 'Crédito' },
                      { value: 'cartao_debito', label: 'Débito' },
                      { value: 'transferencia', label: 'Transf.' },
                    ]}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || receiveAmount <= 0}
                  className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition-colors duration-quick hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar Recebimento'}
                </button>
              </form>
              {receiveResult && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-emerald-800">
                    ✅ Recebimento registrado!
                  </p>
                  <p className="text-xs text-emerald-700">
                    {receiveResult.message}
                  </p>
                  {receiveResult.receiptId && (
                    <p className="text-xs text-emerald-600 font-mono">
                      Recibo: {receiveResult.receiptId}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Ver sessões pendentes atualizadas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </Modal>

      {/* Confirm modal (quick / bulk): fora do painel (um ancestral com transform quebraria o fixed) */}
        <PaymentConfirmModal
          title={confirmMode === 'quick' ? 'Registrar Pagamento' : 'Pagamento em Lote'}
          accentColor={confirmMode === 'quick' ? 'blue' : 'amber'}
          isOpen={confirmMode !== null}
          items={confirmItems}
          totalAmount={confirmTotal}
          paymentMethod={confirmMethod}
          splitMethods={splitMethods}
          isSubmitting={isSubmitting}
          onMethodChange={setConfirmMethod}
          onSplitMethodsChange={setSplitMethods}
          onConfirm={confirmMode === 'quick' ? handleQuickPayment : handleBulkPayment}
          onCancel={closeConfirm}
        />
    </>
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
  disabled = false,
  title,
}: {
  disabled?: boolean;
  title?: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-disabled={disabled || undefined}
      className={`relative flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors duration-quick focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
        disabled
          ? 'cursor-not-allowed text-gray-300'
          : active
          ? `${activeClass} font-semibold`
          : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-0.5 min-w-5 rounded-full bg-red-500 px-1.5 text-center text-xs font-semibold leading-5 text-white">{badge}</span>
      )}
      {active && !disabled && (
        <motion.span layoutId="balance-tab-underline" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-current" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />
      )}
    </button>
  );
}

export default PatientBalanceModal;
