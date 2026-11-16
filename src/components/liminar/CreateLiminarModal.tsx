import { Scale } from 'lucide-react';
import { useState } from 'react';
import { toast } from '../../utils/toast';
import liminarContractService from '../../services/liminarContractService';
import { Modal } from '../ui/Modal';
import { Field, ModalHeader, ModalFooter, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';

interface Doctor {
  _id: string;
  fullName: string;
}

interface Props {
  patientId: string;
  doctors: Doctor[];
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateLiminarModal({ patientId, doctors, onClose, onCreated }: Props) {
  const [doctorId, setDoctorId] = useState('');
  const [totalCredit, setTotalCredit] = useState('');
  const [processNumber, setProcessNumber] = useState('');
  const [court, setCourt] = useState('');
  const [loading, setLoading] = useState(false);

  const credit = parseFloat(totalCredit);
  const isValid = !!doctorId && credit > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    try {
      await liminarContractService.create({
        patientId,
        doctorId,
        totalCredit: credit,
        processNumber: processNumber || undefined,
        court: court || undefined,
      });
      toast.success('Contrato liminar criado com sucesso!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => !loading && onClose()}
      labelledBy="liminar-modal-title"
      zIndexClass="z-[1300]"
      panelClassName="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
    >
      <ModalHeader
        icon={<Scale className="w-6 h-6" />}
        color="#D97706"
        title="Criar contrato liminar"
        subtitle="Crédito pago antecipado, debitado a cada sessão"
        onClose={onClose}
        titleId="liminar-modal-title"
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <Field label="Valor total do crédito" required hint="Valor total liberado pela decisão judicial.">
          <MoneyInput large value={totalCredit} onChange={setTotalCredit} accent="emerald" />
        </Field>
        <Field label="Profissional responsável" required>
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputClass('emerald')}>
            <option value="">Selecione o profissional</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>{d.fullName}</option>
            ))}
          </select>
        </Field>
        <Field label="Número do processo">
          <input
            type="text"
            value={processNumber}
            onChange={(e) => setProcessNumber(e.target.value)}
            placeholder="Ex.: 1234567-89.2026.8.01.0000"
            className={inputClass('emerald')}
          />
        </Field>
        <Field label="Vara / Cartório">
          <input
            type="text"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            placeholder="Ex.: 1ª Vara Cível de Anápolis"
            className={inputClass('emerald')}
          />
        </Field>
      </div>
      <ModalFooter
        accent="emerald"
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={loading}
        submitDisabled={!isValid}
        submitLabel="Criar contrato"
        submittingLabel="Salvando..."
        summary={credit > 0 ? credit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null}
      />
    </Modal>
  );
}
