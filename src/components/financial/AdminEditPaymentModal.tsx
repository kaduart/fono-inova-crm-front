import { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { ChoiceChips, Field, ModalHeader, ModalFooter, MoneyInput, Switch, inputClass } from '../../pages/Financial/components/formKit';

interface AdminEditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: {
    id: string;
    paciente: string;
    valor: number;
    metodo: string;
    data: string; // DD/MM/YYYY
  } | null;
  onSuccess: () => void;
}

const METHOD_OPTIONS = [
  { value: 'pix',           label: 'Pix' },
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'credit_card',   label: 'Cartão Crédito' },
  { value: 'debit_card',    label: 'Cartão Débito' },
  { value: 'bank_transfer', label: 'Transferência' },
  { value: 'other',         label: 'Outro' },
];

const displayToApi = (display: string): string => {
  const map: Record<string, string> = {
    'Pix': 'pix',
    'Dinheiro': 'dinheiro',
    'Cartão': 'credit_card',
    'Cartão Crédito': 'credit_card',
    'Cartão Débito': 'debit_card',
    'Transferência Bancária': 'bank_transfer',
    'Transf.': 'bank_transfer',
    'Outro': 'other',
    'outro': 'other',
    'cartão': 'credit_card',
  };
  return map[display] ?? display.toLowerCase();
};

const toInputDate = (d: string): string => {
  const [day, month, year] = d.split('/');
  if (!day || !month || !year) return new Date().toISOString().split('T')[0];
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const toStr = (n: number) => (n > 0 ? n.toFixed(2) : '');
const toNum = (v: string) => parseFloat(v) || 0;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface SplitRow { method: string; amount: number }

export const AdminEditPaymentModal = ({
  open,
  onClose,
  payment,
  onSuccess,
}: AdminEditPaymentModalProps) => {
  const [loading, setLoading]             = useState(false);
  const [amount, setAmount]               = useState(0);
  const [method, setMethod]               = useState('pix');
  const [financialDate, setFinancialDate] = useState('');
  const [notes, setNotes]                 = useState('');
  const [isSplit, setIsSplit]             = useState(false);
  const [splitRows, setSplitRows]         = useState<SplitRow[]>([
    { method: 'pix', amount: 0 },
    { method: '', amount: 0 },
  ]);

  useEffect(() => {
    if (payment) {
      setAmount(payment.valor);
      setMethod(displayToApi(payment.metodo));
      setFinancialDate(toInputDate(payment.data));
      setNotes('');
      setIsSplit(false);
      // 2ª linha começa vazia de propósito — método pré-selecionado (ex: 'dinheiro')
      // fazia salvar errado quando o usuário só editava o valor e esquecia de trocar
      // o método (bug confirmado 2026-07-03: split gravado como dinheiro+dinheiro
      // quando deveria ser dinheiro+pix).
      setSplitRows([
        { method: displayToApi(payment.metodo), amount: payment.valor },
        { method: '', amount: 0 },
      ]);
    }
  }, [payment]);

  const splitTotal = splitRows.reduce((s, r) => s + (r.amount || 0), 0);
  const splitDiff  = Math.abs(splitTotal - amount);
  const splitMethodsValid = splitRows.every(r => !!r.method);
  const splitValid = splitDiff < 0.01 && splitMethodsValid;

  const updateRow = (i: number, field: keyof SplitRow, val: string | number) => {
    setSplitRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const addRow = () => setSplitRows(prev => [...prev, { method: '', amount: 0 }]);

  const removeRow = (i: number) => {
    if (splitRows.length <= 2) return;
    setSplitRows(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!payment) return;
    if (amount <= 0) { toast.error('Informe um valor maior que zero'); return; }
    if (!financialDate) { toast.error('Informe a data'); return; }
    if (isSplit && !splitMethodsValid) {
      toast.error('Escolha o método de pagamento em todas as linhas do split');
      return;
    }
    if (isSplit && !splitValid) {
      toast.error(`Total do split ${formatCurrency(splitTotal)} ≠ valor ${formatCurrency(amount)}`);
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, any> = { amount, financialDate, notes: notes.trim() || undefined };

      if (isSplit) {
        body.splitMethods = splitRows.map(r => ({ method: r.method, amount: r.amount }));
      } else {
        body.paymentMethod = method;
      }

      await api.patch(`/v2/payments/${payment.id}`, body);
      toast.success('Pagamento atualizado!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao atualizar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open && !!payment}
      onClose={() => !loading && onClose()}
      labelledBy="edit-payment-title"
      zIndexClass="z-[1300]"
      panelClassName="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
    >
      <ModalHeader
        icon={<Pencil className="w-5 h-5" />}
        color="#059669"
        title="Editar pagamento"
        subtitle={payment?.paciente}
        onClose={onClose}
        titleId="edit-payment-title"
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label="Valor total" required>
            <MoneyInput large value={toStr(amount)} onChange={(v) => setAmount(toNum(v))} accent="emerald" />
          </Field>
          <Field label="Data no caixa" required>
            <input type="date" value={financialDate} onChange={(e) => setFinancialDate(e.target.value)} className={inputClass('emerald')} />
          </Field>
        </div>

        <Switch
          checked={isSplit}
          onChange={setIsSplit}
          label="Dividir em múltiplas formas"
          description="Ex.: parte em dinheiro e parte no Pix"
        />

        {!isSplit && (
          <div>
            <span className="mb-2 block text-xs font-semibold text-gray-600">Método</span>
            <ChoiceChips label="Método" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
          </div>
        )}

        {isSplit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Formas de pagamento</span>
              <span className={`text-xs font-semibold tabular-nums ${splitValid ? 'text-emerald-600' : 'text-red-500'}`} aria-live="polite">
                {formatCurrency(splitTotal)} / {formatCurrency(amount)}
              </span>
            </div>

            {splitRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_8.5rem_auto] items-center gap-2">
                <select
                  value={row.method}
                  onChange={(e) => updateRow(i, 'method', e.target.value)}
                  aria-label={`Método da linha ${i + 1}`}
                  className={inputClass('emerald')}
                >
                  <option value="">Escolha um método</option>
                  {METHOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <MoneyInput value={toStr(row.amount)} onChange={(v) => updateRow(i, 'amount', toNum(v))} accent="emerald" />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={splitRows.length <= 2}
                  aria-label="Remover forma"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors duration-quick hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition-colors duration-quick hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Plus size={16} /> Adicionar forma
            </button>

            {!splitValid && (
              <p className="text-xs text-red-500">
                {splitMethodsValid
                  ? `Diferença de ${formatCurrency(splitDiff)}. Ajuste os valores para fechar o total.`
                  : 'Escolha o método em todas as linhas.'}
              </p>
            )}
          </div>
        )}

        <Field label="Observação">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo da edição (opcional)"
            rows={2}
            className={`${inputClass('emerald')} resize-none`}
          />
        </Field>

        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          Status e vínculos (agendamento/sessão) não são alterados.
        </p>
      </div>

      <ModalFooter
        accent="emerald"
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={loading}
        submitDisabled={amount <= 0 || (isSplit && !splitValid)}
        submitLabel="Salvar alterações"
        submittingLabel="Salvando..."
        summary={amount > 0 ? `${formatCurrency(amount)}${isSplit ? ` · ${splitRows.length} formas` : ''}` : null}
      />
    </Modal>
  );
};
