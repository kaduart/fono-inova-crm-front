import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { toast } from 'react-toastify';
import { useAppointmentsContext } from '../../contexts/AppointmentsContext';
import appointmentService from '../../services/appointmentService';
import packageService, { CreatePackageParams } from '../../services/packageService';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { DURATION_OPTIONS, FREQUENCY_OPTIONS, IAppointment, IDoctor, IPatient, ITherapyPackage, PAYMENT_TYPES, THERAPY_TYPES } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';

type Props = {
    initialData: ITherapyPackage | null;
    patient: IPatient;
    doctors: IDoctor[];
    onClose: () => void;
    onSubmit: () => void;
};

const initialFormState = {
    doctorId: '',
    patientId: '',
    sessionType: '',
    date: '',
    time: '',
    totalSessions: 1,
    sessionValue: 0,
    paymentType: 'full',
    totalPaid: 0,
    paymentMethod: '',
    paymentDate: '',
    durationMonths: 0,
    sessionsPerWeek: 0,
    appointmentId: '',
};

export default function TherapyPackageFormModal({ initialData, patient, doctors, onClose, onSubmit }: Props) {
    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [calculationMode, setCalculationMode] = useState('duration'); // 'sessions' or 'duration'
    const [isLoading, setIsLoading] = useState(false);

    // Calculados dinamicamente
    const totalSessions = calculationMode === 'sessions'
        ? formData.totalSessions
        : (formData.durationMonths || 0) * 4 * (formData.sessionsPerWeek || 0);

    const totalValuePackage = totalSessions * formData.sessionValue;
    const remainingBalance = Math.max(totalValuePackage - formData.totalPaid, 0);

    // Calcular duração estimada baseada no número de sessões e frequência
    const estimatedDuration = calculationMode === 'sessions' && formData.sessionsPerWeek > 0
        ? Math.ceil(formData.totalSessions / formData.sessionsPerWeek / 4)
        : formData.durationMonths;

    // Form válido
    const isFormValid = !!(
        formData.patientId &&
        formData.doctorId &&
        formData.sessionType &&
        formData.paymentType &&
        formData.sessionValue > 0 &&
        formData.totalPaid > 0 &&
        formData.paymentMethod &&
        formData.date &&
        formData.time &&
        (calculationMode === 'sessions' ? formData.totalSessions > 0 : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
    );

    const { fetchAppointments } = useAppointmentsContext();

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    useEffect(() => {
        if (patient?._id) {
            setFormData(prev => ({
                ...prev,
                patientId: patient._id,
            }));
            fetchAppointmentsByPatient(patient._id);
        }
    }, [patient]);

    const fetchAppointmentsByPatient = async (patientId: string) => {
        setIsLoading(true);
        try {
            const data = await appointmentService.get(patientId);
            setAppointments(data.data);
        } catch (error) {
            toast.error('Erro ao carregar agendamentos');
        } finally {
            setIsLoading(false);

        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['durationMonths', 'sessionsPerWeek', 'totalSessions', 'sessionValue', 'totalPaid'];
        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? Number(value) : value
        }));

        if (name === 'appointmentId') {
            const selectedAppointment = appointments.find(a => a._id === value);
            if (selectedAppointment) {
                setFormData(prev => ({
                    ...prev,
                    doctorId: selectedAppointment.doctor._id,
                    date: selectedAppointment.date,
                    time: selectedAppointment.time,
                    sessionType: selectedAppointment.specialty
                }));
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        if (!formData.sessionType || !formData.paymentType || !formData.doctorId) {
            toast.error('Preencha todos os campos obrigatórios (profissional, tipo de sessão, tipo de pagamento do pacote).');
            return;
        }

        if (formData.totalPaid < remainingBalance) {
            toast.warning('Valor a ser pago deve ser o valor total do package');
            return;
        }

        setIsLoading(true);

        const packageData = {
            patientId: patient._id,
            doctorId: formData.doctorId,
            sessionType: formData.sessionType,
            sessionValue: formData.sessionValue || 0,
            paymentType: formData.paymentType,
            amountPaid: formData.totalPaid || 0,
            paymentMethod: formData.paymentMethod,
            sessionsPerWeek: +formData.sessionsPerWeek,
            durationMonths: calculationMode === 'duration' ? formData.durationMonths : estimatedDuration,
            totalSessions: calculationMode === 'sessions' ? formData.totalSessions : totalSessions,
            date: formData.date,
            specialty: formData.sessionType,
            time: formData.time,
            paymentDate: formData.paymentDate,
            appointmentId: formData.appointmentId || undefined,
            calculationMode: calculationMode
        };

        try {
            await packageService.createPackage(packageData as CreatePackageParams);
            toast.success('Pacote criado com sucesso!');
            await fetchAppointments();
            onSubmit();
            onClose();
        } catch (err) {
            const errorMessage = err?.message || 'Erro ao salvar pacote.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);

        }
    };

    const validate = () => {
        const newErrors: any = {};

        if (calculationMode === 'duration') {
            if (formData.durationMonths < 1 || formData.durationMonths > 12) {
                newErrors.durationMonths = 'Duração inválida';
            }
            if (formData.sessionsPerWeek < 1 || formData.sessionsPerWeek > 5) {
                newErrors.sessionsPerWeek = 'Frequência inválida';
            }
        } else {
            if (formData.totalSessions < 1 || formData.totalSessions > 100) {
                newErrors.totalSessions = 'Número de sessões inválido';
            }
            if (formData.sessionsPerWeek < 1 || formData.sessionsPerWeek > 5) {
                newErrors.sessionsPerWeek = 'Frequência inválida';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const formatAppointmentDate = (dateString) => {
        if (!dateString) return 'Data inválida';
        const isoDate = `${dateString}T00:00:00`;
        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) return dateString;
        return dateObj.toLocaleDateString('pt-BR');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {initialData ? 'Editar Pacote' : 'Novo Pacote'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna 1 */}
                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Agendamento Existente (Opcional)
                            </label>
                            <Select
                                name="appointmentId"
                                value={formData.appointmentId}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">Selecione um agendamento</option>
                                {appointments.map((appt) => (
                                    <option
                                        key={appt._id}
                                        value={appt._id}
                                        className="text-sm"
                                    >
                                        {formatAppointmentDate(appt.date)} - {appt.time || 'Horário não definido'} •
                                        Dr. {appt.doctor?.fullName || 'Profissional não especificado'} •
                                        {appt.specialty || 'Tipo não especificado'}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Modo de Cálculo
                            </label>
                            <Select
                                value={calculationMode}
                                onChange={(e) => setCalculationMode(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                <option value="sessions">Por número de sessões</option>
                                <option value="duration">Por duração (meses/semanas)</option>
                            </Select>
                        </div>

                        {calculationMode === 'sessions' ? (
                            <>
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Número de Sessões
                                    </label>
                                    <input
                                        type="number"
                                        name="totalSessions"
                                        min="1"
                                        max="100"
                                        value={formData.totalSessions}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {errors.totalSessions && (
                                        <span className="text-red-500 text-sm">{errors.totalSessions}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sessões por Semana
                                    </label>
                                    <Select
                                        name="sessionsPerWeek"
                                        value={formData.sessionsPerWeek}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Selecione a frequência</option>
                                        {FREQUENCY_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt} {opt > 1 ? 'vezes' : 'vez'} por semana
                                            </option>
                                        ))}
                                    </Select>
                                    {errors.sessionsPerWeek && (
                                        <span className="text-red-500 text-sm">{errors.sessionsPerWeek}</span>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        Duração estimada: {estimatedDuration} {estimatedDuration > 1 ? 'meses' : 'mês'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Duração do Pacote
                                    </label>
                                    <Select
                                        name="durationMonths"
                                        value={formData.durationMonths}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Escolha duração do pacote</option>
                                        {DURATION_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt} {opt > 1 ? 'meses' : 'mês'}
                                            </option>
                                        ))}
                                    </Select>
                                    {errors.durationMonths && (
                                        <span className="text-red-500 text-sm">{errors.durationMonths}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sessões por Semana
                                    </label>
                                    <Select
                                        name="sessionsPerWeek"
                                        value={formData.sessionsPerWeek}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Escolha quantidade de vez na semana</option>
                                        {FREQUENCY_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt} {opt > 1 ? 'vezes' : 'vez'} por semana
                                            </option>
                                        ))}
                                    </Select>
                                    {errors.sessionsPerWeek && (
                                        <span className="text-red-500 text-sm">{errors.sessionsPerWeek}</span>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data 1ª Sessao*</label>
                                <DatePicker
                                    selected={formData.date ? buildLocalDateOnly(formData.date) : null}
                                    onChange={(date: Date | null) => {
                                        if (!date) return;
                                        const formattedDate = date.toISOString().split('T')[0];
                                        handleChange({ target: { name: 'date', value: formattedDate } } as any);
                                    }}
                                    customInput={
                                        <ReactInputMask
                                            mask="99/99/9999"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    }
                                    placeholderText="dd/MM/yyyy"
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hora *</label>
                                <DatePicker
                                    selected={formData.time ? new Date(`1970-01-01T${formData.time}`) : null}
                                    onChange={(date: Date | null) => {
                                        if (!date) return;
                                        const formattedTime = date.toTimeString().slice(0, 5);
                                        handleChange({ target: { name: 'time', value: formattedTime } } as any);
                                    }}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={15}
                                    timeFormat="HH:mm"
                                    dateFormat="HH:mm"
                                    placeholderText="HH:MM"
                                    customInput={
                                        <ReactInputMask
                                            mask="99:99"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Coluna 2 */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Profissional</label>
                                <Select
                                    name="doctorId"
                                    value={formData.doctorId}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Escolha um profissional</option>
                                    {doctors.map((doc) => (
                                        <option key={doc._id} value={doc._id}>
                                            {doc.fullName}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Sessão</label>
                                <Select
                                    name="sessionType"
                                    value={formData.sessionType}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Escolha um tipo de terapia</option>
                                    {THERAPY_TYPES.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pagamento</label>
                                <Select
                                    name="paymentType"
                                    value={formData.paymentType}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {PAYMENT_TYPES.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Valor por Sessão (R$)</label>
                                <InputCurrency
                                    name="sessionValue"
                                    value={formData.sessionValue || 0}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Pago (R$)</label>
                                <InputCurrency
                                    name="totalPaid"
                                    value={formData.totalPaid}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Pagamento Pacote*</label>
                                <DatePicker
                                    selected={formData.paymentDate ? buildLocalDateOnly(formData.paymentDate) : null}
                                    onChange={(date: Date | null) => {
                                        if (!date) return;
                                        const formattedDate = date.toISOString().split('T')[0];
                                        handleChange({ target: { name: 'paymentDate', value: formattedDate } } as any);
                                    }}
                                    customInput={
                                        <ReactInputMask
                                            mask="99/99/9999"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    }
                                    placeholderText="dd/MM/yyyy"
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            {(formData.totalPaid && formData.totalPaid > 0) && (
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pagamento</label>
                                    <Select
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Escolha um método</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">PIX</option>
                                        <option value="cartão">Cartão</option>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview e Saldo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-semibold text-blue-800 mb-2">Resumo do Pacote</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Valor por sessão:</span>
                                <span className="text-sm font-medium">R$ {formData.sessionValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total de sessões:</span>
                                <span className="text-sm font-medium">{totalSessions}</span>
                            </div>
                            {calculationMode === 'sessions' && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Duração estimada:</span>
                                    <span className="text-sm font-medium">{estimatedDuration} {estimatedDuration > 1 ? 'meses' : 'mês'}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-blue-100">
                                <span className="text-sm font-semibold text-blue-800">Valor total:</span>
                                <span className="text-sm font-semibold text-blue-800">R$ {totalValuePackage.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Pagamento</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Valor pago:</span>
                                <span className="text-sm font-medium">R$ {formData.totalPaid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">Saldo restante:</span>
                                <span className={`text-sm font-semibold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    R$ {remainingBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                        className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleSave}
                        disabled={!isFormValid || isLoading}
                        className={`px-6 py-2 text-white ${isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
                    >
                        {isLoading ? (
                            <>
                                <LoadingSpinner size="small" color="border-white" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            `${initialData ? 'Atualizar' : 'Criar'} Pacote`


                        )}

                    </Button>
                </div>
            </div>
        </div>
    );
}