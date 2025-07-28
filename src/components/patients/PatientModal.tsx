import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react'; // Importar useEffect e useState
import PatientForm from '../../shared/components/PatientForm';
import { IPatient } from '../../utils/types/types';

interface PatientModalProps {
    open: boolean;
    onClose: () => void;
    patient?: IPatient;
    onSaveSuccess?: (patient: IPatient) => void;
    isLoading?: boolean;
}

export const PatientModal = ({
    open,
    onClose,
    patient: patientProp,
    isLoading = false,
    onSaveSuccess
}: PatientModalProps) => {
    // Estado interno para gerenciar os dados do paciente
    const [patient, setPatient] = useState<IPatient | undefined>(patientProp);
    
    // Sincronizar o estado interno quando as props mudam
    useEffect(() => {
        setPatient(patientProp);
    }, [patientProp, open]);


    return (
        <Dialog
            open={open}
            onClose={isLoading ? undefined : onClose}
            fullWidth
            scroll="paper"
            PaperProps={{
                style: {
                    width: '50%',
                    maxWidth: 'none',
                    margin: 'auto',
                    borderRadius: '12px'
                }
            }}
        >
            <DialogTitle>
                <div className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-tl-lg rounded-tr-lg">
                    <span>{patient?._id ? 'Editar Paciente' : 'Novo Paciente'}</span>
                    <X 
                        className="w-6 h-6 cursor-pointer text-gray-500 hover:text-gray-700" 
                        onClick={onClose} 
                    />
                </div>
            </DialogTitle>

            <DialogContent dividers>
                {open && ( // Renderizar condicionalmente apenas quando aberto
                    <PatientForm
                        patient={patient}
                        onSuccess={(savedPatient) => {
                            onSaveSuccess?.(savedPatient);
                            onClose(); // Fechar modal após salvar
                        }}
                        isLoading={isLoading}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};