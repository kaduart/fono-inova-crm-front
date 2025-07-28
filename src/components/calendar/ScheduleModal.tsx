import { X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { mergeDateAndTime } from '../../utils/dateFormat';
import { IAppointment, STATUS_OPTIONS, TherapyType } from '../../utils/types/types';
import SpecialtySelector from '../common/SpecialtySelector';
import Input from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';

type ScheduleModalProps = {
    patients: any[];
    doctors: any[];
    initialData?: IAppointment;
    payloadToSlots: (data: { doctorId: string; date: string }) => void;
    availableSlots: any[];
    mode: 'create' | 'edit';
    onSave: (data: IAppointment | Omit<IAppointment, 'id'>) => void;
    onClose: () => void;
    open: boolean;
};


const initialDataValues: IAppointment = {
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    sessionType: 'fonoaudiologia',
    status: 'agendado',
    notes: '',
    paymentAmount: 0,
    paymentMethod: 'cartao',
};
const ScheduleModal: React.FC<ScheduleModalProps> = ({
    open,
    initialData,
    patients,
    availableSlots,
    doctors,
    mode,
    payloadToSlots,
    onSave,
    onClose,
}) => {
    const [formState, setFormState] = useState<IAppointment>(initialDataValues);

    useEffect(() => {
        if (formState.doctorId && formState.date) {
            payloadToSlots({
                doctorId: formState.doctorId,
                date: formState.date,
            });
        }
    }, [formState.doctorId, formState.date]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setFormState((prevState) => ({
                ...prevState,
                [name]: value,
            }));
        },
        []
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { patientId, doctorId, date, time } = formState;

        if (!patientId || !doctorId || !date || !time) {
            toast.error('Por favor, preencha os campos obrigatórios.');
            return;
        }

        const mergedDate = mergeDateAndTime(date, time).toISOString();

        const updatedFormState = {
            ...formState,
            date: mergedDate,
            paymentAmount: 200,
            paymentMethod: 'cartao',
            sessionType: 'fonoaudiologia' as TherapyType,
        };

        onSave(updatedFormState);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]">
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl w-full max-w-md z-[1000]">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {mode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-700 -mt-7 mb-2 bg-white px-2 w-fit">
                            Dados do Agendamento
                        </h3>

                        <div className="grid gap-4">
                            <div>
                                <Label>
                                    Paciente
                                </Label>
                                <Select
                                    name="patientId"
                                    value={formState.patientId}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione paciente</option>
                                    {patients?.map(pt => (
                                        <option key={pt._id} value={pt._id}>
                                            {pt.fullName}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <SpecialtySelector
                                value={formState.specialty}
                                onChange={(value) => handleChange({ ...formState, specialty: value })}
                            />
                            <div>
                                <Label>
                                    Profissional
                                </Label>
                                <Select
                                    name="doctorId"
                                    value={formState.doctorId}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione um profissional</option>
                                    {doctors?.map(dr => (
                                        <option key={dr._id} value={dr._id}>
                                            {dr.fullName}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {formState.doctorId && (
                                    <div>
                                        <Label>
                                            Data
                                        </Label>
                                        <Input
                                            name="date"
                                            value={formState.date}
                                            onChange={handleChange}
                                            type="date"
                                        />
                                    </div>
                                )}

                                {formState.doctorId && formState.date && (
                                    <div>
                                        <Label>
                                            Hora
                                        </Label>
                                        <Select
                                            name="time"
                                            value={formState.time}
                                            onChange={handleChange}
                                        >
                                            <option value="">Selecione um horário</option>
                                            {availableSlots?.map(dr => (
                                                <option key={dr._id} value={dr._id}>
                                                    {dr}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label>
                                    Status
                                </Label>
                                <Select
                                    name="status"
                                    value={formState.status}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione um status</option>
                                    {STATUS_OPTIONS?.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Label>
                                    Motivo
                                </Label>
                                <textarea
                                    name="notes"
                                    value={formState.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {mode === 'edit' ? 'Atualizar' : 'Agendar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleModal;
