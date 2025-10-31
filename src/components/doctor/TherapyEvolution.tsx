import { LinearProgress } from '@mui/material';
import { format } from 'date-fns';
import { Activity, ChevronDown, FileText, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import EvolutionChart from './EvolutionChart';

const EVALUATION_TYPES = [
    { id: 'language', name: 'Linguagem' },
    { id: 'motor', name: 'Motor' },
    { id: 'cognitive', name: 'Cognitivo' },
    { id: 'behavior', name: 'Comportamento' },
    { id: 'social', name: 'Social' }
];

const SPEECH_METRICS = [
    {
        id: 'articulacao',
        name: 'Articulação',
        description: 'Capacidade de articulação de fonemas',
        minValue: 0,
        maxValue: 10,
        unit: 'pts'
    },
    {
        id: 'fluencia',
        name: 'Fluência',
        description: 'Fluência na fala',
        minValue: 0,
        maxValue: 10,
        unit: 'pts'
    },
    {
        id: 'compreensao',
        name: 'Compreensão',
        description: 'Compreensão de comandos verbais',
        minValue: 0,
        maxValue: 10,
        unit: 'pts'
    }
];

export default function TherapyEvolution({ patients }) {
    const { user } = useAuth();
    const [selectedPatient, setSelectedPatient] = useState('');
    const [evaluations, setEvaluations] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [metrics, setMetrics] = useState([]);
    const [showDetails, setShowDetails] = useState(null);

    const [newEvaluation, setNewEvaluation] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        metrics: {},
        evaluationTypes: [],
        content: '',
        areaScores: {} as Record<string, number>,
    });

    useEffect(() => {
        const init: Record<string, number> = {};
        EVALUATION_TYPES.forEach(t => { init[t.id] = 3; });
        setNewEvaluation(prev => ({ ...prev, areaScores: { ...init, ...(prev.areaScores || {}) } }));
    }, []);

    const selectedPatientData = patients.find(p => p._id === selectedPatient) || {};

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                setMetrics(SPEECH_METRICS);

                const initialMetrics = {};
                SPEECH_METRICS.forEach(metric => {
                    initialMetrics[metric.name] = 5;
                });
                setNewEvaluation(prev => ({ ...prev, metrics: initialMetrics }));

            } catch (error) {
                console.error('Erro ao carregar métricas:', error);
                setMetrics(SPEECH_METRICS);
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
        }
    }, [selectedPatient]);

    const loadEvaluations = async () => {
        if (!selectedPatient) return;

        try {
            const response = await API.get(`/evolutions/patient/${selectedPatient}`);
            setEvaluations(response.data);
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
        }
    };

    const loadChartData = async () => {
        if (!selectedPatient) return;

        try {
            const response = await API.get(`/evolutions/chart/${selectedPatient}`);
            setChartData(response.data);
        } catch (error) {
            console.error('Erro ao carregar dados gráficos:', error);
            setChartData(null);
        }
    };

    const handleAddEvaluation = async () => {
        if (!selectedPatient) {
            alert("Selecione um paciente antes de salvar a avaliação.");
            return;
        }
        if (!newEvaluation.content?.trim()) {
            alert("Preencha o relatório clínico antes de salvar.");
            return;
        }

        try {
            // Montar métricas
            const metricsArray = metrics.map((metric) => ({
                name: metric.name,
                value: Number(newEvaluation.metrics[metric.name] || metric.minValue)
            }));

            // Montar áreas de avaliação
            const evaluationAreas = Object.entries(newEvaluation.areaScores || {}).map(([id, score]) => ({
                id,
                name: EVALUATION_TYPES.find(t => t.id === id)?.name || id,
                score: Number(score)
            }));

            // Determinar evaluationTypes baseado nas áreas com score >= 1
            const areasWithScore = evaluationAreas.filter(area => area.score >= 1);
            const evaluationTypesFinal = areasWithScore.map(area => area.id);

            // Validar se há pelo menos uma métrica ou área válida
            const hasValidMetrics = metricsArray.some(metric =>
                metric.value !== undefined && metric.value !== 0
            );
            const hasValidAreas = areasWithScore.length > 0;

            if (!hasValidMetrics && !hasValidAreas) {
                alert("Ajuste ao menos uma métrica OU uma área (score >= 1) antes de salvar!");
                return;
            }

            // ✅ PAYLOAD COMPLETAMENTE ALINHADO COM O BACKEND
            const payload = {
                patient: selectedPatient,
                doctor: (user as any)?._id || (user as any)?.id,
                date: new Date(newEvaluation.date), // ✅ Date object para o backend
                time: newEvaluation.time,
                plan: "", // ✅ Campo existente no backend
                evaluationTypes: evaluationTypesFinal, // ✅ Já está no enum correto
                metrics: metricsArray, // ✅ Formato correto
                specialty: (user as any)?.specialty || 'fonoaudiologia', // ✅ Campo obrigatório
                content: newEvaluation.content.trim(), // ✅ Mixed type no backend
                treatmentStatus: 'in_progress', // ✅ Valor do enum
                evaluationAreas: evaluationAreas, // ✅ ✅✅ NOVO CAMPO ADICIONADO
                // Campos opcionais que podem ser adicionados depois:
                // valuePaid: "",
                // sessionType: "",
                // paymentType: "",
                // appointmentId: null,
                // pdfUrl: "",
                // observations: ""
            };

            console.log('Payload alinhado com backend:', JSON.stringify(payload, null, 2));

            const response = await API.post('/evolutions', payload);

            if (response.status >= 200 && response.status < 300) {
                await loadEvaluations();
                await loadChartData();
                setIsAdding(false);

                // Resetar formulário
                const resetAreaScores: Record<string, number> = {};
                EVALUATION_TYPES.forEach(t => { resetAreaScores[t.id] = 3; });

                const initialMetrics = {};
                metrics.forEach(metric => {
                    initialMetrics[metric.name] = 5;
                });

                setNewEvaluation({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    time: '10:00',
                    metrics: initialMetrics,
                    evaluationTypes: [],
                    content: '',
                    areaScores: resetAreaScores,
                });

                toast.success("Avaliação salva com sucesso!");
            }
        } catch (error: any) {
            console.error('Erro detalhado:', error);
            if (error.response) {
                console.error('Resposta do servidor:', error.response.data);
                toast.error(`Erro ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            } else {
                toast.error("Erro ao salvar avaliação. Tente novamente.");
            }
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
            if (metric.values.length < 2) return;

            const firstValue = metric.values[0];
            const lastValue = metric.values[metric.values.length - 1];
            const { minValue = 0, maxValue = 10 } = metric.config;

            if (firstValue !== null && lastValue !== null) {
                const progress = ((lastValue - firstValue) / (maxValue - minValue)) * 100;
                totalProgress += Math.min(Math.max(progress, 0), 100);
                count++;
            }
        });

        return count > 0 ? totalProgress / count : 0;
    };

    const handleMetricChange = (metricName, value) => {
        setNewEvaluation(prev => ({
            ...prev,
            metrics: {
                ...prev.metrics,
                [metricName]: Number(value)
            }
        }));
    };

    const handleAreaScoreChange = (areaId: string, value: number | string) => {
        const v = Math.max(0, Math.min(10, Number(value || 0)));
        setNewEvaluation(prev => ({
            ...prev,
            areaScores: { ...(prev.areaScores || {}), [areaId]: v }
        }));
    };

    return (
        <>
            {/* Modal fora do container com overflow-hidden */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                        {/* Header Fixo */}
                        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white shrink-0">
                            <h3 className="font-bold text-xl">Nova Avaliação</h3>
                            <p className="text-teal-100 text-sm mt-1">
                                Preencha os dados da avaliação do paciente
                            </p>
                        </div>

                        {/* Conteúdo com Scroll */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Data e Hora */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700">Data</label>
                                    <input
                                        type="date"
                                        value={newEvaluation.date}
                                        onChange={(e) => setNewEvaluation({ ...newEvaluation, date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700">Horário</label>
                                    <input
                                        type="time"
                                        value={newEvaluation.time}
                                        onChange={(e) => setNewEvaluation({ ...newEvaluation, time: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                                    />
                                </div>
                            </div>

                            {/* Relatório Clínico */}
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-700">
                                    Relatório Clínico
                                </label>
                                <textarea
                                    value={newEvaluation.content}
                                    onChange={(e) => setNewEvaluation({ ...newEvaluation, content: e.target.value })}
                                    placeholder="Descreva detalhadamente a evolução do paciente, observações relevantes e próximos passos..."
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 h-32 resize-none"
                                />
                            </div>

                            {/* Métricas de Fonoaudiologia */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-teal-50 p-4 border-b border-teal-100">
                                    <h4 className="font-semibold text-lg text-teal-800">
                                        Métricas de Avaliação - Fonoaudiologia
                                    </h4>
                                    <p className="text-teal-600 text-sm mt-1">
                                        Avalie as competências específicas do paciente (0-10 pontos)
                                    </p>
                                </div>
                                <div className="p-4 space-y-4">
                                    {metrics.map(metric => (
                                        <div key={metric.id} className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="block text-sm font-semibold text-gray-700">
                                                    {metric.name}
                                                </label>
                                                <span className="text-lg font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                                                    {newEvaluation.metrics[metric.name] || metric.minValue}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <input
                                                    type="range"
                                                    min={metric.minValue}
                                                    max={metric.maxValue}
                                                    value={newEvaluation.metrics[metric.name] || metric.minValue}
                                                    onChange={(e) => handleMetricChange(metric.name, e.target.value)}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>{metric.minValue} - {metric.description.split('(')[0]}</span>
                                                    <span>{metric.maxValue} - Excelente</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Áreas de Desenvolvimento */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-cyan-50 p-4 border-b border-cyan-100">
                                    <h4 className="font-semibold text-lg text-cyan-800">
                                        Pontuação por Área de Desenvolvimento
                                    </h4>
                                    <p className="text-cyan-600 text-sm mt-1">
                                        0 = ausente · 10 = excelente
                                    </p>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {EVALUATION_TYPES.map((type) => {
                                        const value = newEvaluation.areaScores?.[type.id] ?? 0;
                                        const min = 0, max = 10;
                                        return (
                                            <div key={type.id} className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-sm font-semibold text-gray-700">
                                                        {type.name}
                                                    </label>
                                                    <span className="text-lg font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full">
                                                        {value}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    <input
                                                        type="range"
                                                        min={min}
                                                        max={max}
                                                        step={1}
                                                        value={value}
                                                        onChange={(e) => handleAreaScoreChange(type.id, e.target.value)}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                                                    />
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>0 - Ausente</span>
                                                        <span>10 - Excelente</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer Fixo */}
                        <div className="shrink-0 border-t border-gray-200 p-6 bg-gray-50">
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAdding(false)}
                                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleAddEvaluation}
                                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                    Salvar Avaliação
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Container Principal - Agora sem afetar o modal */}
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <Card className="bg-white/50 backdrop-blur-sm border-0">
                        <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                            <CardTitle className="flex items-center gap-3 text-white">
                                <Activity className="h-6 w-6" />
                                Evolução Terapêutica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <Label htmlFor="patientId" className="block mb-3 font-semibold text-gray-700 flex items-center gap-2">
                                        <Users size={20} className="text-teal-600" />
                                        Paciente
                                    </Label>
                                    <select
                                        value={selectedPatient}
                                        onChange={(e) => setSelectedPatient(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                                    >
                                        <option value="">Selecione um paciente</option>
                                        {patients?.map(patient => (
                                            <option key={patient._id} value={patient._id}>
                                                {patient.fullName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="block text-sm font-semibold mb-3 text-gray-700">
                                        Progresso Geral
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <LinearProgress
                                                variant="determinate"
                                                value={calculateProgress()}
                                                className="h-full rounded-full"
                                                sx={{
                                                    backgroundColor: 'transparent',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: '#0d9488',
                                                        borderRadius: '9999px'
                                                    }
                                                }}
                                            />
                                        </div>
                                        <span className="text-lg font-bold text-teal-700 min-w-12">
                                            {Math.round(calculateProgress())}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedPatient ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-800">
                                                Histórico de Avaliações
                                            </h3>
                                            <p className="text-gray-600 text-sm">
                                                {selectedPatientData.fullName}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsAdding(true)}
                                            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Nova Avaliação
                                        </Button>
                                    </div>

                                    <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                                        {evaluations.length > 0 ? (
                                            evaluations.map((evaluation, index) => (
                                                <div key={evaluation._id} className="border-b border-gray-100 last:border-b-0">
                                                    <div
                                                        className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors duration-200 flex justify-between items-center"
                                                        onClick={() => setShowDetails(showDetails === index ? null : index)}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <div className="font-semibold text-gray-800">
                                                                    {format(new Date(evaluation.date), 'dd/MM/yyyy')} às {evaluation.time}
                                                                </div>
                                                                {evaluation.evaluationTypes?.length > 0 && (
                                                                    <div className="flex gap-2">
                                                                        {evaluation.evaluationTypes.map(type => (
                                                                            <span
                                                                                key={type}
                                                                                className="px-3 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800 border border-teal-200"
                                                                            >
                                                                                {type}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                                <Users size={16} />
                                                                {evaluation.doctor?.fullName} • {evaluation.doctor?.specialty}
                                                            </div>
                                                        </div>
                                                        <ChevronDown
                                                            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showDetails === index ? 'rotate-180' : ''}`}
                                                        />
                                                    </div>

                                                    {showDetails === index && (
                                                        <div className="px-6 pb-6 bg-gray-50/30 border-t border-gray-100">
                                                            <div className="mb-6 pt-4">
                                                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                                    Métricas Registradas
                                                                </h4>
                                                                {evaluation.metrics && evaluation.metrics.length > 0 ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {evaluation.metrics.map(metric => (
                                                                            <div key={metric.name} className="flex justify-between items-center bg-white/80 p-3 rounded-lg border border-gray-200">
                                                                                <span className="font-medium text-gray-700">{metric.name}</span>
                                                                                <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-semibold">
                                                                                    {metric.value}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-gray-500 text-sm">Nenhuma métrica registrada</p>
                                                                )}
                                                            </div>

                                                            <div className="mb-6">
                                                                <h4 className="font-semibold text-gray-800 mb-3">Relatório Clínico</h4>
                                                                <div className="bg-white/80 p-4 rounded-lg border border-gray-200">
                                                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                                        {evaluation.content || 'Nenhum relatório registrado'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors duration-200"
                                                                >
                                                                    <FileText className="h-4 w-4 mr-2" />
                                                                    Gerar PDF
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-12 text-center">
                                                <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                                <p className="text-gray-500 font-medium">
                                                    Nenhuma avaliação registrada para este paciente
                                                </p>
                                                <p className="text-gray-400 text-sm mt-2">
                                                    Clique em "Nova Avaliação" para começar
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="font-semibold text-lg text-gray-800 mb-4">
                                            Análise Gráfica da Evolução
                                        </h3>
                                        {chartData ? (
                                            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm p-6">
                                                <EvolutionChart chartData={chartData} />
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-white/50 rounded-xl border border-gray-200">
                                                <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                                <p className="text-gray-500 font-medium">
                                                    Nenhum dado disponível para exibir gráficos
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <Activity className="h-20 w-20 mx-auto text-gray-300 mb-6" />
                                    <p className="text-gray-500 font-medium text-lg mb-2">
                                        Selecione um paciente
                                    </p>
                                    <p className="text-gray-400">
                                        Escolha um paciente para visualizar a evolução terapêutica
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <style jsx>{`
                .slider-thumb::-webkit-slider-thumb {
                    appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #0d9488;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    transition: all 0.2s ease;
                }
                
                .slider-thumb::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    background: #0f766e;
                }
                
                .slider-thumb::-moz-range-thumb {
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #0d9488;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
            `}</style>
        </>
    );
}