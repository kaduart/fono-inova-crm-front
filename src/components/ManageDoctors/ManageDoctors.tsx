import dayjs from 'dayjs';
import React, { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import appointmentService from '../../services/appointmentService';
import { mergeDateAndTimeToAppointment } from '../../utils/dateFormat';
import { IDoctor, IPatient, ScheduleAppointment } from "../../utils/types/types";
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import { Button } from "../ui/Button";
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
    onSubmitDoctor: () => Promise<void>;
    modalShouldClose: () => Promise<void>;
    setOpenModal: () => Promise<void>;

};

const ManageDoctors: React.FC<ManageDoctorsProps> = ({
    doctors = [],
    patients = [],
    loading,
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
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
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

    useEffect(() => {
        console.log('ffff', modalShouldClose)
        if (modalShouldClose) {
            setShowModal(false);
            const timer = setTimeout(() => {
                setOpenModal(false);
            }, 300); // Tempo para animação de fechamento
            return () => clearTimeout(timer);
        }
    }, [modalShouldClose, setOpenModal]);

    const handleViewAgenda = (doctor: IDoctor) => {

        setSelectedDoctor(doctor);
        setshowAgendaModal(true);
    };

    const handleDaySlotsChange = (slots: { date: string; slots: string[] }[]) => {

        setSelectedDate(dayjs(slots[0].date));
        setAllDaySlots(slots);
    };

    const handleCloseScheduleModal = () => {
        setShowScheduleModal(false);
        setSelectedBookingData(null);
    };

    const handleAddOrEditDoctor = (doctor: IDoctor | null) => {
        setSelectedDoctor(doctor);
        setShowModal(true);
    };

    const handleUpdateSchedule = (doctorId: IDoctor, newSchedule: any) => {
        setDoctorSchedules((prev) => ({
            ...prev,
            [doctorId]: newSchedule,
        }));
    };

    //aqui chama o agendamento por hora
    const onOpenCloseModals = async (data: any) => {
        console.log('data no  closeopen modal ', data);

        setScheduleAppointmentData({
            date: selectedDate ? selectedDate.toISOString() : '',
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

        console.log('data no submit ', data);
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

    //to do ja ta no admiondash so adaptar
    const handleBooking = async (payload: ScheduleAppointment,) => {
        console.log('pay original 2', payload)
        const mergedDate = mergeDateAndTimeToAppointment(payload.date, payload.time);

        payload.specialty = payload.sessionType;
        setIsLoading(true);
        setErrorMessage(null);
        console.log('pay atualizado 2', mergedDate)

        try {
            await appointmentService.create({
                ...payload,
                date: mergedDate,
                specialty: payload.sessionType
            });

            toast.success('Sessão agendada e pagamento registrado com sucesso!');

            setdataUpdateSlots(payload);
            setShowScheduleModal(false);

        } catch (error: unknown) {

            if (error instanceof Error) {
                console.log('erro detalhado:', error);
                setErrorMessage(error.response.data.error);
            } else {
                console.log('erro bruto:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Gestão de Profissionais</h2>
                <Button onClick={() => handleAddOrEditDoctor(null)}>Adicionar Profissional</Button>

            </div>

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
                    onSave={(appointment) => {
                        handleBooking(appointment);
                    }}
                    isLoading={isLoading}
                    erroMessage={errorMessage}

                />
            )}

        </div>
    );
};

export default ManageDoctors;
