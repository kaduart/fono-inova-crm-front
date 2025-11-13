import { Button, Paper, Typography, useTheme } from '@mui/material';
import { Plus, User, UserPlus, Users } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { IAppointment, IDoctor, IPatient, ScheduleAppointment } from "../../utils/types/types";
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
    onNewAppointment: (data: any) => Promise<void>;
};

const ManageDoctors: React.FC<ManageDoctorsProps> = ({
    doctors = [],
    patients = [],
    loading,
    appointments,
    closeModalSignal,
    onNewAppointment,
    onSubmitDoctor,
    modalShouldClose,
    setOpenModal
}) => {
    const [doctorSchedules, setDoctorSchedules] = useState(initialSchedules);
    const [selectedDoctor, setSelectedDoctor] = useState<IDoctor | null>(null);
    const [localShouldClose, setLocalShouldClose] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [dataUpdateSlots, setdataUpdateSlots] = useState<ScheduleAppointment | undefined>();
    const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
    console.log('Chamou - manager doctor ')

    useEffect(() => {
        if (modalShouldClose) {
            setShowModal(false);
            const timer = setTimeout(() => {
                setOpenModal(false);
            }, 300); // Tempo para animação de fechamento
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

    const handleDaySlotsChange = (slots: { date: string; slots: string[] }[]) => {
        setSelectedDate(slots[0].date);
        setAllDaySlots(slots);
    };

    const handleAddOrEditDoctor = (doctor: IDoctor | null) => {
        setSelectedDoctor(doctor);
        setShowModal(true);
    };

    //aqui chama o agendamento por hora
    const onOpenCloseModals = async (data: any) => {

        setScheduleAppointmentData({
            date: selectedDate
                ? (selectedDate instanceof Date
                    ? selectedDate.toISOString().split('T')[0]
                    : selectedDate.toString())
                : '',
            time: data.time,
            doctorId: '',
            patientId: '',
            sessionType: 'fonoaudiologia',
            status: 'agendado',
            notes: '',
            paymentAmount: 0,
            paymentMethod: 'dinheiro'
        });
        setShowScheduleModal(true);

        setSelectedBookingData(data);
    }

    const handleBookingSubmit = async (data: any) => {

        setScheduleAppointmentData({
            ...scheduleAppointmentData,
            date: data.date,
            doctorId: data.doctorId,
            patientId: data.patientId,
            packages: data.packages,
        });
        //  setBookingModalOpen(false);
        setShowScheduleModal(true);
    };

    const handleBookingComplete = async (data: ScheduleAppointment) => {
        setIsLoading(true);
        try {
            console.log('aaaaaaaaaaaaaaaaa',data)
            // 1. Envia para o pai e AGUARDA resposta
            const result = await onNewAppointment(data);
            // 2. Só atualiza após confirmação
            setdataUpdateSlots({
                ...result,
                date: data.date,
                doctorId: data.doctorId,
                _syncKey: Date.now()
            });

        } catch (error) {
            console.error("Erro no intermediário:", error);
            setErrorMessage(error.message);
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
                    {/* Ícone e título */}
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

                    {/* Botão com gradiente institucional */}
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

            <DoctorList doctors={doctors} onEdit={handleAddOrEditDoctor} onViewAgenda={handleViewAgenda} />

            {showAgendaModal && selectedDoctor && (
                <DoctorAgenda
                    selectedDoctor={selectedDoctor}
                    doctors={doctors}
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
                    loading={loading}
                    onClose={() => setShowModal(false)}
                    onSubmitDoctor={async (doctor) => {
                        await onSubmitDoctor(doctor);
                    }}
                    modalShouldClose={modalShouldClose}
                    onCancel={() => setOpenModal(false)}
                    onSubmitSlotBooking={handleBookingSubmit}
                />
            )}

            {showScheduleModal && (
                <ScheduleAppointmentModal
                    isOpen={showScheduleModal}
                    initialData={scheduleAppointmentData}
                    doctors={doctors}
                    patients={patients}
                    //loading={false}
                    // onSubmit={handleCloseScheduleModal}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={(data) => {
                        handleBookingComplete(data),
                            setdataUpdateSlots(data)
                    }}

                    isLoading={isLoading}
                    erroMessage={errorMessage}

                />
            )}

        </div>
    );
};

export default ManageDoctors;
