import { format, parseISO } from 'date-fns';
import { Activity, Calendar, ChevronDown, Clock, FileText, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import MetricService from '../../services/MetricService';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import EvolutionChart from './EvolutionChart';

const EVALUATION_TYPES = [
    { id: 'language', name: 'Linguagem', color: 'bg-blue-100 text-blue-800' },
    { id: 'motor', name: 'Motor', color: 'bg-green-100 text-green-800' },
    { id: 'cognitive', name: 'Cognitivo', color: 'bg-purple-100 text-purple-800' },
    { id: 'behavior', name: 'Comportamento', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'social', name: 'Social', color: 'bg-pink-100 text-pink-800' }
];

export default function TherapyEvolution({ patients }) {
    const { user } = useAuth();

    const [selectedPatient, setSelectedPatient] = useState('');
    const [evaluations, setEvaluations] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [metrics, setMetrics] = useState([]);
    const [showDetails, setShowDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

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

                // Inicializar valores
                const initialMetrics = {};
                metricsData.forEach(metric => {
                    initialMetrics[metric.name] = metric.minValue;
                });
                setNewEvaluation(prev => ({ ...prev, metrics: initialMetrics }));

            } catch (error) {
                console.error('Erro ao carregar métricas:', error);
            }
        };
        loadMetrics();
    }, []);

    useEffect(() => {
        if (metrics.length > 0) {
            const initialMetrics = {};
            metrics.forEach(metric => {
                initialMetrics[metric.name] = metric.minValue +
                    Math.round((metric.maxValue - metric.minValue) * 0.3); // 30% do range
            });

            setNewEvaluation(prev => ({
                ...prev,
                metrics: initialMetrics
            }));
        }
    }, [metrics]);

    useEffect(() => {
        if (selectedPatient) {
            loadEvaluations();
            loadChartData();
        } else {
            setEvaluations([]);
            setChartData(null);
        }
    }, [selectedPatient]);

    // Carregar avaliações do paciente
    const loadEvaluations = async () => {
        if (!selectedPatient) return;

        try {
            const response = await API.get(`/evolutions/patient/${selectedPatient}`);
            setEvaluations(response.data);
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
        }
    };

    // Carregar dados para gráficos
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

    // Verificar se há métricas válidas
    const hasValidMetrics = metrics.some(metric => {
        const value = newEvaluation.metrics[metric.name];
        return value !== undefined && value !== metric.minValue;
    });

    // Adicionar nova avaliação
    const handleAddEvaluation = async () => {
        if (!hasValidMetrics) {
            alert("Ajuste pelo menos uma métrica antes de salvar!");
            return;
        }
        try {
            setIsLoading(true);

            const metricsArray = metrics.map(metric => ({
                name: metric.name,
                value: newEvaluation.metrics[metric.name] || metric.minValue
            }));
            console.log('sssssssssss', user)
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

            console.log('sssssssssss', response)
            if (response.status >= 200 && response.status < 300) {
                loadEvaluations();
                loadChartData();
                setIsAdding(false);
                setNewEvaluation({
                    date: currentDate,
                    time: currentTime,
                    metrics: {},
                    evaluationTypes: [],
                    content: ''
                });
                toast.success("Evolução cadastrada com sucesso!");

            }
            setIsLoading(false);

        } catch (error) {
            toast.error("Erro ao salvar avaliação");
            console.error('Erro ao salvar avaliação:', error);
            setIsLoading(false);

        }
    };

    // Calcular progresso geral
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

    // Formatar data para exibição corrigindo fuso horário
    const formatDisplayDate = (dateString, timeString) => {
        try {
            // Combina data e hora e faz parsing correto
            const dateTime = parseISO(`${dateString}T${timeString}`);
            return format(dateTime, 'dd/MM/yyyy') + ' às ' + format(dateTime, 'HH:mm');
        } catch (error) {
            return `${dateString} às ${timeString}`;
        }
    };

    return (
        <Card className="bg-white rounded-xl shadow-md">
            <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-gray-800">
                    <Activity className="h-6 w-6 text-green-600" />
                    Evolução Terapêutica
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <Label htmlFor="patientId" className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <Users size={18} /> Paciente
                        </Label>

                        <select
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecione um paciente</option>
                            {patients?.map(patient => (
                                <option key={patient._id} value={patient._id}>
                                    {patient.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                            Progresso Geral
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${calculateProgress()}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                                {Math.round(calculateProgress())}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal de adição de avaliação */}
                {isAdding && (

                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
                                <LoadingSpinner />
                            </div>
                        )}
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <h3 className="font-bold text-xl mb-4 text-gray-800">Nova Avaliação</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                                        <Calendar size={16} /> Data
                                    </label>
                                    <input
                                        type="date"
                                        value={newEvaluation.date}
                                        onChange={(e) => setNewEvaluation({ ...newEvaluation, date: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                                        <Clock size={16} /> Hora
                                    </label>
                                    <input
                                        type="time"
                                        value={newEvaluation.time}
                                        onChange={(e) => setNewEvaluation({ ...newEvaluation, time: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-gray-700">Relatório Clínico</label>
                                <textarea
                                    value={newEvaluation.content}
                                    onChange={(e) => setNewEvaluation({ ...newEvaluation, content: e.target.value })}
                                    placeholder="Descreva a evolução do paciente..."
                                    className="w-full p-3 border border-gray-300 rounded-md h-32 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2 text-gray-700">Métricas de Avaliação</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {metrics.map(metric => (
                                        <div key={metric._id} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                                {metric.name}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min={metric.minValue}
                                                    max={metric.maxValue}
                                                    value={newEvaluation.metrics[metric.name] || metric.minValue}
                                                    onChange={(e) => handleMetricChange(metric.name, e.target.value)}
                                                    className="w-full"
                                                />
                                                <span className="text-sm font-medium w-10 text-gray-700">
                                                    {newEvaluation.metrics[metric.name] || metric.minValue}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {metric.description} ({metric.minValue}-{metric.maxValue} {metric.unit})
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2 text-gray-700">Tipos de Avaliação</h4>
                                <div className="flex flex-wrap gap-3">
                                    {EVALUATION_TYPES.map(type => (
                                        <div key={type.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`type-${type.id}`}
                                                checked={newEvaluation.evaluationTypes.includes(type.id)}
                                                onChange={() => setNewEvaluation({
                                                    ...newEvaluation,
                                                    evaluationTypes: newEvaluation.evaluationTypes.includes(type.id)
                                                        ? newEvaluation.evaluationTypes.filter(t => t !== type.id)
                                                        : [...newEvaluation.evaluationTypes, type.id]
                                                })}
                                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor={`type-${type.id}`} className="text-sm text-gray-700">
                                                {type.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleAddEvaluation}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
                                >
                                    Salvar Avaliação
                                </Button>
                            </div>
                        </div>

                    </div>
                )}

                {selectedPatient ? (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-medium text-lg text-gray-800">
                                Histórico de Avaliações: {selectedPatientData.fullName}
                            </h3>
                            <Button
                                size="sm"
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                Nova Avaliação
                            </Button>
                        </div>

                        {/* Gráficos de evolução */}
                        <div className="mt-8">
                            <h3 className="font-medium mb-4 text-gray-800">Análise Gráfica da Evolução</h3>
                            {chartData ? (
                                <EvolutionChart chartData={chartData} />
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-gray-500">
                                        Nenhum dado disponível para exibir gráficos
                                    </p>
                                </div>
                            )}
                        </div>
                        {/* Lista de avaliações */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                            {evaluations.length > 0 ? (
                                evaluations.map((evaluation, index) => {
                                    const evaluationType = EVALUATION_TYPES.find(t => t.id === evaluation.specialty) ||
                                        { name: evaluation.specialty, color: 'bg-gray-100 text-gray-800' };

                                    return (
                                        <div key={evaluation._id} className="border-b border-gray-200 last:border-b-0">
                                            <div
                                                className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                                                onClick={() => setShowDetails(showDetails === index ? null : index)}
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">
                                                        {formatDisplayDate(evaluation.date, evaluation.time)}
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        {evaluation.doctor?.fullName} • {evaluation.specialty}
                                                    </div>
                                                    {evaluation.evaluationTypes?.length > 0 && (
                                                        <div className="flex gap-2 mt-2">
                                                            {evaluation.evaluationTypes.map(type => {
                                                                const typeInfo = EVALUATION_TYPES.find(t => t.id === type) ||
                                                                    { name: type, color: 'bg-gray-100 text-gray-800' };
                                                                return (
                                                                    <span
                                                                        key={type}
                                                                        className={`px-2 py-1 text-xs rounded ${typeInfo.color}`}
                                                                    >
                                                                        {typeInfo.name}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronDown
                                                    className={`h-5 w-5 text-gray-500 transition-transform ${showDetails === index ? 'rotate-180' : ''}`}
                                                />
                                            </div>

                                            {showDetails === index && (
                                                <div className="p-4 bg-gray-50 border-t border-gray-200">
                                                    <div className="mb-4">
                                                        <h4 className="font-medium mb-3 text-gray-800">Métricas Registradas</h4>
                                                        {evaluation.metrics && evaluation.metrics.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {evaluation.metrics.map(metric => (
                                                                    <div key={metric.name} className="bg-white p-3 rounded-lg border border-gray-200">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="font-medium text-gray-700">{metric.name}</span>
                                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                                                                                {metric.value}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500">Nenhuma métrica registrada nesta avaliação</p>
                                                        )}
                                                    </div>

                                                    <div className="mb-4">
                                                        <h4 className="font-medium mb-2 text-gray-800">Relatório Clínico</h4>
                                                        <p className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200">
                                                            {evaluation.content || 'Nenhum relatório registrado'}
                                                        </p>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4" />
                                                            Gerar PDF
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center">
                                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-500">
                                        Nenhuma avaliação registrada para este paciente
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">
                            Selecione um paciente para visualizar a evolução terapêutica
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}