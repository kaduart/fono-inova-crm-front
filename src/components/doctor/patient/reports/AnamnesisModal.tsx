// components/reports/AnamnesisModal.tsx
import {
    ArrowLeft,
    ArrowRight,
    Brain,
    CheckCircle,
    Eye,
    FileText,
    Heart,
    LucideIcon,
    Save,
    School,
    Stethoscope,
    User,
    X
} from 'lucide-react';
import { useState } from 'react';

interface AnamnesisModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
}

type Step = {
    label: string;
    icon: LucideIcon;          // obrigatório
    textColor: string;         // ex: "text-blue-600"
    bgColor: string;           // ex: "bg-blue-50"
};

const steps: Step[] = [
    { label: "Identificação", icon: User, textColor: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "Histórico Médico", icon: Stethoscope, textColor: "text-green-600", bgColor: "bg-green-50" },
    { label: "Histórico Familiar", icon: Heart, textColor: "text-red-600", bgColor: "bg-red-50" },
    { label: "Desenvolvimento", icon: Brain, textColor: "text-purple-600", bgColor: "bg-purple-50" },
    { label: "Hábitos", icon: CheckCircle, textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
    { label: "Aspectos Escolares", icon: School, textColor: "text-indigo-600", bgColor: "bg-indigo-50" },
    { label: "Observações", icon: Eye, textColor: "text-cyan-600", bgColor: "bg-cyan-50" },
    { label: "Conclusões", icon: FileText, textColor: "text-gray-600", bgColor: "bg-gray-50" },
];

export default function AnamnesisModal({ open, onClose, onSave, patient, loading = false }: AnamnesisModalProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState<{ [k: number]: boolean }>({});

    const [formData, setFormData] = useState({
        identification: {
            interviewDate: new Date().toISOString().split('T')[0],
            interviewer: '',
            mainComplaint: '',
            complaintDuration: '',
            complaintEvolution: ''
        },
        medicalHistory: {
            pregnancy: '',
            birth: '',
            birthWeight: '',
            birthHeight: '',
            motorDevelopment: '',
            languageDevelopment: '',
            medicalConditions: '',
            hospitalizations: '',
            surgeries: '',
            allergies: '',
            medications: '',
            complementaryExams: ''
        },
        familyHistory: {
            parents: {
                mother: { age: '', education: '', occupation: '', health: '' },
                father: { age: '', education: '', occupation: '', health: '' }
            },
            siblings: [],
            familyDiseases: '',
            geneticConditions: ''
        },
        development: {
            gestationalAge: '',
            prenatalCare: '',
            deliveryType: '',
            apgarScore: '',
            firstWordsAge: '',
            phraseFormationAge: '',
            currentSpeech: '',
            socialInteraction: '',
            playHabits: ''
        },
        habits: {
            feeding: '',
            sleep: '',
            elimination: '',
            oralHabits: '',
            screenTime: ''
        },
        school: {
            attendsSchool: true,
            schoolName: '',
            grade: '',
            teacher: '',
            performance: '',
            difficulties: '',
            relationshipPeers: '',
            relationshipTeachers: '',
            adaptations: ''
        },
        behavior: {
            generalAppearance: '',
            attention: '',
            concentration: '',
            behaviorDuringAssessment: '',
            cooperation: '',
            emotionalState: ''
        },
        conclusions: {
            diagnosticHypotheses: '',
            recommendations: '',
            referrals: '',
            observations: '',
            nextAppointment: ''
        }
    });

    const handleNext = () => {
        setCompleted({ ...completed, [activeStep]: true });
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleSave = () => {
        const anamnesisData = {
            type: 'anamnesis',
            title: `Anamnese - ${patient.fullName} - ${new Date().toLocaleDateString('pt-BR')}`,
            patientId: patient._id,
            patientName: patient.fullName,
            date: formData.identification.interviewDate,
            content: formData,
            status: 'completed'
        };
        onSave(anamnesisData);
    };

    const updateFormData = (section: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [field]: value
            }
        }));
    };

    const totalSteps = steps.length;
    const completedSteps = Object.keys(completed).length;
    const progress = (completedSteps / totalSteps) * 100;

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Identificação e Queixa Principal</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">
                                    Data da Entrevista
                                </label>
                                <input
                                    type="date"
                                    value={formData.identification.interviewDate}
                                    onChange={(e) => updateFormData('identification', 'interviewDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Entrevistador
                                </label>
                                <input
                                    type="text"
                                    value={formData.identification.interviewer}
                                    onChange={(e) => updateFormData('identification', 'interviewer', e.target.value)}
                                    placeholder="Seu nome"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Queixa Principal
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.identification.mainComplaint}
                                    onChange={(e) => updateFormData('identification', 'mainComplaint', e.target.value)}
                                    placeholder="Descreva detalhadamente a queixa que trouxe o paciente à terapia..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="mt-1 text-sm text-gray-500">Seja específico e detalhado sobre os sintomas e preocupações</p>
                            </div>

                            <div>
                                <label className="form-label">
                                    Tempo de Duração
                                </label>
                                <input
                                    type="text"
                                    value={formData.identification.complaintDuration}
                                    onChange={(e) => updateFormData('identification', 'complaintDuration', e.target.value)}
                                    placeholder="Ex: 1 ano, 6 meses..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Evolução da Queixa
                                </label>
                                <select
                                    value={formData.identification.complaintEvolution}
                                    onChange={(e) => updateFormData('identification', 'complaintEvolution', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="piorou">Piorou Progressivamente</option>
                                    <option value="melhorou">Melhorou</option>
                                    <option value="estavel">Estável</option>
                                    <option value="flutuante">Flutuante</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Stethoscope className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Histórico Médico</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Gestação
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.pregnancy}
                                    onChange={(e) => updateFormData('medicalHistory', 'pregnancy', e.target.value)}
                                    placeholder="Complicações, medicações, saúde materna..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Nascimento
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.birth}
                                    onChange={(e) => updateFormData('medicalHistory', 'birth', e.target.value)}
                                    placeholder="Tipo de parto, complicações, peso/altura..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Desenvolvimento Motor
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.motorDevelopment}
                                    onChange={(e) => updateFormData('medicalHistory', 'motorDevelopment', e.target.value)}
                                    placeholder="Idade que sentou, engatinhou, andou..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Desenvolvimento de Linguagem
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.languageDevelopment}
                                    onChange={(e) => updateFormData('medicalHistory', 'languageDevelopment', e.target.value)}
                                    placeholder="Primeiras palavras, formação de frases..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Histórico Médico
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.medicalHistory.medicalConditions}
                                    onChange={(e) => updateFormData('medicalHistory', 'medicalConditions', e.target.value)}
                                    placeholder="Doenças, internações, cirurgias, alergias..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 7:
                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Conclusões e Encaminhamentos</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="form-label">
                                    Hipóteses Diagnósticas
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.conclusions.diagnosticHypotheses}
                                    onChange={(e) => updateFormData('conclusions', 'diagnosticHypotheses', e.target.value)}
                                    placeholder="Suas impressões e hipóteses iniciais..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Recomendações
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.conclusions.recommendations}
                                    onChange={(e) => updateFormData('conclusions', 'recommendations', e.target.value)}
                                    placeholder="Orientações e recomendações iniciais..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">
                                        Encaminhamentos
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.conclusions.referrals}
                                        onChange={(e) => updateFormData('conclusions', 'referrals', e.target.value)}
                                        placeholder="Outros profissionais necessários..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">
                                        Próxima Consulta
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.conclusions.nextAppointment}
                                        onChange={(e) => updateFormData('conclusions', 'nextAppointment', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default: {
                const current = steps[step];
                const Icon = current.icon;

                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 ${current.bgColor} rounded-lg`}>
                                <Icon className={`w-5 h-5 ${current.textColor}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {current.label}
                            </h3>
                        </div>

                        <div className="text-center py-8">
                            <p className="text-gray-500">Seção em desenvolvimento - Em breve disponível</p>
                        </div>
                    </div>
                );
            }

        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                {/* Modal panel */}
                <div className="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Nova Anamnese
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {patient.fullName} • {new Date().toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    Progresso: {completedSteps}/{totalSteps}
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:h-[600px]">
                        {/* Sidebar - Steps */}
                        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 p-3 md:p-4 overflow-x-auto md:overflow-x-visible md:overflow-y-auto flex-shrink-0">
                            <div className="flex gap-2 md:flex-col md:space-y-2 md:gap-0">
                                {steps.map((step, index) => {
                                    const isActive = index === activeStep;
                                    const isCompleted = completed[index];
                                    const Icon = step.icon;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setActiveStep(index)}
                                            className={`flex-shrink-0 min-w-[130px] md:min-w-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-3 rounded-lg text-left transition-all ${isActive
                                                ? 'bg-white shadow-sm border border-blue-200 text-blue-700'
                                                : isCompleted
                                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${isActive
                                                ? 'bg-blue-100'
                                                : isCompleted
                                                    ? 'bg-green-100'
                                                    : 'bg-gray-100'
                                                }`}>
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : step.bgColor
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs md:text-sm font-medium truncate">{step.label}</div>
                                                <div className={`text-xs hidden md:block ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                    {isCompleted ? 'Concluído' : isActive ? 'Atual' : 'Pendente'}
                                                </div>
                                            </div>
                                            {isCompleted && (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {renderStepContent(activeStep)}

                            {/* Navigation buttons */}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={handleBack}
                                    disabled={activeStep === 0}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeStep === 0
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>

                                    {activeStep === steps.length - 1 ? (
                                        <button
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Salvar Anamnese
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleNext}
                                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Continuar
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}