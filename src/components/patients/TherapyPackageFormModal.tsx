import {
    Building2,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { toast } from 'react-toastify';

import appointmentService from '../../services/appointmentService';
import packageService from '../../services/packageService';
import API from '../../services/api';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { DURATION_OPTIONS, FREQUENCY_OPTIONS, IAppointment, IDoctor, IPatient, ITherapyPackage, PAYMENT_TYPES, THERAPY_TYPES } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';
import { validateObject, required, betweenNumber, minNumber } from "../../utils/validators";

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
};

type FormState = typeof initialFormState;
type FormErrors = Partial<Record<keyof FormState | "payments" | "slots" | "selectedGuide" | "dailySessionTimes", string>>;

export default function TherapyPackageFormModal({ initialData, patient, doctors, onClose, onSubmit }: Props) {
    const [errors, setErrors] = useState<FormErrors>({});
    const [formData, setFormData] = useState(initialFormState);
    const selectedAppointmentIdRef = useRef<string>(''); // ref para garantir valor no submit
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [calculationMode, setCalculationMode] = useState('duration');
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
        doctorName?: string;
        status: string;
        source: string;
    }>>([]);
    const [v2ImportLoading, setV2ImportLoading] = useState(false);
    const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set());

    // normaliza especialidade para comparação (fonoaudiologia == Fonoaudiologia == terapia_ocupacional == Terapia Ocupacional)
    const normSpec = (s: string) => (s || '').toLowerCase().replace(/_/g, ' ').trim();

    // débitos filtrados pela especialidade selecionada no formulário
    const filteredDebts = useMemo(() => {
        if (!formData.sessionType) return v2ImportedSessions;
        return v2ImportedSessions.filter(s => normSpec(s.specialty) === normSpec(formData.sessionType));
    }, [v2ImportedSessions, formData.sessionType]);

    const otherSpecialtyDebts = useMemo(() => {
        if (!formData.sessionType) return [];
        return v2ImportedSessions.filter(s => normSpec(s.specialty) !== normSpec(formData.sessionType));
    }, [v2ImportedSessions, formData.sessionType]);

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
        const combined = { ...formData, calculationMode };
        const baseErrors: any = {};

        // Regras comuns (ambos os tipos)
        if (!formData.doctorId) baseErrors.doctorId = "Profissional é obrigatório";
        if (!formData.sessionType) baseErrors.sessionType = "Tipo de sessão é obrigatório";
        if (!formData.date) baseErrors.date = "Data é obrigatória";
        if (!formData.time) baseErrors.time = "Hora é obrigatória";

        // Regras de pagamento
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

        // Validação de sessões por semana
        const sessionsPerWeek = Number(formData.sessionsPerWeek);

        if (sameDaySessions) {
            if (dailySessionTimes.length < 2) {
                baseErrors.dailySessionTimes = "Adicione pelo menos 2 horários para sessões no mesmo dia";
            }
        } else {
            if (!sessionsPerWeek || sessionsPerWeek < 1 || sessionsPerWeek > 5) {
                baseErrors.sessionsPerWeek = "Sessões por semana deve estar entre 1 e 5";
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

    const [selectedSlots, setSelectedSlots] = useState<Array<{ day: string; time: string }>>([]);

    // real patient _id (patients_view has patientId pointing to the actual Patient document)
    const realPatientId = patient?.patientId || patient?._id;

    useEffect(() => {
        console.log('[TherapyPackageFormModal] Patient mudou:', patient, '→ realPatientId:', realPatientId);
        if (realPatientId) {
            setFormData(prev => ({
                ...prev,
                patientId: realPatientId,
            }));
            fetchAppointmentsByPatient(realPatientId);
        }
    }, [patient]);

    // Auto-carrega débitos ao selecionar especialidade; limpa seleção e sessionValue anterior
    useEffect(() => {
        if (!formData.sessionType || !realPatientId) return;
        setSelectedDebtIds(new Set());
        setFormData(prev => ({ ...prev, sessionValue: 0 })); // reseta valor ao trocar especialidade
        handleImportFromV2();
    }, [formData.sessionType]);

    // Ao marcar/desmarcar débitos: auto-preenche sessionValue e recalcula total do pagamento
    useEffect(() => {
        // usa apenas débitos da especialidade atual (filtrados)
        const selected = filteredDebts.filter(s => selectedDebtIds.has(s.v2PaymentId));
        if (selected.length === 0) return;

        // sessionValue vem do primeiro débito da especialidade correta
        const debtValue = selected[0].amount;
        if (debtValue > 0) {
            setFormData(prev => ({ ...prev, sessionValue: debtValue }));
        }

        // recalcula total: (sessões futuras do formulário + retroativas) × valor
        const sv = formData.sessionValue || debtValue || 0;
        const futuras = (formData.durationMonths || 0) * 4 * (formData.sessionsPerWeek || 0);
        const total = (futuras + selected.length) * sv;
        if (total > 0 && payments.length > 0) {
            setPayments(prev => prev.map((p, i) => i === 0 ? { ...p, amount: total } : p));
        }
    }, [selectedDebtIds]);



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
                    doctorName: item.doctor?.fullName,
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
            setFormData(prev => ({
                ...prev,
                appointmentId: value,
                ...(selectedAppointment && {
                    doctorId: selectedAppointment.doctor?._id || selectedAppointment.doctorId,
                    date: selectedAppointment.date,
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
        dailySessionTimes = []
    }: {
        startDate: string;
        startTime: string;
        totalSessions: number;
        sessionsPerWeek: number;
        selectedSlots?: { day: string; time: string }[];
        sameDaySessions?: boolean;
        dailySessionTimes?: string[];
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

                currentWeek.add(1, 'week');
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
            toast.error("Preencha todos os dias e horários adicionais para sessões múltiplas");
            setIsLoading(false);
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
            // 📅 Gera as datas reais
            // ============================================================
            let schedule: { date: string; time: string }[] = [];

            const generatedSlots = generateSessionDates({
                startDate: formData.date,
                startTime: formData.time,
                totalSessions,
                sessionsPerWeek: formData.sessionsPerWeek,
                selectedSlots,
                sameDaySessions,
                dailySessionTimes
            });
            const unique = Array.from(
                new Map(generatedSlots.map((s) => [`${s.date}|${s.time}`, s])).values()
            ).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
            schedule = unique.map((slot) => ({ date: slot.date, time: slot.time }));
            console.log("📅 Slots gerados localmente:", schedule);
            
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
                schedule, // ✅ V2: envia schedule em vez de selectedSlots
                // 🔥 Só envia pagamentos se NÃO for per-session
                payments: formData.paymentType === 'per-session'
                    ? [] 
                    : payments.map((p) => ({
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
            const numPreConsumed = v2ImportedSessions.filter(s => selectedDebtIds.has(s.v2PaymentId)).length;
            const totalContratual = packageData.totalSessions + numPreConsumed;
            const sv = Number(formData.sessionValue) || 0;
            const therapyData = {
                ...packageData,
                type: 'package',
                model: formData.paymentType === 'per-session' ? 'per_session' : 'prepaid',
                patientId: realPatientId,
                sessionType: formData.sessionType as any,
                appointmentId: selectedAppointmentIdRef.current || formData.appointmentId || undefined,
                totalSessions: totalContratual,
                totalValue: totalContratual * sv,
                preConsumedCount: numPreConsumed
            };
            if (initialData?._id) {
                await packageService.updatePackage(initialData._id, therapyData);
                toast.success(`Pacote atualizado com sucesso! 💚`);
                onSubmit();
            } else {
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
                        } catch (settleErr: any) {
                            toast.warning(`Pacote criado, mas erro ao quitar pendências: ${settleErr?.response?.data?.error || settleErr.message}`);
                        }
                    }
                }

                toast.success(`Pacote criado com sucesso! 💚`);
                onSubmit(newPackageId);
            }
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
        formData.date &&
        formData.time &&
        (calculationMode === 'sessions'
            ? formData.totalSessions > 0
            : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
    );
        console.log('appointments', appointments);

    const { totalSessions, totalValuePackage, remainingBalance } = useMemo(() => {
        const futureSessions =
            calculationMode === 'sessions'
                ? toNumber(formData.totalSessions)
                : toNumber(formData.durationMonths) * 4 * toNumber(formData.sessionsPerWeek);

        // total contratual = futuras + retroativas selecionadas
        const sessions = futureSessions + selectedDebtIds.size;
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
        payments,
        selectedDebtIds,
    ]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden transition-all duration-300 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-4 sm:p-6 text-white relative flex-shrink-0">
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
                            <h2 className="text-lg sm:text-2xl font-bold truncate">
                                {initialData ? 'Editar Pacote' : 'Criar Novo Pacote'}
                            </h2>
                            <p className="text-emerald-100 mt-0.5 sm:mt-1 text-sm sm:text-base truncate">
                                {initialData ? 'Atualize as informações do pacote' : `Criar pacote para ${patient.fullName}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Coluna 1 - Configuração do Pacote */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* 🌸 Financeiro — só exibe se há débitos ou ainda carregando */}
                            {(v2ImportLoading || filteredDebts.length > 0 || v2ImportedSessions.length === 0) && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-rose-500" />
                                            <p className="text-sm font-semibold text-rose-800">
                                                Financeiro
                                            </p>
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
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
                                                    className="text-[10px] text-rose-500 underline"
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
                                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shrink-0">pendente</span>
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

                            {/* Agendamento Existente — oculto quando há débitos selecionados */}
                            {selectedDebtIds.size === 0 && <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100">
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
                                            key={appt._id || appt.id}
                                            value={appt._id || appt.id}
                                            className="text-sm"
                                        >
                                            {formatAppointmentDate(appt.date)} - {appt.time || 'Horário não definido'} •
                                            Dr. {appt.doctor?.fullName || 'Profissional não especificado'} •
                                            {appt.specialty || 'Tipo não especificado'}
                                        </option>
                                    ))}
                                </Select>
                            </div>}

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
                                {/* Checkbox Sessões no Mesmo Dia */}
                                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
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
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
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
                                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
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
                                                    className="w-full py-3 border-2 border-dashed border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 font-medium"
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
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-green-500 bg-white focus:ring-green-500"
                                        />
                                            
                                            {/* 🔥 AVISO para per-session */}
                                            {formData.paymentType === 'per-session' && (
                                                <p className="text-xs text-blue-600 mt-2">
                                                    💡 Pagamento por sessão: O paciente pagará no dia de cada atendimento. Não é necessário adicionar pagamento antecipado.
                                                </p>
                                            )}
                                        </div>

                                        {/* Múltiplos Pagamentos - NÃO para per-session */}
                                        {formData.paymentType !== 'per-session' && (
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
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    Resumo do Pacote
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Sessões totais:</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {totalSessions}
                                            {selectedDebtIds.size > 0 && <span className="text-xs text-rose-500 ml-1">({selectedDebtIds.size} retroativas)</span>}
                                        </span>
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center border-t border-gray-200 flex-shrink-0">
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