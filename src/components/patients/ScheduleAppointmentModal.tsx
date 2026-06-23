import { Calendar, DollarSign, User, UserPlus, Users, X, AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';

import { ptBR } from "date-fns/locale";
import { Building2 } from 'lucide-react';
import ReactInputMask from 'react-input-mask';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { INSURANCE_PROVIDERS, getProviderById } from '../../constants/insuranceProviders';
import { toDateString } from '../../utils/dateUtils';
import { IDoctor, IPatient, ScheduleAppointment } from '../../utils/types/types';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/TextArea';
import SmartAgendaPanel from '../calendar/SmartAgendaPanel';
import { SuggestedSlot } from '../../services/agendaService';

type ServiceType = ScheduleAppointment['serviceType'];

const defaultForm: ScheduleAppointment = {
    doctorId: '',
    patientId: '',
    date: '',
    time: '',
    sessionType: 'fonoaudiologia',
    specialty: 'fonoaudiologia',
    notes: '',
    paymentAmount: 0,
    paymentMethod: 'dinheiro',
    status: 'agendado',
    serviceType: 'individual_session',
    billingType: 'particular',
    insuranceProvider: '',
    authorizationCode: '',
    insuranceValue: 0,
};

export interface ShadowInfoPayload {
    patientName: string;
    occurrences: number;
    confidence: number;
    lastDates?: string[];
}

type Props = {
    isOpen: boolean;
    onClose?: () => void;
    onSave: (appointment: ScheduleAppointment) => void;
    doctors?: IDoctor[];
    patients?: IPatient[];
    packages?: any[];
    initialData?: ScheduleAppointment | null;
    erroMessage?: string | null,
    isLoading: boolean;
    closeModalSignal?: number; // 🆕 Sinal para fechar modal após sucesso
    shadowInfo?: ShadowInfoPayload | null;
};

const ScheduleAppointmentModal = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    doctors,
    patients,
    erroMessage,
    isLoading,
    closeModalSignal,
    shadowInfo
}: Props) => {
    const [formData, setFormData] = useState<ScheduleAppointment>(defaultForm);
    const [serviceType, setServiceType] = useState<ServiceType>('individual_session');
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
    // 👇 NOVO: texto digitado no campo de busca de paciente
    const [patientSearch, setPatientSearch] = useState('');
    // 👇 NOVO: pacientes buscados do backend
    const [searchedPatients, setSearchedPatients] = useState<IPatient[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 👇 NOVO PACIENTE inline
    const [isNewPatient, setIsNewPatient] = useState(false);
    const [newPatientName, setNewPatientName] = useState('');
    const [newPatientPhone, setNewPatientPhone] = useState('');
    const [newPatientBirthDate, setNewPatientBirthDate] = useState('');

    // 👇 NOVO: Buscar doutores quando modal abrir (se não vier dos props)
    const [localDoctors, setLocalDoctors] = useState<IDoctor[]>([]);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Se não tem doutores nos props, busca do backend
            if (!doctors || doctors.length === 0) {
                setIsLoadingDoctors(true);
                doctorService.getActiveDoctors()
                    .then(response => {
                        const docs = (response?.data?.data?.doctors || 
                                      response?.data?.data || 
                                      response?.data || 
                                      []) as IDoctor[];
                        setLocalDoctors(docs);
                    })
                    .catch(() => toast.error('Erro ao carregar profissionais'))
                    .finally(() => setIsLoadingDoctors(false));
            }
        }
    }, [isOpen, doctors]);

    // 👇 Combina doutores dos props com os locais (prioriza props)
    const availableDoctors = useMemo(() => {
        if (doctors && doctors.length > 0) return doctors;
        return localDoctors;
    }, [doctors, localDoctors]);

    // 🏥 CONVÊNIO
    const [billingType, setBillingType] = useState<'particular' | 'convenio'>('particular');
    const [insuranceProvider, setInsuranceProvider] = useState('');
    const [authorizationCode, setAuthorizationCode] = useState('');
    const [insuranceValue, setInsuranceValue] = useState(0);


    // 🔍 Busca pacientes no backend quando digitar (com debounce)
    useEffect(() => {
        const searchTerm = patientSearch.trim();

        // Limpa resultados anteriores imediatamente — evita exibir lista obsoleta do onFocus
        setSearchedPatients([]);

        if (searchTerm.length < 2) {
            return;
        }

        // Se já selecionou um paciente e o nome corresponde exatamente, não busca
        if (selectedPatient && selectedPatient.fullName.toLowerCase() === searchTerm.toLowerCase()) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await patientService.search(searchTerm);
                setSearchedPatients(results);
            } catch (error) {
                console.error('Erro ao buscar pacientes:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300); // debounce de 300ms

        return () => clearTimeout(timeoutId);
    }, [patientSearch, selectedPatient]);

    // Resultados da busca — sempre via API (sem fallback no prop local)
    const filteredPatients = useMemo(() => {
        if (patientSearch.trim().length < 2) return [];
        return searchedPatients;
    }, [patientSearch, searchedPatients]);

    registerLocale("pt-BR", ptBR);

    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        const justOpened = isOpen && !prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        if (!justOpened) return; // só age na transição fechado → aberto

        if (initialData) {
            const isoDate = new Date(initialData.date);
            const formattedDate = isoDate.toISOString().split('T')[0];

            setFormData({
                ...initialData,
                date: formattedDate,
                serviceType: initialData.serviceType || 'individual_session'
            });
            setServiceType(initialData.serviceType || 'individual_session');
            setBillingType(initialData.billingType || 'particular');
            setInsuranceProvider(initialData.insuranceProvider || '');
            setInsuranceValue(initialData.insuranceValue || 0);
            setAuthorizationCode(initialData.authorizationCode || '');
        } else {
            setFormData(defaultForm);
            setServiceType('individual_session');
            setBillingType('particular');
            setInsuranceProvider('');
            setInsuranceValue(0);
            setAuthorizationCode('');
            setPatientSearch('');
            setSearchedPatients([]);
            setSelectedPatient(null);
            setPackages([]);
            setIsNewPatient(false);
            setNewPatientName('');
            setNewPatientPhone('');
            setNewPatientBirthDate('');
        }
    }, [initialData, isOpen]);

    // Resolver reativo: patientId → dados completos (local first, API fallback)
    useEffect(() => {
        if (!initialData?.patientId) return;

        const found = patients?.find((p) => p._id === initialData.patientId);
        if (found) {
            setPatientSearch(found.fullName);
            setSelectedPatient(found);
            return;
        }

        // Não estava no array local → busca pelo ID direto na API
        patientService.getById(initialData.patientId)
            .then(patient => {
                if (patient) {
                    setPatientSearch(patient.fullName);
                    setSelectedPatient(patient);
                }
            })
            .catch(() => {});
    }, [initialData?.patientId]);

    // 🆕 Fecha o modal quando o sinal é emitido (após sucesso no agendamento)
    // ✅ CORREÇÃO: Só fecha quando o sinal MUDA, não quando é > 0 inicialmente
    const prevCloseSignalRef = useRef(closeModalSignal);
    useEffect(() => {
        if (closeModalSignal !== prevCloseSignalRef.current && 
            closeModalSignal && closeModalSignal > 0 && onClose) {
            onClose();
        }
        prevCloseSignalRef.current = closeModalSignal;
    }, [closeModalSignal, onClose]);

    useEffect(() => {

        if (formData.packageId && formData.patientId) {
            const selectedPackage = packages?.find(pkg => pkg._id === formData.packageId);


            if (selectedPackage && selectedPackage.sessions?.length > 0) {
                const upcomingSessions = selectedPackage.sessions
                    .filter(session => session.status === 'scheduled')
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (upcomingSessions.length > 0) {
                    const closest = upcomingSessions[0];
                    // 🆕 Usa helper para compatibilidade
                    const dateStr = toDateString(closest.date);
                    const date = dateStr;
                    // Extrai hora do time ou da data
                    const time = closest.time || (dateStr.includes('T') ? dateStr.split('T')[1].slice(0, 5) : '');

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



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value as ServiceType;
        setServiceType(type);
        setFormData(prev => ({ ...prev, serviceType: type }));
    };

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);

    const handleSubmit = async () => {
        setSubmitError(null);
        if (serviceType === 'package_session') {
            formData.paymentAmount = 0;
        }

        // Novo paciente: cria no backend antes de agendar
        let justCreatedPatientId: string | null = null;
        if (isNewPatient) {
            setIsCreatingPatient(true);
            try {
                const created = await patientService.create({
                    fullName: newPatientName.trim(),
                    phone: newPatientPhone.replace(/\D/g, ''),
                    dateOfBirth: newPatientBirthDate ? new Date(newPatientBirthDate).toISOString() : '',
                    gender: '', maritalStatus: '', profession: '', placeOfBirth: '',
                    address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
                    email: '', cpf: '', rg: '', specialties: [], mainComplaint: '',
                    clinicalHistory: '', medications: '', allergies: '', familyHistory: '',
                    healthPlan: { name: '', policyNumber: '' }, legalGuardian: '',
                    emergencyContact: { name: '', phone: '', relationship: '' },
                    appointments: [], imageAuthorization: false, birthCertificate: '',
                    packages: [], nextAppointment: '', lastAppointment: '',
                } as any);
                // patientService.create() retorna { patient, isAsync, eventId }
                const newId = created?.patient?._id
                    || created?.patient?.id
                    || created?._id;
                if (!newId) throw new Error('Paciente criado mas ID não retornado');
                justCreatedPatientId = newId;
                setFormData(prev => ({ ...prev, patientId: newId }));
                formData.patientId = newId;
            } catch (err: any) {
                // Se o paciente foi criado mas algo falhou depois, tenta rollback
                if (justCreatedPatientId) {
                    try { await patientService.delete(justCreatedPatientId, { reason: 'rollback_id_read_failed', skipPolling: true }); } catch {}
                }
                setSubmitError('Erro ao criar paciente: ' + (err?.response?.data?.message || err?.message || ''));
                setIsCreatingPatient(false);
                return;
            } finally {
                setIsCreatingPatient(false);
            }
        }

        // 🏥 Se for convênio, montar objeto insurance completo
        let insurance = null;
        if (billingType === 'convenio' && insuranceProvider) {
            insurance = {
                provider: insuranceProvider,
                grossAmount: insuranceValue || 0,
                authorizationCode: authorizationCode || null,
                status: 'pending_billing'
            };
        }

        // 🏥 Convênio NUNCA pode ter packageId (hard block no backend)
        const { packageId, ...formDataWithoutPackage } = formData;
        const payload = {
            ...formDataWithoutPackage,
            billingType,
            insuranceProvider,
            authorizationCode,
            insuranceValue,
            insurance,
            ...(billingType !== 'convenio' && packageId ? { packageId } : {}),
        };

        try {
            await onSave(payload);
        } catch (err: any) {
            // Rollback: se o paciente foi criado agora mas o agendamento falhou, deleta o paciente
            if (justCreatedPatientId) {
                try {
                    await patientService.delete(justCreatedPatientId, { reason: 'rollback_appointment_failed', skipPolling: true });
                } catch (rollbackErr) {
                    console.error('[Rollback] Falha ao deletar paciente criado:', rollbackErr);
                }
            }
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Erro ao criar agendamento';
            setSubmitError(msg);
        }
    };

    const canSchedule = useMemo(() => {
        // Paciente: pode ser existente (patientId) ou novo (isNewPatient + nome + telefone)
        const patientReady = isNewPatient
            ? newPatientName.trim().length >= 2 && newPatientPhone.trim().length >= 8
            : !!formData.patientId;

        if (!patientReady || !formData.doctorId || !formData.date || !formData.time || !formData.sessionType) {
            return false;
        }

        // Se for sessão de pacote
        if (formData.serviceType === 'package_session') {
            const selectedPackage = packages.find(p => p._id === formData.packageId);
            if (!selectedPackage) return false;
            const remainingSessions = (selectedPackage.totalSessions || 0) - (selectedPackage.sessionsDone || 0);
            return remainingSessions > 0;
        }

        // 🏥 Se for convênio, só precisa ter provider selecionado
        if (billingType === 'convenio') {
            return !!insuranceProvider;
        }

        // 🔧 Tipos que NÃO exigem valor (alinhamento, retorno, reunião)
        const tiposSemValor = ['alignment', 'return', 'meet'];
        if (tiposSemValor.includes(formData.serviceType)) {
            return true; // permite sem valor
        }

        // Se for sessão individual ou avaliação PARTICULAR, precisa de valor > 0
        if (['individual_session', 'evaluation', 'neuropsych_evaluation', 'tongue_tie_test'].includes(formData.serviceType)) {
            return formData.paymentAmount > 0 && !!formData.paymentMethod;
        }

        return true;
    }, [formData, packages, billingType, insuranceProvider]);

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (erroMessage) {
            toast.error(erroMessage, {
                position: 'top-center',
                duration: 4000,
            });
        }
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
            {(erroMessage || submitError) && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                    <p>{erroMessage || submitError}</p>
                </div>
            )}

            {/* 🧠 Shadow Booking Alert — aparece quando o horário veio de um slot recorrente */}
            {shadowInfo && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-amber-100 rounded-full shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-amber-900">
                                Horário recorrente detectado
                            </p>
                            <p className="text-sm text-amber-800 mt-1">
                                Este horário costuma ser ocupado por <strong>{shadowInfo.patientName}</strong> ({shadowInfo.occurrences}x neste mesmo dia/hora).
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                                Confiança do padrão: {Math.round((shadowInfo.confidence || 0) * 100)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Profissional e Paciente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg relative">
                        <Label
                            htmlFor="patientId"
                            className="block mb-2 font-medium text-gray-700 flex items-center gap-2"
                        >
                            <User size={18} /> Paciente
                        </Label>

                        {/* Campo de busca — oculto quando no modo novo paciente */}
                        {!isNewPatient && (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    placeholder="Digite o nome do paciente..."
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dropdown dinâmico — só mostra quando NÃO estiver no modo novo paciente */}
                        {!isNewPatient && patientSearch.trim().length >= 2 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden">
                                {isSearching ? (
                                    <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
                                ) : (
                                    <>
                                        {filteredPatients.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-gray-400">Nenhum paciente encontrado</div>
                                        ) : (
                                            <ul className="max-h-40 overflow-auto">
                                                {filteredPatients.map((patient, index) => (
                                                    <li
                                                        key={patient._id || `${patient.fullName}-${index}`}
                                                        onClick={() => {
                                                            setSelectedPatient(patient);
                                                            setPatientSearch(patient.fullName);
                                                            setFormData((prev) => ({ ...prev, patientId: patient._id }));
                                                            setPackages((patient as any)?.packages || []);
                                                            setSearchedPatients([]);
                                                        }}
                                                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-700"
                                                    >
                                                        {patient.fullName}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewPatient(true);
                                                setNewPatientName(patientSearch.trim());
                                                setSearchedPatients([]);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-sm text-blue-700 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-2 font-medium"
                                        >
                                            <UserPlus size={15} />
                                            Criar novo: "{patientSearch}"
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Mini-form para novo paciente */}
                        {isNewPatient && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                                        <UserPlus size={13} /> Novo paciente
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setIsNewPatient(false); setNewPatientName(''); setNewPatientPhone(''); setNewPatientBirthDate(''); }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nome completo *"
                                    value={newPatientName}
                                    onChange={(e) => setNewPatientName(e.target.value)}
                                    className="w-full p-2 text-sm border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                                    autoFocus
                                />
                                <input
                                    type="tel"
                                    placeholder="Telefone *"
                                    value={newPatientPhone}
                                    onChange={(e) => setNewPatientPhone(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="date"
                                    placeholder="Data de nascimento"
                                    value={newPatientBirthDate}
                                    onChange={(e) => setNewPatientBirthDate(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="doctorId" className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <Users size={18} /> Profissional
                        </Label>
                        <Select
                            name="doctorId"
                            value={formData.doctorId}
                            onChange={handleChange}
                            disabled={isLoadingDoctors}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        >
                            <option value="">
                                {isLoadingDoctors ? 'Carregando...' : 'Selecione um profissional'}
                            </option>
                            {availableDoctors.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>
                                    {doctor.fullName} - {doctor.specialty}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* 🧠 SMART AGENDA: Sugestões inteligentes de horário */}
                <SmartAgendaPanel
                    patientId={selectedPatient?._id}
                    doctorId={formData.doctorId || undefined}
                    specialty={formData.sessionType}
                    serviceType={formData.serviceType}
                    visible={!!selectedPatient && !!formData.doctorId}
                    onScheduleSlot={async (slot: SuggestedSlot) => {
                        console.log('[ScheduleAppointmentModal] onScheduleSlot chamado:', slot);
                        try {
                            // 1. Atualiza médico, data e hora no formulário
                            setFormData(prev => ({
                                ...prev,
                                doctorId: slot.doctorId,
                                date: slot.date,
                                time: slot.time,
                            }));

                            // 2. Aguarda React aplicar estado
                            await new Promise(r => setTimeout(r, 50));

                            // 3. Monta payload completo para criação direta
                            let insurance = null;
                            if (billingType === 'convenio' && insuranceProvider) {
                                insurance = {
                                    provider: insuranceProvider,
                                    grossAmount: insuranceValue || 0,
                                    authorizationCode: authorizationCode || null,
                                    status: 'pending_billing'
                                };
                            }

                            const currentForm = { ...formData, doctorId: slot.doctorId, date: slot.date, time: slot.time };
                            const { packageId, ...formDataWithoutPackage } = currentForm;
                            const payload = {
                                ...formDataWithoutPackage,
                                billingType,
                                insuranceProvider,
                                authorizationCode,
                                insuranceValue,
                                insurance,
                                ...(billingType !== 'convenio' && packageId ? { packageId } : {}),
                            };

                            console.log('[ScheduleAppointmentModal] Payload montado:', payload);

                            // 4. Envia para o backend
                            console.log('[ScheduleAppointmentModal] Chamando onSave...');
                            await onSave(payload);
                            console.log('[ScheduleAppointmentModal] onSave retornou com sucesso');

                            // 5. Só mostra toast se backend confirmou
                            toast.success(`✅ Agendamento criado: ${slot.date} às ${slot.time}`);
                        } catch (err: any) {
                            console.error('[ScheduleAppointmentModal] Erro ao agendar:', err);
                            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Erro ao criar agendamento';
                            setSubmitError(msg);
                        }
                    }}
                />

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
                            <option value="psicomotricidade">Psicomotricidade</option>
                            <option value="musicoterapia">Musicoterapia</option>
                            <option value="psicopedagogia">Psicopedagogia</option>
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


                            <option value="alignment">Alinhamento</option>
                            <option value="evaluation">Avaliação</option>
                            <option value="neuropsych_evaluation">Avaliação Neuropsicológica</option>
                            <option value="return">Retorno</option>
                            <option value="meet">Reunião</option>
                            <option value="individual_session">Sessão Avulsa</option>
                            <option value="package_session">Sessão de Pacote</option>
                            <option value="tongue_tie_test">Teste da Linguinha</option>
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
                {(serviceType !== 'package_session') && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="bg-green-100 p-2 rounded-full">
                                <DollarSign size={18} className="text-green-600" />
                            </span>
                            Pagamento
                        </h3>

                        {/* 🏥 Toggle Particular/Convênio */}
                        <div className="mb-4">
                            <Label className="block mb-2 font-medium text-gray-700">
                                Tipo de Pagamento
                            </Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillingType('particular');
                                        setFormData(prev => ({ ...prev, billingType: 'particular', paymentMethod: 'dinheiro' }));
                                    }}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${billingType === 'particular'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    💵 Particular
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillingType('convenio');
                                        setFormData(prev => ({ ...prev, billingType: 'convenio', paymentMethod: 'convenio' }));
                                    }}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${billingType === 'convenio'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    🏥 Convênio
                                </button>
                            </div>
                        </div>

                        {/* 💵 Campos Particular */}
                        {billingType === 'particular' && (
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
                        )}

                        {/* 🏥 Campos Convênio */}
                        {billingType === 'convenio' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block mb-2 font-medium text-gray-700">
                                            <Building2 size={16} className="inline mr-1" />
                                            Convênio *
                                        </Label>
                                        <Select
                                            value={insuranceProvider}
                                            onChange={(e) => {
                                                const provider = getProviderById(e.target.value);
                                                setInsuranceProvider(e.target.value);
                                                setInsuranceValue(provider?.defaultValue || 0);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    insuranceProvider: e.target.value,
                                                    insuranceValue: provider?.defaultValue || 0,
                                                }));
                                            }}
                                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Selecione o convênio</option>
                                            {INSURANCE_PROVIDERS.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.city ? `(${p.city})` : ''}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="block mb-2 font-medium text-gray-700">
                                            Valor Tabela
                                        </Label>
                                        <InputCurrency
                                            value={insuranceValue}
                                            onChange={(e) => {
                                                setInsuranceValue(Number(e.target.value));
                                                setFormData(prev => ({ ...prev, insuranceValue: Number(e.target.value) }));
                                            }}
                                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="block mb-2 font-medium text-gray-700">
                                        Código da Guia/Autorização (opcional)
                                    </Label>
                                    <input
                                        type="text"
                                        value={authorizationCode}
                                        onChange={(e) => {
                                            setAuthorizationCode(e.target.value);
                                            setFormData(prev => ({ ...prev, authorizationCode: e.target.value }));
                                        }}
                                        placeholder="Ex: 123456789"
                                        className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
                                    💡 Atendimento será registrado com valor R$ 0,00 no caixa do dia.
                                    O valor só entrará após confirmação de recebimento do convênio.
                                </div>
                            </div>
                        )}
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
                    disabled={!canSchedule || isLoading || isCreatingPatient}
                    onClick={handleSubmit}
                    className={`px-6 py-3 text-white transition-colors flex items-center justify-center gap-2 ${!canSchedule || isLoading || isCreatingPatient
                        ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isCreatingPatient ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Criando paciente...
                        </>
                    ) : isLoading ? (
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