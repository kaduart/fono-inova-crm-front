import { UserPlus2 } from 'lucide-react';
import { ModalHeader } from '../../pages/Financial/components/formKit';
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
      className="max-h-[94vh] w-full max-w-3xl sm:rounded-[20px]">
      <ModalHeader
        icon={<UserPlus2 className="h-6 w-6" />}
        color="#059669"
        title={isEdit ? 'Editar paciente' : 'Novo paciente'}
        subtitle={isEdit ? patientProp?.fullName : 'Dados pessoais, contato e endereço'}
        onClose={onClose}
        titleId="patient-modal-title"
        closeDisabled={isLoading}
      />

      {/* Conteúdo */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        {open && (
          <PatientForm
            key={(patientProp?._id || (patientProp as any)?.patientId || (patientProp as any)?.id) ?? 'new'}
            patient={patientProp}
            isLoading={isLoading}
            onCancel={onClose}
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
