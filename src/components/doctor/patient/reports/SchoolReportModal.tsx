// components/reports/SchoolReportModal.tsx
import {
    BookOpen,
    Brain,
    Lightbulb,
    Save,
    School,
    Target,
    User,
    Users,
    X
} from 'lucide-react';
import { useState } from 'react';

interface SchoolReportModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
}

const performanceOptions = [
    { value: 'excellent', label: 'Excelente', color: 'text-green-600', bgColor: 'bg-green-50' },
    { value: 'good', label: 'Bom', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { value: 'regular', label: 'Regular', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { value: 'poor', label: 'Insuficiente', color: 'text-red-600', bgColor: 'bg-red-50' },
    { value: 'not_evaluated', label: 'Não Avaliado', color: 'text-gray-600', bgColor: 'bg-gray-50' }
];

const semesterOptions = [
    { value: '1º', label: '1º Semestre' },
    { value: '2º', label: '2º Semestre' },
    { value: '3º', label: '3º Semestre' },
    { value: '4º', label: '4º Semestre' },
    { value: 'annual', label: 'Anual' }
];

export default function SchoolReportModal({ open, onClose, onSave, patient, loading = false }: SchoolReportModalProps) {
    const [activeSection, setActiveSection] = useState('basic');
    const [formData, setFormData] = useState({
        title: '',
        schoolYear: new Date().getFullYear().toString(),
        semester: 'annual',
        schoolInfo: {
            schoolName: '',
            grade: '',
            teacher: '',
            schoolPhone: '',
            schoolEmail: ''
        },
        academicPerformance: {
            portuguese: {
                performance: 'not_evaluated',
                observations: '',
                specificSkills: { reading: '', writing: '', interpretation: '', oralExpression: '' }
            },
            mathematics: {
                performance: 'not_evaluated',
                observations: '',
                specificSkills: { calculations: '', problemSolving: '', logicalReasoning: '' }
            },
            sciences: { performance: 'not_evaluated', observations: '' },
            history: { performance: 'not_evaluated', observations: '' },
            geography: { performance: 'not_evaluated', observations: '' },
            overallObservations: ''
        },
        skills: {
            cognitive: { attention: '', memory: '', reasoning: '', concentration: '' },
            social: { interactionPeers: '', interactionAdults: '', teamwork: '', conflictResolution: '' },
            emotional: { selfControl: '', frustrationTolerance: '', selfEsteem: '', motivation: '' }
        },
        behavior: {
            classroomParticipation: '',
            homeworkCompletion: '',
            organization: '',
            punctuality: '',
            followingRules: ''
        },
        support: {
            currentAdaptations: [],
            neededAdaptations: [],
            specializedSupport: '',
            familySupport: '',
            observations: ''
        },
        recommendations: {
            strengths: '',
            difficulties: '',
            goals: '',
            strategies: '',
            familyGuidance: '',
            schoolGuidance: ''
        }
    });

    const sections = [
        { id: 'basic', label: 'Informações Básicas', icon: School },
        { id: 'academic', label: 'Desempenho Acadêmico', icon: BookOpen },
        { id: 'skills', label: 'Habilidades', icon: Brain },
        { id: 'behavior', label: 'Comportamento', icon: Users },
        { id: 'recommendations', label: 'Recomendações', icon: Target }
    ];

    const handleSave = () => {
        const reportData = {
            type: 'school',
            title: formData.title || `Relatório Escolar - ${patient.fullName} - ${formData.schoolInfo.grade} - ${formData.schoolYear}`,
            patientId: patient._id,
            patientName: patient.fullName,
            date: new Date().toISOString().split('T')[0],
            content: formData,
            status: 'completed'
        };
        onSave(reportData);
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

    const updateNestedFormData = (section: string, subsection: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [subsection]: {
                    ...(prev[section as keyof typeof prev] as any)?.[subsection],
                    [field]: value
                }
            }
        }));
    };

    const renderSectionContent = (sectionId: string) => {
        switch (sectionId) {
            case 'basic':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <School className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Informações do Relatório</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Título do Relatório
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder={`Relatório Escolar - ${patient.fullName}`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ano Letivo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.schoolYear}
                                        onChange={(e) => setFormData(prev => ({ ...prev, schoolYear: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Semestre
                                    </label>
                                    <select
                                        value={formData.semester}
                                        onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {semesterOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <User className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Informações Escolares</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nome da Escola
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.schoolInfo.schoolName}
                                        onChange={(e) => updateFormData('schoolInfo', 'schoolName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Série/Ano
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.schoolInfo.grade}
                                        onChange={(e) => updateFormData('schoolInfo', 'grade', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Professor Responsável
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.schoolInfo.teacher}
                                        onChange={(e) => updateFormData('schoolInfo', 'teacher', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'academic':
                return (
                    <div className="space-y-6">
                        {/* Língua Portuguesa */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Língua Portuguesa</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Desempenho
                                    </label>
                                    <select
                                        value={formData.academicPerformance.portuguese.performance}
                                        onChange={(e) => updateNestedFormData('academicPerformance', 'portuguese', 'performance', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        {performanceOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.academicPerformance.portuguese.observations}
                                        onChange={(e) => updateNestedFormData('academicPerformance', 'portuguese', 'observations', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Descreva o desempenho em leitura, escrita, interpretação..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Matemática */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <Brain className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Matemática</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Desempenho
                                    </label>
                                    <select
                                        value={formData.academicPerformance.mathematics.performance}
                                        onChange={(e) => updateNestedFormData('academicPerformance', 'mathematics', 'performance', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        {performanceOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.academicPerformance.mathematics.observations}
                                        onChange={(e) => updateNestedFormData('academicPerformance', 'mathematics', 'observations', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Descreva o desempenho em cálculos, raciocínio lógico, resolução de problemas..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Observações Gerais */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Lightbulb className="w-5 h-5 text-gray-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Observações Gerais</h3>
                            </div>

                            <div>
                                <textarea
                                    rows={4}
                                    value={formData.academicPerformance.overallObservations}
                                    onChange={(e) => updateFormData('academicPerformance', 'overallObservations', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    placeholder="Observações gerais sobre o desempenho acadêmico..."
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'skills':
                return (
                    <div className="space-y-6">
                        {/* Habilidades Cognitivas */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Brain className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Habilidades Cognitivas</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Atenção
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.skills.cognitive.attention}
                                        onChange={(e) => updateNestedFormData('skills', 'cognitive', 'attention', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Descreva a capacidade de atenção..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Memória
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.skills.cognitive.memory}
                                        onChange={(e) => updateNestedFormData('skills', 'cognitive', 'memory', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Descreva a capacidade de memória..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Raciocínio
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.skills.cognitive.reasoning}
                                        onChange={(e) => updateNestedFormData('skills', 'cognitive', 'reasoning', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Descreva a capacidade de raciocínio..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Concentração
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.skills.cognitive.concentration}
                                        onChange={(e) => updateNestedFormData('skills', 'cognitive', 'concentration', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Descreva a capacidade de concentração..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'behavior':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-pink-50 rounded-lg">
                                    <Users className="w-5 h-5 text-pink-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Comportamento e Socialização</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Participação em Sala
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.behavior.classroomParticipation}
                                        onChange={(e) => updateFormData('behavior', 'classroomParticipation', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Descreva a participação em sala de aula..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Realização de Tarefas
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.behavior.homeworkCompletion}
                                        onChange={(e) => updateFormData('behavior', 'homeworkCompletion', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Descreva o comprometimento com tarefas..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Organização
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.behavior.organization}
                                        onChange={(e) => updateFormData('behavior', 'organization', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Descreva a organização com materiais..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pontualidade
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.behavior.punctuality}
                                        onChange={(e) => updateFormData('behavior', 'punctuality', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Descreva a pontualidade..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'recommendations':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-teal-50 rounded-lg">
                                    <Target className="w-5 h-5 text-teal-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Recomendações e Orientações</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pontos Fortes
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.recommendations.strengths}
                                        onChange={(e) => updateFormData('recommendations', 'strengths', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Liste os principais pontos fortes observados..."
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Dificuldades
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.recommendations.difficulties}
                                        onChange={(e) => updateFormData('recommendations', 'difficulties', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Liste as principais dificuldades observadas..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Orientações para a Escola
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.recommendations.schoolGuidance}
                                        onChange={(e) => updateFormData('recommendations', 'schoolGuidance', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Orientações específicas para a equipe escolar..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Orientações para a Família
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.recommendations.familyGuidance}
                                        onChange={(e) => updateFormData('recommendations', 'familyGuidance', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Orientações específicas para a família..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return <div>Seção não encontrada</div>;
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
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-teal-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Novo Relatório Escolar
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
                    </div>

                    <div className="flex h-[600px]">
                        {/* Sidebar - Sections */}
                        <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                            <div className="space-y-2">
                                {sections.map((section) => {
                                    const isActive = section.id === activeSection;
                                    const Icon = section.icon;

                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${isActive
                                                    ? 'bg-white shadow-sm border border-green-200 text-green-700'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' : 'bg-gray-100'
                                                }`}>
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-600'
                                                    }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{section.label}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {renderSectionContent(activeSection)}

                            {/* Navigation and actions */}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Preenchido</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                        <span>Pendente</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Salvar Relatório
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}