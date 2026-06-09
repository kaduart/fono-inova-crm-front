import React, { useState } from 'react';
import { Paper, Typography, Button, useTheme } from '@mui/material';
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
    const theme = useTheme();
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
        <div className="p-4">
            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: 'rgba(55,171,135,0.15)' }}
                        >
                            <Users size={24} style={{ color: '#00C087' }} />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800">
                                Gestão de Pacientes
                            </Typography>
                            <Typography variant="body2" color="grey.600">
                                Visualize e gerencie os pacientes da clínica.
                            </Typography>
                        </div>
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={openCreate}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))',
                            '&:hover': {
                                background: 'linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))',
                                transform: 'translateY(-1px)',
                                boxShadow: 4,
                            },
                            transition: 'all 0.25s ease-in-out',
                        }}
                    >
                        Novo Paciente
                    </Button>
                </div>
            </Paper>

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
