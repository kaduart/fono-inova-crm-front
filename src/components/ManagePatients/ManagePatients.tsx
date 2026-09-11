import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { IPatient } from '../../utils/types/types';
import PatientList from './PatientList';
import { PatientModal } from '../patients/PatientModal';
import { usePatients } from '../../hooks/usePatients';
import { extractErrorMessage } from '../../utils/errorUtils';
import { toast } from 'react-hot-toast';

const EMPTY_PATIENT: IPatient = {
    fullName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    profession: '',
    placeOfBirth: '',
    address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
    phone: '',
    email: '',
    cpf: '',
    cnpj: '',
    rg: '',
    specialties: [],
    mainComplaint: '',
    clinicalHistory: '',
    medications: '',
    allergies: '',
    familyHistory: '',
    healthPlan: { name: '', policyNumber: '' },
    legalGuardian: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
};

const ManagePatients: React.FC = () => {
    const { updatePatient, createPatient } = usePatients();
    const [patientToEdit, setPatientToEdit] = useState<IPatient | undefined>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const handleSave = async (formData: IPatient): Promise<boolean> => {
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                dateOfBirth: formData.dateOfBirth
                    ? new Date(formData.dateOfBirth).toISOString()
                    : formData.dateOfBirth,
            };
            if (formData._id) {
                await updatePatient(formData._id, payload);
                toast.success('Paciente atualizado com sucesso!');
            } else {
                await createPatient(payload);
                toast.success('Paciente criado com sucesso!');
            }
            setRefreshSignal(s => s + 1);
            return true;
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao salvar paciente'));
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const openCreate = () => {
        setPatientToEdit(undefined);
        setIsModalOpen(true);
    };

    const openEdit = (p: IPatient) => {
        setPatientToEdit(p);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setPatientToEdit(undefined);
    };

    return (
        <div>
            <div className="mb-2 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 shadow-sm md:flex-row md:items-center md:p-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Users size={22} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                            Gestão de Pacientes
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-600">
                            Visualize e gerencie os pacientes da clínica.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openCreate}
                    className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                    <Plus size={14} />
                    Novo Paciente
                </button>
            </div>

            <PatientList onEdit={openEdit} refreshSignal={refreshSignal} />

            <PatientModal
                open={isModalOpen}
                patient={patientToEdit ?? EMPTY_PATIENT}
                isLoading={isSaving}
                onClose={handleClose}
                onSaveSuccess={async (formData) => {
                    const ok = await handleSave(formData);
                    if (ok) handleClose();
                }}
            />
        </div>
    );
};

export default ManagePatients;
