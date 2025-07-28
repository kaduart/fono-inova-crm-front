import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import toast from 'react-hot-toast';
import ReactInputMask from 'react-input-mask';
import packageService, { CreatePackageParams } from '../../services/packageService';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { DURATION_OPTIONS, FREQUENCY_OPTIONS, IDoctor, IPatient, ITherapyPackage, PAYMENT_TYPES, THERAPY_TYPES } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
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
    durationMonths: 0,
    sessionsPerWeek: 0,
};

export default function TherapyPackageFormModal({ initialData, patient, doctors, onClose, onSubmit }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [remainingBalance, setRemainingBalance] = useState(0);
    const [totalValuePackage, setTotalValuePackage] = useState(0);
    const [errors, setErrors] = useState({});
    const isFormValid = !!(
        formData.patientId &&
        formData.doctorId &&
        formData.sessionType &&
        formData.paymentType &&
        formData.sessionValue > 0 &&
        formData.totalPaid > 0 &&
        formData.paymentMethod &&
        formData.date &&
        formData.time
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    useEffect(() => {
        if (patient?._id) {
            setFormData(prev => ({
                ...prev,
                patientId: patient._id,
            }));
        }
    }, [patient]); 

    useEffect(() => {
        const newBalance = Math.max(
            (formData.sessionValue * formData.totalSessions) - formData.totalPaid
        );
        setRemainingBalance(newBalance)
    }, [formData.sessionValue, formData.totalPaid, formData.totalSessions]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        // await formatDateTimeForBackend(dateTime.date, dateTime.time);

        if (!formData.sessionType || !formData.paymentType || !formData.doctorId) { // Adicionado doctorId
            toast.error('Preencha todos os campos obrigatórios (profissional, tipo de sessão, tipo de pagamento do pacote).');
            return;
        }
        if (formData.totalPaid < totalValuePackage) {
            toast.error('💳 O valor do pacote deve ser quitado integralmente no ato da contratação.');
            return
        }

        // Validação adicional se um valor foi pago
        if ((formData.totalPaid || 0) > 0 && !formData.paymentMethod) {
            toast.error('Se um valor foi pago, selecione o método de pagamento.');
            return;
        }

        const backendDateTime = {
            date: formData.date,  // "2025-07-22"
            time: formData.time   // "17:00"
        };

        setLoading(true);
        try {
            const packageData = {
                patientId: patient._id,
                doctorId: formData.doctorId,
                sessionType: formData.sessionType,
                sessionValue: formData.sessionValue || 0,
                /*totalSessions: formData.totalSessions || 0, */
                paymentType: formData.paymentType,
                amountPaid: formData.totalPaid || 0,
                paymentMethod: formData.paymentMethod,
                sessionsPerWeek: +formData.sessionsPerWeek,
                durationMonths: formData.durationMonths,
                dateTime: backendDateTime,
                specialty: formData.sessionType,
                time: formData.time
            };

            await packageService.createPackage(packageData as CreatePackageParams);

            onSubmit();
            onClose();
        } catch (err) {
            console.error('Erro ao salvar pacote:', err);
            toast.error('Erro ao salvar pacote.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let totalSessions = 0;

        if (formData.durationMonths && formData.sessionsPerWeek) {
            totalSessions = formData.durationMonths * 4 * formData.sessionsPerWeek;
        }

        setFormData(prev => ({
            ...prev,
            sessionValue: formData.sessionValue,
            totalSessions: totalSessions,
            totalPaid: formData.totalPaid || 0,
        }));
        setTotalValuePackage(totalSessions * formData.sessionValue)


    }, [formData.durationMonths, formData.sessionsPerWeek, formData.sessionValue]);

    const validate = () => {
        const newErrors = {};
        if (formData.durationMonths < 1 || formData.durationMonths > 12) {
            newErrors.durationMonths = 'Duração inválida';
        }
        if (formData.sessionsPerWeek < 1 || formData.sessionsPerWeek > 5) {
            newErrors.sessionsPerWeek = 'Frequência inválida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold border-b pb-2">
                    {initialData ? 'Editar Pacote' : 'Novo Pacote'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coluna 1 */}
                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Duração do Pacote</label>
                            <Select
                                name="durationMonths"
                                value={formData.durationMonths}
                                onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}

                            >
                                <option value="">Escolha duração do pacote</option>

                                {DURATION_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>
                                        {opt} {opt > 1 ? 'meses' : 'mês'}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Sessões por Semana</label>
                            <Select
                                name="sessionsPerWeek"
                                value={+formData.sessionsPerWeek}
                                onChange={handleChange}

                            >
                                <option value="">Escolha quantidade de vez na semana</option>

                                {FREQUENCY_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>
                                        {opt} {opt > 1 ? 'vezes' : 'vez'} por semana
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-medium mb-1">Profissional</label>
                            <Select
                                name="doctorId"
                                value={formData.doctorId}
                                onChange={handleChange}

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
                            <label className="block text-sm font-medium mb-1">Tipo de Sessão</label>
                            <Select
                                name="sessionType"
                                value={formData.sessionType}
                                onChange={handleChange}

                            >
                                <option value="">Escolha um tipo de terapia</option>
                                {THERAPY_TYPES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Campo Data */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Data *
                                </label>
                                <DatePicker
                                    selected={
                                        formData.date ? buildLocalDateOnly(formData.date) : null
                                    }
                                    onChange={(date: Date | null) => {
                                        if (!date) return;

                                        const formattedDate = date.toISOString().split('T')[0];

                                        const fakeEvent = {
                                            target: {
                                                name: 'date',
                                                value: formattedDate,
                                                type: 'text',
                                            },
                                        } as React.ChangeEvent<HTMLInputElement>;

                                        handleChange(fakeEvent);
                                    }}
                                    customInput={
                                        <ReactInputMask
                                            mask="99/99/9999"
                                            className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    }
                                    placeholderText='dd/MM/yyyy'
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />

                            </div>

                            {/* Campo Hora */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Hora *
                                </label>
                                <DatePicker
                                    selected={
                                        formData.time
                                            ? new Date(`1970-01-01T${formData.time}`)
                                            : null
                                    }
                                    onChange={(date: Date | null) => {
                                        if (!date) return;

                                        const formattedTime = date.toTimeString().slice(0, 5); // "HH:mm"

                                        const fakeEvent = {
                                            target: {
                                                name: 'time',
                                                value: formattedTime,
                                                type: 'text',
                                            },
                                        } as React.ChangeEvent<HTMLInputElement>;

                                        handleChange(fakeEvent);
                                    }}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={15}
                                    timeFormat="HH:mm"
                                    dateFormat="HH:mm"
                                    placeholderText='HH:MM'

                                    customInput={
                                        <ReactInputMask
                                            mask="99:99"
                                            className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    }
                                    className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Coluna 2 */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            {/* <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Total de Sessões</label>
                                <Input
                                    name="totalSessions"
                                    value={formData.totalSessions}
                                    onChange={handleChange}
                                    min="1"
        
                                />
                            </div> */}

                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Tipo de Pagamento</label>
                                <Select
                                    name="paymentType"
                                    value={formData.paymentType}
                                    onChange={handleChange}

                                >
                                    {PAYMENT_TYPES.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Valor por Sessão (R$)</label>

                                <InputCurrency
                                    name="sessionValue"
                                    value={formData.sessionValue || 0}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01" />
                            </div>


                            <div className="form-group">
                                <label className="block text-sm font-medium mb-1">Valor Pago (R$)</label>
                                <InputCurrency
                                    name="totalPaid"
                                    value={formData.totalPaid}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"

                                />
                            </div>

                            {(formData.totalPaid && formData.totalPaid > 0) && (
                                <div className="form-group">
                                    <label className="block text-sm font-medium mb-1">Método de Pagamento</label>
                                    <Select
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}

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
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-sm font-semibold mb-2">Pré-visualização</h3>
                        <div className="space-y-1">
                            <p className="text-sm">Valor por sessão: R$ {formData.sessionValue}</p>
                            <p className="text-sm">Total de sessões: {formData.totalSessions}</p>
                            <p className="text-sm font-semibold">Valor total: R$ {totalValuePackage}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium mb-1">Saldo Restante </label>
                        <p className="bg-red-100">
                            <b>
                                {remainingBalance}
                            </b>

                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition"
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="submit"
                        onClick={handleSave}
                        disabled={!isFormValid}
                        className={`px-4 py-2 rounded-md text-white transition ${isFormValid
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-300 cursor-not-allowed'
                            }`}
                    >
                        Agendar
                    </Button>
                </div>

            </div>
        </div>
    );
}
