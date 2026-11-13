import { useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { ChoiceChips, Field, ModalHeader, ModalFooter, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';

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
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<AdvanceType>('advance');
  const [notes, setNotes] = useState('');
  // 🛡️ Guard síncrono contra duplo-clique — `loading` (estado) só desabilita o botão
  // no próximo render; um segundo clique rápido dispara handleSubmit de novo antes
  // disso, gerando 2 requests (1 sucesso + 1 erro/duplicata) e o modal ficando preso.
  const isSubmittingRef = useRef(false);

  const reset = () => {
    setAmount('');
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

    const value = parseFloat(amount);
    if (!(value > 0)) {
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
        amount: value,
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

  const value = parseFloat(amount);
  const valid = value > 0;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === type)?.label;
  const summary = valid ? `${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${typeLabel}` : null;

  return (
    <Modal
      open={open}
      onClose={() => !loading && handleClose()}
      labelledBy="advance-modal-title"
      zIndexClass="z-[1300]"
      panelClassName="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
    >
      <ModalHeader
        icon={<Wallet className="w-6 h-6" />}
        color="#059669"
        title="Registrar adiantamento"
        subtitle={doctorName}
        onClose={handleClose}
        titleId="advance-modal-title"
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label="Valor" required>
            <MoneyInput large value={amount} onChange={setAmount} accent="emerald" />
          </Field>
          <Field label="Data" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass('emerald')} />
          </Field>
        </div>
        <div>
          <span className="mb-2 block text-xs font-semibold text-gray-600">Tipo</span>
          <ChoiceChips label="Tipo" value={type} onChange={setType} options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </div>
        <Field label="Observação">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo ou descrição (opcional)"
            rows={2}
            className={`${inputClass('emerald')} resize-none`}
          />
        </Field>
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          O valor será abatido automaticamente da comissão no fechamento mensal.
        </p>
      </div>
      <ModalFooter
        accent="emerald"
        onCancel={handleClose}
        onSubmit={handleSubmit}
        submitting={loading}
        submitDisabled={!valid}
        submitLabel="Registrar adiantamento"
        submittingLabel="Registrando..."
        summary={summary}
      />
    </Modal>
  );
};
