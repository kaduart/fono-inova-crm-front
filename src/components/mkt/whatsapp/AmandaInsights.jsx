
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Brain,
    BarChart,
    MessageSquare,
    Smile,
    RefreshCw,
    CheckCircle
} from 'lucide-react';

export default function AmandaInsights() {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Buscar insights ao montar
    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get('/api/analytics/insights');
            setInsights(response.data);
            setLastUpdate(new Date(response.data?.generatedAt || Date.now()));
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao carregar insights');
        } finally {
            setLoading(false);
        }
    };

    const runAnalysis = async () => {
        setAnalyzing(true);
        setError(null);

        try {
            const response = await axios.post('/api/analytics/learn');

            if (response.data.success) {
                setTimeout(() => {
                    fetchInsights();
                    setAnalyzing(false);
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao rodar análise');
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error && !insights) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
                <div className="text-red-800 text-sm">{error}</div>
            </div>
        );
    }

    const stats = {
        leadsAnalyzed: insights?.leadsAnalyzed || 0,
        conversationsAnalyzed: insights?.conversationsAnalyzed || 0,
        openings: insights?.data?.bestOpeningLines?.length || 0,
        priceResponses: insights?.data?.effectivePriceResponses?.length || 0,
        questions: insights?.data?.successfulClosingQuestions?.length || 0
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        🧠 Aprendizado da Amanda
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Insights gerados a partir de conversas bem-sucedidas
                    </p>
                </div>

                <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                    {analyzing ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Analisando...</span>
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Atualizar Insights</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-yellow-800 text-sm">{error}</div>
                </div>
            )}

            {/* CARDS DE ESTATÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Conversões Analisadas</h3>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                        {stats.leadsAnalyzed}
                    </div>
                    <p className="text-gray-600 text-sm">Leads que viraram pacientes</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Mensagens Analisadas</h3>
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                        {stats.conversationsAnalyzed * 8}
                    </div>
                    <p className="text-gray-600 text-sm">~{stats.conversationsAnalyzed} conversas completas</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart className="w-5 h-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">Padrões Descobertos</h3>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                        {stats.openings + stats.priceResponses + stats.questions}
                    </div>
                    <p className="text-gray-600 text-sm">Insights acionáveis</p>
                </div>
            </div>

            {/* INSIGHTS DETALHADOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ABERTURAS EFETIVAS */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <Smile className="w-5 h-5 text-blue-600" />
                            <div>
                                <h3 className="font-semibold text-gray-900">Aberturas Que Convertem</h3>
                                <p className="text-gray-600 text-sm">{stats.openings} padrões identificados</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {insights?.data?.bestOpeningLines?.slice(0, 3).map((opening, idx) => (
                                <div key={idx} className={`pb-4 ${idx < 2 ? 'border-b border-gray-100' : ''}`}>
                                    <p className="text-gray-800 mb-3 italic">"{opening.text}"</p>
                                    <div className="flex gap-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Usada {opening.usageCount}x
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {opening.leadOrigin}
                                        </span>
                                    </div>
                                </div>
                            )) || (
                                    <div className="text-center py-4">
                                        <p className="text-gray-500 text-sm">Nenhum padrão descoberto ainda</p>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>

                {/* RESPOSTAS DE PREÇO */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <BarChart className="w-5 h-5 text-green-600" />
                            <div>
                                <h3 className="font-semibold text-gray-900">Respostas de Preço Efetivas</h3>
                                <p className="text-gray-600 text-sm">{stats.priceResponses} estratégias validadas</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {insights?.data?.effectivePriceResponses?.slice(0, 3).map((price, idx) => (
                                <div key={idx} className={`pb-4 ${idx < 2 ? 'border-b border-gray-100' : ''}`}>
                                    <p className="text-gray-800 mb-3">"{price.response.substring(0, 100)}..."</p>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {price.scenario.replace('_', ' ')}
                                    </span>
                                </div>
                            )) || (
                                    <div className="text-center py-4">
                                        <p className="text-gray-500 text-sm">Nenhum padrão descoberto ainda</p>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PERGUNTAS DE FECHAMENTO */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-orange-600" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Perguntas Que Levam a Agendamento</h3>
                            <p className="text-gray-600 text-sm">{stats.questions} perguntas validadas</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {insights?.data?.successfulClosingQuestions?.slice(0, 5).map((question, idx) => (
                            <div key={idx} className={`pb-4 ${idx < 4 ? 'border-b border-gray-100' : ''}`}>
                                <p className="text-gray-800 mb-3">"{question.question}"</p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {question.ledToScheduling}% de sucesso
                                </span>
                            </div>
                        )) || (
                                <div className="text-center py-4">
                                    <p className="text-gray-500 text-sm">Nenhum padrão descoberto ainda</p>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="text-center">
                <p className="text-gray-500 text-sm">
                    Última atualização: {lastUpdate?.toLocaleString('pt-BR')}
                </p>
            </div>
        </div>
    );
}