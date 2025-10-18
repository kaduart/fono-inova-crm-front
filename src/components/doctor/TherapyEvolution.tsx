import { format } from 'date-fns';
import {
    Activity,
    BarChart3,
    Calendar,
    ChevronDown,
    Clock,
    Download,
    Edit3,
    Eye,
    EyeOff,
    FileText,
    Plus,
    Target,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import MetricService from '../../services/MetricService';
import { dateFormat } from '../../utils/dateFormat';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import EvolutionChart from './EvolutionChart';

const EVALUATION_TYPES = [
    { id: 'language', name: 'Linguagem', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'motor', name: 'Motor', color: 'bg-green-100 text-green-800 border-green-200' },
    { id: 'cognitive', name: 'Cognitivo', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'behavior', name: 'Comportamento', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'social', name: 'Social', color: 'bg-pink-100 text-pink-800 border-pink-200' }
];

export default function TherapyEvolution({ patients }) {
    const { user } = useAuth();

    const [selectedPatient, setSelectedPatient] = useState('');
    const [evaluations, setEvaluations] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [metrics, setMetrics] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(1);
    const [expandedEvaluations, setExpandedEvaluations] = useState(new Set());
    const [chartError, setChartError] = useState(null);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    // Obter data e hora atuais no formato correto
    const now = new Date();
    const currentDate = format(now, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm');

    const [newEvaluation, setNewEvaluation] = useState({
        date: currentDate,
        time: currentTime,
        metrics: {},
        evaluationTypes: [],
        content: ''
    });

    const selectedPatientData = patients.find(p => p._id === selectedPatient) || {};

    // Carregar métricas disponíveis
    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const metricsData = await MetricService.getAllMetrics();
                if (metricsData.length === 0) {
                    console.warn("Nenhuma métrica cadastrada no sistema!");
                    return;
                }
                setMetrics(metricsData);

                // Inicializar valores com 50% do range
                const initialMetrics = {};
                metricsData.forEach(metric => {
                    initialMetrics[metric.name] = Math.round(
                        metric.minValue + (metric.maxValue - metric.minValue) * 0.5
                    );
                });
                setNewEvaluation(prev => ({ ...prev, metrics: initialMetrics }));

            } catch (error) {
                console.error('Erro ao carregar métricas:', error);
                toast.error("Erro ao carregar métricas disponíveis");
            }
        };
        loadMetrics();
    }, []);

    useEffect(() => {
        if (selectedPatient) {
            loadEvaluations();
            loadChartData();
        } else {
            setEvaluations([]);
            setChartData(null);
            setChartError(null);
        }
    }, [selectedPatient]);

    // Carregar avaliações do paciente
    const loadEvaluations = async () => {
        if (!selectedPatient) return;

        try {
            setIsLoading(true);
            const response = await API.get(`/evolutions/patient/${selectedPatient}`);
            setEvaluations(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
            toast.error("Erro ao carregar avaliações");
            setEvaluations([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Carregar dados para gráficos
    const loadChartData = async () => {
        if (!selectedPatient) {
            setChartData(null);
            return;
        }

        try {
            setIsLoadingChart(true);
            setChartError(null);
            const response = await API.get(`/evolutions/chart/${selectedPatient}`);

            // Validar estrutura dos dados recebidos
            if (response.data && response.data.metrics) {
                setChartData(response.data);
            } else {
                setChartData(null);
                setChartError("Dados de gráfico não disponíveis");
            }
        } catch (error) {
            console.error('Erro ao carregar dados gráficos:', error);
            setChartData(null);
            setChartError("Erro ao carregar dados para os gráficos");
            toast.error("Erro ao carregar dados dos gráficos");
        } finally {
            setIsLoadingChart(false);
        }
    };

    // Verificar se há métricas válidas
    const hasValidMetrics = metrics.some(metric => {
        const value = newEvaluation.metrics[metric.name];
        return value !== undefined && value !== metric.minValue;
    });

    // Verificar se há dados válidos para o gráfico
    const hasValidChartData = chartData &&
        chartData.metrics &&
        Object.keys(chartData.metrics).length > 0 &&
        Object.values(chartData.metrics).some(metric =>
            metric.values && metric.values.length > 0
        );

    // Adicionar nova avaliação
    const handleAddEvaluation = async () => {
        if (!hasValidMetrics) {
            toast.warning("Ajuste pelo menos uma métrica antes de salvar!");
            return;
        }

        if (!newEvaluation.content.trim()) {
            toast.warning("Por favor, preencha o relatório clínico");
            return;
        }

        try {
            setIsLoading(true);

            const metricsArray = metrics.map(metric => ({
                name: metric.name,
                value: newEvaluation.metrics[metric.name] || metric.minValue
            }));

            const response = await API.post('/evolutions', {
                patient: selectedPatient,
                doctor: user._id || user.id,
                specialty: user.specialty,
                date: newEvaluation.date,
                content: newEvaluation.content,
                metrics: metricsArray,
                evaluationTypes: newEvaluation.evaluationTypes,
                time: newEvaluation.time,
            });

            if (response.status >= 200 && response.status < 300) {
                await loadEvaluations();
                await loadChartData();
                resetModal();
                toast.success("Avaliação registrada com sucesso!");
            }
        } catch (error) {
            toast.error("Erro ao salvar avaliação");
            console.error('Erro ao salvar avaliação:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calcular progresso geral
    const calculateProgress = () => {
        if (!hasValidChartData) return 0;

        const metricKeys = Object.keys(chartData.metrics);
        if (metricKeys.length === 0) return 0;

        let totalProgress = 0;
        let count = 0;

        metricKeys.forEach(key => {
            const metric = chartData.metrics[key];
            if (!metric.values || metric.values.length < 2) return;

            const firstValue = metric.values[0];
            const lastValue = metric.values[metric.values.length - 1];
            const { minValue = 0, maxValue = 10 } = metric.config || {};

            if (firstValue !== null && lastValue !== null && firstValue !== undefined && lastValue !== undefined) {
                const progress = ((lastValue - firstValue) / (maxValue - minValue)) * 100;
                totalProgress += Math.min(Math.max(progress, 0), 100);
                count++;
            }
        });

        return count > 0 ? totalProgress / count : 0;
    };

    // Atualizar valor de uma métrica
    const handleMetricChange = (metricName, value) => {
        setNewEvaluation(prev => ({
            ...prev,
            metrics: {
                ...prev.metrics,
                [metricName]: Number(value)
            }
        }));
    };

    // Alternar expansão de avaliação
    const toggleEvaluationExpansion = (evaluationId) => {
        const newExpanded = new Set(expandedEvaluations);
        if (newExpanded.has(evaluationId)) {
            newExpanded.delete(evaluationId);
        } else {
            newExpanded.add(evaluationId);
        }
        setExpandedEvaluations(newExpanded);
    };

    // Próximo passo no modal
    const nextStep = () => {
        if (activeStep === 1 && !newEvaluation.content.trim()) {
            toast.warning("Por favor, preencha o relatório clínico");
            return;
        }
        setActiveStep(activeStep + 1);
    };

    // Passo anterior no modal
    const prevStep = () => {
        setActiveStep(activeStep - 1);
    };

    // Resetar modal
    const resetModal = () => {
        setIsAdding(false);
        setActiveStep(1);
        setNewEvaluation({
            date: currentDate,
            time: currentTime,
            metrics: {},
            evaluationTypes: [],
            content: ''
        });
    };

    const progress = calculateProgress();
    const progressColor = progress >= 70 ? 'bg-green-500' : progress >= 40 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="space-y-6">
            {/* 🔹 HEADER DO MÓDULO */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-2xl">
                            <Activity className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Evolução Terapêutica
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Acompanhe o progresso e registre novas avaliações
                            </p>
                        </div>
                    </div>

                    {selectedPatient && (
                        <Button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl"
                        >
                            <Plus className="h-5 w-5" />
                            Nova Avaliação
                        </Button>
                    )}
                </div>
            </div>

            {/* 🔹 SELEÇÃO DE PACIENTE E RESUMO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Seleção de Paciente */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-600" />
                            Selecione o Paciente
                        </label>
                        <select
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-medium"
                        >
                            <option value="">Escolha um paciente...</option>
                            {patients?.map(patient => (
                                <option key={patient._id} value={patient._id}>
                                    {patient.fullName}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>

                {/* Cartão de Progresso */}
                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Target className="h-6 w-6 text-emerald-600" />
                            <h3 className="font-semibold text-gray-900">Progresso Geral</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Evolução</span>
                                <span className="text-lg font-bold text-emerald-700">{Math.round(progress)}%</span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${progressColor}`}
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>

                            <div className="text-xs text-gray-500 text-center">
                                {progress >= 70 ? 'Excelente progresso!' :
                                    progress >= 40 ? 'Progresso consistente' :
                                        'Acompanhamento necessário'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 MODAL DE NOVA AVALIAÇÃO */}
            {isAdding && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50 rounded-2xl">
                            <div className="text-center">
                                <LoadingSpinner />
                                <p className="text-gray-600 mt-2">Salvando avaliação...</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        {/* Header do Modal */}
                        <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Nova Avaliação</h2>
                                    <p className="text-gray-600 mt-1">Registre a evolução do paciente</p>
                                </div>
                                <button
                                    onClick={resetModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            {/* Progress Steps */}
                            <div className="flex items-center justify-center mt-6">
                                {[1, 2].map((step) => (
                                    <div key={step} className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${activeStep >= step
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {step}
                                        </div>
                                        {step < 2 && (
                                            <div className={`w-16 h-1 mx-2 ${activeStep > step ? 'bg-emerald-600' : 'bg-gray-200'
                                                }`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6">
                            {/* PASSO 1: Informações Básicas */}
                            {activeStep === 1 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-emerald-600" />
                                                Data da Avaliação
                                            </label>
                                            <input
                                                type="date"
                                                value={newEvaluation.date}
                                                onChange={(e) => setNewEvaluation({ ...newEvaluation, date: e.target.value })}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-emerald-600" />
                                                Horário
                                            </label>
                                            <input
                                                type="time"
                                                value={newEvaluation.time}
                                                onChange={(e) => setNewEvaluation({ ...newEvaluation, time: e.target.value })}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <Edit3 className="h-4 w-4 text-emerald-600" />
                                            Relatório Clínico
                                        </label>
                                        <textarea
                                            value={newEvaluation.content}
                                            onChange={(e) => setNewEvaluation({ ...newEvaluation, content: e.target.value })}
                                            placeholder="Descreva detalhadamente a evolução, observações e recomendações..."
                                            className="w-full p-4 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-emerald-500 resize-none"
                                            rows={4}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Target className="h-4 w-4 text-emerald-600" />
                                            Áreas de Avaliação
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {EVALUATION_TYPES.map(type => (
                                                <button
                                                    key={type.id}
                                                    type="button"
                                                    onClick={() => setNewEvaluation({
                                                        ...newEvaluation,
                                                        evaluationTypes: newEvaluation.evaluationTypes.includes(type.id)
                                                            ? newEvaluation.evaluationTypes.filter(t => t !== type.id)
                                                            : [...newEvaluation.evaluationTypes, type.id]
                                                    })}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${newEvaluation.evaluationTypes.includes(type.id)
                                                        ? `${type.color} border-current`
                                                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${newEvaluation.evaluationTypes.includes(type.id)
                                                            ? 'bg-current'
                                                            : 'bg-gray-300'
                                                            }`} />
                                                        <span className={`text-sm font-medium ${newEvaluation.evaluationTypes.includes(type.id)
                                                            ? 'text-current'
                                                            : 'text-gray-700'
                                                            }`}>
                                                            {type.name}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASSO 2: Métricas */}
                            {activeStep === 2 && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Avaliação</h3>

                                    {metrics.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            Nenhuma métrica disponível. Configure as métricas primeiro.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {metrics.map(metric => (
                                                <div key={metric._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="font-semibold text-gray-900">
                                                            {metric.name}
                                                        </label>
                                                        <span className="text-lg font-bold text-emerald-600 bg-white px-2 py-1 rounded">
                                                            {newEvaluation.metrics[metric.name] || metric.minValue}
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="range"
                                                        min={metric.minValue}
                                                        max={metric.maxValue}
                                                        value={newEvaluation.metrics[metric.name] || metric.minValue}
                                                        onChange={(e) => handleMetricChange(metric.name, e.target.value)}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                                    />

                                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                                        <span>{metric.minValue}</span>
                                                        <span>{metric.maxValue}</span>
                                                    </div>

                                                    <p className="text-sm text-gray-600 mt-2">
                                                        {metric.description} ({metric.unit})
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer do Modal */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
                            <div className="flex justify-between">
                                {activeStep > 1 ? (
                                    <Button
                                        variant="outline"
                                        onClick={prevStep}
                                        className="px-6 py-3"
                                    >
                                        Voltar
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={resetModal}
                                        className="px-6 py-3"
                                    >
                                        Cancelar
                                    </Button>
                                )}

                                {activeStep < 2 ? (
                                    <Button
                                        onClick={nextStep}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Continuar
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleAddEvaluation}
                                        disabled={!hasValidMetrics || metrics.length === 0}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        Finalizar Avaliação
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔹 CONTEÚDO PRINCIPAL */}
            {selectedPatient ? (
                <div className="space-y-6">
                    {/* Gráficos de Evolução */}
                    <Card>
                        <CardHeader className="border-b border-gray-200">
                            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                                <BarChart3 className="h-5 w-5 text-emerald-600" />
                                Análise Gráfica da Evolução
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoadingChart ? (
                                <div className="text-center py-8">
                                    <LoadingSpinner />
                                    <p className="text-gray-600 mt-2">Carregando dados do gráfico...</p>
                                </div>
                            ) : chartError ? (
                                <div className="text-center py-8 text-red-600">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-red-400" />
                                    <p>{chartError}</p>
                                    <Button
                                        onClick={loadChartData}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        Tentar Novamente
                                    </Button>
                                </div>
                            ) : !hasValidChartData ? (
                                <div className="text-center py-8 text-gray-500">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p>Não há dados suficientes para exibir os gráficos.</p>
                                    <p className="text-sm mt-2">Registre algumas avaliações primeiro.</p>
                                </div>
                            ) : (
                                <EvolutionChart chartData={chartData} />
                            )}
                        </CardContent>
                    </Card>

                    {/* Histórico de Avaliações */}
                    <Card>
                        <CardHeader className="border-b border-gray-200">
                            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                Histórico de Avaliações
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    ({evaluations.length} registros)
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <LoadingSpinner />
                                    <p className="text-gray-600 mt-2">Carregando avaliações...</p>
                                </div>
                            ) : evaluations.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6">
                                    {evaluations.map((evaluation) => (
                                        <div
                                            key={evaluation._id}
                                            className="bg-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Header do Card */}
                                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 px-6 py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-white rounded-xl p-2 shadow-sm border border-emerald-200">
                                                            <Calendar className="h-5 w-5 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-lg">
                                                                {dateFormat(evaluation.date)} às {evaluation.time}
                                                            </h4>
                                                            <p className="text-sm text-emerald-600 font-medium">
                                                                por {evaluation.doctor?.fullName}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center gap-2 bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            PDF
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Conteúdo do Card */}
                                            <div className="p-6 space-y-4">
                                                {/* Tipos de Avaliação */}
                                                {evaluation.evaluationTypes?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {evaluation.evaluationTypes.map(type => {
                                                            const typeInfo = EVALUATION_TYPES.find(t => t.id === type);
                                                            return typeInfo ? (
                                                                <span
                                                                    key={type}
                                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${typeInfo.color} shadow-sm`}
                                                                >
                                                                    {typeInfo.name}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}

                                                {/* Métricas */}
                                                {evaluation.metrics && evaluation.metrics.length > 0 && (
                                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                        <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                            <BarChart3 className="h-4 w-4 text-emerald-600" />
                                                            Métricas de Avaliação
                                                        </h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                            {evaluation.metrics.map(metric => (
                                                                <div
                                                                    key={metric.name}
                                                                    className="bg-white rounded-lg p-3 border border-gray-300 shadow-xs hover:shadow-sm transition-shadow"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                                                                        <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                                                                            {metric.value}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Relatório Clínico */}
                                                <div className="border-t border-gray-200 pt-4">
                                                    <button
                                                        onClick={() => toggleEvaluationExpansion(evaluation._id)}
                                                        className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 mb-3 group"
                                                    >
                                                        <div className="bg-emerald-100 rounded-lg p-2 group-hover:bg-emerald-200 transition-colors">
                                                            {expandedEvaluations.has(evaluation._id) ? (
                                                                <EyeOff className="h-4 w-4 text-emerald-700" />
                                                            ) : (
                                                                <Eye className="h-4 w-4 text-emerald-700" />
                                                            )}
                                                        </div>
                                                        {expandedEvaluations.has(evaluation._id) ? 'Ocultar Relatório' : 'Ver Relatório Completo'}
                                                        <ChevronDown
                                                            className={`h-4 w-4 transition-transform duration-300 ${expandedEvaluations.has(evaluation._id) ? 'rotate-180' : ''
                                                                }`}
                                                        />
                                                    </button>

                                                    {expandedEvaluations.has(evaluation._id) && (
                                                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-300 shadow-inner">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <FileText className="h-4 w-4 text-emerald-600" />
                                                                <h6 className="font-semibold text-gray-800">Relatório Clínico</h6>
                                                            </div>
                                                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                                {evaluation.content || 'Nenhum relatório clínico registrado para esta avaliação.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Footer do Card */}
                                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
                                                <div className="flex justify-between items-center text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Avaliação registrada em {dateFormat(evaluation.date)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {evaluation.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Nenhuma avaliação registrada
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Comece registrando a primeira avaliação deste paciente.
                                    </p>
                                    <Button
                                        onClick={() => setIsAdding(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Primeira Avaliação
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                /* Estado Vazio - Sem paciente selecionado */
                <Card>
                    <CardContent className="text-center py-16">
                        <Users className="h-20 w-20 mx-auto text-gray-400 mb-6" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                            Selecione um Paciente
                        </h3>
                        <p className="text-gray-600 text-lg max-w-md mx-auto">
                            Escolha um paciente na lista acima para visualizar e gerenciar sua evolução terapêutica.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}