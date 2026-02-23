import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { useAnalytics } from '../../hooks/analytics';
import API from '../../services/api';
import AmandaInsights from '../mkt/whatsapp/AmandaInsights';
import MarketingDashboard from './MarketingDashboard';
import SiteAnalyticsTable from './SiteAnalyticsTable';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const handleCreateLead = async (event) => {
    try {
        const payload = {
            name: event.userName || 'Visitante do Site',
            origin: 'Site',
            status: 'novo',
            contact: {
                email: event.userEmail || '',
                phone: event.userPhone || '',
            },
            notes: `Evento GA4: ${event.name} - Página: ${event.pageTitle}`,
        };

        await API.post('/leads', payload);
        toast.success('Lead criado com sucesso!');
    } catch (err) {
        toast.error('Erro ao criar lead');
        console.error(err);
    }
};

const SiteAnalyticsDashboard = () => {
    const today = new Date();
    const daysAgo7 = new Date();
    daysAgo7.setDate(today.getDate() - 7);

    const [dateRange, setDateRange] = useState({
        startDate: daysAgo7.toISOString().split('T')[0], // 7 dias atrás
        endDate: today.toISOString().split('T')[0],      // hoje
    });

    const [selectedEventType, setSelectedEventType] = useState('all');
    const [activeTab, setActiveTab] = useState('marketing'); // 'marketing' | 'insights' | 'gmb'

    const { events, metrics, loading, error } = useAnalytics(dateRange);

    // Função para corrigir dados inconsistentes da API
    const cleanedEvents = useMemo(() => {
        if (!events || events.length === 0) return [];

        return events.map(event => {
            // Corrigir valores quebrados
            if (typeof event.value === 'string' && event.value.includes(',')) {
                event.value = parseInt(event.value.split(',')[0]);
            }

            // Garantir que value é numérico
            return {
                ...event,
                value: Number(event.value) || 0
            };
        });
    }, [events]);

    // Filtrar eventos por tipo selecionado
    const filteredEvents = useMemo(() => {
        if (selectedEventType === 'all') return cleanedEvents;
        return cleanedEvents.filter(event => event.action === selectedEventType);
    }, [cleanedEvents, selectedEventType]);

    // Dados para o gráfico de linha (evolução diária)
    const lineChartData = useMemo(() => {
        const dailyMap = {};
        cleanedEvents.forEach(e => {
            const dateKey = new Date(e.timestamp).toISOString().split('T')[0];
            dailyMap[dateKey] = (dailyMap[dateKey] || 0) + Number(e.value || 1);
        });

        return Object.keys(dailyMap)
            .sort()
            .map(date => ({ date, total: dailyMap[date] }));
    }, [cleanedEvents]);

    // Dados para o gráfico de pizza (proporção de eventos)
    const pieChartData = useMemo(() => {
        const eventCounts = {};
        cleanedEvents.forEach(e => {
            eventCounts[e.action] = (eventCounts[e.action] || 0) + 1;
        });

        return Object.entries(eventCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value]) => ({ name, value }));
    }, [cleanedEvents]);

    // Tipos de evento únicos para o filtro
    const eventTypes = useMemo(() => {
        const types = new Set(cleanedEvents.map(event => event.action));
        return ['all', ...Array.from(types)].sort();
    }, [cleanedEvents]);

    // Métricas calculadas
    const calculatedMetrics = useMemo(() => {
        if (cleanedEvents.length === 0) return null;

        const totalEvents = cleanedEvents.length;
        const uniqueEventTypes = new Set(cleanedEvents.map(event => event.action)).size;
        const totalValue = cleanedEvents.reduce((sum, event) => sum + event.value, 0);
        const averageValue = totalValue / totalEvents;

        return {
            totalEvents,
            uniqueEventTypes,
            averageValue: averageValue.toFixed(2),
            maxValue: Math.max(...cleanedEvents.map(event => event.value))
        };
    }, [cleanedEvents]);

    // Manipulador de mudança de filtro
    const handleFilterChange = useCallback((filterType, value) => {
        if (filterType === 'dateRange') {
            setDateRange(value);
        } else if (filterType === 'eventType') {
            setSelectedEventType(value);
        }
    }, []);

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Erro ao carregar dados: {error.message}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Marketing</h1>
                        <p className="text-sm text-gray-500">Análise de tráfego e conversões do site</p>
                    </div>
                </div>
            </div>

            {/* Abas */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'marketing'
                                ? 'border-purple-500 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Marketing
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'analytics'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Analytics do Site
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'insights'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Insights da Amanda
                    </button>
                </nav>
            </div>

            {activeTab === 'analytics' && (
                <>
                    {/* Filtros */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Data Inicial</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={dateRange.startDate}
                                    onChange={(e) => handleFilterChange('dateRange', { ...dateRange, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Data Final</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={dateRange.endDate}
                                    onChange={(e) => handleFilterChange('dateRange', { ...dateRange, endDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tipo de Evento</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={selectedEventType}
                                    onChange={(e) => handleFilterChange('eventType', e.target.value)}
                                >
                                    {eventTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type === 'all' ? 'Todos os Eventos' : type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        // Skeleton loading
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                        <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                                        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                                        <div className="h-64 bg-gray-100 rounded"></div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                                <div className="h-48 bg-gray-100 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Cards de Métricas - GA4 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                                {[
                                    { label: 'Usuários Totais', value: metrics?.totalUsers },
                                    { label: 'Usuários Ativos', value: metrics?.activeUsers },
                                    { label: 'Sessões', value: metrics?.sessions },
                                    { label: 'Sessões Engajadas', value: metrics?.engagedSessions },
                                    { 
                                        label: 'Duração Média', 
                                        value: metrics?.avgSessionDuration ? (metrics.avgSessionDuration / 60).toFixed(2) + ' min' : '-'
                                    }
                                ].map((metric, idx) => (
                                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{metric.label}</div>
                                        <div className="text-2xl font-bold text-gray-900">{metric.value ?? '-'}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Cards de Métricas - Eventos */}
                            {calculatedMetrics && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    {[
                                        { label: 'Total de Eventos', value: calculatedMetrics.totalEvents, color: 'blue' },
                                        { label: 'Tipos de Eventos', value: calculatedMetrics.uniqueEventTypes, color: 'green' },
                                        { label: 'Valor Médio', value: calculatedMetrics.averageValue, color: 'purple' },
                                        { label: 'Maior Valor', value: calculatedMetrics.maxValue, color: 'orange' }
                                    ].map((metric, idx) => (
                                        <div 
                                            key={idx} 
                                            className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{metric.label}</div>
                                            <div className={`text-2xl font-bold text-${metric.color}-600`}>{metric.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Gráficos */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Gráfico de Evolução Temporal */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                        Evolução Temporal de Eventos
                                    </h2>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                                }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="total" 
                                                stroke="#3b82f6" 
                                                strokeWidth={3}
                                                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                                activeDot={{ r: 6, fill: '#3b82f6' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Gráfico de Distribuição de Eventos */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                                        Distribuição de Eventos
                                    </h2>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                innerRadius={60}
                                                fill="#8884d8"
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                labelLine={false}
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                                }}
                                            />
                                            <Legend 
                                                layout="vertical" 
                                                align="right"
                                                verticalAlign="middle"
                                                wrapperStyle={{ fontSize: 12 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Tabela de Eventos */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-800">Eventos Detalhados</h2>
                                            <p className="text-sm text-gray-500">
                                                Exibindo {filteredEvents.length} eventos
                                                {selectedEventType !== 'all' ? ` do tipo "${selectedEventType}"` : ''}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Última atualização: {new Date().toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                </div>
                                <SiteAnalyticsTable data={filteredEvents} />
                            </div>
                        </>
                    )}
                </>
            )}
            {activeTab === 'insights' && <AmandaInsights />}
            {activeTab === 'marketing' && <MarketingDashboard />}
        </div>
    );
};

export default SiteAnalyticsDashboard;