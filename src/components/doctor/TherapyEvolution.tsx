import { LinearProgress } from '@mui/material';
import { format } from 'date-fns';
import { Activity, ChevronDown, FileText, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import MetricService from '../../services/MetricService';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import EvolutionChart from './EvolutionChart';

// Altere a definição dos tipos para:
const EVALUATION_TYPES = [
    { id: 'language', name: 'Linguagem' },
    { id: 'motor', name: 'Motor' },
    { id: 'cognitive', name: 'Cognitivo' },
    { id: 'behavior', name: 'Comportamento' },
    { id: 'social', name: 'Social' }
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

    // Adicione esta verificação antes de enviar
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

            const metricsArray = metrics.map(metric => ({
                name: metric.name,
                value: newEvaluation.metrics[metric.name] || metric.minValue
            }));


            const response = await API.post('/evolutions', {
                patient: selectedPatient,
                doctor: user.id, // ID do médico logado
                specialty: user.specialty, // Especialidade do médico
                date: newEvaluation.date,
                content: newEvaluation.content,
                metrics: metricsArray, // Formato Map
                evaluationTypes: newEvaluation.evaluationTypes, // Já são valores válidos
                time: newEvaluation.time,
                // Adicione outros campos conforme necessário
            });

            if (response.status >= 200 && response.status < 300) {
                // Recarregar dados e resetar formulário
                loadEvaluations();
                loadChartData();
                setIsAdding(false);
                setNewEvaluation({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    time: '10:00',
                    metrics: {},
                    evaluationTypes: [],
                    content: ''
                });
            }
        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Evolução Terapêutica
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <Label htmlFor="patientId" className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <Users size={18} /> Paciente
                        </Label>

                        <select
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="">Selecione um paciente</option>
                            {patients?.map(patient => (
                                <option key={patient._id} value={patient._id}>
                                    {patient.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Progresso Geral
                        </label>
                        <div className="flex items-center gap-3">
                            <LinearProgress
                                variant="determinate"
                                value={calculateProgress()}
                                className="h-3 flex-1"
                            />
                            <span className="text-sm font-medium">
                                {Math.round(calculateProgress())}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal de adição de avaliação */}
                {isAdding && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4">Nova Avaliação</h3>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Data</label>
                                <input
                                    type="date"
                                    value={newEvaluation.date}
                                    onChange={(e) => setNewEvaluation({ ...newEvaluation, date: e.target.value })}
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Relatório Clínico</label>
                                <textarea
                                    value={newEvaluation.content}
                                    onChange={(e) => setNewEvaluation({ ...newEvaluation, content: e.target.value })}
                                    placeholder="Descreva a evolução do paciente..."
                                    className="w-full p-3 border rounded-md h-32"
                                />
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Métricas de Avaliação</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {metrics.map(metric => (
                                        <div key={metric._id} className="border rounded-md p-3 bg-gray-50">
                                            <label className="block text-sm font-medium mb-1">
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
                                                <span className="text-sm font-medium w-10">
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

                            {/* No modal de adição */}
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Tipos de Avaliação</h4>
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
                                                className="mr-2"
                                            />
                                            <label htmlFor={`type-${type.id}`} className="text-sm">
                                                {type.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAdding(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button onClick={handleAddEvaluation}>
                                    Salvar Avaliação
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedPatient ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">
                                Histórico de Avaliações: {selectedPatientData.fullName}
                            </h3>
                            <Button size="sm" onClick={() => setIsAdding(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Avaliação
                            </Button>
                        </div>

                        {/* Lista de avaliações */}
                        <div className="border rounded-lg overflow-hidden mb-6">
                            {evaluations.length > 0 ? (
                                evaluations.map((evaluation, index) => (
                                    <div key={evaluation._id} className="border-b last:border-b-0">
                                        <div
                                            className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                                            onClick={() => setShowDetails(showDetails === index ? null : index)}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {format(new Date(evaluation.date), 'dd/MM/yyyy')} às {evaluation.time}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {evaluation.doctor?.fullName} • {evaluation.doctor?.specialty}
                                                </div>
                                                {evaluation.evaluationTypes?.length > 0 && (
                                                    <div className="flex gap-2 mt-1">
                                                        {evaluation.evaluationTypes.map(type => (
                                                            <span
                                                                key={type}
                                                                className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
                                                            >
                                                                {type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronDown
                                                className={`h-5 w-5 transition-transform ${showDetails === index ? 'rotate-180' : ''}`}
                                            />
                                        </div>

                                        {showDetails === index && (
                                            <div className="p-4 bg-gray-50 border-t">
                                                <div className="mb-4">
                                                    <h4 className="font-medium mb-2">Métricas Registradas</h4>
                                                    {evaluation.metrics && evaluation.metrics.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {evaluation.metrics.map(metric => (
                                                                <div key={metric.name} className="flex justify-between items-center border-b pb-2">
                                                                    <span className="font-medium">{metric.name}</span>
                                                                    <span className="bg-gray-200 px-2 py-1 rounded">{metric.value}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500">Nenhuma métrica registrada nesta avaliação</p>
                                                    )}
                                                </div>

                                                <div className="mb-4">
                                                    <h4 className="font-medium mb-2">Relatório Clínico</h4>
                                                    <p className="text-gray-700 whitespace-pre-wrap">
                                                        {evaluation.content || 'Nenhum relatório registrado'}
                                                    </p>
                                                </div>

                                                <div className="flex justify-end">
                                                    <Button variant="outline" size="sm">
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Gerar PDF
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-500">
                                        Nenhuma avaliação registrada para este paciente
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Gráficos de evolução */}
                        <div className="mt-8">
                            <h3 className="font-medium mb-4">Análise Gráfica da Evolução</h3>
                            {chartData ? (
                                <EvolutionChart chartData={chartData} />
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">
                                        Nenhum dado disponível para exibir gráficos
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
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