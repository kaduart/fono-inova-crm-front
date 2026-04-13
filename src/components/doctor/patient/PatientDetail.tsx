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
    Phone,
    School,
    Stethoscope,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import API from '../../../services/api';
import MedicalReportsSection from './reports/MedicalReportsSection';

// Interfaces (mantidas as mesmas)
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

// Função para calcular idade
function calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Função para formatar data
function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

const tabs = [
    { id: 0, label: 'Visão Geral', icon: BarChart3, color: 'text-blue-600' },
    { id: 1, label: 'Anamnese', icon: ClipboardList, color: 'text-green-600' },
    { id: 2, label: 'Relatórios Escolares', icon: School, color: 'text-purple-600' },
    { id: 3, label: 'Relatórios Médicos', icon: FileText, color: 'text-orange-600' },
    { id: 4, label: 'Evolução', icon: Activity, color: 'text-cyan-600' }
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

    // Buscar dados do paciente
    useEffect(() => {
        const fetchPatient = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await API.get(`/v2/patients/${actualPatientId}`);
                // 🔥 V2: Resposta tem estrutura { data: { ...patientData } }
                setPatient(response.data?.data || response.data);
            } catch (error) {
                console.error('Erro ao buscar paciente:', error);
                setError('Erro ao carregar dados do paciente');
            } finally {
                setLoading(false);
            }
        };

        if (actualPatientId) {
            fetchPatient();
        } else {
            setError('ID do paciente não fornecido');
            setLoading(false);
        }
    }, [actualPatientId]);

    // Processar query parameters
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        const create = searchParams.get('create');

        if (tab === 'anamnesis') setCurrentTab(1);
        if (tab === 'school') setCurrentTab(2);
        if (tab === 'medical') setCurrentTab(3);

        if (create === 'new') {
            setIsCreatingReport(true);
            setReportType(tab || '');
        }
    }, [location.search]);

    const handleTabChange = (newValue: number) => {
        setCurrentTab(newValue);
        setIsCreatingReport(false);
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate('/patients');
        }
    };

    const handleCreateReport = (type: string) => {
        setReportType(type);
        setIsCreatingReport(true);
        if (type === 'anamnesis') setCurrentTab(1);
        if (type === 'school') setCurrentTab(2);
        if (type === 'medical') setCurrentTab(3);
    };

    // Estados de loading e error
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Carregando paciente...</p>
                        <p className="text-sm text-gray-500 mt-2">ID: {actualPatientId}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <Heart className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-red-600">{error}</h3>
                        <p className="text-sm text-gray-500 mt-2">ID: {actualPatientId}</p>
                        <button
                            onClick={handleBack}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Voltar para lista de pacientes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">Paciente não encontrado</h3>
                        <p className="text-sm text-gray-500 mt-2">ID: {actualPatientId}</p>
                        <button
                            onClick={handleBack}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Voltar para lista de pacientes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const age = calculateAge(patient.dateOfBirth);
    const reportCounts = {
        anamnesis: patient.reports?.filter((r: any) => r.type === 'anamnesis').length || 0,
        school: patient.reports?.filter((r: any) => r.type === 'school').length || 0,
        medical: patient.reports?.filter((r: any) => r.type === 'medical').length || 0
    };

    const renderTabContent = () => {
        switch (currentTab) {
            case 0: // Visão Geral
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Resumo do Paciente</h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Histórico Clínico */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Histórico Clínico</h4>
                                <div className="space-y-3">
                                    <div>
                                        <span className="font-medium text-gray-700">Queixa Principal:</span>
                                        <p className="text-gray-600 mt-1">{patient.mainComplaint || 'Não informado'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Histórico Clínico:</span>
                                        <p className="text-gray-600 mt-1">{patient.clinicalHistory || 'Não informado'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Medicações:</span>
                                        <p className="text-gray-600 mt-1">{patient.medications || 'Nenhuma'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Alergias:</span>
                                        <p className="text-gray-600 mt-1">{patient.allergies || 'Nenhuma'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Histórico Familiar:</span>
                                        <p className="text-gray-600 mt-1">{patient.familyHistory || 'Não informado'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Estatísticas */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        {patient.appointments?.length || 0} Consultas
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        {reportCounts.anamnesis} Anamneses
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                        {reportCounts.school} Escolares
                                    </span>
                                </div>
                                <div className="text-gray-600">
                                    {patient.nextAppointment ? (
                                        <p>
                                            <strong>Próxima consulta:</strong> {formatDate(patient.nextAppointment)}
                                        </p>
                                    ) : (
                                        <p>Agende a próxima consulta do paciente.</p>
                                    )}
                                </div>
                            </div>

                            {/* Endereço */}
                            {patient.address && (
                                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h4>
                                    <div className="text-gray-600 space-y-1">
                                        <p>{patient.address.street} {patient.address.number && `, ${patient.address.number}`}</p>
                                        <p>{patient.address.district} - {patient.address.city} - {patient.address.state}</p>
                                        <p>CEP: {patient.address.zipCode}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 1: // Anamnese
                return isCreatingReport && reportType === 'anamnesis' ? (
                    <div className="text-center py-12">
                        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Formulário de Anamnese</h3>
                        <p className="text-gray-600">Em breve você poderá criar fichas de anamnese completas para este paciente.</p>
                    </div>
                ) : (
                    <MedicalReportsSection patient={patient} reportType="anamnesis" />
                );

            case 2: // Relatórios Escolares
                return isCreatingReport && reportType === 'school' ? (
                    <div className="text-center py-12">
                        <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatório Escolar</h3>
                        <p className="text-gray-600">Em breve você poderá criar relatórios escolares completos para este paciente.</p>
                    </div>
                ) : (
                    <MedicalReportsSection patient={patient} reportType="school" />
                );

            case 3: // Relatórios Médicos
                return <MedicalReportsSection patient={patient} reportType="medical" />;

            case 4: // Evolução
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900">Gráficos de Evolução</h3>
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">
                                Aqui serão exibidos os gráficos de progresso do paciente ao longo do tempo.
                            </p>
                            {patient.appointments && patient.appointments.length > 0 && (
                                <p className="text-gray-700">
                                    <strong>Total de consultas realizadas:</strong> {patient.appointments.length}
                                </p>
                            )}
                        </div>
                    </div>
                );

            default:
                return <div>Conteúdo não encontrado</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Cabeçalho e Navegação */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    {/* Breadcrumbs */}
                    <div className="flex items-center text-sm text-gray-600 mb-6">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Pacientes
                        </button>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900 font-medium">{patient.fullName}</span>
                    </div>

                    {/* Informações do Paciente */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                                {patient.fullName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{patient.fullName}</h1>
                                <div className="flex flex-wrap gap-4 text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <User className="w-4 h-4" />
                                        <span>{age} anos • {patient.gender}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Stethoscope className="w-4 h-4" />
                                        <span>{patient.mainComplaint || 'Queixa principal não informada'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            Última consulta: {patient.lastAppointment ? formatDate(patient.lastAppointment) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patient.appointments && patient.appointments.length > 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {patient.appointments && patient.appointments.length > 0 ? 'Ativo' : 'Sem consultas'}
                            </span>
                        </div>
                    </div>

                    {/* Informações de Contato */}
                    <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-200">
                        {patient.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{patient.phone}</span>
                            </div>
                        )}
                        {patient.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4" />
                                <span>{patient.email}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                            <FileText className="w-4 h-4" />
                            <span>{patient.healthPlan?.name || 'Particular'}</span>
                        </div>
                        {patient.address && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{patient.address.city} - {patient.address.state}</span>
                            </div>
                        )}
                    </div>

                    {/* Informações Adicionais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
                        <div className="space-y-2">
                            <p className="text-gray-700">
                                <strong>Nascimento:</strong> {formatDate(patient.dateOfBirth)}
                            </p>
                            <p className="text-gray-700">
                                <strong>Naturalidade:</strong> {patient.placeOfBirth}
                            </p>
                            <p className="text-gray-700">
                                <strong>Profissão:</strong> {patient.profession}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-gray-700">
                                <strong>CPF:</strong> {patient.cpf}
                            </p>
                            <p className="text-gray-700">
                                <strong>RG:</strong> {patient.rg}
                            </p>
                            <p className="text-gray-700">
                                <strong>Estado Civil:</strong> {patient.maritalStatus}
                            </p>
                        </div>
                    </div>

                    {/* Contato de Emergência */}
                    {patient.emergencyContact && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Heart className="w-4 h-4 text-yellow-600" />
                                <span className="font-semibold text-yellow-800">Contato de Emergência</span>
                            </div>
                            <p className="text-yellow-700">
                                <strong>{patient.emergencyContact.name}</strong> ({patient.emergencyContact.relationship}) - {patient.emergencyContact.phone}
                            </p>
                        </div>
                    )}
                </div>

                {/* Abas Principais */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header das Abas */}
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Tabs */}
                            <div className="flex space-x-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = currentTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : tab.color}`} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleCreateReport('anamnesis')}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Stethoscope className="w-4 h-4" />
                                    Nova Anamnese
                                </button>
                                <button
                                    onClick={() => handleCreateReport('school')}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <School className="w-4 h-4" />
                                    Relatório Escolar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Conteúdo das Abas */}
                    <div className="p-6">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}