// src/components/doctor/TherapyEvolution.tsx
import { LinearProgress } from '@mui/material';
import { format } from 'date-fns';
import {
    Activity,
    BarChart3,
    ChevronDown,
    Plus,
    Target,
    Trash2,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import { confirmToast } from '../../utils/confirmToast';
import { IPatient } from '../../utils/types/types';
import ProtocolAnalytics from '../protocols/ProtocolAnalytics';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import EvolutionChart from './EvolutionChart';
import { NewEvaluationForm, NewEvaluationModal } from './NewEvaluationModal';


type TherapyEvolutionProps = {
    patients: IPatient[];
    selectedPatient?: IPatient | null;
    onSelectPatient?: (patient: IPatient | null) => void;
    onOpenPatientDetail?: (patient: IPatient) => void;
};

export default function TherapyEvolution({
    patients,
    selectedPatient,
    onSelectPatient,
    onOpenPatientDetail, }: TherapyEvolutionProps) {
    const { user } = useAuth();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any | null>(null);
    const [progressData, setProgressData] = useState<any | null>(null);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);

    const [isAdding, setIsAdding] = useState(false);
    const [showDetails, setShowDetails] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');

    const selectedPatientData = patients.find(p => p._id === selectedPatientId) || ({} as IPatient);
    const [protocols, setProtocols] = useState<any[]>([]);
    const [protocolsLoading, setProtocolsLoading] = useState(false);
    const [protocolsError, setProtocolsError] = useState<string | null>(null);
    const [selectedProtocolCode, setSelectedProtocolCode] = useState<string | null>(null);


    useEffect(() => {
        if (selectedPatient && selectedPatient._id) {
            setSelectedPatientId(selectedPatient._id);
        } else {
            setSelectedPatientId('');
        }
    }, [selectedPatient]);;

    useEffect(() => {
        if (progressData?.currentPlan?.protocol?.code) {
            setSelectedProtocolCode(progressData.currentPlan.protocol.code);
        } else {
            setSelectedProtocolCode(null);
        }
    }, [progressData]);


    useEffect(() => {
        if (user) {
            loadProtocols();
        }
    }, [user]);

    useEffect(() => {
        if (!selectedPatientId) {
            setEvaluations([]);
            setChartData(null);
            setProgressData(null);
            return;
        }

        loadEvaluations();
        loadChartData();
        loadProgressData();
    }, [selectedPatientId]);

    useEffect(() => {
        console.log('protocols >>>', protocols);
    }, [protocols]);

    const loadEvaluations = async () => {
        if (!selectedPatientId) return;

        try {
            const response = await API.get(`/evolutions/patient/${selectedPatientId}`);
            setEvaluations(response.data);
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
        }
    };


    const loadChartData = async () => {
        if (!selectedPatientId) return; // ✅ usa o ID, não o objeto

        try {
            const response = await API.get(`/evolutions/chart/${selectedPatientId}`);
            setChartData(response.data);
        } catch (error) {
            console.error('Erro ao carregar dados gráficos:', error);
            setChartData(null);
        }
    };

    const loadProgressData = async () => {
        if (!selectedPatientId) return;

        try {
            setIsLoadingProgress(true);
            const response = await API.get(`/evolutions/patient/${selectedPatientId}/progress`);
            setProgressData(response.data);
        } catch (error) {
            console.error('Erro ao carregar progresso do plano terapêutico:', error);
            setProgressData(null);
        } finally {
            setIsLoadingProgress(false);
        }
    };

    // 🔹 aqui fazemos o POST alinhado com o backend novo
    const EVALUATION_TYPE_LABELS: Record<string, string> = {
        language: 'Linguagem',
        motor: 'Motor',
        cognitive: 'Cognitivo',
        behavior: 'Comportamento',
        social: 'Social'
    };

    const handleSaveEvaluation = async (form: NewEvaluationForm) => {
        if (!selectedPatientId) {
            alert('Selecione um paciente antes de salvar a avaliação.');
            return;
        }

        try {
            // metrics[]
            const metricsArray = Object.entries(form.metrics).map(([name, value]) => ({
                name,
                value: Number(value)
            }));

            // evaluationAreas[]
            const evaluationAreas = Object.entries(form.areaScores).map(([id, score]) => ({
                id,
                name: EVALUATION_TYPE_LABELS[id] ?? id,
                score: Number(score)
            }));

            const areasWithScore = evaluationAreas.filter(a => a.score >= 1);
            const evaluationTypes = areasWithScore.map(a => a.id);

            const hasValidMetrics = metricsArray.some(m => m.value !== undefined && m.value !== 0);
            const hasValidAreas = areasWithScore.length > 0;

            if (!hasValidMetrics && !hasValidAreas) {
                alert('Ajuste ao menos uma métrica OU uma área (score >= 1) antes de salvar!');
                return;
            }

            // 🔹 Definir protocolCode:
            // 1) se já tem plano, usar código do plano atual
            // 2) senão, usar o que foi selecionado no modal
            let protocolCode: string | null =
                progressData?.currentPlan?.protocol?.code ||
                selectedProtocolCode ||
                null;

            // 🔹 Montar therapeuticPlan:
            let therapeuticPlan: any = null;

            if (progressData?.currentPlan) {
                // Reaproveita plano atual do paciente e apenas atualiza currentScore dos objetivos
                therapeuticPlan = {
                    protocol: progressData.currentPlan.protocol || undefined,
                    objectives: (progressData.objectives || []).map((obj: any) => {
                        const sliderScore = form.areaScores[obj.area];
                        return {
                            area: obj.area,
                            description: obj.description,
                            targetScore: Number(obj.target ?? obj.targetScore ?? 0),
                            currentScore: Number(sliderScore ?? obj.current ?? 0),
                            targetDate: obj.targetDate || null,
                            notes: obj.notes || ''
                        };
                    }),
                    reviewDate: progressData.currentPlan.reviewDate || null
                };
            } else if (protocolCode) {
                // Paciente ainda não tinha plano, mas foi escolhido um protocolo
                const selectedProtocol = protocols.find((p: any) => p.code === protocolCode);

                therapeuticPlan = {
                    protocol: selectedProtocol
                        ? {
                            code: selectedProtocol.code,
                            name: selectedProtocol.name,
                            customNotes: ''
                        }
                        : {
                            code: protocolCode,
                            name: protocolCode,
                            customNotes: ''
                        },
                    // Não temos certeza do schema interno de objetivos no TherapyProtocol,
                    // então aqui iniciamos objetivos baseados nas áreas (sliders) como rascunho:
                    objectives: evaluationAreas.map(area => ({
                        area: area.id,
                        description: `Objetivo em ${EVALUATION_TYPE_LABELS[area.id] ?? area.id}`,
                        targetScore: 10,                    // meta padrão
                        currentScore: area.score,           // valor da sessão
                        targetDate: null,
                        notes: ''
                    })),
                    reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 dias
                };
            }

            const payload = {
                patient: selectedPatientId,
                doctor: (user as any)?._id || (user as any)?.id,
                specialty: (user as any)?.specialty || 'fonoaudiologia',
                date: new Date(form.date),
                time: form.time,
                content: form.content,
                metrics: metricsArray,
                evaluationAreas,
                evaluationTypes,
                plan: '',
                treatmentStatus: 'in_progress',
                therapeuticPlan,
                protocolCode
            };


            console.log('Enviando payload de avaliação:', payload);

            const response = await API.post('/evolutions', payload);

            if (response.status >= 200 && response.status < 300) {
                await loadEvaluations();
                await loadChartData();
                await loadProgressData();
                setIsAdding(false);
                toast.success('Avaliação salva com sucesso!');
            }
        } catch (error: any) {
            console.error('Erro ao salvar avaliação:', error);
            if (error.response) {
                toast.error(
                    `Erro ${error.response.status}: ${error.response.data?.message || JSON.stringify(error.response.data)
                    }`
                );
            } else {
                toast.error('Erro ao salvar avaliação. Tente novamente.');
            }
        }
    };
    const [activeTab, setActiveTab] = useState<'evolution' | 'analytics'>('evolution');

    const handleDeleteEvaluation = async (evaluationId: string) => {
        const confirmed = await confirmToast(
            'Tem certeza que deseja excluir esta avaliação? Essa ação não pode ser desfeita.'
        );
        if (!confirmed) return;

        try {
            setDeletingId(evaluationId);
            await API.delete(`/evolutions/${evaluationId}`);
            setEvaluations(prev => prev.filter((e: any) => e._id !== evaluationId));
            toast.success('Avaliação excluída com sucesso! 💚');
            await loadProgressData();
            await loadChartData();
        } catch (err: any) {
            console.error(err);
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Erro ao excluir avaliação.';
            toast.error(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const calculateProgress = () => {
        if (!chartData?.metrics) return 0;

        const metricKeys = Object.keys(chartData.metrics);
        if (metricKeys.length === 0) return 0;

        let totalProgress = 0;
        let count = 0;

        metricKeys.forEach(key => {
            const metric = chartData.metrics[key];
            if (!metric?.values || metric.values.length < 2) return;

            const firstValue = metric.values[0];
            const lastValue = metric.values[metric.values.length - 1];
            const { minValue = 0, maxValue = 10 } = metric.config || {};

            if (firstValue !== null && lastValue !== null) {
                const progress = ((lastValue - firstValue) / (maxValue - minValue || 1)) * 100;
                totalProgress += Math.min(Math.max(progress, 0), 100);
                count++;
            }
        });

        return count > 0 ? totalProgress / count : 0;
    };

    // CORREÇÃO 1: Remover filtro active da query (linha 326-347)

    const loadProtocols = async () => {
        try {
            setProtocolsLoading(true);
            setProtocolsError(null);

            const specialty = (user as any)?.specialty;

            // ✅ CORRIGIDO: Remover &active=true
            const query = specialty
                ? `?specialty=${encodeURIComponent(specialty)}`
                : '';

            console.log('🔍 Buscando protocolos:', `/protocols${query}`);
            const response = await API.get(`/protocols${query}`);
            console.log('✅ Protocolos recebidos:', response.data);

            setProtocols(response.data || []);

            if (response.data?.length === 0) {
                console.warn('⚠️ Nenhum protocolo encontrado para especialidade:', specialty);
            }
        } catch (err: any) {
            console.error('❌ Erro ao carregar protocolos:', err);
            setProtocolsError('Erro ao carregar protocolos terapêuticos');
            toast.error('Erro ao carregar protocolos');
        } finally {
            setProtocolsLoading(false);
        }
    };

    return (
        <>
            <NewEvaluationModal
                open={isAdding}
                onClose={() => setIsAdding(false)}
                onSave={handleSaveEvaluation}
                currentPlan={progressData?.currentPlan}
                objectives={progressData?.objectives || []}
                protocols={protocols}
                selectedProtocolCode={selectedProtocolCode}
                onSelectProtocol={(code) => setSelectedProtocolCode(code || null)}
                protocolsLoading={protocolsLoading}
                protocolsError={protocolsError}
            />

            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">

                    {/* ✅ TABS */}
                    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-xl mb-6">
                        <div className="border-b border-gray-200 px-4">
                            <nav className="flex gap-2 -mb-px">
                                <button
                                    onClick={() => setActiveTab('evolution')}
                                    className={`px-6 py-4 text-base font-semibold border-b-4 transition-all ${activeTab === 'evolution'
                                            ? 'border-green-500 text-green-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Activity className="h-5 w-5 inline mr-2" />
                                    Evolução de Pacientes
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`px-6 py-4 text-base font-semibold border-b-4 transition-all ${activeTab === 'analytics'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <BarChart3 className="h-5 w-5 inline mr-2" />
                                    Analytics
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* ✅ ABA EVOLUÇÃO */}
                    {activeTab === 'evolution' && (
                        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl overflow-hidden">
                            <Card className="border-0">
                                <CardHeader className="bg-gradient-to-r from-green-600 via-green-500 to-cyan-500 p-8">
                                    <CardTitle className="flex items-center gap-4 text-white text-3xl font-bold drop-shadow-lg">
                                        <Activity className="h-8 w-8" />
                                        Evolução Terapêutica
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                                        {/* seleção de paciente */}
                                        <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-white rounded-2xl border-2 border-green-100 shadow-lg hover:shadow-xl transition-all">
                                            <Label
                                                htmlFor="patientId"
                                                className="block font-bold text-gray-800 flex items-center gap-3 text-lg"
                                            >
                                                <Users size={24} className="text-green-600" />
                                                Selecione o Paciente
                                            </Label>
                                            <select
                                                value={selectedPatientId}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    setSelectedPatientId(id);
                                                    const patient = patients.find(p => p._id === id) || null;
                                                    onSelectPatient?.(patient);
                                                }}
                                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md text-base font-medium"
                                            >
                                                <option value="">Escolha um paciente...</option>
                                                {patients?.map(patient => (
                                                    <option key={patient._id} value={patient._id}>
                                                        {patient.fullName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* progresso geral */}
                                        <div className="space-y-4 p-6 bg-gradient-to-br from-cyan-50 to-white rounded-2xl border-2 border-cyan-100 shadow-lg hover:shadow-xl transition-all">
                                            <label className="block font-bold text-gray-800 text-lg flex items-center gap-3">
                                                <span className="text-2xl">📈</span>
                                                Progresso Geral
                                            </label>
                                            <div className="flex items-center gap-6">
                                                <div className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-4 overflow-hidden shadow-inner">
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={calculateProgress()}
                                                        className="h-full rounded-full"
                                                        sx={{
                                                            backgroundColor: 'transparent',
                                                            '& .MuiLinearProgress-bar': {
                                                                background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)',
                                                                borderRadius: '9999px'
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-cyan-500 min-w-[80px] text-right">
                                                    {Math.round(calculateProgress())}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* plano terapêutico atual */}
                                    {selectedPatient && (
                                        <div className="mb-10">
                                            <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Target className="h-6 w-6 text-green-600" />
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-900">
                                                                Plano Terapêutico Atual
                                                            </h3>
                                                            <p className="text-sm text-gray-500">
                                                                Progresso em relação aos objetivos definidos no plano.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {progressData?.currentPlan?.protocol && (
                                                        <div className="text-right text-sm text-gray-600">
                                                            <p className="font-semibold text-gray-800">
                                                                {progressData.currentPlan.protocol.name}
                                                            </p>
                                                            <p className="text-gray-500 text-xs">
                                                                Código: {progressData.currentPlan.protocol.code}
                                                            </p>
                                                            {progressData.currentPlan.reviewDate && (
                                                                <p className="text-gray-500 text-xs">
                                                                    Revisão em:{' '}
                                                                    {new Date(
                                                                        progressData.currentPlan.reviewDate
                                                                    ).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {isLoadingProgress && (
                                                    <p className="text-sm text-gray-500 italic">
                                                        Carregando progresso...
                                                    </p>
                                                )}

                                                {!isLoadingProgress &&
                                                    (!progressData ||
                                                        !progressData.objectives ||
                                                        progressData.objectives.length === 0) && (
                                                        <p className="text-sm text-gray-500 italic">
                                                            Nenhum plano terapêutico estruturado encontrado para este paciente.
                                                        </p>
                                                    )}

                                                {!isLoadingProgress &&
                                                    progressData?.objectives &&
                                                    progressData.objectives.length > 0 && (
                                                        <div className="space-y-4 mt-4">
                                                            {progressData.objectives.map((obj: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    className="p-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">
                                                                                {obj.area}
                                                                            </p>
                                                                            <p className="text-sm font-semibold text-gray-800">
                                                                                {obj.description}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                Meta: {obj.target} • Atual: {obj.current ?? '-'}
                                                                            </p>
                                                                            {obj.targetDate && (
                                                                                <p className="text-xs text-gray-500">
                                                                                    Prazo alvo:{' '}
                                                                                    {new Date(obj.targetDate).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            )}
                                                                            {obj.projectedCompletion && (
                                                                                <p className="text-xs text-gray-500">
                                                                                    Projeção de conclusão:{' '}
                                                                                    {new Date(
                                                                                        obj.projectedCompletion
                                                                                    ).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                                                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                                                                <span>
                                                                                    {obj.trend === 'improving' && 'Melhorando'}
                                                                                    {obj.trend === 'stable' && 'Estável'}
                                                                                    {obj.trend === 'regressing' && 'Regredindo'}
                                                                                    {!obj.trend && '-'}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-cyan-500">
                                                                                {Math.round(obj.progress ?? 0)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-3">
                                                                        <LinearProgress
                                                                            variant="determinate"
                                                                            value={obj.progress ?? 0}
                                                                            className="h-2 rounded-full"
                                                                            sx={{
                                                                                backgroundColor: '#e5e7eb',
                                                                                '& .MuiLinearProgress-bar': {
                                                                                    background:
                                                                                        'linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #22d3ee 100%)',
                                                                                    borderRadius: '9999px'
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPatient ? (
                                        <div className="space-y-8">
                                            <div className="flex justify-between items-center p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-2 border-gray-200 shadow-md">
                                                <div>
                                                    <h3 className="font-bold text-2xl text-gray-900 flex items-center gap-3">
                                                        <span className="text-3xl">📋</span>
                                                        Histórico de Avaliações
                                                    </h3>
                                                    <p className="text-gray-600 text-base mt-1 font-medium">
                                                        {selectedPatientData.fullName}
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => setIsAdding(true)}
                                                    className="bg-gradient-to-r from-green-600 to-cyan-500 hover:from-green-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                                >
                                                    <Plus className="h-5 w-5 mr-2" />
                                                    Nova Avaliação
                                                </Button>
                                            </div>

                                            <div className="space-y-4">
                                                {evaluations.length > 0 ? (
                                                    evaluations.map((evaluation: any, index: number) => (
                                                        <div
                                                            key={evaluation._id}
                                                            className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:shadow-2xl transition-all hover:border-green-200 group"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-4 mb-4">
                                                                        <div className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                                                            <span className="text-2xl">📅</span>
                                                                            {format(new Date(evaluation.date), 'dd/MM/yyyy')} às{' '}
                                                                            {evaluation.time}
                                                                        </div>
                                                                        {evaluation.evaluationTypes?.length > 0 && (
                                                                            <div className="flex gap-2 flex-wrap">
                                                                                {evaluation.evaluationTypes.map((type: string) => (
                                                                                    <span
                                                                                        key={type}
                                                                                        className="px-4 py-2 text-xs font-bold rounded-full bg-gradient-to-r from-green-100 to-cyan-100 text-green-800 border-2 border-green-200 shadow-sm"
                                                                                    >
                                                                                        {type}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-base text-gray-600 flex items-center gap-3 font-medium">
                                                                        <Users size={18} className="text-green-600" />
                                                                        {evaluation.doctor?.fullName} • {evaluation.doctor?.specialty}
                                                                    </div>

                                                                    {showDetails === index && (
                                                                        <div className="mt-8 space-y-8 pt-8 border-t-2 border-gray-200">
                                                                            <div>
                                                                                <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                                                                    <span className="text-xl">📊</span>
                                                                                    Métricas Registradas
                                                                                </h4>
                                                                                {evaluation.metrics && evaluation.metrics.length > 0 ? (
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                        {evaluation.metrics.map((metric: any) => (
                                                                                            <div
                                                                                                key={metric.name}
                                                                                                className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all"
                                                                                            >
                                                                                                <span className="font-semibold text-gray-800">
                                                                                                    {metric.name}
                                                                                                </span>
                                                                                                <span className="bg-gradient-to-r from-green-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                                                                                    {metric.value}
                                                                                                </span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-gray-500 text-sm italic">
                                                                                        Nenhuma métrica registrada
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            <div>
                                                                                <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                                                                    <span className="text-xl">📝</span>
                                                                                    Relatório Clínico
                                                                                </h4>
                                                                                <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200 shadow-inner">
                                                                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed font-light">
                                                                                        {evaluation.content || 'Nenhum relatório registrado'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-3 ml-6">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            setShowDetails(showDetails === index ? null : index)
                                                                        }
                                                                        className="text-gray-600 hover:text-green-600 border-2 border-gray-300 hover:border-green-400 rounded-xl p-3 transition-all hover:scale-110"
                                                                    >
                                                                        <ChevronDown
                                                                            className={`h-5 w-5 transition-transform duration-300 ${showDetails === index ? 'rotate-180' : ''
                                                                                }`}
                                                                        />
                                                                    </Button>

                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled={deletingId === evaluation._id}
                                                                        onClick={() => handleDeleteEvaluation(evaluation._id)}
                                                                        className="text-red-600 border-2 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-400 rounded-xl p-3 transition-all hover:scale-110"
                                                                        title="Excluir avaliação"
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300">
                                                        <Activity className="h-20 w-20 mx-auto text-gray-300 mb-6" />
                                                        <p className="text-gray-600 font-bold text-xl mb-2">
                                                            Nenhuma avaliação registrada
                                                        </p>
                                                        <p className="text-gray-400 text-base">
                                                            Clique em &quot;Nova Avaliação&quot; para começar
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-10">
                                                <h3 className="font-bold text-2xl text-gray-900 mb-6 flex items-center gap-3">
                                                    <span className="text-3xl">📈</span>
                                                    Análise Gráfica da Evolução
                                                </h3>
                                                {chartData ? (
                                                    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
                                                        <EvolutionChart chartData={chartData} />
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300">
                                                        <Activity className="h-16 w-16 mx-auto text-gray-300 mb-6" />
                                                        <p className="text-gray-600 font-bold text-lg">
                                                            Nenhum dado disponível para exibir gráficos
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-24 bg-gradient-to-br from-green-50 to-cyan-50 rounded-2xl border-2 border-dashed border-green-200">
                                            <Activity className="h-24 w-24 mx-auto text-green-300 mb-8" />
                                            <p className="text-gray-700 font-bold text-2xl mb-3">
                                                Selecione um paciente
                                            </p>
                                            <p className="text-gray-500 text-lg">
                                                Escolha um paciente para visualizar a evolução terapêutica
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ✅ ABA ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl overflow-hidden">
                            <Card className="border-0">
                                <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8">
                                    <CardTitle className="flex items-center gap-4 text-white text-3xl font-bold drop-shadow-lg">
                                        <BarChart3 className="h-8 w-8" />
                                        Analytics de Protocolos
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-8">
                                    <ProtocolAnalytics specialty={(user as any)?.specialty} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}