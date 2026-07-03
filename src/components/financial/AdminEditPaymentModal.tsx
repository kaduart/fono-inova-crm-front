import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import InputCurrency from '../ui/InputCurrency';

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

  if (!open || !payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Editar Pagamento</h2>
            <p className="text-xs text-gray-500 mt-0.5">{payment.paciente}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Valor total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor total *</label>
            <InputCurrency name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full" />
          </div>

          {/* Toggle split */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSplit(s => !s)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isSplit ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isSplit ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700">Dividir em múltiplas formas</span>
          </div>

          {/* Método único */}
          {!isSplit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Método</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {METHOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Split rows */}
          {isSplit && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Formas de pagamento</label>
                <span className={`text-xs font-semibold ${splitValid ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(splitTotal)} / {formatCurrency(amount)}
                </span>
              </div>

              {splitRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={row.method}
                    onChange={(e) => updateRow(i, 'method', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Escolha um método</option>
                    {METHOD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="w-32">
                    <InputCurrency name={`split-${i}`} value={row.amount} onChange={(e) => updateRow(i, 'amount', e.target.value)} className="w-full" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={splitRows.length <= 2}
                    className="p-1.5 rounded text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Plus size={13} /> Adicionar forma
              </button>

              {!splitValid && (
                <p className="text-xs text-red-500">
                  Diferença de {formatCurrency(splitDiff)} — ajuste os valores para fechar o total.
                </p>
              )}
            </div>
          )}

          {/* Data no caixa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Data no caixa *</label>
            <input
              type="date"
              value={financialDate}
              onChange={(e) => setFinancialDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observação</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da edição (opcional)"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <p className="text-[11px] text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            ⚠️ Status e vínculos (agendamento/sessão) não são alterados.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || amount <= 0 || (isSplit && !splitValid)}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
