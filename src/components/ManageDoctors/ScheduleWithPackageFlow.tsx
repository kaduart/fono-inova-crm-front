import { useState } from 'react';
import toast from 'react-hot-toast';
import { IDoctor, ISession } from '../../utils/types/types';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import { SessionModal } from '../patients/SessionModal';

interface ScheduleWithPackageFlowProps {
    isOpen: boolean;
    onClose: () => void;
    doctors: IDoctor[];
    patients: IPatient[];
    defaultDateTime: string; // ISO string do horário clicado
    onComplete: () => void; // callback para recarregar agenda ou outro efeito
}

export const ScheduleWithPackageFlow = ({
    isOpen,
    onClose,
    doctors,
    patients,
    defaultDateTime,
    onComplete
}: ScheduleWithPackageFlowProps) => {
    const [step, setStep] = useState<'appointment' | 'session' | null>('appointment');
    const [appointmentData, setAppointmentData] = useState(null);
    const [sessionData, setSessionData] = useState<ISession | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSaveAppointment = async (data) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/pacotes/${patientId}`);
            const pacote = await res.json();

            if (!res.ok || !pacote?.hasActivePackage) {
                toast.error("Paciente sem pacote ativo.");
                return;
            }

            if (pacote.remainingSessions <= 0) {
                toast.error("Paciente não possui sessões restantes.");
                return;
            }

            setAppointmentData(data);
            setSessionData({
                date: new Date(`${data.data}T${data.hora}`),
                professional: data.profissional,
                sessionType: data.tipoSessao,
                paymentAmount: 0,
                notes: data.motivo,
                paymentMethod: '',
            });
            setStep('session');
        } catch (err) {
            toast.error("Erro ao verificar pacote.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitSession = async () => {
        if (!sessionData) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/sessoes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...sessionData, patientId })
            });

            if (!res.ok) throw new Error('Erro ao registrar sessão');

            toast.success('Sessão registrada com sucesso!');
            onComplete();
        } catch (error) {
            toast.error('Erro ao registrar sessão.');
        } finally {
            setLoading(false);
            onClose();
        }
    };

    const handleClose = () => {
        setStep(null);
        onClose();
    };

    return (
        <>
            {step === 'appointment' && (
                <ScheduleAppointmentModal
                    isOpen={isOpen}
                    onClose={handleClose}
                    onSave={handleSaveAppointment}
                    initialData={{
                        professional: '',
                        data: defaultDateTime.slice(0, 10),
                        time: defaultDateTime.slice(11, 16),
                        sessionType: '',
                        status: 'agendado',
                        notes: ''
                    }}
                />
            )}

            {step === 'session' && sessionData && (
                <SessionModal
                    action="use"
                    doctors={doctors}
                    sessionData={sessionData}
                    onSessionDataChange={setSessionData}
                    onClose={handleClose}
                    loading={loading}
                    onSubmit={handleSubmitSession}
                />
            )}
        </>
    );
};
