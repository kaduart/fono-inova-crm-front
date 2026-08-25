import { Dialog, DialogContent, DialogTitle, IconButton, Slide } from '@mui/material';
import { X, UserPlus2 } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import PatientForm from '../../shared/components/PatientForm';
import { IPatient } from '../../utils/types/types';

const Transition = forwardRef(function Transition(props: any, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="md"
      disableScrollLock
      PaperProps={{
        className:
          'rounded-2xl shadow-xl border border-gray-100 backdrop-blur-sm bg-white/90 overflow-hidden transition-all',
      }}
    >
      {/* Cabeçalho */}
      <DialogTitle className="p-0">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <UserPlus2 className="w-5 h-5 text-white/90" />
            <span className="font-semibold text-lg tracking-wide">
              {(patientProp?._id || (patientProp as any)?.patientId || (patientProp as any)?.id)
                ? 'Editar Paciente'
                : 'Novo Paciente'}
            </span>
          </div>
          <IconButton
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </IconButton>
        </div>
      </DialogTitle>

      {/* Conteúdo */}
      <DialogContent
        dividers
        className="p-6 bg-gradient-to-b from-white to-gray-50 rounded-b-2xl overflow-y-auto"
      >
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
      </DialogContent>
    </Dialog>
  );
};
