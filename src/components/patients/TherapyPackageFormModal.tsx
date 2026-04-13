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
import { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { toast } from 'react-toastify';

import appointmentService from '../../services/appointmentService';
import { getGuides, InsuranceGuide } from '../../services/insuranceGuideApi';
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
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [calculationMode, setCalculationMode] = useState('duration');
    const [isLoading, setIsLoading] = useState(false);

    // 🏥 Estados para pacotes de convênio
    const [packageType, setPackageType] = useState<'therapy' | 'convenio' | 'liminar'>('therapy');
    
    // ⚖️ Estados para pacotes liminar
    const [liminarProcessNumber, setLiminarProcessNumber] = useState('');
    const [liminarCourt, setLiminarCourt] = useState('');
    const [liminarTotalCredit, setLiminarTotalCredit] = useState(0);
    const [availableGuides, setAvailableGuides] = useState<InsuranceGuide[]>([]);
    const [selectedGuide, setSelectedGuide] = useState<string>('');
    const [loadingGuides, setLoadingGuides] = useState(false);

    // 🆕 Estados para Sessões no Mesmo Dia
    const [sameDaySessions, setSameDaySessions] = useState(false);
    const [dailySessionTimes, setDailySessionTimes] = useState<string[]>(['16:00', '16:40']);

    // 🔄 Sessões pendentes para absorção
    const [pendingSessions, setPendingSessions] = useState<Array<{ _id: string; date: string; time: string; sessionValue: number; specialty: string; doctorName?: string }>>([]);
    const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

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

        // Regras específicas para THERAPY
        if (packageType === 'therapy') {
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
        }

        // Regras específicas para CONVENIO
        if (packageType === 'convenio') {
            if (!selectedGuide) {
                baseErrors.selectedGuide = "Selecione uma guia de convênio.";
            }
        }

        // Regras específicas para LIMINAR (valor é obrigatório, mas pagamentos não)
        if (packageType === 'liminar') {
            const sessionValue = Number(formData.sessionValue);
            if (!sessionValue || sessionValue < 0.01) {
                baseErrors.sessionValue = "Valor por sessão deve ser maior que zero";
            }
            if (!liminarTotalCredit || liminarTotalCredit < 0.01) {
                baseErrors.liminarTotalCredit = "Valor total do crédito é obrigatório";
            }
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

    // 🏥 Buscar guias ativas quando tipo = convenio
    useEffect(() => {
        if (packageType === 'convenio' && realPatientId) {
            fetchInsuranceGuides(realPatientId);
        }
    }, [packageType, realPatientId]);

    // 🔄 Buscar DÉBITOS pendentes do balance — só quando especialidade estiver selecionada
    useEffect(() => {
        if (!realPatientId || packageType !== 'therapy' || !formData.sessionType) {
            setPendingSessions([]);
            setSelectedPendingIds([]);
            return;
        }
        const fetchPending = async () => {
            try {
                // 🆕 NOVO: Busca no PatientBalance (fonte correta)
                const res = await API.get(`/patients/${realPatientId}/balance/details`, {
                    params: { specialty: formData.sessionType }
                });
                const raw = res.data?.data || [];
                
                // Adapta formato para compatibilidade com UI existente
                const debits = raw.map((t: any) => ({
                    _id: t._id,
                    date: t.transactionDate,
                    time: '',  // balance não tem hora
                    sessionValue: t.amount,
                    specialty: t.specialty,
                    doctorName: null,
                    description: t.description,
                    appointmentId: t.appointmentId
                }));
                
                const sessions = [...debits].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setPendingSessions(sessions);
                setSelectedPendingIds(sessions.map((s: any) => s._id));

                // Auto-sugerir data inicial = semana seguinte à última sessão absorvida
                if (sessions.length > 0) {
                    const lastDate = new Date(sessions[sessions.length - 1].date);
                    lastDate.setUTCDate(lastDate.getUTCDate() + 7);
                    const yyyy = lastDate.getUTCFullYear();
                    const mm = String(lastDate.getUTCMonth() + 1).padStart(2, '0');
                    const dd = String(lastDate.getUTCDate()).padStart(2, '0');
                    setFormData(prev => ({ ...prev, date: `${yyyy}-${mm}-${dd}` }));
                }
            } catch {
                // silencioso — não é crítico
            }
        };
        fetchPending();
    }, [realPatientId, packageType, formData.sessionType]);

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

    // 🏥 Buscar guias de convênio ativas
    const fetchInsuranceGuides = async (patientId: string) => {
        setLoadingGuides(true);
        try {
            const guides = await getGuides(patientId, { status: 'active' });
            setAvailableGuides(guides);

            // Se só tem uma guia, seleciona automaticamente
            if (guides.length === 1) {
                setSelectedGuide(guides[0]._id);
                // Preenche specialty automaticamente
                setFormData(prev => ({
                    ...prev,
                    sessionType: guides[0].specialty
                }));
            }
        } catch (error) {
            toast.error('Erro ao carregar guias de convênio');
            console.error(error);
        } finally {
            setLoadingGuides(false);
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
            // 📅 Gera as datas reais — sessões absorvidas já contam, não criar slots para elas
            // ============================================================
            const absorbedCount = selectedPendingIds.length;
            const newSlotsNeeded = Math.max(totalSessions - absorbedCount, 0);

            let generatedSlots: { date: string; time: string }[] = [];

            if (newSlotsNeeded > 0) {
                generatedSlots = generateSessionDates({
                    startDate: formData.date,
                    startTime: formData.time,
                    totalSessions: newSlotsNeeded,
                    sessionsPerWeek: formData.sessionsPerWeek,
                    selectedSlots,
                    sameDaySessions,
                    dailySessionTimes
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
            // 🔄 Converte selectedSlots para schedule (formato V2)
            const schedule = unique.map((slot: {date: string, time: string}) => ({
                date: slot.date,
                time: slot.time
            }));
            
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
                pendingSessionIds: selectedPendingIds, // 🔄 sessões pendentes a absorver
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

            // 🏥 Lógica condicional: Therapy vs Convenio vs Liminar
            if (packageType === 'convenio') {
                // Validar guia selecionada
                if (!selectedGuide) {
                    toast.error('Selecione uma guia de convênio');
                    setIsLoading(false);
                    return;
                }

                // Payload simplificado para convenio
                const convenioData = {
                    patientId: realPatientId,
                    doctorId: formData.doctorId,
                    insuranceGuideId: selectedGuide,
                    selectedSlots: unique
                };

                console.log("📤 Enviando pacote de convênio:", convenioData);
                const convenioResponse = await packageService.createConvenioPackage(convenioData);
                // 🔥 Extrai o ID do pacote criado (pode vir em package._id ou package.packageId)
                const newPackageId = convenioResponse?.package?._id 
                    || convenioResponse?.package?.packageId 
                    || convenioResponse?._id;
                toast.success(`Pacote de convênio criado com sucesso! 💚`);
                onSubmit(newPackageId);
            } else if (packageType === 'liminar') {
                // ⚖️ Payload para liminar
                const liminarData = {
                    ...packageData,
                    patientId: realPatientId,
                    sessionType: formData.sessionType as any,
                    type: 'liminar',
                    liminarProcessNumber: liminarProcessNumber || undefined,
                    liminarCourt: liminarCourt || undefined,
                    liminarMode: 'hybrid',
                    liminarTotalCredit: liminarTotalCredit || (formData.totalSessions * formData.sessionValue)
                };

                console.log("📤 Enviando pacote liminar:", liminarData);
                const liminarResponse = await packageService.createPackage(liminarData);
                // 🔥 Extrai o ID do pacote criado
                const newPackageId = liminarResponse?.data?.package?._id 
                    || liminarResponse?.data?.package?.packageId 
                    || liminarResponse?.data?._id;
                toast.success(`Pacote liminar criado com sucesso! ⚖️`);
                onSubmit(newPackageId);
            } else {
                // Fluxo normal (therapy)
                const therapyData = {
                    ...packageData,
                    type: 'therapy', // 🔥 IMPORTANTE: Define o tipo para o hook useCreatePackage
                    patientId: realPatientId,
                    sessionType: formData.sessionType as any, // Type assertion para compatibilidade
                    selectedDebts: selectedPendingIds // 🆕 IDs dos débitos selecionados para quitar
                };
                if (initialData?._id) {
                    // Edição
                    await packageService.updatePackage(initialData._id, therapyData);
                    toast.success(`Pacote atualizado com sucesso! 💚`);
                    onSubmit();
                } else {
                    // Criação
                    const response = await packageService.createPackage(therapyData);
                    // V2 retorna { data: { package: {...} } }; V1 retorna o pacote direto
                    const newPackageId = response?.data?.package?._id
                        || response?.data?.package?.packageId
                        || response?.data?._id;
                    toast.success(`Pacote criado com sucesso! 💚`);
                    onSubmit(newPackageId); // 🔥 Passa o ID
                }
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


    // 🏥 Validação condicional por tipo de pacote
    const isFormValid = packageType === 'convenio'
        ? !!(
            // Campos obrigatórios para CONVENIO
            formData.patientId &&
            formData.doctorId &&
            formData.sessionType &&
            selectedGuide && // ← Guia obrigatória
            formData.date &&
            formData.time &&
            (calculationMode === 'sessions'
                ? formData.totalSessions > 0
                : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
        )
        : packageType === 'liminar'
        ? !!(
            // Campos obrigatórios para LIMINAR (sem pagamentos - receita por sessão)
            formData.patientId &&
            formData.doctorId &&
            formData.sessionType &&
            formData.sessionValue > 0 &&
            liminarTotalCredit > 0 &&
            formData.date &&
            formData.time &&
            (calculationMode === 'sessions'
                ? formData.totalSessions > 0
                : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
        )
        : !!(
            // Campos obrigatórios para THERAPY
            formData.patientId &&
            formData.doctorId &&
            formData.sessionType &&
            formData.paymentType &&
            formData.sessionValue > 0 &&
            // 🔥 Só exige pagamentos válidos se NÃO for per-session
            (formData.paymentType === 'per-session' || hasValidPayments) &&
            formData.date &&
            formData.time &&
            (calculationMode === 'sessions'
                ? formData.totalSessions > 0
                : (formData.durationMonths > 0 && formData.sessionsPerWeek > 0))
        );
        console.log('appointments', appointments);

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
                            {/* 🏥 Toggle Tipo de Pacote */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setPackageType('therapy')}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${packageType === 'therapy'
                                        ? 'bg-white shadow-md text-emerald-700'
                                        : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Particular
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPackageType('convenio')}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${packageType === 'convenio'
                                        ? 'bg-white shadow-md text-blue-700'
                                        : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    Convênio
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPackageType('liminar')}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${packageType === 'liminar'
                                        ? 'bg-white shadow-md text-amber-700'
                                        : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                >
                                    <Package className="w-4 h-4" />
                                    Liminar
                                </button>
                            </div>

                            {/* 🏥 Select de Guia (só se convenio) */}
                            {packageType === 'convenio' && (
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        Guia de Convênio
                                    </h3>

                                    {loadingGuides ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            <span className="ml-2 text-gray-600">Carregando guias...</span>
                                        </div>
                                    ) : availableGuides.length === 0 ? (
                                        <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-lg">
                                            <p className="font-medium">Nenhuma guia ativa encontrada</p>
                                            <p className="text-sm mt-1">Cadastre uma guia na aba "Guias de Convênio" antes de criar o pacote</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                name="selectedGuide"
                                                value={selectedGuide}
                                                onChange={(e) => {
                                                    setSelectedGuide(e.target.value);
                                                    const guide = availableGuides.find(g => g._id === e.target.value);
                                                    if (guide) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            sessionType: guide.specialty
                                                        }));
                                                    }
                                                }}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="">Selecione uma guia ativa *</option>
                                                {availableGuides.map((guide) => (
                                                    <option key={guide._id} value={guide._id}>
                                                        {guide.insurance} - Guia #{guide.number} ({guide.remaining || 0} sessões disponíveis) - {guide.specialty}
                                                    </option>
                                                ))}
                                            </Select>
                                            {errors.selectedGuide && (
                                                <span className="text-red-500 text-sm mt-1 block">{errors.selectedGuide}</span>
                                            )}
                                            {selectedGuide && (
                                                <div className="mt-3 p-3 bg-blue-100 rounded-lg text-sm text-blue-900">
                                                    <p className="font-medium">ℹ️ Informação:</p>
                                                    <p>O paciente não pagará nada. O convênio realizará o pagamento conforme tabela.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ⚖️ Campos para pacotes Liminar */}
                            {packageType === 'liminar' && (
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-amber-600" />
                                        Dados da Liminar (Opcional)
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Número do Processo
                                            </label>
                                            <input
                                                type="text"
                                                value={liminarProcessNumber}
                                                onChange={(e) => setLiminarProcessNumber(e.target.value)}
                                                placeholder="Ex: 1234567-89.2026.8.01.0000"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Vara / Cartório
                                            </label>
                                            <input
                                                type="text"
                                                value={liminarCourt}
                                                onChange={(e) => setLiminarCourt(e.target.value)}
                                                placeholder="Ex: 1ª Vara Cível de Anápolis"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Valor Total do Crédito (R$) *
                                            </label>
                                            <InputCurrency
                                                value={liminarTotalCredit}
                                                onChange={(e) => setLiminarTotalCredit(Number(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                            />
                                            <p className="text-xs text-amber-600 mt-2">
                                                💡 Valor total liberado pela liminar judicial. Será consumido à medida que as sessões forem realizadas.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 p-3 bg-amber-100 rounded-lg text-sm text-amber-900">
                                        <p className="font-medium">ℹ️ Sobre o crédito:</p>
                                        <p>O valor será consumido à medida que as sessões forem realizadas. Se alterar o status de uma sessão de &quot;concluída&quot; para outro, o crédito volta automaticamente. Não precisa cancelar!</p>
                                    </div>
                                </div>
                            )}

                            {/* 🔄 ALERTA: Sessões pendentes para absorção */}
                            {packageType === 'therapy' && pendingSessions.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-600 text-base">⚠️</span>
                                        <p className="text-sm font-semibold text-amber-800">
                                            {pendingSessions.length} sessão(ões) pendente(s) encontrada(s)
                                        </p>
                                    </div>
                                    <p className="text-xs text-amber-700">
                                        Selecione quais deseja cobrir com este pacote:
                                    </p>
                                    {selectedPendingIds.length > 0 && (
                                        <p className="text-xs text-emerald-700 mt-1">
                                            💡 Os débitos selecionados serão quitados automaticamente ao criar o pacote
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {pendingSessions.map(s => (
                                            <label key={s._id} className="flex items-center gap-2 cursor-pointer hover:bg-amber-100 rounded px-1 py-0.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPendingIds.includes(s._id)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setSelectedPendingIds(prev => [...prev, s._id]);
                                                        } else {
                                                            setSelectedPendingIds(prev => prev.filter(id => id !== s._id));
                                                        }
                                                    }}
                                                    className="accent-amber-600"
                                                />
                                                <span className="text-xs text-amber-900">
                                                    {(() => { const d = new Date(s.date); return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`; })()} às {s.time}
                                                    {s.specialty ? ` — ${s.specialty}` : ''}
                                                    {s.sessionValue ? ` — R$ ${Number(s.sessionValue).toFixed(2).replace('.', ',')}` : ''}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedPendingIds.length > 0 && (
                                        <p className="text-xs text-amber-700 font-medium">
                                            ✅ {selectedPendingIds.length} sessão(ões) serão absorvidas e marcadas como pagas pelo pacote.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Agendamento Existente */}
                            {packageType === 'therapy' && (
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
                            )}

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
                                        {selectedPendingIds.length > 0 && (
                                            <p className="mt-1 text-xs text-purple-600">
                                                📌 Data da 1ª nova sessão — as {selectedPendingIds.length} sessão(ões) absorvidas já contam para o pacote.
                                            </p>
                                        )}
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

                                    {packageType === 'therapy' && (
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
                                    )}

                                    {packageType === 'convenio' && (
                                        <div className="p-3 bg-blue-100 rounded-lg text-sm text-blue-900">
                                            <p className="font-medium">💳 Pagamento via Convênio</p>
                                            <p className="text-xs mt-1">O paciente não realiza pagamento. O valor será faturado ao convênio.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informações Financeiras - Therapy e Liminar */}
                            {(packageType === 'therapy' || packageType === 'liminar') && (
                                <div className={`p-5 rounded-xl border ${packageType === 'liminar' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'}`}>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <DollarSign className={`w-5 h-5 ${packageType === 'liminar' ? 'text-amber-600' : 'text-green-600'}`} />
                                        {packageType === 'liminar' ? 'Valor da Sessão' : 'Informações Financeiras'}
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
                                                className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-green-500 bg-white ${packageType === 'liminar' ? 'focus:ring-amber-500' : 'focus:ring-green-500'}`}
                                            />
                                            {packageType === 'liminar' && (
                                                <p className="text-xs text-amber-600 mt-2">
                                                    💡 Este valor será consumido do crédito à medida que as sessões forem realizadas.
                                                </p>
                                            )}
                                            
                                            {/* 🔥 AVISO para per-session */}
                                            {formData.paymentType === 'per-session' && (
                                                <p className="text-xs text-blue-600 mt-2">
                                                    💡 Pagamento por sessão: O paciente pagará no dia de cada atendimento. Não é necessário adicionar pagamento antecipado.
                                                </p>
                                            )}
                                        </div>

                                        {/* Múltiplos Pagamentos - APENAS para Therapy e NÃO for per-session */}
                                        {packageType === 'therapy' && formData.paymentType !== 'per-session' && (
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
                            )}

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