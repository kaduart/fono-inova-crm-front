import { Button, Paper, Typography, useTheme } from '@mui/material';
import { Plus, Users } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { toast } from 'react-hot-toast';
import { IAppointment, IDoctor, IPatient, ScheduleAppointment } from "../../utils/types/types";
import { doctorService } from "../../services/doctorService";
import { useDoctorsContext } from "../../contexts/DoctorsContext";
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import DoctorAgenda from "./DoctorAgenda";
import DoctorFormModal from "./DoctorFormModal";
import DoctorList from "./DoctorList";

const initialSchedules = {
    "1": {
        Segunda: ["08:00", "09:00"],
        Terça: ["10:00", "14:00"],
    },
    "2": {
        Segunda: ["08:00"],
        Quarta: ["15:00"],
    },
};

interface ManageDoctorsProps {
    doctors: IDoctor[],
    patients: IPatient[],
    loading: boolean,
    appointments: IAppointment,
    onSubmitDoctor: () => Promise<void>;
    modalShouldClose: boolean;
    closeModalSignal: number;
    setOpenModal: () => Promise<void>;
    onNewAppointment: (data: ScheduleAppointment) => Promise<void>;
    onDoctorsChange?: () => Promise<void>;
};

const ManageDoctors: React.FC<ManageDoctorsProps> = ({
    doctors: propDoctors,
    patients,
    loading: propLoading,
    appointments,
    closeModalSignal,
    onNewAppointment,
    onSubmitDoctor,
    modalShouldClose,
    setOpenModal,
    onDoctorsChange
}) => {
    const [doctorSchedules, setDoctorSchedules] = useState(initialSchedules);
    const [selectedDoctor, setSelectedDoctor] = useState<IDoctor | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [dataUpdateSlots, setdataUpdateSlots] = useState<ScheduleAppointment | undefined>();
    const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
    const [showAgendaModal, setshowAgendaModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [allDaySlots, setAllDaySlots] = useState<(any)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedBookingData, setSelectedBookingData] = useState<{
        time: string,
        isBookingModalOpen: boolean
    } | null>(null);
    const [scheduleAppointmentData, setScheduleAppointmentData] = useState<ScheduleAppointment>({
        doctorId: '',
        patientId: '',
        date: '',
        time: '',
        sessionType: 'fonoaudiologia',
        notes: '',
        paymentAmount: 0,
        paymentMethod: 'dinheiro',
        status: 'agendado',
    });
    const theme = useTheme();

    // 🎯 USA O CONTEXTO GLOBAL DE MÉDICOS
    const { doctors: allDoctors, activeDoctors, inactiveDoctors, loading: isLoadingDoctors, refreshDoctors } = useDoctorsContext();
    
    // 🔄 Força re-render quando doctors mudam (fix para carregamento inicial)
    const [localDoctors, setLocalDoctors] = useState<IDoctor[]>([]);
    
    useEffect(() => {
        setLocalDoctors(allDoctors);
    }, [allDoctors]);

    useEffect(() => {
        if (modalShouldClose) {
            setShowModal(false);
            const timer = setTimeout(() => {
                setOpenModal();
            }, 300);
            return () => clearTimeout(timer);
        }
        if (closeModalSignal) {
            setShowScheduleModal(false);
        }
    }, [modalShouldClose, closeModalSignal, setOpenModal]);

    const handleViewAgenda = (doctor: IDoctor) => {
        setSelectedDoctor(doctor);
        setshowAgendaModal(true);
    };

    const [selectedDate, setSelectedDate] = useState<string>('');

    const handleDaySlotsChange = (slots: { date: string; slots: string[] }[]) => {
        if (slots && slots.length > 0) {
            setSelectedDate(slots[0].date);
            setAllDaySlots(slots);
        }
    };

    const handleAddOrEditDoctor = (doctor: IDoctor | null) => {
        setSelectedDoctor(doctor);
        setShowModal(true);
    };

    const onOpenCloseModals = (data: {
        time: string;
        date: string;
        doctorId: string;
        specialty: string;
        isBookingModalOpen: boolean;
    }) => {
        const baseDate =
            typeof data.date === 'string'
                ? data.date
                : new Date(data.date).toISOString().split('T')[0];

        setScheduleAppointmentData({
            date: baseDate,
            time: data.time,
            doctorId: data.doctorId || selectedDoctor?._id || '',
            patientId: '',
            sessionType: data.specialty || selectedDoctor?.specialty || 'fonoaudiologia',
            specialty: data.specialty || selectedDoctor?.specialty || 'fonoaudiologia',
            status: 'agendado',
            notes: '',
            paymentAmount: 0,
            paymentMethod: 'dinheiro',
            serviceType: 'individual_session',
        });

        setShowScheduleModal(true);
        setSelectedBookingData(data);
    };

    const handleBookingSubmit = async (data: any) => {
        setScheduleAppointmentData({
            ...scheduleAppointmentData,
            date: data.date,
            doctorId: data.doctorId,
            patientId: data.patientId,
            packages: data.packages,
        });
        setShowScheduleModal(true);
    };

    const handleBookingComplete = async (data: ScheduleAppointment) => {
        setIsLoading(true);
        try {
            await onNewAppointment(data);
            setdataUpdateSlots({
                ...data,
                _syncKey: Date.now(),
            });
        } catch (error: any) {
            console.error("Erro no intermediário:", error);
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 🆕 Inativar profissional (soft delete)
    const handleDeactivateDoctor = async (doctor: IDoctor) => {
        if (!doctor._id) return;
        
        setIsLoading(true);
        try {
            await doctorService.deactivateDoctor(doctor._id);
            toast.success(`Profissional "${doctor.fullName}" inativado com sucesso!`);
            
            // 🎯 Atualiza via contexto
            await refreshDoctors();
            await onDoctorsChange?.();
            
            if (selectedDoctor?._id === doctor._id) {
                setshowAgendaModal(false);
                setSelectedDoctor(null);
            }
        } catch (error: any) {
            console.error("Erro ao inativar profissional:", error);
            toast.error(error.response?.data?.message || "Erro ao inativar profissional");
        } finally {
            setIsLoading(false);
        }
    };

    // 🆕 Reativar profissional
    const handleReactivateDoctor = async (doctor: IDoctor) => {
        if (!doctor._id) return;
        
        setIsLoading(true);
        try {
            await doctorService.reactivateDoctor(doctor._id);
            toast.success(`Profissional "${doctor.fullName}" reativado com sucesso!`);
            
            // 🎯 Atualiza via contexto
            await refreshDoctors();
            await onDoctorsChange?.();
        } catch (error: any) {
            console.error("Erro ao reativar profissional:", error);
            toast.error(error.response?.data?.message || "Erro ao reativar profissional");
        } finally {
            setIsLoading(false);
        }
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
                                Gestão de Profissionais
                            </Typography>
                            <Typography variant="body2" color="grey.600">
                                Cadastre e gerencie os profissionais da clínica.
                            </Typography>
                        </div>
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={handleAddOrEditDoctor}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            fontWeight: 'bold',
                            background: `linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))`,
                            '&:hover': {
                                background: `linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))`,
                                transform: 'translateY(-1px)',
                                boxShadow: 4,
                            },
                            transition: 'all 0.25s ease-in-out',
                        }}
                    >
                        Novo Profissional
                    </Button>
                </div>
            </Paper>

            <DoctorList 
                doctors={localDoctors}
                onEdit={handleAddOrEditDoctor} 
                onViewAgenda={handleViewAgenda}
                onDeactivate={handleDeactivateDoctor}
                onReactivate={handleReactivateDoctor}
            />

            {showAgendaModal && selectedDoctor && (
                <DoctorAgenda
                    selectedDoctor={selectedDoctor}
                    doctors={localDoctors}
                    patients={patients}
                    onDaySlotsChange={handleDaySlotsChange}
                    onSubmitSlotBooking={onOpenCloseModals}
                    updateSlots={dataUpdateSlots}
                />
            )}

            {showModal && (
                <DoctorFormModal
                    selectedDoctor={selectedDoctor}
                    open={showModal}
                    loading={isLoadingDoctors || propLoading}
                    onClose={() => setShowModal(false)}
                    onSubmitDoctor={async (doctor) => {
                        await onSubmitDoctor();
                        await refreshDoctors(); // 🎯 Atualiza lista após salvar
                    }}
                    modalShouldClose={modalShouldClose}
                    onCancel={() => setOpenModal()}
                    onSubmitSlotBooking={handleBookingSubmit}
                />
            )}

            {showScheduleModal && (
                <ScheduleAppointmentModal
                    isOpen={showScheduleModal}
                    initialData={scheduleAppointmentData}
                    doctors={localDoctors}
                    patients={patients}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={(data) => { handleBookingComplete(data) }}
                    isLoading={isLoading}
                    erroMessage={errorMessage}
                />
            )}
        </div>
    );
};

export default ManageDoctors;
