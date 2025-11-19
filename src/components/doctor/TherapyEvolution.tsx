import { LinearProgress } from '@mui/material';
import { format } from 'date-fns';
import { Activity, ChevronDown, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import { confirmToast } from '../../utils/confirmToast';
import { formatDateForInput, toLocalDate } from '../../utils/dateHelper';
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

    const [deletingId, setDeletingId] = useState<string | null>(null);
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

    const handleDeleteEvaluation = async (evaluationId: string) => {
        const confirmed = await confirmToast("Tem certeza que deseja excluir esta avaliação? Essa ação não pode ser desfeita.");
        if (!confirmed) return;

        try {
            setDeletingId(evaluationId);
            await API.delete(`/evolutions/${evaluationId}`);
            // remove da lista local (evita recarregar tudo)
            setEvaluations(prev => prev.filter((e: any) => e._id !== evaluationId));
            toast.success("Avaliação excluída com sucesso! 💚");
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || "Erro ao excluir avaliação.";
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
            {isAdding && (
                <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="bg-gradient-to-br from-green-600 via-green-500 to-cyan-500 p-8 rounded-t-3xl shrink-0">
                            <h3 className="font-bold text-3xl text-white drop-shadow-lg">Nova Avaliação</h3>
                            <p className="text-green-50 text-base mt-2 font-light">
                                Preencha os dados da avaliação do paciente com atenção
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gradient-to-br from-gray-50 to-white">
                            {/* Data e Hora */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="block text-sm font-semibold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">
                                        📅 Data da Avaliação
                                    </label>
                                    <DatePicker
                                        selected={newEvaluation.date ? toLocalDate(newEvaluation.date) : null}
                                        onChange={(date) => {
                                            if (!date) return;
                                            setNewEvaluation(prev => ({
                                                ...prev,
                                                date: formatDateForInput(date)
                                            }));
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText='dd/MM/yyyy'
                                        className="w-full py-4 px-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-semibold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">
                                        🕐 Horário
                                    </label>
                                    <input
                                        type="time"
                                        value={newEvaluation.time}
                                        onChange={(e) => setNewEvaluation({ ...newEvaluation, time: e.target.value })}
                                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md"
                                    />
                                </div>
                            </div>

                            {/* Relatório Clínico */}
                            <div className="group">
                                <label className="block text-sm font-semibold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">
                                    📝 Relatório Clínico Detalhado
                                </label>
                                <textarea
                                    value={newEvaluation.content}
                                    onChange={(e) => setNewEvaluation({ ...newEvaluation, content: e.target.value })}
                                    placeholder="Descreva detalhadamente a evolução do paciente, observações relevantes e próximos passos..."
                                    className="w-full p-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all h-36 resize-none shadow-sm hover:shadow-md font-light"
                                />
                            </div>

                            {/* Métricas */}
                            <div className="space-y-6">
                                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                                    <div className="bg-gradient-to-r from-green-50 to-cyan-50 p-6 border-b-2 border-green-100">
                                        <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                            <span className="text-2xl">📊</span>
                                            Métricas de Avaliação
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">Avalie cada aspecto de 0 a 10</p>
                                    </div>
                                    <div className="p-6 space-y-6 bg-white">
                                        {metrics.map(metric => (
                                            <div key={metric.id} className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-base font-semibold text-gray-800">
                                                        {metric.name}
                                                    </label>
                                                    <span className="text-2xl font-bold text-green-600 bg-green-100 px-5 py-2 rounded-full shadow-sm min-w-[70px] text-center">
                                                        {newEvaluation.metrics[metric.name] || metric.minValue}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={metric.minValue}
                                                    max={metric.maxValue}
                                                    value={newEvaluation.metrics[metric.name] || metric.minValue}
                                                    onChange={(e) => handleMetricChange(metric.name, e.target.value)}
                                                    className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer slider-thumb shadow-inner"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                    <span>{metric.minValue} - Baixo</span>
                                                    <span>{metric.maxValue} - Excelente</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Áreas de Desenvolvimento */}
                                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                                    <div className="bg-gradient-to-r from-cyan-50 to-green-50 p-6 border-b-2 border-cyan-100">
                                        <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                            <span className="text-2xl">🎯</span>
                                            Áreas de Desenvolvimento
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">Pontue cada área de 0 a 10</p>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                                        {EVALUATION_TYPES.map((type) => {
                                            const value = newEvaluation.areaScores?.[type.id] ?? 0;
                                            return (
                                                <div key={type.id} className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-base font-semibold text-gray-800">
                                                            {type.name}
                                                        </label>
                                                        <span className="text-2xl font-bold text-cyan-600 bg-cyan-100 px-5 py-2 rounded-full shadow-sm min-w-[70px] text-center">
                                                            {value}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={10}
                                                        step={1}
                                                        value={value}
                                                        onChange={(e) => handleAreaScoreChange(type.id, e.target.value)}
                                                        className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer slider-thumb shadow-inner"
                                                    />
                                                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                        <span>0 - Ausente</span>
                                                        <span>10 - Excelente</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 border-t-2 border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-white rounded-b-3xl">
                            <div className="flex justify-end gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAdding(false)}
                                    className="px-8 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-all hover:scale-105"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleAddEvaluation}
                                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-cyan-500 hover:from-green-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl font-semibold transition-all hover:scale-105"
                                >
                                    ✓ Salvar Avaliação
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
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
                                    <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-white rounded-2xl border-2 border-green-100 shadow-lg hover:shadow-xl transition-all">
                                        <Label htmlFor="patientId" className="block font-bold text-gray-800 flex items-center gap-3 text-lg">
                                            <Users size={24} className="text-green-600" />
                                            Selecione o Paciente
                                        </Label>
                                        <select
                                            value={selectedPatient}
                                            onChange={(e) => setSelectedPatient(e.target.value)}
                                            className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md font-medium text-gray-700"
                                        >
                                            <option value="">Escolha um paciente...</option>
                                            {patients?.map(patient => (
                                                <option key={patient._id} value={patient._id}>
                                                    {patient.fullName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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
                                                evaluations.map((evaluation, index) => (
                                                    <div key={evaluation._id} className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:shadow-2xl transition-all hover:border-green-200 group">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-4 mb-4">
                                                                    <div className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                                                        <span className="text-2xl">📅</span>
                                                                        {format(new Date(evaluation.date), 'dd/MM/yyyy')} às {evaluation.time}
                                                                    </div>
                                                                    {evaluation.evaluationTypes?.length > 0 && (
                                                                        <div className="flex gap-2 flex-wrap">
                                                                            {evaluation.evaluationTypes.map(type => (
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
                                                                                    {evaluation.metrics.map(metric => (
                                                                                        <div key={metric.name} className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
                                                                                            <span className="font-semibold text-gray-800">{metric.name}</span>
                                                                                            <span className="bg-gradient-to-r from-green-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                                                                                {metric.value}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-gray-500 text-sm italic">Nenhuma métrica registrada</p>
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
                                                                    onClick={() => setShowDetails(showDetails === index ? null : index)}
                                                                    className="text-gray-600 hover:text-green-600 border-2 border-gray-300 hover:border-green-400 rounded-xl p-3 transition-all hover:scale-110"
                                                                >
                                                                    <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${showDetails === index ? 'rotate-180' : ''}`} />
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
                                                        Clique em "Nova Avaliação" para começar
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
                </div>
            </div>

            <style jsx>{`
            .slider-thumb::-webkit-slider-thumb {
                appearance: none;
                height: 24px;
                width: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                transition: all 0.3s ease;
            }
            
            .slider-thumb::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
            }
            
            .slider-thumb::-moz-range-thumb {
                height: 24px;
                width: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            }
            
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes zoom-in {
                from { transform: scale(0.95); }
                to { transform: scale(1); }
            }
            
            .animate-in {
                animation: fade-in 0.3s ease-out, zoom-in 0.3s ease-out;
            }
        `}</style>
        </>
    );
}