import { Calendar, DollarSign, User, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';

import { ptBR } from "date-fns/locale";
import toast from 'react-hot-toast';
import ReactInputMask from 'react-input-mask';
import Modal from 'react-modal';
import { IDoctor, IPatient, ScheduleAppointment } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/TextArea';

type ServiceType = 'package_session' | 'session' | 'individual_session' | 'evaluation';

const defaultForm: ScheduleAppointment = {
    doctorId: '',
    patientId: '',
    date: '',
    time: '',
    sessionType: 'fonoaudiologia',
    notes: '',
    paymentAmount: 0,
    paymentMethod: 'dinheiro',
    status: 'agendado',
    serviceType: 'individual_session',
    packageId: '',
};

type Props = {
    isOpen: boolean;
    onClose?: () => void;
    onSave: (appointment: ScheduleAppointment) => void;
    doctors?: IDoctor[];
    patients?: IPatient[];
    packages?: any[];
    initialData?: ScheduleAppointment | null;
    erroMessage?: string | null,
    isLoading: boolean
};

const ScheduleAppointmentModal = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    doctors,
    patients,
    erroMessage,
    isLoading
}: Props) => {
    const [formData, setFormData] = useState<ScheduleAppointment>(defaultForm);
    const [serviceType, setServiceType] = useState<ServiceType>('individual_session');
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
    registerLocale("pt-BR", ptBR);
    console.log('inciciou component', initialData)
    useEffect(() => {
        if (initialData) {
            const isoDate = new Date(initialData.date);
            const formattedDate = isoDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
            console.log('inciciou component', initialData)

            setFormData({
                ...initialData,
                //   patientId: initialData.patientId,
                date: formattedDate,
                serviceType: initialData.serviceType || 'individual_session'
            });
            setServiceType(initialData.serviceType || 'individual_session');
        } else {
            setFormData(defaultForm);
            setServiceType('individual_session');
        }
    }, [initialData, isOpen]);

    useEffect(() => {

        if (formData.packageId && formData.patientId) {
            const selectedPackage = packages?.find(pkg => pkg._id === formData.packageId);


            if (selectedPackage && selectedPackage.sessions?.length > 0) {
                const upcomingSessions = selectedPackage.sessions
                    .filter(session => session.status === 'scheduled')
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (upcomingSessions.length > 0) {
                    const closest = upcomingSessions[0];
                    const date = closest.date.split('T')[0];
                    const time = closest.date.split('T')[1].slice(0, 5);



                    setFormData((prev) => ({
                        ...prev,
                        date,
                        paymentMethod: selectedPackage.paymentMethod,
                        time,
                    }));
                }
            }
        }
    }, [formData.packageId]);


    const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const found = patients?.find((p) => p._id === id);
        setPackages(found?.packages);
        setFormData((prev) => ({
            ...prev,
            patientId: id,
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value as ServiceType;
        setServiceType(type);
        setFormData(prev => ({ ...prev, serviceType: type }));
    };

    const handleSubmit = () => {
        if (serviceType === 'package_session') {
            formData.paymentAmount = 0;
        }

        onSave({
            ...formData,
        });
    };

    // Verificação completa de campos obrigatórios
    const canSchedule = useMemo(() => {

        // Verifica campos obrigatórios
        if (!formData.patientId || !formData.doctorId || !formData.date || !formData.time || !formData.sessionType) {
            return false;
        }

        // Se for sessão de pacote
        if (formData.serviceType === 'package_session') {
            const selectedPackage = packages.find(p => p._id === formData.packageId);

            if (!selectedPackage) return false;

            const remainingSessions = (selectedPackage.totalSessions || 0) - (selectedPackage.sessionsDone || 0);

            return remainingSessions > 0;
        }

        // Se for sessão individual
        if (formData.serviceType === 'individual_session') {
            return formData.paymentAmount > 0 && !!formData.paymentMethod;
        }

        return true;
    }, [formData, packages]);

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Adicionado: Função para cancelar sessão avançada
    const handleCancelAdvancedSession = (sessionId: string) => {
        if (onCancelAdvancedSession) {
            onCancelAdvancedSession(sessionId);
        }
    };

    const buildLocalDateOnly = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day); // cria com hora 00:00 no fuso local
    }

    useEffect(() => {
        if (erroMessage) {
            toast.error(erroMessage, {
                position: 'top-center',
                style: {
                    zIndex: 999999,
                },
                duration: 4000,
            });

        }
        erroMessage = null
    }, [erroMessage]);

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className="p-6 bg-white rounded-xl max-w-2xl mx-auto my-10 shadow-xl w-full max-h-[90vh] overflow-y-auto outline-none z-[99999]"
            overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[99998]"
            ariaHideApp={false}
        >
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="text-blue-600" size={24} />
                    Novo Agendamento
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Fechar modal"
                >
                    <X size={24} />
                </button>
            </div>
            {erroMessage && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                    <p>{erroMessage}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Profissional e Paciente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="patientId" className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <Users size={18} /> Paciente
                        </Label>
                        <Select
                            name="patientId"
                            value={formData.patientId}
                            onChange={handlePatientChange}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecione um paciente</option>
                            {patients?.map(patient => (
                                <option key={patient._id} value={patient._id}>
                                    {patient.fullName}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="doctorId" className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <User size={18} /> Profissional
                        </Label>
                        <Select
                            name="doctorId"
                            value={formData.doctorId}
                            onChange={handleChange}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecione um profissional</option>
                            {doctors?.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>
                                    Dr. {doctor.fullName} - {doctor.specialty}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Especialidade e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="sessionType" className="block mb-2 font-medium text-gray-700">
                            Especialidade
                        </Label>
                        <Select
                            name="sessionType"
                            value={formData.sessionType}
                            onChange={handleChange}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="fonoaudiologia">Fonoaudiologia</option>
                            <option value="psicologia">Psicologia</option>
                            <option value="terapia_ocupacional">Terapia Ocupacional</option>
                            <option value="fisioterapia">Fisioterapia</option>
                            <option value="pediatria">Pediatria</option>
                            <option value="neuroped">Neuropediatria</option>
                        </Select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="status" className="block mb-2 font-medium text-gray-700">
                            Status
                        </Label>
                        <Select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="agendado">Agendado</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="concluído">Concluído</option>
                            <option value="cancelado">Cancelado</option>
                            <option value="faltou">Paciente Faltou</option>
                        </Select>
                    </div>
                </div>

                {/* Data e Hora */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label className="block mb-2 font-medium text-gray-700">
                            Data
                        </Label>
                        <DatePicker
                            selected={
                                formData.date
                                    ? new Date(formData.date + 'T00:00:00') // força horário local
                                    : null
                            }
                            onChange={(date) => {
                                if (!date) return;
                                const formatted = date.toLocaleDateString('sv-SE'); // yyyy-MM-dd
                                handleFieldChange('date', formatted);
                            }}
                            customInput={
                                <ReactInputMask
                                    mask="99/99/9999"
                                    className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            }
                            locale={ptBR}

                            placeholderText='DD/MM/YYYY'
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label className="block mb-2 font-medium text-gray-700">
                            Hora
                        </Label>
                        {/* <Input
                            type="time"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        /> */}
                        <DatePicker
                            selected={formData.time ? new Date(`1970-01-01T${formData.time}`) : null}
                            onChange={(date) =>
                                handleFieldChange('time', date?.toTimeString().slice(0, 5) ?? '')
                            }
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
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipo de Agendamento */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="serviceType" className="block mb-2 font-medium text-gray-700">
                            Tipo de Agendamento
                        </Label>
                        <Select
                            name="serviceType"
                            value={formData.serviceType}
                            onChange={handleTypeChange}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="individual_session">Sessão Avulsa</option>
                            <option value="package_session">Sessão de Pacote</option>
                            <option value="evaluation">Avaliação</option>
                        </Select>
                    </div>
                </div>

                {/* Pacote (se aplicável) */}
                {serviceType === 'package_session' && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 p-2 rounded-full">
                                <Calendar size={18} className="text-blue-600" />
                            </span>
                            Sessão de Pacote
                        </h3>

                        <div className="grid grid-cols-1">
                            <Label htmlFor="packageId" className="block mb-2 font-medium text-gray-700">
                                Pacote
                            </Label>
                            <Select
                                name="packageId"
                                value={formData.packageId}
                                onChange={handleChange}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Selecione um pacote</option>
                                {packages.map(pkg => (
                                    <option key={pkg._id} value={pkg._id}>
                                        {pkg.doctor.specialty} - {pkg.doctor.fullName}
                                    </option>
                                ))}
                            </Select>

                            {formData.packageId && (
                                <div className="mt-3 text-sm text-gray-600">
                                    <span className="font-medium">Sessões restantes: </span>
                                    {
                                        (() => {
                                            const selectedPackage = packages?.find(
                                                (pkg) => pkg._id === formData.packageId
                                            );

                                            return selectedPackage
                                                ? selectedPackage.totalSessions - selectedPackage.sessionsDone
                                                : 'N/A';
                                        })()
                                    }
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Pagamento (para sessão avulsa) */}
                {(serviceType === 'individual_session' || serviceType === 'evaluation') && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="bg-green-100 p-2 rounded-full">
                                <DollarSign size={18} className="text-green-600" />
                            </span>
                            Pagamento
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="block mb-2 font-medium text-gray-700">
                                    Valor
                                </Label>
                                <InputCurrency
                                    name="paymentAmount"
                                    value={formData.paymentAmount}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <Label htmlFor="paymentMethod" className="block mb-2 font-medium text-gray-700">
                                    Método de Pagamento
                                </Label>
                                <Select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">PIX</option>
                                    <option value="cartão">Cartão</option>
                                    <option value="transferência">Transferência</option>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Observações */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <Label htmlFor="notes" className="block mb-2 font-medium text-gray-700">
                        Observações
                    </Label>
                    <Textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Detalhes da sessão, observações importantes, etc."
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Botões de ação */}
            <div className="mt-8 flex justify-end gap-4">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    Cancelar
                </Button>
                <Button
                    disabled={!canSchedule || isLoading}
                    onClick={handleSubmit}
                    className={`px-6 py-3 text-white transition-colors flex items-center justify-center gap-2 ${!canSchedule || isLoading
                        ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processando...
                        </>
                    ) : (
                        'Salvar Agendamento'
                    )}

                </Button>

            </div>

        </Modal>
    );
};

export default ScheduleAppointmentModal;