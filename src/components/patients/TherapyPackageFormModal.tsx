import {
    Calculator,
    Calendar,
    Clock,
    DollarSign,
    Package,
    Plus,
    Save,
    Trash2,
    TrendingUp,
    User,
    X
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
import { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { toast } from 'react-toastify';
import { useAppointmentsContext } from '../../contexts/AppointmentsContext';
import appointmentService from '../../services/appointmentService';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { DURATION_OPTIONS, FREQUENCY_OPTIONS, IAppointment, IDoctor, IPatient, ITherapyPackage, PAYMENT_TYPES, THERAPY_TYPES } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';
import packageService from '../../services/packageService';

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
    const [calculationMode, setCalculationMode] = useState('duration');
    const [isLoading, setIsLoading] = useState(false);

    // Calculados dinamicamente (compatível com string ou número)
    const toNumber = (v: any) => {
        if (v == null) return 0;
        if (typeof v === 'number') return isNaN(v) ? 0 : v;
        if (typeof v === 'string') {
            const clean = v
                .replace(/[R$\s]/g, '') // remove R$, espaços
                .replace(/\./g, '')
                .replace(',', '.')
                .trim();
            const n = Number(clean);
            return isNaN(n) ? 0 : n;
        }
        return Number(v) || 0;
    };


    // Calcular duração estimada baseada no número de sessões e frequência
    const estimatedDuration = calculationMode === 'sessions' && formData.sessionsPerWeek > 0
        ? Math.ceil(formData.totalSessions / formData.sessionsPerWeek / 4)
        : formData.durationMonths;

    // 🧩 Atualiza totalSessions dinamicamente
    useEffect(() => {
        if (calculationMode === 'duration') {
            const total = (formData.durationMonths || 0) * 4 * (formData.sessionsPerWeek || 0);

            // evita loop infinito e re-render desnecessário
            if (formData.totalSessions !== total) {
                setFormData(prev => ({ ...prev, totalSessions: total }));
            }
        }
    }, [formData.durationMonths, formData.sessionsPerWeek, calculationMode]);



    const { fetchAppointments } = useAppointmentsContext();
    const [selectedSlots, setSelectedSlots] = useState<{ day: ''; time: '' }[]>([]);

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

        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: numericFields.includes(name)
                    ? value === '' ? 0 : Number(value)
                    : value
            };

            // ✅ Atualiza automaticamente os slots adicionais conforme a frequência
            // No handleChange, quando sessionsPerWeek muda:
            if (name === 'sessionsPerWeek') {
                const num = Number(value);

                if (num > 1) {
                    // Mantém o primeiro slot sempre preenchido com sexta-feira como padrão
                    const defaultSlots = Array.from({ length: num - 1 }, (_, index) =>
                        index === 0
                            ? { day: 'friday', time: formData.time || '17:00' }
                            : { day: '', time: '' }
                    );
                    setSelectedSlots(defaultSlots);
                } else {
                    setSelectedSlots([]);
                }
            }

            return updated;
        });

        // 🔹 Sincroniza o agendamento escolhido, se aplicável
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

    function generateSessionDates({
        startDate,
        startTime,
        totalSessions,
        sessionsPerWeek,
        selectedSlots = [],
    }: {
        startDate: string;
        startTime: string;
        totalSessions: number;
        sessionsPerWeek: number;
        selectedSlots?: { day: string; time: string }[];
    }) {
        const start = moment(startDate, "YYYY-MM-DD");
        const results: { date: string; time: string }[] = [];

        // 🔹 Mapeamento de dias da semana
        const dayToNumber: Record<string, number> = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
        };

        // 🔹 Determina os dias ativos baseados na primeira sessão + slots adicionais
        const activeDays: number[] = [];
        const dayTimes: Record<number, string> = {};

        // Primeira sessão (data inicial)
        const firstSessionDay = start.isoWeekday();
        activeDays.push(firstSessionDay);
        dayTimes[firstSessionDay] = startTime;

        // Sessões adicionais (selectedSlots)
        selectedSlots.forEach(slot => {
            if (slot.day && dayToNumber[slot.day] && slot.time) {
                const dayNum = dayToNumber[slot.day];
                if (!activeDays.includes(dayNum)) {
                    activeDays.push(dayNum);
                }
                dayTimes[dayNum] = slot.time;
            }
        });

        // 🔹 Ordena os dias da semana
        activeDays.sort((a, b) => a - b);

        let sessionsCreated = 0;
        let currentWeek = start.clone().startOf('isoWeek'); // Segunda-feira da semana inicial

        while (sessionsCreated < totalSessions) {
            // Para cada dia ativo na semana atual
            for (const dayOfWeek of activeDays) {
                if (sessionsCreated >= totalSessions) break;

                const sessionDate = currentWeek.clone().isoWeekday(dayOfWeek);

                // ⚠️ IMPORTANTE: Só inclui sessões a partir da data de início
                if (sessionDate.isBefore(start, 'day')) {
                    continue;
                }

                // ⚠️ CORREÇÃO: Garante que não cria sessões em dias passados
                if (sessionDate.isoWeekday() > 5) { // Sábado ou Domingo
                    continue;
                }

                const time = dayTimes[dayOfWeek] || startTime;

                results.push({
                    date: sessionDate.format('YYYY-MM-DD'),
                    time: time
                });

                sessionsCreated++;
            }

            // Avança para a próxima semana
            currentWeek.add(1, 'week');
        }

        return results.slice(0, totalSessions);
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);

        // No handleSave, antes de gerar as datas:
        const hasValidSlots = selectedSlots.every(slot =>
            formData.sessionsPerWeek === 1 || (slot.day && slot.time)
        );

        if (!hasValidSlots && formData.sessionsPerWeek > 1) {
            toast.error('Preencha todos os dias e horários adicionais para sessões múltiplas');
            return;
        }
        try {
            // ============================================================
            // 🧩 Cálculo do total de sessões
            // ============================================================
            const totalSessions =
                calculationMode === "sessions"
                    ? formData.totalSessions
                    : (formData.durationMonths || 0) * 4 * (formData.sessionsPerWeek || 0);

            // ============================================================
            // 📅 Gera as datas reais (usando a função declarada fora)
            // ============================================================
            let generatedSlots: { date: string; time: string }[] = [];

            if (calculationMode === "sessions") {
                // 🔹 Modo 1: Por número de sessões (já está funcionando)
                generatedSlots = generateSessionDates({
                    startDate: formData.date,
                    startTime: formData.time,
                    totalSessions,
                    sessionsPerWeek: formData.sessionsPerWeek,
                    selectedSlots,
                });
            } else {
                // 🔹 Modo 2: Por duração — usa mesma lógica do modo "sessions"
                const totalSessions = formData.durationMonths * 4 * formData.sessionsPerWeek;

                generatedSlots = generateSessionDates({
                    startDate: formData.date,
                    startTime: formData.time,
                    totalSessions,
                    sessionsPerWeek: formData.sessionsPerWeek,
                    selectedSlots,
                });

            }

            // 🔹 Remove duplicatas e ordena (garantia extra)
            const unique = Array.from(
                new Map(generatedSlots.map((s) => [`${s.date}|${s.time}`, s])).values()
            ).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

            console.log("📅 Slots gerados (preview antes do envio):");
            console.table(unique);

            // ============================================================
            // 🔹 Monta o payload final
            // ============================================================
            const packageData = {
                patientId: patient._id,
                doctorId: formData.doctorId,
                sessionType: formData.sessionType,
                specialty: formData.sessionType,
                sessionValue: formData.sessionValue || 0,
                paymentType: formData.paymentType,
                sessionsPerWeek: +formData.sessionsPerWeek,
                durationMonths:
                    calculationMode === "duration"
                        ? formData.durationMonths
                        : Math.ceil(
                            formData.totalSessions / (formData.sessionsPerWeek || 1) / 4
                        ),
                totalSessions:
                    calculationMode === "sessions"
                        ? formData.totalSessions
                        : totalSessions,
                date: formData.date,
                time: formData.time,
                calculationMode,
                selectedSlots: unique, // ✅ datas reais geradas
                payments: payments.map((p) => ({
                    amount: Number(p.amount),
                    method: p.method,
                    date: p.date,
                    description: p.description,
                })),
            };

            console.log("📤 Enviando pacote:", packageData);

            await packageService.createPackage(packageData);
            toast.success(`Pacote criado com sucesso! 💚`);
            await fetchAppointments();
            onSubmit();
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Erro ao salvar pacote.");
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

    const formatAppointmentDate = (dateString: string) => {
        if (!dateString) return 'Data inválida';
        const isoDate = `${dateString}T00:00:00`;
        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) return dateString;
        return dateObj.toLocaleDateString('pt-BR');
    };

    const [payments, setPayments] = useState([
        {
            id: 1,
            amount: 0,
            date: '',
            method: '',
            description: ''
        }
    ]);

    useEffect(() => {
        const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        setFormData(prev => ({ ...prev, totalPaid: total }));
    }, [payments]);

    const addPayment = () => {
        setPayments(prev => [
            ...prev,
            {
                id: Date.now(),
                amount: 0,
                date: '',
                method: '',
                description: ''
            }
        ]);
    };

    const removePayment = (id: number) => {
        if (payments.length > 1) {
            setPayments(prev => prev.filter(payment => payment.id !== id));
        }
    };

    const updatePayment = (id: number, field: string, value: any) => {
        setPayments(prev =>
            prev.map(payment =>
                payment.id === id ? { ...payment, [field]: value } : payment
            )
        );
    };


    const getTotalPaid = () => {
        return payments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    };

    // 🔹 Verifica se todos os pagamentos têm valor, método e data
    const hasValidPayments = payments.every(
        p => p.amount > 0 && p.method && p.date
    );

    const addSlot = () => {
        setSelectedSlots(prev => [...prev, { day: '', time: '' }]);
    };

    const removeSlot = (index: number) => {
        setSelectedSlots(prev => prev.filter((_, i) => i !== index));
    };

    const updateSlot = (index: number, field: string, value: string) => {
        setSelectedSlots(prev =>
            prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
        );
    };


    const isFormValid = !!(
        formData.patientId &&
        formData.doctorId &&
        formData.sessionType &&
        formData.paymentType &&
        formData.sessionValue > 0 &&
        hasValidPayments && // ✅ usa a nova regra
        formData.date &&
        formData.time &&
        (calculationMode === 'sessions'
            ? formData.totalSessions > 0
            : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
    );

    const { totalSessions, totalValuePackage, remainingBalance } = useMemo(() => {
        const sessions =
            calculationMode === 'sessions'
                ? toNumber(formData.totalSessions)
                : toNumber(formData.durationMonths) * 4 * toNumber(formData.sessionsPerWeek);

        const totalValue = toNumber(sessions) * toNumber(formData.sessionValue);
        const totalPaidNow = payments.reduce((sum, p) => sum + toNumber(p.amount || 0), 0);
        const remaining = Math.max(totalValue - totalPaidNow, 0);

        return {
            totalSessions: sessions,
            totalValuePackage: totalValue,
            remainingBalance: remaining,
        };
    }, [
        calculationMode,
        formData.totalSessions,
        formData.durationMonths,
        formData.sessionsPerWeek,
        formData.sessionValue,
        payments, // 👈 adiciona aqui!
    ]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden transition-all duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors p-1"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                            {initialData ? <Save className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">
                                {initialData ? 'Editar Pacote' : 'Criar Novo Pacote'}
                            </h2>
                            <p className="text-emerald-100 mt-1">
                                {initialData ? 'Atualize as informações do pacote' : `Criar pacote de terapia para ${patient.fullName}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Coluna 1 - Configuração do Pacote */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* Agendamento Existente */}
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Agendamento Existente (Opcional)
                                </h3>
                                <Select
                                    name="appointmentId"
                                    value={formData.appointmentId}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

                            {/* Configuração do Pacote */}
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-xl border border-emerald-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-emerald-600" />
                                    Configuração do Pacote
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Modo de Cálculo
                                        </label>
                                        <Select
                                            value={calculationMode}
                                            onChange={(e) => setCalculationMode(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                        >
                                            <option value="sessions">Por número de sessões</option>
                                            <option value="duration">Por duração (meses/semanas)</option>
                                        </Select>
                                    </div>
                                </div>

                                {calculationMode === 'sessions' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Número de Sessões *
                                            </label>
                                            <input
                                                name="totalSessions"
                                                min="1"
                                                max="100"
                                                value={formData.totalSessions}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                            {errors.totalSessions && (
                                                <span className="text-red-500 text-sm">{errors.totalSessions}</span>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Sessões por Semana *
                                            </label>
                                            <Select
                                                name="sessionsPerWeek"
                                                value={formData.sessionsPerWeek}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                                            <p className="text-xs text-emerald-600 mt-2 font-medium">
                                                Duração estimada: {estimatedDuration} {estimatedDuration > 1 ? 'meses' : 'mês'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Duração do Pacote *
                                            </label>
                                            <Select
                                                name="durationMonths"
                                                value={formData.durationMonths}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Sessões por Semana *
                                            </label>
                                            <Select
                                                name="sessionsPerWeek"
                                                value={formData.sessionsPerWeek}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                                    </div>
                                )}
                            </div>

                            {/* Data e Hora da Primeira Sessão */}
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-600" />
                                    Primeira Sessão
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
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
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                />
                                            }
                                            placeholderText="dd/MM/yyyy"
                                            dateFormat="dd/MM/yyyy"
                                        />
                                    </div>

                                    <div>
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
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                />
                                            }
                                        />
                                    </div>
                                </div>
                                {formData.sessionsPerWeek > 1 && (
                                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-xl border border-emerald-100 mt-4">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-emerald-600" />
                                            Dias e Horários Adicionais da Semana
                                        </h3>

                                        {selectedSlots.map((slot, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 bg-white p-4 rounded-lg border border-gray-200"
                                            >
                                                {/* Dia da semana */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Dia da Semana *</label>
                                                    <Select
                                                        value={slot.day}
                                                        onChange={(e) => updateSlot(index, 'day', e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                                    >
                                                        <option value="">Selecione o dia</option>
                                                        <option value="monday">Segunda-feira</option>
                                                        <option value="tuesday">Terça-feira</option>
                                                        <option value="wednesday">Quarta-feira</option>
                                                        <option value="thursday">Quinta-feira</option>
                                                        <option value="friday">Sexta-feira</option>
                                                    </Select>
                                                </div>

                                                {/* Hora */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Horário *</label>
                                                    <DatePicker
                                                        selected={slot.time ? new Date(`1970-01-01T${slot.time}`) : null}
                                                        onChange={(date: Date | null) => {
                                                            if (!date) return;
                                                            const formattedTime = date.toTimeString().slice(0, 5);
                                                            updateSlot(index, 'time', formattedTime);
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
                                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                                            />
                                                        }
                                                    />
                                                </div>

                                                {/* Botão de remover */}
                                                {index > 0 && (
                                                    <div className="md:col-span-2 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSlot(index)}
                                                            className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg border border-red-200 flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Remover
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Botão de adicionar novo dia */}
                                        <button
                                            type="button"
                                            onClick={addSlot}
                                            className="mt-3 text-sm text-emerald-700 flex items-center gap-2 hover:text-emerald-800"
                                        >
                                            <Plus className="w-4 h-4" /> Adicionar outro dia
                                        </button>
                                    </div>
                                )}


                            </div>

                        </div>

                        {/* Coluna 2 - Informações e Resumo */}
                        <div className="space-y-6">
                            {/* Informações do Profissional */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-amber-600" />
                                    Profissional e Sessão
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Profissional *</label>
                                        <Select
                                            name="doctorId"
                                            value={formData.doctorId}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            <option value="">Escolha um profissional</option>
                                            {doctors.map((doc) => (
                                                <option key={doc._id} value={doc._id}>
                                                    {doc.fullName}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Sessão *</label>
                                        <Select
                                            name="sessionType"
                                            value={formData.sessionType}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            <option value="">Escolha um tipo de terapia</option>
                                            {THERAPY_TYPES.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pagamento *</label>
                                        <Select
                                            name="paymentType"
                                            value={formData.paymentType}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            {PAYMENT_TYPES.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Informações Financeiras */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    Informações Financeiras
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Valor por Sessão (R$) *</label>
                                        <InputCurrency
                                            name="sessionValue"
                                            value={formData.sessionValue || 0}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                        />
                                    </div>

                                    {/* Múltiplos Pagamentos */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Formas de Pagamento
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addPayment}
                                                className="flex items-center gap-2 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg border border-green-200"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Adicionar Pagamento
                                            </button>
                                        </div>

                                        {payments.map((payment, index) => (
                                            <div key={payment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Pagamento {index + 1}
                                                    </span>
                                                    {payments.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removePayment(payment.id)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Valor */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                                            Valor (R$)*
                                                        </label>
                                                        <InputCurrency
                                                            value={payment.amount}
                                                            onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>

                                                    {/* Data */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                                            Data *
                                                        </label>
                                                        <DatePicker
                                                            selected={payment.date ? buildLocalDateOnly(payment.date) : null}
                                                            onChange={(date: Date | null) => {
                                                                if (!date) return;
                                                                const formattedDate = date.toISOString().split('T')[0];
                                                                updatePayment(payment.id, 'date', formattedDate);
                                                            }}
                                                            customInput={
                                                                <ReactInputMask
                                                                    mask="99/99/9999"
                                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                                />
                                                            }
                                                            placeholderText="dd/MM/yyyy"
                                                            dateFormat="dd/MM/yyyy"
                                                        />
                                                    </div>

                                                    {/* Método de Pagamento */}
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                                            Método de Pagamento *
                                                        </label>
                                                        <select
                                                            value={payment.method}
                                                            onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                        >
                                                            <option value="">Escolha um método</option>
                                                            <option value="dinheiro">Dinheiro</option>
                                                            <option value="pix">PIX</option>
                                                            <option value="cartao_credito">Cartão de Crédito</option>
                                                            <option value="cartao_debito">Cartão de Débito</option>
                                                            <option value="transferencia">Transferência</option>
                                                            <option value="boleto">Boleto</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total Pago */}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-blue-800">Total Pago:</span>
                                            <span className="text-lg font-bold text-blue-800">
                                                R$ {getTotalPaid().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo do Pacote */}
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    Resumo do Pacote
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Sessões totais:</span>
                                        <span className="text-sm font-semibold text-gray-900">{totalSessions}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Valor por sessão:</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            R$ {Number(formData.sessionValue || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    {calculationMode === 'sessions' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Duração estimada:</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {estimatedDuration} {estimatedDuration > 1 ? 'meses' : 'mês'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="border-t border-blue-200 pt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-blue-700">Valor total:</span>
                                            <span className="text-sm font-bold text-blue-700">
                                                R$ {Number(totalValuePackage || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo de Pagamento */}
                            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-5 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-gray-600" />
                                    Resumo de Pagamento
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Valor pago:</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            R$ {getTotalPaid().toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">Saldo restante:</span>
                                            <span className={`text-sm font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                                                }`}>
                                                R$ {Number(remainingBalance || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        {!isFormValid && "Preencha todos os campos obrigatórios (*)"}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200 font-medium"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!isFormValid || isLoading}
                            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${!isFormValid || isLoading
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <LoadingSpinner size="small" color="border-white" />
                                    <span>Salvando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {initialData ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    {initialData ? 'Atualizar Pacote' : 'Criar Pacote'}
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}