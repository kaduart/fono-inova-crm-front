import { useCallback, useMemo, useState } from 'react';
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

        await api.post('/leads', payload);
        toast.success('Lead criado com sucesso!');
    } catch (err) {
        toast.error('Erro ao criar lead');
        console.error(err);
    }
};

const AnalyticsDashboard = () => {
    const today = new Date();
    const daysAgo7 = new Date();
    daysAgo7.setDate(today.getDate() - 7);

    const [dateRange, setDateRange] = useState({
        startDate: daysAgo7.toISOString().split('T')[0], // 7 dias atrás
        endDate: today.toISOString().split('T')[0],      // hoje
    });

    const [selectedEventType, setSelectedEventType] = useState('all');

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
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Dashboard de Analytics</h1>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded"
                            value={dateRange.startDate}
                            onChange={(e) => handleFilterChange('dateRange', { ...dateRange, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded"
                            value={dateRange.endDate}
                            onChange={(e) => handleFilterChange('dateRange', { ...dateRange, endDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded"
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
                            <div key={i} className="p-4 shadow rounded bg-white">
                                <div className="skeleton h-4 w-1/2 mb-2"></div>
                                <div className="skeleton h-8 w-3/4"></div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="chart-container skeleton h-80"></div>
                        <div className="chart-container skeleton h-80"></div>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="skeleton h-64"></div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Cards de Métricas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                        <div className="p-4 shadow rounded bg-white fade-in">
                            <div className="text-gray-500">Usuários Totais</div>
                            <div className="text-2xl font-bold">{metrics?.totalUsers ?? '-'}</div>
                        </div>
                        <div className="p-4 shadow rounded bg-white fade-in">
                            <div className="text-gray-500">Usuários Ativos</div>
                            <div className="text-2xl font-bold">{metrics?.activeUsers ?? '-'}</div>
                        </div>
                        <div className="p-4 shadow rounded bg-white fade-in">
                            <div className="text-gray-500">Sessões</div>
                            <div className="text-2xl font-bold">{metrics?.sessions ?? '-'}</div>
                        </div>
                        <div className="p-4 shadow rounded bg-white fade-in">
                            <div className="text-gray-500">Sessões Engajadas</div>
                            <div className="text-2xl font-bold">{metrics?.engagedSessions ?? '-'}</div>
                        </div>
                        <div className="p-4 shadow rounded bg-white fade-in">
                            <div className="text-gray-500">Duração Média</div>
                            <div className="text-2xl font-bold">
                                {metrics?.avgSessionDuration ? (metrics.avgSessionDuration / 60).toFixed(2) + ' min' : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Cards de Métricas Adicionais */}
                    {calculatedMetrics && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="p-4 shadow rounded bg-white fade-in">
                                <div className="text-gray-500">Total de Eventos</div>
                                <div className="text-2xl font-bold">{calculatedMetrics.totalEvents}</div>
                            </div>
                            <div className="p-4 shadow rounded bg-white fade-in">
                                <div className="text-gray-500">Tipos de Eventos</div>
                                <div className="text-2xl font-bold">{calculatedMetrics.uniqueEventTypes}</div>
                            </div>
                            <div className="p-4 shadow rounded bg-white fade-in">
                                <div className="text-gray-500">Valor Médio</div>
                                <div className="text-2xl font-bold">{calculatedMetrics.averageValue}</div>
                            </div>
                            <div className="p-4 shadow rounded bg-white fade-in">
                                <div className="text-gray-500">Maior Valor</div>
                                <div className="text-2xl font-bold">{calculatedMetrics.maxValue}</div>
                            </div>
                        </div>
                    )}

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Gráfico de Evolução Temporal */}
                        <div className="chart-container">
                            <h2 className="text-xl font-semibold mb-4">Evolução Temporal de Eventos</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid stroke="#f5f5f5" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Gráfico de Distribuição de Eventos */}
                        <div className="chart-container">
                            <h2 className="text-xl font-semibold mb-4">Distribuição de Eventos</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Tabela de Eventos */}
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold">Eventos Detalhados</h2>
                            <p className="text-sm text-gray-600">
                                Exibindo {filteredEvents.length} eventos
                                {selectedEventType !== 'all' ? ` do tipo "${selectedEventType}"` : ''}
                            </p>
                        </div>
                        <SiteAnalyticsTable data={filteredEvents} />
                    </div>
                </>
            )}

            <style jsx>{`
        .chart-container {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 1.25rem;
        }
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 0.25rem;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default AnalyticsDashboard;