import { useRef, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import InputCurrency from '../ui/InputCurrency';

interface ProfessionalAdvanceModalProps {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  // 🚨 Opcional: caller pode não ter um refresh pra oferecer. Chamar como
  // função obrigatória e receber undefined aqui já causou crash real
  // (TypeError, capturado pelo catch como "erro ao registrar" mesmo com o
  // adiantamento já criado com sucesso — modal nunca fechava).
  onSuccess?: () => void;
}

const TYPE_OPTIONS = [
  { value: 'advance',    label: 'Adiantamento' },
  { value: 'bonus',      label: 'Bonificação' },
  { value: 'adjustment', label: 'Ajuste' },
] as const;

type AdvanceType = typeof TYPE_OPTIONS[number]['value'];

export const ProfessionalAdvanceModal = ({
  open,
  onClose,
  doctorId,
  doctorName,
  onSuccess,
}: ProfessionalAdvanceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<AdvanceType>('advance');
  const [notes, setNotes] = useState('');
  // 🛡️ Guard síncrono contra duplo-clique — `loading` (estado) só desabilita o botão
  // no próximo render; um segundo clique rápido dispara handleSubmit de novo antes
  // disso, gerando 2 requests (1 sucesso + 1 erro/duplicata) e o modal ficando preso.
  const isSubmittingRef = useRef(false);

  const reset = () => {
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setType('advance');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    if (amount <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    if (!date) {
      toast.error('Informe a data');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      await api.post(`/v2/professionals/${doctorId}/advances`, {
        amount,
        date,
        type,
        notes: notes.trim() || null,
      });
      toast.success('Adiantamento registrado com sucesso!');
      reset();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao registrar adiantamento');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#4F46E5' }}>
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">Registrar Adiantamento</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{doctorName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    type === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor *</label>
            <InputCurrency
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Data *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observação</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo ou descrição (opcional)"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Aviso */}
          <p className="text-2xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            ⚠️ O valor será abatido automaticamente da comissão no fechamento mensal.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || amount <= 0}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
