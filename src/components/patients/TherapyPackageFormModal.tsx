import {
    Calculator,
    Calendar,
    Clock,
    DollarSign,
    Package,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    TrendingUp,
    User,
    X
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
import { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { toast } from 'react-toastify';

import appointmentService from '../../services/appointmentService';
import packageService from '../../services/packageService';
import API from '../../services/api';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { extractErrorMessage } from '../../utils/errorUtils';
import { DURATION_OPTIONS, FREQUENCY_OPTIONS, IAppointment, IDoctor, IPatient, ITherapyPackage, PAYMENT_TYPES, THERAPY_TYPES } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';
import { validateObject, required, betweenNumber, minNumber } from "../../utils/validators";

const WEEKS_PER_MONTH = 4;

const normSpec = (specialty: string) => (specialty || '').toLowerCase().replace(/_/g, ' ').trim();

const therapyValueForSpecialty = (specialty?: string) => THERAPY_TYPES.find(option =>
    normSpec(option.value) === normSpec(specialty || '') ||
    normSpec(option.label) === normSpec(specialty || '')
)?.value;

// Semanal = ocorrência toda semana (intervalWeeks=1). Quinzenal = ocorrência a
// cada 2 semanas (intervalWeeks=2) — mesma "Sessões por Semana"/slots dentro da
// semana ativa, só espaçados o dobro. Centraliza a matemática de duração↔sessões
// pra não duplicar `durationMonths * 4 * sessionsPerWeek` em 4+ lugares diferentes.
function sessionsForDuration(durationMonths: number, sessionsPerOccurrence: number, intervalWeeks: number): number {
    const weeksAvailable = (durationMonths || 0) * WEEKS_PER_MONTH;
    const occurrences = Math.floor(weeksAvailable / intervalWeeks);
    return occurrences * (sessionsPerOccurrence || 0);
}

function durationForSessions(totalSessions: number, sessionsPerOccurrence: number, intervalWeeks: number): number {
    if (!sessionsPerOccurrence) return 0;
    const occurrencesNeeded = Math.ceil((totalSessions || 0) / sessionsPerOccurrence);
    const weeksNeeded = occurrencesNeeded * intervalWeeks;
    return Math.ceil(weeksNeeded / WEEKS_PER_MONTH);
}

const rules = {
    doctorId: [required("Profissional")],
    sessionType: [required("Tipo de sessão")],
    paymentType: [required("Tipo de pagamento")],
    date: [required("Data")],
    time: [required("Hora")],
    sessionValue: [minNumber("Valor por sessão", 0.01)],
    sessionsPerWeek: [betweenNumber("Sessões por semana", 1, 5)],
    durationMonths: [
        (v: any, all: any) => (all.calculationMode === "duration" ? betweenNumber("Duração", 1, 12)(v) : ""),
    ],
    totalSessions: [
        (v: any, all: any) => (all.calculationMode === "sessions" ? betweenNumber("Número de sessões", 1, 100)(v) : ""),
    ],
} as const;

type Props = {
    initialData: ITherapyPackage | null;
    patient: IPatient;
    doctors: IDoctor[];
    onClose: () => void;
    onSubmit: (newPackageId?: string) => void; // 🔥 Agora retorna o ID do pacote criado
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
    notes: '',
};

type FormState = typeof initialFormState;
type FormErrors = Partial<Record<keyof FormState | "payments" | "slots" | "selectedGuide" | "dailySessionTimes", string>>;

export default function TherapyPackageFormModal({ initialData, patient, doctors, onClose, onSubmit }: Props) {
    const isEditing = !!initialData;
    const [errors, setErrors] = useState<FormErrors>({});
    const [formData, setFormData] = useState(initialFormState);
    const selectedAppointmentIdRef = useRef<string>(''); // ref para garantir valor no submit
    const specialtyDerivedFromDebtRef = useRef(false);
    const previousSessionTypeRef = useRef('');
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [calculationMode, setCalculationMode] = useState('duration');
    const [frequencyInterval, setFrequencyInterval] = useState<'weekly' | 'biweekly'>('weekly');
    const intervalWeeks = frequencyInterval === 'biweekly' ? 2 : 1;
    const occurrenceLabel = frequencyInterval === 'biweekly' ? 'quinzena' : 'semana';
    const [isLoading, setIsLoading] = useState(false);



    // 🆕 Estados para Sessões no Mesmo Dia
    const [sameDaySessions, setSameDaySessions] = useState(false);
    const [dailySessionTimes, setDailySessionTimes] = useState<string[]>(['16:00', '16:40']);

    // 🆕 Estados para importação de pendências
    const [v2ImportedSessions, setV2ImportedSessions] = useState<Array<{
        id: string;
        v2PaymentId: string;
        amount: number;
        date: string;
        time?: string;
        specialty: string;
        doctorId?: string;
        doctorName?: string;
        status: string;
        source: string;
    }>>([]);
    const [v2ImportLoading, setV2ImportLoading] = useState(false);
    const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set());
    const [pendingSettlement, setPendingSettlement] = useState<{
        packageId: string;
        paymentIds: string[];
        paymentMethod: string;
    } | null>(null);

    // normaliza especialidade para comparação (fonoaudiologia == Fonoaudiologia == terapia_ocupacional == Terapia Ocupacional)
    // débitos filtrados pela especialidade selecionada no formulário
    const filteredDebts = useMemo(() => {
        if (!formData.sessionType) return v2ImportedSessions;
        return v2ImportedSessions.filter(s => normSpec(s.specialty) === normSpec(formData.sessionType));
    }, [v2ImportedSessions, formData.sessionType]);

    const otherSpecialtyDebts = useMemo(() => {
        if (!formData.sessionType) return [];
        return v2ImportedSessions.filter(s => normSpec(s.specialty) !== normSpec(formData.sessionType));
    }, [v2ImportedSessions, formData.sessionType]);

    const selectedDebtTotal = useMemo(
        () => filteredDebts
            .filter(debt => selectedDebtIds.has(debt.v2PaymentId))
            .reduce((sum, debt) => sum + Number(debt.amount || 0), 0),
        [filteredDebts, selectedDebtIds]
    );

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

    function validateAll() {
        const baseErrors: any = {};

        // Em edição o único campo gravável é `notes` (ver packageUpdatePolicy.js
        // no backend). Validar profissional/valor/pagamentos aqui só travaria o
        // salvamento por causa de dados históricos que nem são enviados.
        if (isEditing) {
            if ((formData.notes || '').length > 500) {
                baseErrors.notes = "Observação deve ter no máximo 500 caracteres";
            }
            setErrors(baseErrors);
            return Object.keys(baseErrors).length === 0;
        }

        // Regras comuns (ambos os modos)
        if (!formData.doctorId) baseErrors.doctorId = "Profissional é obrigatório";
        if (!formData.sessionType) baseErrors.sessionType = "Tipo de sessão é obrigatório";
        if (!formData.paymentType) baseErrors.paymentType = "Tipo de pagamento é obrigatório";

        const sessionValue = Number(formData.sessionValue);
        if (!sessionValue || sessionValue < 0.01) {
            baseErrors.sessionValue = "Valor por sessão deve ser maior que zero";
        }

        // 🔥 Só valida pagamentos se NÃO for per-session
        if (formData.paymentType !== 'per-session') {
            const hasValidPayments = payments.every(p => Number(p.amount) > 0 && !!p.method && !!p.date);
            if (!hasValidPayments) baseErrors.payments = "Preencha valor, método e data em todos os pagamentos.";
        }

        // Regras exclusivas de criação
        if (!formData.date) baseErrors.date = "Data é obrigatória";
        if (!formData.time) baseErrors.time = "Hora é obrigatória";

        if (formData.appointmentId) {
            if (!selectedExistingAppointment) {
                baseErrors.appointmentId = 'O agendamento selecionado não está mais disponível';
            } else {
                const appointmentPatientId = selectedExistingAppointment.patient?._id
                    || selectedExistingAppointment.patientId;
                const appointmentDoctorId = selectedExistingAppointment.doctor?._id
                    || selectedExistingAppointment.doctorId;
                const appointmentDate = selectedExistingAppointment.date instanceof Date
                    ? selectedExistingAppointment.date.toISOString().split('T')[0]
                    : String(selectedExistingAppointment.date).split('T')[0];

                if (String(appointmentPatientId || '') !== String(realPatientId || '')) {
                    baseErrors.appointmentId = 'O agendamento não pertence a este paciente';
                } else if (String(appointmentDoctorId || '') !== String(formData.doctorId || '')) {
                    baseErrors.appointmentId = 'O profissional deve ser o mesmo do agendamento selecionado';
                } else if (normSpec(selectedExistingAppointment.specialty || '') !== normSpec(formData.sessionType || '')) {
                    baseErrors.appointmentId = 'A especialidade deve ser a mesma do agendamento selecionado';
                } else if (appointmentDate !== String(formData.date).split('T')[0]
                    || selectedExistingAppointment.time !== formData.time) {
                    baseErrors.appointmentId = 'A data e a hora devem corresponder ao agendamento selecionado';
                }

            }
        }

        const alreadyPaid = selectedExistingAppointment?.payment?.status === 'paid'
            ? Number(selectedExistingAppointment.payment.amount || 0)
            : 0;
        const contractualSessions = calculationMode === 'sessions'
            ? toNumber(formData.totalSessions)
            : sessionsForDuration(formData.durationMonths, formData.sessionsPerWeek, intervalWeeks);
        const contractualValue = contractualSessions * Number(formData.sessionValue || 0);
        const newPaymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        if (newPaymentTotal > Math.max(0, contractualValue - alreadyPaid) + 0.009) {
            baseErrors.payments = `O valor informado ultrapassa o saldo do pacote. Máximo permitido agora: R$ ${Math.max(0, contractualValue - alreadyPaid).toFixed(2)}.`;
        }
        if (selectedDebtTotal > 0 && newPaymentTotal + 0.009 < selectedDebtTotal) {
            baseErrors.payments = `As sessões retroativas selecionadas somam R$ ${selectedDebtTotal.toFixed(2)}. Informe pelo menos esse valor para quitá-las.`;
        }

        // Validação de sessões por semana
        const sessionsPerWeek = Number(formData.sessionsPerWeek);

        if (sameDaySessions) {
            if (dailySessionTimes.length < 2) {
                baseErrors.dailySessionTimes = "Adicione pelo menos 2 horários para sessões no mesmo dia";
            }
        } else {
            if (!sessionsPerWeek || sessionsPerWeek < 1 || sessionsPerWeek > 5) {
                baseErrors.sessionsPerWeek = `Sessões por ${occurrenceLabel} deve estar entre 1 e 5`;
            }
        }

        // Validação de duração/sessões baseado no modo
        if (calculationMode === 'duration') {
            const duration = Number(formData.durationMonths);
            if (!duration || duration < 1 || duration > 12) {
                baseErrors.durationMonths = "Duração deve estar entre 1 e 12 meses";
            }
        } else {
            const total = Number(formData.totalSessions);
            if (!total || total < 1 || total > 100) {
                baseErrors.totalSessions = "Total de sessões deve estar entre 1 e 100";
            }
        }

        if (selectedDebtIds.size >= contractualSessions && contractualSessions > 0) {
            baseErrors.totalSessions = `O pacote precisa ter pelo menos 1 sessão futura. Com ${selectedDebtIds.size} retroativas, escolha no mínimo ${selectedDebtIds.size + 1} sessões no total.`;
        }

        // Slots adicionais se sessionsPerWeek > 1
        if (sessionsPerWeek > 1) {
            const ok = selectedSlots.every(s => !!s.day && !!s.time);
            if (!ok) baseErrors.slots = "Preencha todos os dias/horários adicionais.";
        }

        setErrors(baseErrors);
        return Object.keys(baseErrors).length === 0;
    }

    // Calcular duração estimada baseada no número de sessões e frequência
    const estimatedDuration = calculationMode === 'sessions' && formData.sessionsPerWeek > 0
        ? durationForSessions(formData.totalSessions, formData.sessionsPerWeek, intervalWeeks)
        : formData.durationMonths;

    // 🧩 Atualiza totalSessions dinamicamente
    useEffect(() => {
        if (calculationMode === 'duration') {
            const total = sessionsForDuration(formData.durationMonths, formData.sessionsPerWeek, intervalWeeks);

            // evita loop infinito e re-render desnecessário
            if (formData.totalSessions !== total) {
                setFormData(prev => ({ ...prev, totalSessions: total }));
            }
        }
    }, [formData.durationMonths, formData.sessionsPerWeek, calculationMode, intervalWeeks]);

    const [selectedSlots, setSelectedSlots] = useState<Array<{ day: string; time: string }>>([]);

    // real patient _id (patients_view has patientId pointing to the actual Patient document)
    const realPatientId = patient?.patientId || patient?._id;

    useEffect(() => {
        console.log('[TherapyPackageFormModal] Carregando paciente:', realPatientId);
        if (realPatientId) {
            setFormData(prev => ({
                ...prev,
                patientId: realPatientId,
            }));
            fetchAppointmentsByPatient(realPatientId);
        }
    }, [realPatientId]);

    // Popular formulário quando estiver editando um pacote existente
    useEffect(() => {
        if (!initialData) return;

        const doctorId = initialData.doctorId
            || (initialData as any).doctor?._id?.toString?.()
            || (initialData as any).doctor?.toString?.()
            || '';

        const firstSession = initialData.sessions?.[0];
        const sessionDate = firstSession?.date
            ? (firstSession.date as string).substring(0, 10)
            : '';
        const sessionTime = firstSession?.time || '';

        const model = (initialData as any).model || initialData.paymentType || 'prepaid';
        const paymentType = model === 'per_session' ? 'per-session' : 'full';

        // Determina modo de cálculo: se totalSessions está preenchido, assume modo 'sessions'
        const hasDuration = Boolean((initialData as any).durationMonths);
        setCalculationMode(hasDuration ? 'duration' : 'sessions');
        setFrequencyInterval((initialData as any).frequencyInterval === 'biweekly' ? 'biweekly' : 'weekly');

        setFormData(prev => ({
            ...prev,
            doctorId,
            sessionType: initialData.sessionType || '',
            date: sessionDate,
            time: sessionTime,
            totalSessions: initialData.totalSessions || 1,
            sessionValue: initialData.sessionValue || 0,
            paymentType,
            durationMonths: (initialData as any).durationMonths || 0,
            sessionsPerWeek: (initialData as any).sessionsPerWeek || 0,
            notes: (initialData as any).notes || '',
        }));

        if (Array.isArray(initialData.payments) && initialData.payments.length > 0) {
            setPayments(
                initialData.payments.map((p: any, i: number) => ({
                    id: p._id || i,
                    amount: Number(p.amount) || 0,
                    date: p.paymentDate || p.date ? (p.paymentDate || p.date).substring(0, 10) : '',
                    method: p.method || p.paymentMethod || '',
                    description: p.description || p.notes || '',
                }))
            );
        }
    }, [initialData]);

    // Auto-carrega débitos ao selecionar especialidade; limpa seleção e sessionValue anterior
    useEffect(() => {
        const currentSessionType = formData.sessionType;
        const previousSessionType = previousSessionTypeRef.current;

        if (!currentSessionType || !realPatientId) {
            previousSessionTypeRef.current = currentSessionType;
            return;
        }
        if (specialtyDerivedFromDebtRef.current) {
            specialtyDerivedFromDebtRef.current = false;
            previousSessionTypeRef.current = currentSessionType;
            return;
        }

        const specialtyActuallyChanged = previousSessionType !== ''
            && normSpec(previousSessionType) !== normSpec(currentSessionType);
        previousSessionTypeRef.current = currentSessionType;

        if (specialtyActuallyChanged) {
            setSelectedDebtIds(new Set());
            setFormData(prev => ({ ...prev, sessionValue: 0 }));
        }
        handleImportFromV2();
    }, [formData.sessionType]);

    // Ao marcar/desmarcar débitos: auto-preenche sessionValue e recalcula total do pagamento
    useEffect(() => {
        // usa apenas débitos da especialidade atual (filtrados)
        const selected = filteredDebts.filter(s => selectedDebtIds.has(s.v2PaymentId));
        if (selected.length === 0) {
            const linkedAppointment = appointments.find(appointment =>
                String(appointment._id || appointment.id) === String(formData.appointmentId)
            );
            const linkedDate = linkedAppointment?.date
                ? (linkedAppointment.date instanceof Date
                    ? linkedAppointment.date.toISOString().split('T')[0]
                    : String(linkedAppointment.date).split('T')[0])
                : '';
            setFormData(prev => ({
                ...prev,
                date: linkedDate,
                time: linkedAppointment?.time || '',
            }));
            return;
        }

        const oldestDebt = [...selected].sort((a, b) => {
            const first = `${String(a.date || '').split('T')[0]}T${a.time || '00:00'}`;
            const second = `${String(b.date || '').split('T')[0]}T${b.time || '00:00'}`;
            return first.localeCompare(second);
        })[0];
        const debtSessionType = therapyValueForSpecialty(oldestDebt.specialty);

        selectedAppointmentIdRef.current = '';
        if (debtSessionType && formData.sessionType !== debtSessionType) {
            specialtyDerivedFromDebtRef.current = true;
        }
        setFormData(prev => ({
            ...prev,
            appointmentId: '',
            date: String(oldestDebt.date || '').split('T')[0],
            time: oldestDebt.time || '',
            doctorId: oldestDebt.doctorId || prev.doctorId,
            sessionType: debtSessionType || prev.sessionType,
        }));

        // sessionValue vem do primeiro débito da especialidade correta
        const debtValue = selected[0].amount;
        if (debtValue > 0) {
            setFormData(prev => ({ ...prev, sessionValue: debtValue }));
        }

        // Sugere somente o valor das retroativas. A pessoa pode alterar depois;
        // mudanças de duração/frequência não sobrescrevem esse campo.
        const total = selected.reduce((sum, debt) => sum + Number(debt.amount || 0), 0);
        if (total > 0 && payments.length > 0) {
            setPayments(prev => prev.map((p, i) => i === 0 ? { ...p, amount: total } : p));
            lastSuggestedPaymentAmountRef.current = total;
        }
    }, [appointments, filteredDebts, formData.appointmentId, selectedDebtIds]);



    const fetchAppointmentsByPatient = async (patientId: string) => {
        setIsLoading(true);
        try {
            console.log('[TherapyPackageFormModal] Buscando agendamentos para paciente (V2):', patientId);
            // Usa endpoint V2 com filtro de patientId
            const response = await appointmentService.list({
                patientId: patientId,
                limit: 100
            });
            console.log('[TherapyPackageFormModal] Resposta da API V2:', response);

            // Extrai dados da resposta V2: { data: { appointments: [...], pagination: {...} } }
            const appointmentsData = response.data?.data?.appointments ||
                response.data?.appointments ||
                response.data?.data ||
                response.data ||
                [];
            console.log('[TherapyPackageFormModal] Agendamentos extraídos:', appointmentsData);
            console.log('[TherapyPackageFormModal] Tipo:', typeof appointmentsData, 'É array?', Array.isArray(appointmentsData));

            // Garante que é um array
            if (Array.isArray(appointmentsData)) {
                setAppointments(appointmentsData);
            } else {
                console.warn('[TherapyPackageFormModal] Resposta não é array, usando []');
                setAppointments([]);
            }
        } catch (error) {
            console.error('[TherapyPackageFormModal] Erro ao carregar agendamentos:', error);
            toast.error('Erro ao carregar agendamentos');
        } finally {
            setIsLoading(false);
        }
    };



    // Handler: carrega pendências financeiras do paciente
    const handleImportFromV2 = async () => {
        if (!realPatientId) return;
        setV2ImportLoading(true);
        try {
            const res = await API.get(`/v2/balance/${realPatientId}`);
            const items = res.data?.data?.v2_financial?.items || [];

            const existingIds = new Set(
                v2ImportedSessions
                    .filter(s => s.source === 'V2_BALANCE')
                    .map(s => s.v2PaymentId)
            );

            const newSessions = items
                .filter((item: any) => !existingIds.has(item._id))
                .map((item: any) => ({
                    id: crypto.randomUUID(),
                    source: 'V2_BALANCE',
                    v2PaymentId: item._id,
                    amount: item.amount,
                    date: item.serviceDate || item.appointment?.date || item.paymentDate,
                    time: item.appointment?.time,
                    specialty: item.specialty,
                    doctorId: item.session?.doctor?._id || item.appointment?.doctor?._id || item.doctor?._id,
                    doctorName: item.session?.doctor?.fullName || item.appointment?.doctor?.fullName || item.doctor?.fullName,
                    status: 'PENDING',
                }));

            if (newSessions.length === 0) {
                toast.info('Nenhuma pendência nova encontrada.');
                return;
            }

            setV2ImportedSessions(prev => [...prev, ...newSessions]);
            toast.success(`${newSessions.length} pendência(s) carregadas. Selecione as que deseja absorver.`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao buscar pendências.');
        } finally {
            setV2ImportLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {

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

                // Se sameDaySessions estiver ativo, ignoramos a lógica de slots adicionais
                if (!sameDaySessions) {
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
            }

            return updated;
        });

        // 🔹 Sincroniza o agendamento escolhido, se aplicável
        if (name === 'appointmentId') {
            selectedAppointmentIdRef.current = value; // 🔗 ref sempre atualizado
            const selectedAppointment = appointments.find(a => (a._id || a.id) === value);
            const selectedAppointmentDate = selectedAppointment?.date
                ? (selectedAppointment.date instanceof Date
                    ? selectedAppointment.date.toISOString().split('T')[0]
                    : String(selectedAppointment.date).split('T')[0])
                : undefined;
            setFormData(prev => ({
                ...prev,
                appointmentId: value,
                ...(selectedAppointment && {
                    doctorId: selectedAppointment.doctor?._id || selectedAppointment.doctorId,
                    date: selectedAppointmentDate,
                    time: selectedAppointment.time,
                    sessionType: selectedAppointment.specialty
                })
            }));
            return;
        }
    };

    // 🆕 Effect para sincronizar sessionsPerWeek com dailySessionTimes
    useEffect(() => {
        if (sameDaySessions) {
            setFormData(prev => ({
                ...prev,
                sessionsPerWeek: dailySessionTimes.length
            }));
        }
    }, [sameDaySessions, dailySessionTimes]);

    function generateSessionDates({
        startDate,
        startTime,
        totalSessions,
        sessionsPerWeek,
        selectedSlots = [],
        sameDaySessions = false,
        dailySessionTimes = [],
        intervalWeeks = 1
    }: {
        startDate: string;
        startTime: string;
        totalSessions: number;
        sessionsPerWeek: number;
        selectedSlots?: { day: string; time: string }[];
        sameDaySessions?: boolean;
        dailySessionTimes?: string[];
        intervalWeeks?: number;
    }) {
        const start = moment(startDate, "YYYY-MM-DD");
        const results: { date: string; time: string }[] = [];

        // 🆕 Lógica para Sessões no Mesmo Dia
        if (sameDaySessions && dailySessionTimes.length > 0) {
            let sessionsCreated = 0;
            let currentWeek = start.clone().startOf('isoWeek');
            const dayOfWeek = start.isoWeekday(); // Dia da semana da data de início

            // Ordena horários para garantir ordem cronológica
            const sortedTimes = [...dailySessionTimes].sort();

            while (sessionsCreated < totalSessions) {
                const sessionDate = currentWeek.clone().isoWeekday(dayOfWeek);

                // Só processa se a data for válida (>= start date e não fim de semana se desejado)
                if (sessionDate.isSameOrAfter(start, 'day') && sessionDate.isoWeekday() <= 5) {
                    for (const time of sortedTimes) {
                        if (sessionsCreated >= totalSessions) break;
                        results.push({
                            date: sessionDate.format('YYYY-MM-DD'),
                            time: time
                        });
                        sessionsCreated++;
                    }
                }

                // Semanal = avança 1 semana; quinzenal = pula 2 (ocorrência a cada 15 dias)
                currentWeek.add(intervalWeeks, 'week');
            }
            return results;
        }

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

            // Avança para a próxima ocorrência (1 semana no modo semanal, 2 no quinzenal)
            currentWeek.add(intervalWeeks, 'week');
        }

        return results.slice(0, totalSessions);
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // O pacote já existe: em caso de falha de rede, repete somente a quitação.
        // Recriar o pacote aqui produziria duplicidade e manteria o débito pendente.
        if (pendingSettlement) {
            setIsLoading(true);
            try {
                await API.post(`/v2/packages/${pendingSettlement.packageId}/settle-payments`, {
                    paymentIds: pendingSettlement.paymentIds,
                    paymentMethod: pendingSettlement.paymentMethod,
                });
                toast.success(`${pendingSettlement.paymentIds.length} pendência(s) quitadas e vinculadas ao pacote.`);
                const settledPackageId = pendingSettlement.packageId;
                setPendingSettlement(null);
                onSubmit(settledPackageId);
                onClose();
            } catch (settleErr: unknown) {
                toast.error(`A quitação ainda não foi concluída. Tente novamente: ${extractErrorMessage(settleErr, 'erro desconhecido')}`);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        if (!validateAll()) return;
        setIsLoading(true);

        // No handleSave, antes de gerar as datas:
        const hasValidSlots = selectedSlots.every(slot =>
            formData.sessionsPerWeek === 1 || (slot.day && slot.time)
        );

        if (!hasValidSlots && formData.sessionsPerWeek > 1) {
            toast.error("Preencha todos os dias e horários adicionais para sessões múltiplas");
            setIsLoading(false);
            return;
        }

        // ============================================================
        // ✏️ EDIÇÃO: só campo cadastral. Valor, quantidade de sessões,
        // especialidade, profissional e pagamentos são fatos históricos ou
        // exigem propagação para Appointment/Session/Payment — cada um tem
        // seu fluxo próprio (troca em lote, inativação, transferência).
        // Mandar tudo aqui gerava 500 opaco ou gravação silenciosamente
        // descartada pelo Mongoose.
        // ============================================================
        if (isEditing) {
            const realPackageId = initialData?.packageId || initialData?._id;
            if (!realPackageId) {
                toast.error('Pacote não identificado');
                setIsLoading(false);
                return;
            }
            try {
                const result: any = await packageService.updatePackage(realPackageId, {
                    notes: formData.notes,
                });
                if (result?.changed === false) {
                    toast.info(result?.message || 'Nenhuma alteração a salvar.');
                } else {
                    toast.success('Pacote atualizado com sucesso! 💚');
                }
                onSubmit();
                onClose();
            } catch (err: any) {
                toast.error(extractErrorMessage(err, 'Erro ao salvar pacote.'));
            } finally {
                setIsLoading(false);
            }
            return;
        }

        try {
            // ============================================================
            // 🧩 Cálculo do total de sessões (daqui pra baixo: só CRIAÇÃO)
            // ============================================================
            const contractualTotalSessions = calculationMode === "sessions"
                ? formData.totalSessions
                : sessionsForDuration(formData.durationMonths, formData.sessionsPerWeek, intervalWeeks);
            const numPreConsumed = v2ImportedSessions.filter(s => selectedDebtIds.has(s.v2PaymentId)).length;
            const futureSessions = Math.max(0, contractualTotalSessions - numPreConsumed);

            // ============================================================
            // 📅 Gera as datas reais
            // ============================================================
            let schedule: { date: string; time: string }[] = [];

            {
                const generatedSlots = generateSessionDates({
                    startDate: formData.date,
                    startTime: formData.time,
                    totalSessions: contractualTotalSessions,
                    sessionsPerWeek: formData.sessionsPerWeek,
                    selectedSlots,
                    sameDaySessions,
                    dailySessionTimes,
                    intervalWeeks
                });
                // A cadência começa na retroativa mais antiga. As primeiras ocorrências
                // já foram consumidas e não devem virar novos agendamentos.
                const futureSlots = generatedSlots.slice(numPreConsumed);
                const unique = Array.from(
                    new Map(futureSlots.map((s) => [`${s.date}|${s.time}`, s])).values()
                ).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
                schedule = unique.map((slot) => ({ date: slot.date, time: slot.time }));
                console.log("📅 Slots gerados localmente:", schedule);
            }

            // Os Payments pendentes originais são a fonte canônica do valor usado
            // para quitar as retroativas. Só o excedente vira novo receipt do pacote.
            let debtAmountToAllocate = selectedDebtTotal;
            const packagePayments = payments
                .map((payment) => {
                    const grossAmount = Number(payment.amount || 0);
                    const debtAllocation = Math.min(grossAmount, debtAmountToAllocate);
                    debtAmountToAllocate -= debtAllocation;
                    return { ...payment, amount: grossAmount - debtAllocation };
                })
                .filter(payment => payment.amount > 0.009);

            const packageData = {
                    patientId: realPatientId,
                    doctorId: formData.doctorId,
                    sessionType: formData.sessionType,
                    specialty: formData.sessionType,
                    sessionValue: formData.sessionValue || 0,
                    paymentType: formData.paymentType,
                    sessionsPerWeek: +formData.sessionsPerWeek,
                    durationMonths:
                        calculationMode === "duration"
                            ? formData.durationMonths
                            : durationForSessions(formData.totalSessions, formData.sessionsPerWeek, intervalWeeks),
                    totalSessions: futureSessions,
                    frequencyInterval,
                    date: formData.date,
                    time: formData.time,
                    calculationMode,
                    schedule, // ✅ V2: envia schedule em vez de selectedSlots
                    // 🔥 Só envia pagamentos se NÃO for per-session
                    payments: formData.paymentType === 'per-session'
                        ? []
                        : packagePayments.map((p) => ({
                            amount: Number(p.amount),
                            method: p.method,
                            date: p.date,
                            description: p.description,
                        })),
                };

            // Validar patientId
            if (!realPatientId) {
                toast.error('Paciente não identificado');
                setIsLoading(false);
                return;
            }

            console.log("📤 Enviando pacote:", packageData);

            // Fluxo particular (therapy/package)
            const sv = Number(formData.sessionValue) || 0;
            const therapyData = {
                ...packageData,
                type: 'package',
                model: formData.paymentType === 'per-session' ? 'per_session' : 'prepaid',
                patientId: realPatientId,
                sessionType: formData.sessionType as any,
                appointmentId: selectedAppointmentIdRef.current || formData.appointmentId || undefined,
                totalSessions: contractualTotalSessions,
                totalValue: contractualTotalSessions * sv,
                preConsumedCount: numPreConsumed
            };

            const response = await packageService.createPackage(therapyData);
            const newPackageId = response?.data?.packageId
                || response?.data?.package?._id
                || response?.data?._id;

            // Quita pendências importadas vinculando ao pacote recém-criado
            const selectedSessions = v2ImportedSessions.filter(s => selectedDebtIds.has(s.v2PaymentId));
            if (newPackageId && selectedSessions.length > 0) {
                const paymentIds = selectedSessions.map(s => s.v2PaymentId).filter(Boolean);
                if (paymentIds.length > 0) {
                    try {
                        await API.post(`/v2/packages/${newPackageId}/settle-payments`, {
                            paymentIds,
                            paymentMethod: payments[0]?.method || 'pix'
                        });
                        toast.success(`${paymentIds.length} pendência(s) quitadas e vinculadas ao pacote.`);
                    } catch (settleErr: unknown) {
                        setPendingSettlement({
                            packageId: newPackageId,
                            paymentIds,
                            paymentMethod: payments[0]?.method || 'pix',
                        });
                        toast.error(`Pacote criado, mas a quitação não foi concluída. Use "Tentar quitação novamente": ${extractErrorMessage(settleErr, 'erro desconhecido')}`);
                        return;
                    }
                }
            }

            toast.success(`Pacote criado com sucesso! 💚`);
            onSubmit(newPackageId);
            onClose();
        } catch (err: any) {
            toast.error(extractErrorMessage(err, "Erro ao salvar pacote."));
        } finally {
            setIsLoading(false);
        }
    };

    const formatAppointmentDate = (dateString: string) => {
        if (!dateString) return 'Data inválida';
        const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const dateObj = new Date(`${datePart}T00:00:00`);
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
    const lastSuggestedPaymentAmountRef = useRef(0);

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


    // Validação para pacote particular
    const isFormValid = !!(
        formData.patientId &&
        formData.doctorId &&
        formData.sessionType &&
        formData.paymentType &&
        formData.sessionValue > 0 &&
        (formData.paymentType === 'per-session' || hasValidPayments) &&
        formData.totalSessions > 0 &&
        (isEditing || (
            formData.date &&
            formData.time &&
            (calculationMode === 'sessions'
                ? true
                : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
        ))
    );
    console.log('appointments', appointments);

    const { totalSessions, totalValuePackage, remainingBalance } = useMemo(() => {
        const contractualSessions =
            calculationMode === 'sessions'
                ? toNumber(formData.totalSessions)
                : sessionsForDuration(formData.durationMonths, formData.sessionsPerWeek, intervalWeeks);

        // As retroativas consomem o total contratado; não aumentam o pacote.
        const sessions = contractualSessions;
        const totalValue = toNumber(contractualSessions) * toNumber(formData.sessionValue);
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
        intervalWeeks,
        payments,
    ]);

    const selectedExistingAppointment = useMemo(
        () => appointments.find((appointment) =>
            String(appointment._id || appointment.id) === String(formData.appointmentId)
        ),
        [appointments, formData.appointmentId]
    );

    const existingAppointmentPaidAmount = selectedExistingAppointment?.payment?.status === 'paid'
        ? Number(selectedExistingAppointment.payment.amount || 0)
        : 0;
    const suggestedPaymentAmount = Math.max(0, totalValuePackage - existingAppointmentPaidAmount);
    const newPaymentsTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const overpaymentAmount = Math.max(0, newPaymentsTotal - suggestedPaymentAmount);
    const uncoveredDebtAmount = Math.max(0, selectedDebtTotal - newPaymentsTotal);
    // Em edição só há um campo gravável: sem mudança real, nada a enviar.
    // Evita o "atualizado com sucesso" sobre uma requisição que não muda nada.
    const notesChanged = isEditing && (formData.notes || '') !== ((initialData as any)?.notes || '');
    const canSubmitForm = isEditing
        ? notesChanged
        : isFormValid && overpaymentAmount <= 0.009 && uncoveredDebtAmount <= 0.009;

    useEffect(() => {
        if (formData.paymentType === 'per-session' || payments.length !== 1) return;
        if (selectedDebtIds.size > 0) return;

        const currentAmount = Number(payments[0]?.amount || 0);
        const wasAutomaticallySuggested = currentAmount === lastSuggestedPaymentAmountRef.current;
        const canSuggest = currentAmount === 0 || wasAutomaticallySuggested;

        if (canSuggest && currentAmount !== suggestedPaymentAmount) {
            setPayments(previous => previous.map((payment, index) =>
                index === 0 ? { ...payment, amount: suggestedPaymentAmount } : payment
            ));
        }
        lastSuggestedPaymentAmountRef.current = suggestedPaymentAmount;
    }, [formData.paymentType, payments, selectedDebtIds.size, suggestedPaymentAmount]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-hidden">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="therapy-package-modal-title"
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden transition-all duration-300 flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-3.5 sm:px-5 sm:py-4 text-white relative flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-gray-200 transition-colors p-1"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-white bg-opacity-20 rounded-xl flex-shrink-0">
                            {initialData ? <Save className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </div>
                        <div className="min-w-0">
                            <h2 id="therapy-package-modal-title" className="text-lg sm:text-xl font-bold truncate">
                                {initialData ? 'Editar Pacote' : 'Criar Novo Pacote'}
                            </h2>
                            <p className="text-emerald-100 mt-0.5 text-sm truncate">
                                {initialData ? 'Atualize as informações do pacote' : <>Criar pacote para <span className="font-bold uppercase">{patient.fullName}</span></>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-5 flex-1 overflow-y-auto overscroll-contain min-h-0 text-sm [&_.form-label]:mb-1 [&_.form-label]:text-xs [&_input]:text-sm [&_select]:text-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        {/* Coluna 1 - Configuração do Pacote */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* 🌸 Financeiro — só exibe se há débitos ou ainda carregando (criação apenas) */}
                            {!isEditing && (v2ImportLoading || filteredDebts.length > 0 || v2ImportedSessions.length === 0) && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-rose-500" />
                                            <p className="text-sm font-semibold text-rose-800">
                                                Financeiro
                                            </p>
                                            <span className="text-3xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                                recomendado
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleImportFromV2}
                                            disabled={v2ImportLoading}
                                            className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {v2ImportLoading ? 'Buscando...' : 'Carregar pendências'}
                                        </button>
                                    </div>
                                    {filteredDebts.length > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-blue-700 font-medium">
                                                    Selecione as sessões a absorver no pacote:
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedDebtIds.size === filteredDebts.length) {
                                                            setSelectedDebtIds(new Set());
                                                        } else {
                                                            setSelectedDebtIds(new Set(filteredDebts.map(s => s.v2PaymentId)));
                                                        }
                                                    }}
                                                    className="text-3xs text-rose-500 underline"
                                                >
                                                    {selectedDebtIds.size === filteredDebts.length ? 'Desmarcar todas' : 'Marcar todas'}
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                {filteredDebts.map(s => (
                                                    <label key={s.id} className="flex items-center gap-2 bg-white rounded px-2 py-1 cursor-pointer hover:bg-rose-50">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDebtIds.has(s.v2PaymentId)}
                                                            onChange={() => {
                                                                setSelectedDebtIds(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(s.v2PaymentId)) next.delete(s.v2PaymentId);
                                                                    else next.add(s.v2PaymentId);
                                                                    return next;
                                                                });
                                                            }}
                                                            className="accent-rose-500"
                                                        />
                                                        <span className="text-xs text-rose-900 flex-1">
                                                            {s.date ? new Date(s.date).toLocaleDateString('pt-BR') : 'Sem data'}
                                                            {s.time ? ` às ${s.time}` : ''}
                                                            {s.specialty ? ` — ${s.specialty}` : ''}
                                                            {s.amount ? ` — R$ ${Number(s.amount).toFixed(2).replace('.', ',')}` : ''}
                                                            {s.doctorName ? ` (${s.doctorName})` : ''}
                                                        </span>
                                                        <span className="text-3xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shrink-0">pendente</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {selectedDebtIds.size > 0 && (
                                                <p className="text-xs text-emerald-700 font-medium">
                                                    {selectedDebtIds.size} sessão(ões) selecionada(s) para absorção no pacote
                                                </p>
                                            )}
                                            {otherSpecialtyDebts.length > 0 && (
                                                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                                                    ⚠️ {otherSpecialtyDebts.length} débito(s) de outra(s) especialidade(s) não exibido(s) — crie pacotes separados.
                                                </p>
                                            )}
                                        </>
                                    ) : v2ImportedSessions.length > 0 ? (
                                        <div className="space-y-1">
                                            <p className="text-xs text-blue-600 italic">
                                                Nenhum débito de {formData.sessionType} encontrado.
                                            </p>
                                            {otherSpecialtyDebts.length > 0 && (
                                                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                                                    ⚠️ {otherSpecialtyDebts.length} débito(s) de outra(s) especialidade(s) — crie pacotes separados.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-blue-600 italic">
                                            {formData.sessionType ? 'Buscando pendências...' : 'Selecione o tipo de terapia para ver débitos em aberto.'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Agendamento Existente — oculto quando há débitos selecionados ou em edição */}
                            {!isEditing && selectedDebtIds.size === 0 && <div className={`p-4 rounded-xl border transition-colors ${selectedExistingAppointment ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center ${selectedExistingAppointment ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                        <Calendar className="w-4 h-4" />
                                    </span>
                                    <span>
                                        {selectedExistingAppointment ? 'Sessão existente incorporada' : 'Incorporar sessão existente'}
                                        <span className="block text-xs font-normal text-slate-500">
                                            {selectedExistingAppointment
                                                ? 'Esta sessão será vinculada ao novo pacote.'
                                                : 'Opcional — selecione uma sessão avulsa já agendada.'}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { const pid = patient?.patientId || patient?._id; if (pid) fetchAppointmentsByPatient(pid); }}
                                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        title="Recarregar agendamentos"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Recarregar
                                    </button>
                                </h3>
                                <Select
                                    name="appointmentId"
                                    value={formData.appointmentId}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">Selecione um agendamento</option>
                                    {appointments
                                        .filter((appt) => {
                                            const svc = (appt as any).serviceType;
                                            const ops = (appt as any).operationalStatus;
                                            return svc !== 'package_session'
                                                && svc !== 'liminar_session'
                                                && svc !== 'convenio_session'
                                                && ops !== 'canceled'
                                                && ops !== 'missed'
                                                && ops !== 'completed';
                                        })
                                        .map((appt) => {
                                            const svcType = (appt as any).serviceType;
                                            const typeLabel =
                                                svcType === 'evaluation' ? '[Avaliação]' :
                                                    svcType === 'individual_session' ? '[Avulsa]' :
                                                        svcType === 'liminar_session' ? '[Liminar]' :
                                                            svcType === 'convenio_session' ? '[Convênio]' : '';
                                            return (
                                                <option
                                                    key={appt._id || appt.id}
                                                    value={appt._id || appt.id}
                                                >
                                                    {typeLabel} {formatAppointmentDate(appt.date)} - {appt.time || 'Horário não definido'} •
                                                    Dr. {appt.doctor?.fullName || 'Profissional não especificado'} •
                                                    {appt.specialty || 'Tipo não especificado'}
                                                </option>
                                            );
                                    })}
                                </Select>
                                {errors.appointmentId && (
                                    <p className="mt-2 text-xs font-medium text-red-600">{errors.appointmentId}</p>
                                )}
                                {selectedExistingAppointment && (
                                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs text-slate-600">
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">1</span>
                                        <div>
                                            <p className="font-semibold text-slate-800">Sessão inicial do pacote</p>
                                            <p className="mt-0.5">
                                                {formatAppointmentDate(selectedExistingAppointment.date)} às {selectedExistingAppointment.time || 'horário não definido'}
                                                {' · '}{selectedExistingAppointment.doctor?.fullName || 'Profissional não especificado'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>}

                            {/* Configuração do Pacote */}
                            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-emerald-600" />
                                    Configuração do Pacote
                                </h3>

                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="form-label">Número de Sessões</label>
                                                <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                                    {formData.totalSessions}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Quantidade contratada: fato histórico da venda. Para redirecionar sessões
                                                    não realizadas, use a transferência de sessões.
                                                </p>
                                            </div>
                                            <div>
                                                <label className="form-label">Frequência</label>
                                                <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                                    {frequencyInterval === 'biweekly' ? 'Quinzenal (a cada 15 dias)' : 'Semanal'}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Definida na criação do pacote, não editável.</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="form-label">Observação</label>
                                            <textarea
                                                name="notes"
                                                rows={3}
                                                maxLength={500}
                                                value={formData.notes}
                                                onChange={handleChange}
                                                placeholder="Anotação livre da equipe sobre este pacote"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                            <p className="text-xs text-emerald-700 mt-1">
                                                Único campo editável por aqui ({formData.notes?.length || 0}/500).
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="form-label">
                                                    Modo de Cálculo
                                                </label>
                                                <Select
                                                    value={calculationMode}
                                                    onChange={(e) => setCalculationMode(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                                >
                                                    <option value="sessions">Por número de sessões</option>
                                                    <option value="duration">Por duração (meses/semanas)</option>
                                                </Select>
                                            </div>

                                            <div>
                                                <label className="form-label">
                                                    Frequência
                                                </label>
                                                <Select
                                                    value={frequencyInterval}
                                                    onChange={(e) => setFrequencyInterval(e.target.value as 'weekly' | 'biweekly')}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                                >
                                                    <option value="weekly">Semanal</option>
                                                    <option value="biweekly">Quinzenal (a cada 15 dias)</option>
                                                </Select>
                                            </div>
                                        </div>

                                        {calculationMode === 'sessions' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="form-label">
                                                        Número de Sessões *
                                                    </label>
                                                    <input
                                                        name="totalSessions"
                                                        min="1"
                                                        max="100"
                                                        value={formData.totalSessions}
                                                        onChange={handleChange}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                    />
                                                    {errors.totalSessions && (
                                                        <span className="text-red-500 text-sm">{errors.totalSessions}</span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="form-label">
                                                        Sessões por {occurrenceLabel === 'quinzena' ? 'Quinzena' : 'Semana'} *
                                                    </label>
                                                    <Select
                                                        name="sessionsPerWeek"
                                                        value={formData.sessionsPerWeek}
                                                        onChange={handleChange}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                                    >
                                                        <option value="">Selecione a frequência</option>
                                                        {FREQUENCY_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>
                                                                {opt} {opt > 1 ? 'vezes' : 'vez'} por {occurrenceLabel}
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
                                                    <label className="form-label">
                                                        Duração do Pacote *
                                                    </label>
                                                    <Select
                                                        name="durationMonths"
                                                        value={formData.durationMonths}
                                                        onChange={handleChange}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                                            <label className="form-label">
                                                Sessões por {occurrenceLabel === 'quinzena' ? 'Quinzena' : 'Semana'} *
                                            </label>
                                            <Select
                                                name="sessionsPerWeek"
                                                value={formData.sessionsPerWeek}
                                                onChange={handleChange}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                            >
                                                <option value="">Escolha quantidade de vez na {occurrenceLabel}</option>
                                                {FREQUENCY_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>
                                                        {opt} {opt > 1 ? 'vezes' : 'vez'} por {occurrenceLabel}
                                                    </option>
                                                ))}
                                            </Select>
                                            {errors.sessionsPerWeek && (
                                                <span className="text-red-500 text-sm">{errors.sessionsPerWeek}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Data e Hora da Primeira Sessão — apenas na criação */}
                    {!isEditing && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center ${selectedExistingAppointment ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    <Clock className="w-4 h-4" />
                                </span>
                                {selectedDebtIds.size > 0
                                    ? 'Início histórico do pacote'
                                    : selectedExistingAppointment ? 'Sessão inicial selecionada' : 'Sessão inicial do pacote'}
                            </h3>
                            <p className="mb-3 ml-9 text-xs text-slate-500">
                                {selectedDebtIds.size > 0
                                    ? 'Data e hora da sessão retroativa mais antiga. As novas sessões começam depois das ocorrências já realizadas.'
                                    : selectedExistingAppointment
                                    ? 'Os dados abaixo pertencem ao agendamento existente e serão usados como a primeira sessão do pacote.'
                                    : 'Defina quando o acompanhamento será iniciado.'}
                            </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">
                                            {selectedDebtIds.size > 0 ? 'Data da retroativa mais antiga' : selectedExistingAppointment ? 'Data do agendamento selecionado' : 'Data *'}
                                        </label>
                                        <DatePicker
                                            selected={formData.date ? buildLocalDateOnly(formData.date) : null}
                                            disabled={Boolean(selectedExistingAppointment) || selectedDebtIds.size > 0}
                                            onChange={(date: Date | null) => {
                                                if (!date) return;
                                                const formattedDate = date.toISOString().split('T')[0];
                                                handleChange({ target: { name: 'date', value: formattedDate } } as any);
                                            }}
                                            customInput={
                                                <ReactInputMask
                                                    mask="99/99/9999"
                                                    className={`w-full p-2 border rounded-lg ${selectedExistingAppointment || selectedDebtIds.size > 0
                                                        ? 'border-blue-200 bg-blue-50 text-blue-900 cursor-not-allowed'
                                                        : 'border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                                                        }`}
                                                />
                                            }
                                            placeholderText="dd/MM/yyyy"
                                            dateFormat="dd/MM/yyyy"
                                        />

                                    </div>

                                    <div>
                                        <label className="form-label">
                                            {selectedDebtIds.size > 0 ? 'Hora da retroativa mais antiga' : selectedExistingAppointment ? 'Hora do agendamento selecionado' : 'Hora *'}
                                        </label>
                                        <DatePicker
                                            selected={formData.time ? new Date(`1970-01-01T${formData.time}`) : null}
                                            disabled={Boolean(selectedExistingAppointment) || selectedDebtIds.size > 0}
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
                                                    className={`w-full p-2 border rounded-lg ${selectedExistingAppointment || selectedDebtIds.size > 0
                                                        ? 'border-blue-200 bg-blue-50 text-blue-900 cursor-not-allowed'
                                                        : 'border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                                                        }`}
                                                />
                                            }
                                        />
                                    </div>
                                </div>
                            {selectedExistingAppointment && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-3xs text-white">1</span>
                                    Esta é a primeira sessão do pacote. As próximas serão calculadas pela frequência escolhida.
                                </p>
                            )}
                                {/* Checkbox Sessões no Mesmo Dia */}
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sameDaySessions}
                                            onChange={(e) => setSameDaySessions(e.target.checked)}
                                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                        />
                                        <span className="font-medium text-gray-700">Sessões seguidas no mesmo dia</span>
                                    </label>
                                    {sameDaySessions && (
                                        <p className="text-sm text-gray-500 mt-1 ml-7">
                                            Permite agendar múltiplos horários no mesmo dia da semana.
                                        </p>
                                    )}
                                </div>

                                {sameDaySessions && (
                                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border border-orange-100 mt-4">
                                        <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-orange-600" />
                                            Horários do Dia
                                        </h3>

                                        <div className="space-y-3">
                                            {dailySessionTimes.map((time, index) => (
                                                <div key={index} className="flex items-center gap-3">
                                                    <span className="font-medium text-gray-500 w-8">#{index + 1}</span>
                                                    <div className="flex-1">
                                                        <DatePicker
                                                            selected={time ? new Date(`1970-01-01T${time}`) : null}
                                                            onChange={(date: Date | null) => {
                                                                if (!date) return;
                                                                const formattedTime = date.toTimeString().slice(0, 5);
                                                                const newTimes = [...dailySessionTimes];
                                                                newTimes[index] = formattedTime;
                                                                setDailySessionTimes(newTimes);
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
                                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                                                                />
                                                            }
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newTimes = dailySessionTimes.filter((_, i) => i !== index);
                                                            setDailySessionTimes(newTimes);
                                                        }}
                                                        className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remover horário"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}

                                            {dailySessionTimes.length < 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDailySessionTimes([...dailySessionTimes, ''])}
                                                    className="w-full py-2 border-2 border-dashed border-orange-300 rounded-lg text-sm text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Adicionar Horário
                                                </button>
                                            )}
                                        </div>
                                        {errors.dailySessionTimes && (
                                            <p className="text-red-500 text-sm mt-2">{errors.dailySessionTimes}</p>
                                        )}
                                    </div>
                                )}

                                {!sameDaySessions && formData.sessionsPerWeek > 1 && (
                                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-xl border border-emerald-100 mt-4">
                                        <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
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
                                                    <label className="form-label">Dia da Semana *</label>
                                                    <Select
                                                        value={slot.day}
                                                        onChange={(e) => updateSlot(index, 'day', e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                                                    <label className="form-label">Horário *</label>
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
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                    )}

                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">

                                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-600" />
                                    Profissional e Sessão
                                </h3>
                                {isEditing && (
                                    <p className="mb-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-600">
                                        Estes campos não são editáveis aqui. Trocar o profissional exige atualizar também
                                        agendamentos, sessões e pagamentos — use <strong>“Trocar terapeuta das sessões futuras”</strong>
                                        em Detalhes do pacote. Trocar a especialidade exige transferência de sessões.
                                    </p>
                                )}
                                <div className="space-y-4">
                                    {/* Primeira linha - Profissional */}
                                    <div>
                                        <label className="form-label">
                                            Profissional *
                                        </label>
                                        <Select
                                            name="doctorId"
                                            value={formData.doctorId}
                                            onChange={handleChange}
                                            disabled={isEditing}
                                            className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                        >
                                            <option value="">Escolha um profissional</option>
                                            {doctors.map((doc) => (
                                                <option key={doc._id} value={doc._id}>
                                                    {doc.fullName}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    {/* Segunda linha - 2 colunas */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">
                                                Tipo de Sessão *
                                            </label>
                                            <Select
                                                name="sessionType"
                                                value={formData.sessionType}
                                                onChange={handleChange}
                                                disabled={isEditing}
                                                className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
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
                                            <label className="form-label">
                                                Tipo de Pagamento *
                                            </label>
                                            <Select
                                                name="paymentType"
                                                value={formData.paymentType}
                                                onChange={handleChange}
                                                disabled={isEditing}
                                                className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
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
                            </div>
                        </div>

                        {/* Coluna 2 - Informações e Resumo */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Informações Financeiras */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    Informações Financeiras
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="form-label">
                                            Valor por Sessão (R$) {!isEditing && '*'}
                                        </label>
                                        {isEditing ? (
                                            <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                                R$ {Number(formData.sessionValue || 0).toFixed(2)}
                                            </div>
                                        ) : (
                                            <InputCurrency
                                                name="sessionValue"
                                                value={formData.sessionValue || 0}
                                                onChange={handleChange}
                                                min="0"
                                                step="0.01"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-green-500 bg-white focus:ring-green-500"
                                            />
                                        )}

                                        {/* 🔥 AVISO para per-session */}
                                        {formData.paymentType === 'per-session' && (
                                            <p className="text-xs text-blue-600 mt-2">
                                                💡 Pagamento por sessão: O paciente pagará no dia de cada atendimento. Não é necessário adicionar pagamento antecipado.
                                            </p>
                                        )}
                                    </div>

                                    {/* ✏️ Edição: recebimento é fato consumado — leitura apenas.
                                        Alterar pagamento aqui reescreveria caixa em data retroativa. */}
                                    {isEditing && (
                                        <div className="rounded-lg border border-green-200 bg-white px-3 py-2.5 text-xs text-slate-600">
                                            <p className="font-semibold text-slate-800">Pagamentos registrados</p>
                                            <p className="mt-0.5">
                                                Total recebido: <strong>R$ {getTotalPaid().toFixed(2)}</strong>. O histórico
                                                financeiro do pacote não é editável — o recebimento já entrou no caixa na data
                                                original. Ajustes precisam de lançamento próprio no financeiro.
                                            </p>
                                        </div>
                                    )}

                                    {/* Múltiplos Pagamentos - NÃO para per-session, NÃO em edição */}
                                    {!isEditing && formData.paymentType !== 'per-session' && (
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
                                                                Valor pago agora (R$) *
                                                            </label>
                                                            <InputCurrency
                                                                value={payment.amount}
                                                                onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                            />
                                                            {index === 0 && payments.length === 1 && (
                                                                <p className="mt-1 text-3xs leading-tight text-slate-400">
                                                                    {selectedDebtIds.size > 0
                                                                        ? 'Sugerido pelas sessões retroativas; você pode alterar o valor.'
                                                                        : 'Saldo sugerido do pacote; altere se for dividir o pagamento.'}
                                                                </p>
                                                            )}
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

                                            {errors.payments && (
                                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                                    {errors.payments}
                                                </p>
                                            )}
                                            {overpaymentAmount > 0.009 && (
                                                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                                                    <p className="font-semibold">Valor acima do permitido</p>
                                                    <p className="mt-0.5">
                                                        Reduza R$ {overpaymentAmount.toFixed(2)}. O máximo para pagar agora é R$ {suggestedPaymentAmount.toFixed(2)}.
                                                    </p>
                                                </div>
                                            )}
                                            {uncoveredDebtAmount > 0.009 && (
                                                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                                                    <p className="font-semibold">Valor insuficiente para quitar as retroativas</p>
                                                    <p className="mt-0.5">
                                                        Acrescente R$ {uncoveredDebtAmount.toFixed(2)}. Os débitos selecionados somam R$ {selectedDebtTotal.toFixed(2)}.
                                                    </p>
                                                </div>
                                            )}

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
                                    )}
                                </div>
                            </div>

                            {/* Resumo do Pacote */}
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    Resumo do Pacote
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Sessões totais:</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {totalSessions}
                                            {selectedDebtIds.size > 0 && <span className="text-xs text-rose-500 ml-1">({selectedDebtIds.size} já realizadas)</span>}
                                        </span>
                                    </div>
                                    {selectedDebtIds.size > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Sessões futuras:</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {Math.max(totalSessions - selectedDebtIds.size, 0)}
                                            </span>
                                        </div>
                                    )}
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
                            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-gray-600" />
                                    {formData.paymentType === 'per-session' ? 'Forma de Pagamento' : 'Resumo de Pagamento'}
                                </h3>
                                <div className="space-y-3">
                                    {formData.paymentType === 'per-session' ? (
                                        // 🔥 Layout para per-session
                                        <div className="text-center py-2">
                                            <p className="text-sm text-blue-600 font-medium">
                                                💳 Pagamento no dia da sessão
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                O paciente pagará R$ {formData.sessionValue?.toFixed(2)} em cada atendimento
                                            </p>
                                        </div>
                                    ) : (
                                        // Layout normal (full/partial)
                                        <>
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
                                            {overpaymentAmount > 0.009 && (
                                                <div className="flex justify-between items-center border-t border-red-200 pt-2 text-red-600">
                                                    <span className="text-sm font-semibold">Valor excedente:</span>
                                                    <span className="text-sm font-bold">R$ {overpaymentAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 sm:px-5 py-3 flex justify-between items-center border-t border-gray-200 flex-shrink-0">
                    <div className="text-sm text-gray-500">
                        {isEditing
                            ? (notesChanged ? null : "Nenhuma alteração a salvar")
                            : !isFormValid
                                ? "Preencha todos os campos obrigatórios (*)"
                                : overpaymentAmount > 0.009
                                    ? `Pagamento excede o pacote em R$ ${overpaymentAmount.toFixed(2)}`
                                    : uncoveredDebtAmount > 0.009
                                        ? `Faltam R$ ${uncoveredDebtAmount.toFixed(2)} para quitar as retroativas selecionadas`
                                    : null}
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
                            disabled={(!canSubmitForm && !pendingSettlement) || isLoading}
                            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${(!canSubmitForm && !pendingSettlement) || isLoading
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <LoadingSpinner size="small" color="border-white" />
                                    <span>{pendingSettlement ? 'Quitando...' : 'Salvando...'}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {initialData ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    {pendingSettlement ? 'Tentar quitação novamente' : initialData ? 'Atualizar Pacote' : 'Criar Pacote'}
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
