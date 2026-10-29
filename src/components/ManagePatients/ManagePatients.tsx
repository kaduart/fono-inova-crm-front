import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { IPatient } from '../../utils/types/types';
import PatientList from './PatientList';
import { PatientModal } from '../patients/PatientModal';
import { usePatients } from '../../hooks/usePatients';

import { toast } from '../../utils/toast';
import { notifyApiError } from '../../utils/notifyApiError';

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
            notifyApiError(error, 'Erro ao salvar paciente');
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
        <div className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-left">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Users size={20} aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-50">Pacientes</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Cadastro, sessões e saldo de cada paciente.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                    <Plus size={16} aria-hidden />
                    Novo paciente
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
