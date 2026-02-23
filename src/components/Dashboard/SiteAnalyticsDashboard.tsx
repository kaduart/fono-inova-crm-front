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
    YAxis,
    Bar,
    BarChart,
    Area,
    AreaChart
} from 'recharts';
import { 
    useAnalyticsDashboard, 
    SERVICE_PAGES 
} from '../../hooks/analytics';
import { translateEvent } from '../../services/analytics';
import API from '../../services/api';
import { RefreshCw, Users, MousePointer, TrendingUp, Globe, Clock, Smartphone, MapPin } from 'lucide-react';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7300'];

interface ServicePageMetric {
    id: string;
    title: string;
    path: string;
    icon: string;
    views: number;
    users: number;
    bounceRate: number;
    avgTime: number;
    leads: number;
}

const SiteAnalyticsDashboard = () => {
    const today = new Date();
    const daysAgo7 = new Date();
    daysAgo7.setDate(today.getDate() - 7);
    const daysAgo30 = new Date();
    daysAgo30.setDate(today.getDate() - 30);

    const [dateRange, setDateRange] = useState({
        startDate: daysAgo7.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
    });

    const [selectedEventType, setSelectedEventType] = useState('Todos');

    const { 
        data, 
        metrics, 
        events, 
        sources, 
        pages, 
        conversions, 
        realtime,
        loading, 
        error,
        refetch 
    } = useAnalyticsDashboard(dateRange);

    // Métricas calculadas das páginas de serviço
    const serviceMetrics = useMemo((): ServicePageMetric[] => {
        if (!pages || pages.length === 0) return [];

        return SERVICE_PAGES.map(service => {
            const pageData = pages.find(p => 
                p.path === service.path || 
                p.path.includes(service.id) ||
                p.title.toLowerCase().includes(service.title.toLowerCase())
            );

            return {
                ...service,
                views: pageData?.views || 0,
                users: pageData?.users || 0,
                bounceRate: pageData?.bounceRate || 0,
                avgTime: pageData?.avgEngagementTime || 0,
                leads: conversions?.filter(c => 
                    c.eventName === 'generate_lead' && 
                    pageData?.path
                ).length || 0
            };
        }).sort((a, b) => b.views - a.views);
    }, [pages, conversions]);

    // Dados para gráficos
    const lineChartData = useMemo(() => {
        const dailyMap: Record<string, number> = {};
        events.forEach(e => {
            const dateKey = new Date(e.timestamp).toISOString().split('T')[0];
            dailyMap[dateKey] = (dailyMap[dateKey] || 0) + Number(e.value || 1);
        });
        return Object.keys(dailyMap).sort().map(date => ({ date, total: dailyMap[date] }));
    }, [events]);

    const pieChartData = useMemo(() => {
        const eventCounts: Record<string, number> = {};
        events.forEach(e => {
            const translatedName = translateEvent(e.action);
            eventCounts[translatedName] = (eventCounts[translatedName] || 0) + e.value;
        });
        return Object.entries(eventCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value]) => ({ name, value }));
    }, [events]);

    const sourcesChartData = useMemo(() => {
        return sources.slice(0, 6).map(s => ({
            name: s.source,
            sessions: s.sessions,
            users: s.users
        }));
    }, [sources]);

    const eventTypes = useMemo(() => {
        const types = new Set(events.map(event => translateEvent(event.action)));
        return ['Todos', ...Array.from(types)].sort();
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (selectedEventType === 'Todos') return events;
        return events.filter(event => translateEvent(event.action) === selectedEventType);
    }, [events, selectedEventType]);

    // Formatar duração
    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    // Calcular taxa de conversão
    const conversionRate = metrics?.sessions && metrics?.conversions 
        ? ((metrics.conversions / metrics.sessions) * 100).toFixed(1)
        : '0';

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Erro ao carregar dados: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">SiteAnalyticsDashboard</h1>
                        <p className="text-sm text-gray-500">Visão unificada - GA4 + CRM</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Usuários em tempo real */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium">{realtime?.activeUsers || 0} online</span>
                    </div>
                    
                    <button
                        onClick={refetch}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Período</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const newRange = {
                                            startDate: daysAgo7.toISOString().split('T')[0],
                                            endDate: today.toISOString().split('T')[0]
                                        };
                                        setDateRange(newRange);
                                        // Força refresh após mudar período
                                        setTimeout(() => refetch(), 100);
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                                        dateRange.startDate === daysAgo7.toISOString().split('T')[0]
                                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                                            : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                                >
                                    7 dias
                                </button>
                                <button
                                    onClick={() => {
                                        const newRange = {
                                            startDate: daysAgo30.toISOString().split('T')[0],
                                            endDate: today.toISOString().split('T')[0]
                                        };
                                        setDateRange(newRange);
                                        // Força refresh após mudar período
                                        setTimeout(() => refetch(), 100);
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                                        dateRange.startDate === daysAgo30.toISOString().split('T')[0]
                                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                                            : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                                >
                                    30 dias
                                </button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">
                            {dateRange.startDate} até {dateRange.endDate}
                            {loading && <span className="ml-2 text-blue-500">(atualizando...)</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 1: MÉTRICAS PRINCIPAIS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                {[
                    { label: 'Usuários', value: metrics?.totalUsers, icon: Users, color: 'blue' },
                    { label: 'Ativos', value: metrics?.activeUsers, icon: Users, color: 'green' },
                    { label: 'Sessões', value: metrics?.sessions, icon: MousePointer, color: 'purple' },
                    { label: 'Page Views', value: metrics?.pageViews, icon: TrendingUp, color: 'orange' },
                    { label: 'Conv.', value: metrics?.conversions, icon: TrendingUp, color: 'red' },
                    { label: 'Taxa Conv.', value: `${conversionRate}%`, icon: TrendingUp, color: 'teal' },
                    { label: 'Leads 7d', value: metrics?.leadsThisWeek, icon: Users, color: 'indigo' },
                    { label: 'Leads Hoje', value: metrics?.leadsToday, icon: Users, color: 'pink' },
                ].map((metric, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-3">
                        <div className={`text-${metric.color}-600 mb-1`}>
                            <metric.icon className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-gray-500">{metric.label}</div>
                        <div className="text-lg font-bold text-gray-900">{metric.value ?? '-'}</div>
                    </div>
                ))}
            </div>

            {/* SEÇÃO 2: GRÁFICOS PRINCIPAIS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Evolução Temporal */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Evolução de Eventos
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={lineChartData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Distribuição de Eventos */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Eventos</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
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

            {/* SEÇÃO 3: FONTES DE TRÁFEGO + TOP PÁGINAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Fontes de Tráfego */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-green-500" />
                        Fontes de Tráfego
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={sourcesChartData}>
                            <CartesianGrid stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="sessions" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        {sources?.slice(0, 5).map((source, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">{idx + 1}.</span>
                                    <span className="font-medium">{source.source}</span>
                                    <span className="text-xs text-gray-400">({source.medium})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-600">{source.sessions.toLocaleString()} sessões</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                                        {source.conversions} conv.
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Páginas */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-purple-500" />
                        Top Páginas
                    </h2>
                    <div className="space-y-3">
                        {pages?.slice(0, 6).map((page, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400 font-mono text-sm">#{idx + 1}</span>
                                    <div>
                                        <div className="font-medium text-gray-900 text-sm truncate max-w-[180px]">{page.title}</div>
                                        <div className="text-xs text-gray-500">{page.path}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-900">{page.views.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">{page.bounceRate.toFixed(0)}% bounce</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SEÇÃO 4: PÁGINAS DE SERVIÇO (Fono, Psico, etc) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-orange-500" />
                    Performance por Página de Serviço
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {serviceMetrics.map((service) => (
                        <div key={service.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{service.icon}</span>
                                <div className="text-xs font-medium text-gray-700 truncate">{service.title}</div>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Views:</span>
                                    <span className="font-semibold">{service.views.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Users:</span>
                                    <span className="font-semibold">{service.users.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Bounce:</span>
                                    <span className={`font-semibold ${service.bounceRate > 50 ? 'text-red-500' : 'text-green-500'}`}>
                                        {service.bounceRate.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tempo:</span>
                                    <span className="font-semibold">{formatDuration(service.avgTime)}</span>
                                </div>
                                {service.leads > 0 && (
                                    <div className="flex justify-between pt-1 border-t">
                                        <span className="text-green-600">Leads:</span>
                                        <span className="font-bold text-green-600">{service.leads}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SEÇÃO 5: TABELA DE EVENTOS DETALHADOS */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Eventos Detalhados</h2>
                        <p className="text-sm text-gray-500">
                            {filteredEvents.length} eventos 
                            {selectedEventType !== 'all' && ` - Filtro: ${selectedEventType}`}
                        </p>
                    </div>
                    <select
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                    >
                        {eventTypes.map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-4">Data/Hora</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-4">Evento</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-4">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEvents.slice(0, 100).map((event, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 text-sm text-gray-600">
                                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="py-2 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {translateEvent(event.action)}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                                        {event.value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-400">
                Última atualização: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString('pt-BR') : '-'}
            </div>
        </div>
    );
};

export default SiteAnalyticsDashboard;
