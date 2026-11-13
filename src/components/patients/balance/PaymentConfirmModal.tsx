import { DollarSign, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { ChoiceChips, ModalHeader, ModalFooter, MoneyInput, Switch, inputClass } from '../../../pages/Financial/components/formKit';

export interface SplitMethod {
  method: string;
  amount: number;
}

interface PaymentItemLite {
  id: string;
  description: string | null;
  amount: number;
}

interface Props {
  title: string;
  accentColor: 'blue' | 'amber';
  isOpen: boolean;
  items: PaymentItemLite[];
  totalAmount: number;
  paymentMethod: string;
  splitMethods?: SplitMethod[];
  isSubmitting: boolean;
  onMethodChange: (m: string) => void;
  onSplitMethodsChange?: (methods: SplitMethod[]) => void;
  onConfirm: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia_bancaria'] as const;

const translatePaymentMethod = (method: string): string => {
  const map: Record<string, string> = {
    dinheiro: '💵 Dinheiro',
    pix: '⚡ PIX',
    cartao_credito: '💳 Cartão Crédito',
    cartao_debito: '💳 Cartão Débito',
    transferencia_bancaria: '🏦 Transferência',
  };
  return map[method] || method;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const PaymentConfirmModal: React.FC<Props> = ({
  title,
  accentColor,
  isOpen,
  items,
  totalAmount,
  paymentMethod,
  splitMethods,
  isSubmitting,
  onMethodChange,
  onSplitMethodsChange,
  onConfirm,
  onCancel,
}) => {
  const [showItems, setShowItems] = useState(false);
  const [useSplit, setUseSplit] = useState(false);

  const effectiveSplit = useSplit && splitMethods && splitMethods.length > 0 ? splitMethods : [{ method: paymentMethod, amount: totalAmount }];
  const splitTotal = effectiveSplit.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const splitDiff = totalAmount - splitTotal;
  const splitValid = Math.abs(splitDiff) < 0.01 && effectiveSplit.length > 0 && effectiveSplit.every(s => s.method && s.amount > 0);

  const accent = {
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      btnFrom: 'from-blue-600',
      btnTo: 'to-indigo-600',
      btnHoverFrom: 'hover:from-blue-700',
      btnHoverTo: 'hover:to-indigo-700',
      methodBorder: 'border-blue-500',
      methodBg: 'bg-blue-50',
      methodText: 'text-blue-700',
      methodHover: 'hover:border-blue-300',
    },
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      btnFrom: 'from-amber-600',
      btnTo: 'to-orange-600',
      btnHoverFrom: 'hover:from-amber-700',
      btnHoverTo: 'hover:to-orange-700',
      methodBorder: 'border-amber-500',
      methodBg: 'bg-amber-50',
      methodText: 'text-amber-700',
      methodHover: 'hover:border-amber-300',
    },
  }[accentColor];

  const isSingle = items.length === 1;

  const handleSplitToggle = (enabled: boolean) => {
    setUseSplit(enabled);
    if (enabled && onSplitMethodsChange) {
      onSplitMethodsChange([{ method: paymentMethod, amount: totalAmount }]);
    } else if (!enabled && onSplitMethodsChange) {
      onSplitMethodsChange([]);
    }
  };

  const updateSplitAmount = (index: number, decimal: string) => {
    if (!onSplitMethodsChange) return;
    const next = [...effectiveSplit];
    next[index] = { ...next[index], amount: parseFloat(decimal) || 0 };
    onSplitMethodsChange(next);
  };

  const updateSplitMethod = (index: number, method: string) => {
    if (!onSplitMethodsChange) return;
    const next = [...effectiveSplit];
    next[index] = { ...next[index], method };
    onSplitMethodsChange(next);
  };

  const addSplitMethod = () => {
    if (!onSplitMethodsChange) return;
    const remaining = Math.max(0, totalAmount - splitTotal);
    onSplitMethodsChange([...effectiveSplit, { method: '', amount: remaining }]);
  };

  const removeSplitMethod = (index: number) => {
    if (!onSplitMethodsChange) return;
    const next = effectiveSplit.filter((_, i) => i !== index);
    onSplitMethodsChange(next.length === 0 ? [{ method: paymentMethod, amount: totalAmount }] : next);
  };

  const methodOptions = METHODS.map((m) => ({ value: m, label: translatePaymentMethod(m) }));
  const headerColor = accentColor === 'amber' ? '#D97706' : '#2563EB';

  return (
    <Modal
      open={isOpen}
      onClose={() => !isSubmitting && onCancel()}
      labelledBy="payment-confirm-title"
      zIndexClass="z-[1300]"
      panelClassName="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
    >
      <ModalHeader
        icon={<DollarSign className="w-6 h-6" />}
        color={headerColor}
        title={title}
        subtitle={isSingle ? 'Débito a ser pago' : `${items.length} itens selecionados`}
        onClose={onCancel}
        titleId="payment-confirm-title"
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <div className={`rounded-2xl border ${accent.border} ${accent.bg} p-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-sm font-medium ${accent.text}`}>{isSingle ? 'Total a pagar' : 'Total dos itens'}</span>
            <span className="text-3xl font-bold tabular-nums text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>
          {!isSingle && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowItems(!showItems)}
                aria-expanded={showItems}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {showItems ? 'Ocultar itens' : 'Ver itens'}
                {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showItems && (
                <div className="max-h-32 space-y-1 overflow-y-auto pr-1 text-sm">
                  {items.map((p) => (
                    <div key={p.id} className="flex justify-between gap-2 border-b border-black/5 pb-1 last:border-0">
                      <span className="truncate text-gray-700">{p.description || 'Débito'}</span>
                      <span className="shrink-0 font-medium tabular-nums text-gray-800">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Switch
          checked={useSplit}
          onChange={handleSplitToggle}
          label="Dividir em múltiplas formas"
          description="Ex.: parte em dinheiro e parte no Pix"
        />

        {!useSplit && (
          <div>
            <span className="mb-2 block text-xs font-semibold text-gray-600">Forma de pagamento</span>
            <ChoiceChips label="Forma de pagamento" value={paymentMethod} onChange={onMethodChange} options={methodOptions} />
          </div>
        )}

        {useSplit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-600">Formas de pagamento</span>
              <span className={`text-xs font-semibold tabular-nums ${splitValid ? 'text-emerald-600' : 'text-red-600'}`} aria-live="polite">
                {formatCurrency(splitTotal)} / {formatCurrency(totalAmount)}
                {splitDiff !== 0 && (
                  <span className="ml-1">({splitDiff > 0 ? `faltam ${formatCurrency(splitDiff)}` : `sobram ${formatCurrency(Math.abs(splitDiff))}`})</span>
                )}
              </span>
            </div>
            {effectiveSplit.map((split, index) => (
              <div key={index} className="grid grid-cols-[1fr_8.5rem_auto] items-center gap-2">
                <select
                  value={split.method}
                  onChange={(e) => updateSplitMethod(index, e.target.value)}
                  aria-label={`Forma da linha ${index + 1}`}
                  className={`${inputClass('emerald')} ${split.method ? '' : 'border-red-300 text-red-600'}`}
                >
                  <option value="" disabled>Selecione...</option>
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{translatePaymentMethod(m)}</option>
                  ))}
                </select>
                <MoneyInput
                  value={split.amount > 0 ? split.amount.toFixed(2) : ''}
                  onChange={(v) => updateSplitAmount(index, v)}
                  accent="emerald"
                />
                {effectiveSplit.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeSplitMethod(index)}
                    aria-label="Remover forma"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors duration-quick hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : <span className="w-11" />}
              </div>
            ))}
            <button
              type="button"
              onClick={addSplitMethod}
              disabled={splitTotal >= totalAmount}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition-colors duration-quick hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Adicionar forma
            </button>
          </div>
        )}

        <p className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs text-gray-600">
          Ao confirmar, o pagamento é registrado e o débito fica quitado.
        </p>
      </div>

      <ModalFooter
        accent="emerald"
        onCancel={onCancel}
        onSubmit={() => onConfirm({ preventDefault() {} } as React.FormEvent)}
        submitting={isSubmitting}
        submitDisabled={useSplit && !splitValid}
        submitLabel="Confirmar pagamento"
        submittingLabel="Processando..."
        summary={`${formatCurrency(totalAmount)} · ${useSplit ? `${effectiveSplit.length} formas` : translatePaymentMethod(paymentMethod).replace(/^\S+\s/, '')}`}
      />
    </Modal>
  );
};

export default PaymentConfirmModal;
