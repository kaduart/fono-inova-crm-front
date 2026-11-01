import { X, UserPlus2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ModalShell } from '../ui/TailwindParts';
import PatientForm from '../../shared/components/PatientForm';
import { IPatient } from '../../utils/types/types';

interface PatientModalProps {
  open: boolean;
  onClose: () => void;
  patient?: IPatient;
  onSaveSuccess?: (patient: IPatient) => Promise<boolean> | boolean;
  isLoading?: boolean;
}

export const PatientModal = ({
  open,
  onClose,
  patient: patientProp,
  isLoading = false,
  onSaveSuccess
}: PatientModalProps) => {
  const [patient, setPatient] = useState<IPatient | undefined>(patientProp);

  useEffect(() => {
    setPatient(patientProp);
  }, [patientProp, open]);

  const isEdit = Boolean(patientProp?._id || (patientProp as any)?.patientId || (patientProp as any)?.id);

  return (
    <ModalShell open={open} onClose={isLoading ? () => {} : onClose} labelledBy="patient-modal-title"
      className="max-h-[94vh] w-full max-w-4xl border border-gray-100 sm:rounded-2xl dark:border-slate-700">
      {/* Cabeçalho */}
      <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus2 className="h-5 w-5 text-white/90" aria-hidden />
          <h2 id="patient-modal-title" className="text-lg font-semibold tracking-wide">{isEdit ? 'Editar Paciente' : 'Novo Paciente'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white transition-all hover:bg-white/20">
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-gray-100 bg-gradient-to-b from-white to-gray-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
        {open && (
          <PatientForm
            key={(patientProp?._id || (patientProp as any)?.patientId || (patientProp as any)?.id) ?? 'new'}
            patient={patientProp}
            isLoading={isLoading}
            onSuccess={async (savedPatient) => {
              const success = await onSaveSuccess?.(savedPatient);
              if (success) onClose(); // fecha só se sucesso
            }}
          />
        )}
      </div>
    </ModalShell>
  );
};
