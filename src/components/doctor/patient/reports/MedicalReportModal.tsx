// components/reports/MedicalReportModal.tsx
import { useState } from 'react';
import { 
    X, 
    Save, 
    FileText, 
    Stethoscope, 
    Target,
    Calendar,
    Pill,
    ClipboardList,
    Lightbulb,
    ArrowRight
} from 'lucide-react';

interface MedicalReportModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
}

const reportTypes = [
    { value: 'medical', label: 'Relatório Médico', icon: Stethoscope, color: 'text-blue-600' },
    { value: 'progress', label: 'Relatório de Progresso', icon: FileText, color: 'text-green-600' },
    { value: 'evolution', label: 'Relatório de Evolução', icon: Target, color: 'text-purple-600' },
    { value: 'assessment', label: 'Avaliação', icon: ClipboardList, color: 'text-orange-600' }
];

const statusOptions = [
    { value: 'draft', label: 'Rascunho', color: 'text-gray-600' },
    { value: 'completed', label: 'Completo', color: 'text-green-600' },
    { value: 'archived', label: 'Arquivado', color: 'text-blue-600' }
];

export default function MedicalReportModal({ open, onClose, onSave, patient, loading = false }: MedicalReportModalProps) {
    const [activeSection, setActiveSection] = useState('basic');
    const [formData, setFormData] = useState({
        title: '',
        type: 'medical' as 'medical' | 'progress' | 'evolution' | 'assessment',
        date: new Date().toISOString().split('T')[0],
        content: {
            diagnosis: '',
            observations: '',
            progress: '',
            goals: '',
            recommendations: '',
            nextSteps: '',
            treatmentPlan: '',
            medications: '',
            exams: ''
        },
        status: 'completed' as 'draft' | 'completed' | 'archived'
    });

    const sections = [
        { id: 'basic', label: 'Informações Básicas', icon: FileText },
        { id: 'diagnosis', label: 'Diagnóstico', icon: Stethoscope },
        { id: 'treatment', label: 'Tratamento', icon: Pill },
        { id: 'recommendations', label: 'Recomendações', icon: Lightbulb }
    ];

    const handleSave = () => {
        const reportData = {
            ...formData,
            title: formData.title || `Relatório ${formData.type === 'medical' ? 'Médico' : formData.type === 'progress' ? 'de Progresso' : formData.type === 'evolution' ? 'de Evolução' : 'de Avaliação'} - ${patient.fullName}`,
            patientId: patient._id,
            patientName: patient.fullName
        };
        onSave(reportData);
    };

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateContentData = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            content: { ...prev.content, [field]: value }
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
                                    <FileText className="w-5 h-5 text-blue-600" />
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
                                        onChange={(e) => updateFormData('title', e.target.value)}
                                        placeholder={`Relatório Médico - ${patient.fullName}`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo de Relatório
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => updateFormData('type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {reportTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Data
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => updateFormData('date', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => updateFormData('status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'diagnosis':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Stethoscope className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Diagnóstico e Observações</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Diagnóstico
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.content.diagnosis}
                                        onChange={(e) => updateContentData('diagnosis', e.target.value)}
                                        placeholder="Descreva o diagnóstico principal e condições associadas..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Observações Clínicas
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.content.observations}
                                        onChange={(e) => updateContentData('observations', e.target.value)}
                                        placeholder="Descreva observações relevantes do estado clínico..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Progresso
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={formData.content.progress}
                                            onChange={(e) => updateContentData('progress', e.target.value)}
                                            placeholder="Descreva o progresso do paciente..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Metas
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={formData.content.goals}
                                            onChange={(e) => updateContentData('goals', e.target.value)}
                                            placeholder="Estabeleça metas de tratamento..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'treatment':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <Pill className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Tratamento e Medicações</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Plano de Tratamento
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.content.treatmentPlan}
                                        onChange={(e) => updateContentData('treatmentPlan', e.target.value)}
                                        placeholder="Descreva o plano de tratamento proposto..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Medicações
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={formData.content.medications}
                                            onChange={(e) => updateContentData('medications', e.target.value)}
                                            placeholder="Liste as medicações prescritas..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Exames Solicitados/Realizados
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={formData.content.exams}
                                            onChange={(e) => updateContentData('exams', e.target.value)}
                                            placeholder="Liste os exames solicitados ou realizados..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>
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
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <Lightbulb className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Recomendações e Próximos Passos</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Recomendações
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.content.recommendations}
                                        onChange={(e) => updateContentData('recommendations', e.target.value)}
                                        placeholder="Forneça recomendações específicas..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Próximos Passos
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.content.nextSteps}
                                        onChange={(e) => updateContentData('nextSteps', e.target.value)}
                                        placeholder="Descreva os próximos passos do tratamento..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                <div className="relative inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Novo Relatório Médico
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
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                                                isActive 
                                                    ? 'bg-white shadow-sm border border-blue-200 text-blue-700' 
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg ${
                                                isActive ? 'bg-blue-100' : 'bg-gray-100'
                                            }`}>
                                                <Icon className={`w-4 h-4 ${
                                                    isActive ? 'text-blue-600' : 'text-gray-600'
                                                }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{section.label}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Report Type Preview */}
                            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Tipo de Relatório</h4>
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const reportType = reportTypes.find(rt => rt.value === formData.type);
                                        const Icon = reportType?.icon || FileText;
                                        return (
                                            <>
                                                <div className={`p-1 rounded ${reportType?.bgColor || 'bg-blue-100'}`}>
                                                    <Icon className={`w-3 h-3 ${reportType?.color || 'text-blue-600'}`} />
                                                </div>
                                                <span className="text-xs text-gray-600">{reportType?.label}</span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {renderSectionContent(activeSection)}
                            
                            {/* Navigation and actions */}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    {(() => {
                                        const reportType = reportTypes.find(rt => rt.value === formData.type);
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span>{reportType?.label} • {formData.status === 'completed' ? 'Completo' : 'Rascunho'}</span>
                                            </div>
                                        );
                                    })()}
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