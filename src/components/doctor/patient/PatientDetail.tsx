import {
    Activity,
    ArrowLeft,
    BarChart3,
    Calendar,
    ClipboardList,
    FileText,
    Heart,
    Mail,
    MapPin,
    Package,
    Phone,
    School,
    Shield,
    Stethoscope,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import API from '../../../services/api';
import TherapyPackagesSummary from '../../patients/TherapyPackagesSummary';
import MedicalReportsSection from './reports/MedicalReportsSection';

interface Address {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
}

interface HealthPlan {
    name: string;
    policyNumber: string;
}

interface EmergencyContact {
    name: string;
    phone: string;
    relationship: string;
}

interface Patient {
    _id: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    profession: string;
    placeOfBirth: string;
    phone: string;
    email: string;
    cpf: string;
    rg: string;
    mainComplaint: string;
    clinicalHistory: string;
    medications: string;
    allergies: string;
    familyHistory: string;
    legalGuardian: string;
    imageAuthorization: boolean;
    createdAt: string;
    updatedAt: string;
    lastAppointment?: string;
    nextAppointment?: string;
    status: string;
    address: Address;
    healthPlan: HealthPlan;
    emergencyContact: EmergencyContact;
    appointments: string[];
    reports?: any[];
}

interface PatientDetailProps {
    patientId?: string;
    onBack?: () => void;
}

function calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

function formatDate(dateString: string): string {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
}

function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const tabs = [
    { id: 0, label: 'Visão Geral',         icon: BarChart3,     color: 'text-emerald-500' },
    { id: 1, label: 'Anamnese',             icon: ClipboardList, color: 'text-green-500'   },
    { id: 2, label: 'Rel. Escolares',       icon: School,        color: 'text-purple-500'  },
    { id: 3, label: 'Rel. Médicos',         icon: FileText,      color: 'text-orange-500'  },
    { id: 4, label: 'Evolução',             icon: Activity,      color: 'text-cyan-500'    },
    { id: 5, label: 'Pacotes',              icon: Package,       color: 'text-teal-500'    },
];

export default function PatientDetail({ patientId, onBack }: PatientDetailProps) {
    const { id: urlPatientId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const actualPatientId = patientId || urlPatientId;
    const [currentTab, setCurrentTab] = useState(0);
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [reportType, setReportType] = useState('');
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [doctors, setDoctors] = useState<any[]>([]);

    useEffect(() => {
        API.get('/doctors?status=active&limit=100')
            .then(res => setDoctors(res.data?.data || res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchPatient = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await API.get(`/v2/patients/${actualPatientId}`);
                setPatient(response.data?.data || response.data);
            } catch {
                setError('Erro ao carregar dados do paciente');
            } finally {
                setLoading(false);
            }
        };
        if (actualPatientId) fetchPatient();
        else { setError('ID do paciente não fornecido'); setLoading(false); }
    }, [actualPatientId]);

    useEffect(() => {
        const p = new URLSearchParams(location.search);
        const tab = p.get('tab');
        const create = p.get('create');
        if (tab === 'anamnesis') setCurrentTab(1);
        if (tab === 'school') setCurrentTab(2);
        if (tab === 'medical') setCurrentTab(3);
        if (create === 'new') { setIsCreatingReport(true); setReportType(tab || ''); }
    }, [location.search]);

    const handleTabChange = (v: number) => { setCurrentTab(v); setIsCreatingReport(false); };

    const handleBack = () => onBack ? onBack() : navigate('/patients');

    const handleCreateReport = (type: string) => {
        setReportType(type);
        setIsCreatingReport(true);
        if (type === 'anamnesis') setCurrentTab(1);
        if (type === 'school') setCurrentTab(2);
        if (type === 'medical') setCurrentTab(3);
    };

    // ── Loading / Error states ──────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600 font-medium">Carregando paciente…</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-7 h-7 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{error || 'Paciente não encontrado'}</h3>
                    <p className="text-sm text-gray-400 mb-6">ID: {actualPatientId}</p>
                    <button onClick={handleBack} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium">
                        Voltar para lista
                    </button>
                </div>
            </div>
        );
    }

    const age = calculateAge(patient.dateOfBirth);
    const reportCounts = {
        anamnesis: patient.reports?.filter((r: any) => r.type === 'anamnesis').length || 0,
        school:    patient.reports?.filter((r: any) => r.type === 'school').length    || 0,
        medical:   patient.reports?.filter((r: any) => r.type === 'medical').length   || 0,
    };
    const totalConsultas = patient.appointments?.length || 0;
    const isActive = totalConsultas > 0;

    // ── Tab content ─────────────────────────────────────────────────────────
    const renderTabContent = () => {
        switch (currentTab) {
            case 0:
                return (
                    <div className="space-y-5">
                        {/* KPI row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Consultas',  value: totalConsultas,          icon: Calendar,      bg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100' },
                                { label: 'Anamneses',  value: reportCounts.anamnesis,  icon: ClipboardList, bg: 'bg-green-50',   iconColor: 'text-green-600',   border: 'border-green-100'   },
                                { label: 'Escolares',  value: reportCounts.school,     icon: School,        bg: 'bg-purple-50',  iconColor: 'text-purple-600',  border: 'border-purple-100'  },
                                { label: 'Médicos',    value: reportCounts.medical,    icon: FileText,      bg: 'bg-orange-50',  iconColor: 'text-orange-600',  border: 'border-orange-100'  },
                            ].map(k => {
                                const Icon = k.icon;
                                return (
                                    <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4 flex items-center gap-3`}>
                                        <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
                                            <Icon className={`w-5 h-5 ${k.iconColor}`} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                                            <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Histórico Clínico */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <Stethoscope className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900">Histórico Clínico</h4>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Queixa Principal', value: patient.mainComplaint },
                                        { label: 'Histórico Clínico', value: patient.clinicalHistory },
                                        { label: 'Medicações', value: patient.medications || 'Nenhuma' },
                                        { label: 'Alergias', value: patient.allergies || 'Nenhuma' },
                                        { label: 'Histórico Familiar', value: patient.familyHistory },
                                    ].map(item => (
                                        <div key={item.label} className="flex gap-2">
                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 pt-0.5 flex-shrink-0">{item.label}</span>
                                            <span className="text-sm text-gray-700">{item.value || 'Não informado'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Próxima consulta + endereço */}
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900">Agendamento</h4>
                                    </div>
                                    {patient.nextAppointment ? (
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <div>
                                                <p className="text-xs text-emerald-600 font-medium">Próxima consulta</p>
                                                <p className="text-sm font-semibold text-gray-900">{formatDate(patient.nextAppointment)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Nenhuma consulta agendada</p>
                                    )}
                                </div>

                                {patient.address && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <h4 className="font-semibold text-gray-900">Endereço</h4>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>{patient.address.street}{patient.address.number ? `, ${patient.address.number}` : ''}</p>
                                            <p>{patient.address.district} — {patient.address.city}/{patient.address.state}</p>
                                            <p className="text-gray-400">CEP {patient.address.zipCode}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 1:
                return isCreatingReport && reportType === 'anamnesis' ? (
                    <div className="text-center py-16">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Formulário de anamnese em breve.</p>
                    </div>
                ) : <MedicalReportsSection patient={patient} reportType="anamnesis" />;

            case 2:
                return isCreatingReport && reportType === 'school' ? (
                    <div className="text-center py-16">
                        <School className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Relatório escolar em breve.</p>
                    </div>
                ) : <MedicalReportsSection patient={patient} reportType="school" />;

            case 3:
                return <MedicalReportsSection patient={patient} reportType="medical" />;

            case 4:
                return (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Activity className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">Gráficos de Evolução</h3>
                        <p className="text-sm text-gray-400">
                            {totalConsultas > 0
                                ? `${totalConsultas} consultas registradas — visualização em breve.`
                                : 'Nenhuma consulta registrada ainda.'}
                        </p>
                    </div>
                );

            case 5:
                return (
                    <TherapyPackagesSummary patient={patient as any} doctors={doctors} />
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50/30 py-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">

                {/* Breadcrumb externo */}
                <div className="flex items-center gap-1.5 text-sm">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Pacientes
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-500 truncate max-w-xs">{patient.fullName}</span>
                </div>

                {/* ── Hero Card ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Gradient banner — apenas decorativo */}
                    <div className="h-20 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />

                    {/* Patient info below banner */}
                    <div className="px-6 pb-6">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 -mt-8">
                            {/* Avatar + name */}
                            <div className="flex items-end gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white">
                                    {getInitials(patient.fullName)}
                                </div>
                                <div className="pb-1">
                                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{patient.fullName}</h1>
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1 text-sm text-gray-500">
                                            <User className="w-3.5 h-3.5" />{age} anos • {patient.gender || '—'}
                                        </span>
                                        {patient.mainComplaint && (
                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                <Stethoscope className="w-3.5 h-3.5" />{patient.mainComplaint}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status + última consulta */}
                            <div className="flex items-center gap-3 pb-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    {isActive ? 'Ativo' : 'Sem consultas'}
                                </span>
                                {patient.lastAppointment && (
                                    <span className="flex items-center gap-1 text-sm text-gray-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Última: {formatDate(patient.lastAppointment)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Contact strip */}
                        <div className="mt-5 flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                            {patient.phone && (
                                <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Phone className="w-3.5 h-3.5" />
                                    </div>
                                    {patient.phone}
                                </a>
                            )}
                            {patient.email && (
                                <a href={`mailto:${patient.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Mail className="w-3.5 h-3.5" />
                                    </div>
                                    {patient.email}
                                </a>
                            )}
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Shield className="w-3.5 h-3.5" />
                                </div>
                                {patient.healthPlan?.name || 'Particular'}
                            </div>
                            {patient.address?.city && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    {patient.address.city}/{patient.address.state}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Info grid ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Dados Pessoais</p>
                        <div className="space-y-2">
                            {[
                                { l: 'Nascimento', v: formatDate(patient.dateOfBirth) },
                                { l: 'Naturalidade', v: patient.placeOfBirth },
                                { l: 'Profissão', v: patient.profession },
                            ].map(i => (
                                <div key={i.l} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{i.l}</span>
                                    <span className="text-gray-800 font-medium text-right">{i.v || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Documentos</p>
                        <div className="space-y-2">
                            {[
                                { l: 'CPF', v: patient.cpf },
                                { l: 'RG', v: patient.rg },
                                { l: 'Estado Civil', v: patient.maritalStatus },
                            ].map(i => (
                                <div key={i.l} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{i.l}</span>
                                    <span className="text-gray-800 font-medium text-right">{i.v || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {patient.emergencyContact?.name ? (
                        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Heart className="w-4 h-4 text-amber-500" />
                                <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold">Contato de Emergência</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{patient.emergencyContact.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{patient.emergencyContact.relationship}</p>
                            <p className="text-sm text-amber-700 font-medium mt-2">{patient.emergencyContact.phone}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-center">
                            <p className="text-sm text-gray-300 italic">Sem contato de emergência</p>
                        </div>
                    )}
                </div>

                {/* ── Tabs ─────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-100 px-5 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {/* Tab pills */}
                            <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                                {tabs.map(tab => {
                                    const Icon = tab.icon;
                                    const active = currentTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                                active
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : tab.color}`} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Quick actions (only on non-package tabs) */}
                            {currentTab !== 5 && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleCreateReport('anamnesis')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium"
                                    >
                                        <Stethoscope className="w-3.5 h-3.5" />
                                        Nova Anamnese
                                    </button>
                                    <button
                                        onClick={() => handleCreateReport('school')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium"
                                    >
                                        <School className="w-3.5 h-3.5" />
                                        Rel. Escolar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-5">
                        {renderTabContent()}
                    </div>
                </div>
            </div>


        </div>
    );
}
