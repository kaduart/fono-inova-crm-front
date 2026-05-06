import React, { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import API from '../../services/api';
import { extractData } from '../../utils/dtoHelper';

interface ProgressData {
    patient: string;
    currentPlan: {
        protocol: {
            code: string;
            name: string;
        };
        version: number;
        reviewDate: string;
    };
    objectives: Array<{
        area: string;
        description: string;
        target: number;
        current: number;
        progress: number;
        achieved: boolean;
        trend: 'improving' | 'stable' | 'regressing';
        history: Array<{ date: string; score: number }>;
        projectedCompletion: string | null;
        targetDate: string;
    }>;
    protocolEffectiveness: {
        code: string;
        name: string;
        sessionsCompleted: number;
        overallImprovement: number;
    };
    totalSessions: number;
    treatmentStatus: string;
}

interface ProgressDashboardProps {
    patientId: string;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ patientId }) => {
    const [data, setData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedObjective, setSelectedObjective] = useState<number>(0);

    useEffect(() => {
        fetchProgress();
    }, [patientId]);

    const fetchProgress = async () => {
        try {
            setLoading(true);
            const response = await API.get(`/v2/evolutions/patient/${patientId}/progress`);
            setData(extractData(response));
        } catch (error) {
            console.error('Erro ao buscar progresso:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            </div>
        );
    }

    if (!data || data.objectives.length === 0) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800">
                    Nenhum plano terapêutico encontrado. Crie uma evolução com protocolo para visualizar o progresso.
                </p>
            </div>
        );
    }

    const objective = data.objectives[selectedObjective];

    const areaLabels: Record<string, string> = {
        language: 'Linguagem',
        motor: 'Motor',
        cognitive: 'Cognitivo',
        behavior: 'Comportamento',
        social: 'Social'
    };

    const trendIcons = {
        improving: '📈',
        stable: '➡️',
        regressing: '📉'
    };

    const trendColors = {
        improving: 'text-green-600 bg-green-100',
        stable: 'text-blue-600 bg-blue-100',
        regressing: 'text-red-600 bg-red-100'
    };

    const trendLabels = {
        improving: 'Melhorando',
        stable: 'Estável',
        regressing: 'Regredindo'
    };

    // Preparar dados para o gráfico
    const chartData = objective.history.map(h => ({
        date: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        score: h.score,
        meta: objective.target
    }));

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const daysUntilTarget = (targetDate: string) => {
        const days = Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">Progresso do Tratamento</h2>
                <p className="text-green-100">{data.currentPlan.protocol.name}</p>
                <div className="flex gap-6 mt-4 text-sm">
                    <div>
                        <span className="opacity-80">Sessões:</span>
                        <span className="font-semibold ml-1">{data.totalSessions}</span>
                    </div>
                    <div>
                        <span className="opacity-80">Progresso geral:</span>
                        <span className="font-semibold ml-1">{data.protocolEffectiveness.overallImprovement}%</span>
                    </div>
                    <div>
                        <span className="opacity-80">Revisão:</span>
                        <span className="font-semibold ml-1">{formatDate(data.currentPlan.reviewDate)}</span>
                    </div>
                </div>
            </div>

            {/* Objectives Tabs */}
            <div className="flex gap-2 overflow-x-auto">
                {data.objectives.map((obj, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedObjective(idx)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${selectedObjective === idx
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {areaLabels[obj.area] || obj.area}
                    </button>
                ))}
            </div>

            {/* Objective Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Progress Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Progresso Atual</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-gray-900">{objective.current}</span>
                        <span className="text-2xl text-gray-400 mb-1">/ {objective.target}</span>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{objective.progress}%</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${trendColors[objective.trend]}`}>
                                {trendIcons[objective.trend]} {trendLabels[objective.trend]}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-green-500 h-3 rounded-full transition-all"
                                style={{ width: `${objective.progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Target Date Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Data Alvo</h3>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatDate(objective.targetDate)}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        {daysUntilTarget(objective.targetDate) > 0
                            ? `${daysUntilTarget(objective.targetDate)} dias restantes`
                            : 'Prazo expirado'}
                    </p>
                </div>

                {/* Projection Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Projeção</h3>
                    {objective.projectedCompletion ? (
                        <>
                            <div className="text-2xl font-bold text-gray-900">
                                {formatDate(objective.projectedCompletion)}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                Estimativa baseada no progresso atual
                            </p>
                        </>
                    ) : (
                        <p className="text-gray-500">Dados insuficientes para projeção</p>
                    )}
                </div>
            </div>

            {/* Objective Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1">Objetivo</h3>
                <p className="text-gray-700">{objective.description}</p>
            </div>

            {/* Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Evolução ao Longo do Tempo</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            domain={[0, 10]}
                            ticks={[0, 2, 4, 6, 8, 10]}
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine
                            y={objective.target}
                            stroke="#10b981"
                            strokeDasharray="5 5"
                            label={{ value: 'Meta', position: 'right', fill: '#10b981', fontSize: 12 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 5 }}
                            activeDot={{ r: 7 }}
                            name="Score"
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* History Table */}
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Histórico de Sessões</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-gray-600">Data</th>
                                    <th className="px-4 py-2 text-left text-gray-600">Score</th>
                                    <th className="px-4 py-2 text-left text-gray-600">Variação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {objective.history.map((h, idx) => {
                                    const prevScore = idx > 0 ? objective.history[idx - 1].score : h.score;
                                    const diff = h.score - prevScore;
                                    return (
                                        <tr key={idx}>
                                            <td className="px-4 py-2">{formatDate(h.date)}</td>
                                            <td className="px-4 py-2 font-medium">{h.score}</td>
                                            <td className="px-4 py-2">
                                                {diff > 0 && (
                                                    <span className="text-green-600">+{diff} 📈</span>
                                                )}
                                                {diff < 0 && (
                                                    <span className="text-red-600">{diff} 📉</span>
                                                )}
                                                {diff === 0 && (
                                                    <span className="text-gray-500">-- ➡️</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* All Objectives Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Resumo de Todos os Objetivos</h3>
                <div className="space-y-3">
                    {data.objectives.map((obj, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-700">
                                        {areaLabels[obj.area] || obj.area}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${trendColors[obj.trend]}`}>
                                        {trendIcons[obj.trend]}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{obj.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex-1">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full"
                                                style={{ width: `${obj.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm text-gray-600 whitespace-nowrap">
                                        {obj.current} / {obj.target}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressDashboard;