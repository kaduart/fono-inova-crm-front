/**
 * 📊 SiteAnalyticsDashboard - VERSÃO CORRIGIDA
 * 
 * Correções:
 * 1. ✅ Filtros de data consistentes (7d/30d/personalizado)
 * 2. ✅ Landing Pages aparecendo corretamente
 * 3. ✅ Relatório diário com tabs
 * 4. ✅ Dados de leads por dia
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
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
    AreaChart,
    ComposedChart
} from 'recharts';
import { 
    useAnalyticsDashboard, 
    SERVICE_PAGES 
} from '../../hooks/analytics';
import { translateEvent } from '../../services/analytics';
import API from '../../services/api';
import AnapolisSEOPagesCard from './AnapolisSEOPagesCard';
import { 
    RefreshCw, Users, MousePointer, TrendingUp, Globe, 
    Clock, Smartphone, MapPin, Calendar, Filter, 
    ChevronDown, ChevronUp, ExternalLink, AlertTriangle, 
    Lightbulb, Zap, Award, AlertCircle, ChevronRight
} from 'lucide-react';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7300'];

// ============================================
// TIPOS
// ============================================

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

interface DailyReport {
    date: string;
    sessions: number;
    users: number;
    pageViews: number;
    events: number;
    leads: number;
    conversions: number;
}

interface LandingPage {
    slug: string;
    title: string;
    path: string;
    category: string;
    views: number;
    leads: number;
    users: number;
    bounceRate: number;
    isLandingPage: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

// Props para compatibilidade com AnalyticsTab (não usadas - componente usa hook interno)
interface SiteAnalyticsDashboardProps {
    patients?: any[];
    doctors?: any[];
    payments?: any[];
    onMarkAsPaid?: (payment: any) => void;
    registerAppointmentAndPayemntFuture?: (payment: any) => void;
    onCancelPayment?: (paymentId: string) => void;
}

const SiteAnalyticsDashboard = (_props: SiteAnalyticsDashboardProps) => {
    // ============================================
    // ESTADOS
    // ============================================
    
    const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'landing-pages' | 'anapolis-seo' | 'insights'>('overview');
    const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | 'custom'>('7d');
    const [showCustomDate, setShowCustomDate] = useState(false);
    
    // Datas calculadas
    const today = useMemo(() => new Date(), []);
    const daysAgo7 = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return d;
    }, [today]);
    const daysAgo30 = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return d;
    }, [today]);

    const [dateRange, setDateRange] = useState({
        startDate: daysAgo7.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
    });

    const [selectedEventType, setSelectedEventType] = useState('Todos');

    // ============================================
    // ESTADOS - INSIGHTS & ALERTAS
    // ============================================
    const [alertsData, setAlertsData] = useState<any>(null);
    const [scoringData, setScoringData] = useState<any[]>([]);
    const [prioritiesData, setPrioritiesData] = useState<any>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [recalculating, setRecalculating] = useState(false);

    // Fetch dados de insights quando a aba é ativada ou período muda
    useEffect(() => {
        if (activeTab === 'insights') {
            fetchInsightsData(dateRange);
        }
    }, [activeTab, dateRange]);

    const fetchInsightsData = async (range = dateRange) => {
        setInsightsLoading(true);
        const start = new Date(range.startDate + 'T12:00:00');
        const end = new Date(range.endDate + 'T12:00:00');
        const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        try {
            const [alertsRes, scoringRes, prioritiesRes] = await Promise.all([
                API.get('/alerts/dashboard').then(r => r.data),
                API.get('/scoring/ranking', { params: { period: periodDays } }).then(r => r.data),
                API.get('/scoring/priorities').then(r => r.data)
            ]);

            if (alertsRes.success) setAlertsData(alertsRes.data);
            if (scoringRes.success) setScoringData(scoringRes.data?.results || []);
            if (prioritiesRes.success) setPrioritiesData(prioritiesRes.data);
        } catch (error) {
            toast.error('Erro ao carregar dados de insights');
        } finally {
            setInsightsLoading(false);
        }
    };

    const handleRecalculateScores = async () => {
        setRecalculating(true);
        try {
            const start = new Date(dateRange.startDate + 'T12:00:00');
            const end = new Date(dateRange.endDate + 'T12:00:00');
            const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            const res = await API.post('/scoring/calculate', { period: periodDays });
            const data = res.data;
            if (data.success) {
                toast.success(`Scores recalculados: ${data.data.successful} LPs atualizadas`);
                fetchInsightsData();
            } else {
                toast.error('Erro ao recalcular scores');
            }
        } catch (error) {
            toast.error('Erro ao recalcular scores');
        } finally {
            setRecalculating(false);
        }
    };

    // ============================================
    // DADOS
    // ============================================
    
    const {
        data,
        metrics,
        events,
        sources,
        pages,
        landingPages: landingPagesRaw,
        anapolisPages,
        conversions,
        realtime,
        loading,
        error,
        refetch
    } = useAnalyticsDashboard(dateRange);

    // LPs vêm do hook (já com leads filtrados por período)
    const landingPages: LandingPage[] = useMemo(() => {
        return (landingPagesRaw?.length ? landingPagesRaw : data?.landingPages || pages?.filter(p => p.isLandingPage) || []);
    }, [landingPagesRaw, data, pages]);

    // 🆕 Relatório diário
    const dailyReport: DailyReport[] = useMemo(() => {
        return data?.dailyReport || [];
    }, [data]);

    // ============================================
    // HANDLERS DE DATA
    // ============================================
    
    const handleDatePreset = useCallback((preset: 'today' | '7d' | '30d' | 'custom') => {
        setDatePreset(preset);
        
        const todayStr = today.toISOString().split('T')[0];
        
        if (preset === 'today') {
            setDateRange({
                startDate: todayStr,
                endDate: todayStr
            });
            setShowCustomDate(false);
        } else if (preset === '7d') {
            setDateRange({
                startDate: daysAgo7.toISOString().split('T')[0],
                endDate: todayStr
            });
            setShowCustomDate(false);
        } else if (preset === '30d') {
            setDateRange({
                startDate: daysAgo30.toISOString().split('T')[0],
                endDate: todayStr
            });
            setShowCustomDate(false);
        } else {
            setShowCustomDate(true);
        }
    }, [daysAgo7, daysAgo30, today]);

    // Força refetch quando muda a data
    useEffect(() => {
        refetch();
    }, [dateRange, refetch]);

    // ============================================
    // DADOS CALCULADOS
    // ============================================
    
    const serviceMetrics = useMemo((): ServicePageMetric[] => {
        if (!pages || pages.length === 0) return [];

        return SERVICE_PAGES.map(service => {
            const pageData = pages.find(p => 
                p.path === service.path || 
                p.path?.includes(service.id) ||
                p.title?.toLowerCase().includes(service.title.toLowerCase())
            );

            return {
                ...service,
                views: pageData?.views || 0,
                users: pageData?.users || 0,
                bounceRate: pageData?.bounceRate || 0,
                avgTime: pageData?.avgEngagementTime || 0,
                leads: pageData?.leads || 0
            };
        }).sort((a, b) => b.views - a.views);
    }, [pages]);

    // Dados para gráficos
    const lineChartData = useMemo(() => {
        return dailyReport.map(day => {
            // Adiciona T12:00:00 para evitar bug de timezone (UTC vs local)
            const [, mm, dd] = day.date.split('-');
            return {
                date: `${dd}/${mm}`,
                fullDate: day.date,
                views: day.pageViews,
                events: day.events,
                leads: day.leads,
                conversions: day.conversions
            };
        });
    }, [dailyReport]);

    const pieChartData = useMemo(() => {
        const eventCounts: Record<string, number> = {};
        events.forEach(e => {
            const translatedName = translateEvent(e.action);
            eventCounts[translatedName] = (eventCounts[translatedName] || 0) + (e.value || 1);
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

    // ============================================
    // HELPERS
    // ============================================
    
    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

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

    // ============================================
    // RENDER - HEADER
    // ============================================
    
    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Analytics</h1>
                    <p className="text-sm text-gray-500">
                        Período: {dateRange.startDate} até {dateRange.endDate}
                        {loading && <span className="ml-2 text-blue-500">(carregando...)</span>}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Usuários em tempo real */}
                {realtime?.activeUsers !== null && realtime?.activeUsers !== undefined ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium">{realtime.activeUsers} online</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full" title="Dados realtime requerem configuração da GA4 Realtime API">
                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                        <span className="text-sm font-medium">Realtime não disponível</span>
                    </div>
                )}
                
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
    );

    // ============================================
    // RENDER - FILTROS
    // ============================================
    
    const renderFilters = () => (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-4">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'overview' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Visão Geral
                </button>
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'daily' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Relatório Diário
                </button>
                <button
                    onClick={() => setActiveTab('landing-pages')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'landing-pages' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Landing Pages ({landingPages.length})
                </button>
                <button
                    onClick={() => setActiveTab('anapolis-seo')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        activeTab === 'anapolis-seo' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <MapPin className="w-4 h-4" />
                    Anápolis SEO
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        activeTab === 'insights' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Lightbulb className="w-4 h-4" />
                    Insights & Alertas
                </button>
            </div>

            {/* Filtro de data */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Período:</span>
                </div>
                
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => handleDatePreset('today')}
                        disabled={loading}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors relative ${
                            datePreset === 'today'
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {loading && datePreset === 'today' && (
                            <span className="absolute left-1 top-1/2 -translate-y-1/2">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            </span>
                        )}
                        <span className={loading && datePreset === 'today' ? 'pl-4' : ''}>Hoje</span>
                    </button>
                    <button
                        onClick={() => handleDatePreset('7d')}
                        disabled={loading}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors relative ${
                            datePreset === '7d'
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {loading && datePreset === '7d' && (
                            <span className="absolute left-1 top-1/2 -translate-y-1/2">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            </span>
                        )}
                        <span className={loading && datePreset === '7d' ? 'pl-4' : ''}>7 dias</span>
                    </button>
                    <button
                        onClick={() => handleDatePreset('30d')}
                        disabled={loading}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors relative ${
                            datePreset === '30d'
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {loading && datePreset === '30d' && (
                            <span className="absolute left-1 top-1/2 -translate-y-1/2">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            </span>
                        )}
                        <span className={loading && datePreset === '30d' ? 'pl-4' : ''}>30 dias</span>
                    </button>
                    <button
                        onClick={() => handleDatePreset('custom')}
                        disabled={loading}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors relative ${
                            datePreset === 'custom'
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        Personalizado
                    </button>
                    {/* 🆕 Loading global indicator */}
                    {loading && (
                        <span className="ml-2 text-xs text-blue-600 flex items-center gap-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Atualizando...
                        </span>
                    )}
                </div>

                {showCustomDate && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        />
                        <span className="text-gray-500">até</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    // ============================================
    // RENDER - MÉTRICAS PRINCIPAIS
    // ============================================
    
    const renderMetrics = () => (
        <>
        {/* 🆕 Alerta de delay do GA4 */}
        {(metrics as any)?._isDelayed && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-yellow-800">
                    <strong>Dados de hoje ainda não disponíveis.</strong> O Google Analytics 4 tem delay de 24-48h para processar dados. 
                    Os dados do dia atual aparecerão amanhã. Métricas de leads do CRM são atualizadas em tempo real.
                </div>
            </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
                { label: 'Usuários', value: metrics?.totalUsers, icon: Users, color: 'blue' },
                { label: 'Ativos', value: metrics?.activeUsers, icon: Users, color: 'green' },
                { label: 'Sessões', value: metrics?.sessions, icon: MousePointer, color: 'purple' },
                { label: 'Page Views', value: metrics?.pageViews ?? 0, icon: TrendingUp, color: 'orange' },
                { label: 'Conv.', value: metrics?.conversions, icon: TrendingUp, color: 'red' },
                { label: 'Taxa Conv.', value: `${conversionRate}%`, icon: TrendingUp, color: 'teal' },
                { label: 'Leads Período', value: metrics?.leadsPeriod ?? metrics?.leadsThisWeek, icon: Users, color: 'indigo' },
                { label: 'Leads Hoje', value: metrics?.leadsToday, icon: Users, color: 'pink' },
            ].map((metric, idx) => (
                <div key={idx} className={`bg-white rounded-xl border border-gray-200 p-3 relative ${loading ? 'opacity-70' : ''}`}>
                    <div className={`text-${metric.color}-600 mb-1`}>
                        <metric.icon className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-gray-500">{metric.label}</div>
                    {loading ? (
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                    ) : (
                        <div className="text-lg font-bold text-gray-900">{metric.value ?? '-'}</div>
                    )}
                </div>
            ))}
        </div>
        </>
    );

    // ============================================
    // RENDER - TAB: OVERVIEW
    // ============================================
    
    const renderOverview = () => (
        <>
            {/* Info sobre filtro de data */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                <div className="p-1 bg-green-100 rounded">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-green-800">Dados filtrados por período</p>
                    <p className="text-xs text-green-700 mt-1">
                        Todos os dados desta aba respeitam o filtro de data selecionado (Google Analytics 4).
                    </p>
                </div>
            </div>

            {/* Gráficos principais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Evolução Temporal */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 relative">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Evolução de Eventos
                    </h2>
                    {loading && (
                        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
                            <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-sm text-gray-600">Carregando dados...</span>
                            </div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={lineChartData}>
                            <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" name="Page Views" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Distribuição de Eventos - Gráfico de Pizza Melhorado */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 relative">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Distribuição de Eventos</h2>
                    {loading && (
                        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
                            <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-sm text-gray-600">Carregando...</span>
                            </div>
                        </div>
                    )}
                    
                    {pieChartData.length === 0 ? (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Nenhum evento no período
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="45%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent, value }) => 
                                        `${(percent * 100).toFixed(0)}%`
                                    }
                                    labelLine={true}
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={COLORS[index % COLORS.length]} 
                                            stroke="#fff"
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number, name: string) => [
                                        `${value.toLocaleString()} eventos`, 
                                        name
                                    ]}
                                    contentStyle={{ 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                                    }}
                                />
                                <Legend 
                                    layout="vertical" 
                                    verticalAlign="middle" 
                                    align="right"
                                    iconType="circle"
                                    iconSize={10}
                                    wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                    
                    {/* Resumo abaixo do gráfico */}
                    {pieChartData.length > 0 && (
                        <div className="mt-2 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500 text-center">
                                Total: <strong>{pieChartData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}</strong> eventos
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fontes + Top Páginas */}
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
                                    <span className="text-gray-600">{source.sessions?.toLocaleString()} sessões</span>
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
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {pages?.slice(0, 10).map((page, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${page.isLandingPage ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400 font-mono text-sm">#{idx + 1}</span>
                                    <div>
                                        <div className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                                            {page.title}
                                            {page.isLandingPage && (
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">LP</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">{page.path}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-900">{page.views?.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">{page.bounceRate ? `${page.bounceRate.toFixed(0)}% bounce` : '-'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Páginas de Serviço */}
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
                                    <span className="font-semibold">{service.views?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Users:</span>
                                    <span className="font-semibold">{service.users?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Bounce:</span>
                                    <span className={`font-semibold ${service.bounceRate && service.bounceRate > 50 ? 'text-red-500' : service.bounceRate ? 'text-green-500' : 'text-gray-400'}`}>
                                        {service.bounceRate ? `${service.bounceRate.toFixed(0)}%` : '-'}
                                    </span>
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
        </>
    );

    // ============================================
    // RENDER - TAB: DAILY REPORT
    // ============================================
    
    const renderDailyReport = () => (
        <div className="space-y-6">
            {/* Info sobre filtro de data */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-1 bg-green-100 rounded">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-green-800">Dados filtrados por período</p>
                    <p className="text-xs text-green-700 mt-1">
                        Todos os dados desta aba respeitam o filtro de data selecionado (Google Analytics 4).
                    </p>
                </div>
            </div>

            {/* Gráfico diário */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Relatório Diário - Views e Leads
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={lineChartData}>
                        <CartesianGrid stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="views" fill="#3b82f6" name="Page Views" />
                        <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversões" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Tabela detalhada por dia */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Detalhamento por Dia</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Data</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Views</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Eventos</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Conversões</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dailyReport.map((day, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                        {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                            weekday: 'short',
                                            day: '2-digit',
                                            month: '2-digit'
                                        })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-gray-600">
                                        {day.pageViews?.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-gray-600">
                                        {day.events?.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm">
                                        <span className={`font-semibold ${day.conversions > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {day.conversions}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // ============================================
    // RENDER - TAB: LANDING PAGES
    // ============================================
    
    const renderLandingPages = () => (
        <div className="space-y-6">
            {/* Stats das LPs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-500 mb-1">Total LPs</div>
                    <div className="text-2xl font-bold text-gray-900">{landingPages.length}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-500 mb-1">Total Views</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {landingPages.reduce((sum, lp) => sum + (lp.views || 0), 0).toLocaleString()}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-500 mb-1">Total Leads</div>
                    <div className="text-2xl font-bold text-green-600">
                        {landingPages.reduce((sum, lp) => sum + (lp.leads || 0), 0).toLocaleString()}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-500 mb-1">Taxa Conv.</div>
                    <div className="text-2xl font-bold text-purple-600">
                        {(() => {
                            const totalViews = landingPages.reduce((sum, lp) => sum + (lp.views || 0), 0);
                            const totalLeads = landingPages.reduce((sum, lp) => sum + (lp.leads || 0), 0);
                            return totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : 0;
                        })()}%
                    </div>
                </div>
            </div>

            {/* Gráficos de Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 LPs por Views */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Top 10 LPs por Views
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={landingPages.slice(0, 10).sort((a, b) => (b.views || 0) - (a.views || 0))} layout="vertical">
                            <CartesianGrid stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="slug" type="category" width={150} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value) => [`${value.toLocaleString()} views`, 'Views']} />
                            <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 10 LPs por Leads */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-500" />
                        Top 10 LPs por Leads
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={landingPages.slice(0, 10).sort((a, b) => (b.leads || 0) - (a.leads || 0))} layout="vertical">
                            <CartesianGrid stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="slug" type="category" width={150} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value) => [`${value.toLocaleString()} leads`, 'Leads']} />
                            <Bar dataKey="leads" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribuição por Categoria */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Categoria</h2>
                {(() => {
                    const byCategory = landingPages.reduce((acc, lp) => {
                        acc[lp.category] = (acc[lp.category] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    const data = Object.entries(byCategory).map(([name, value]) => ({ name, value }));
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={3} dataKey="value">
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col justify-center space-y-2">
                                {data.sort((a, b) => b.value - a.value).map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm font-medium capitalize">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-sm font-bold">{item.value} LPs</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Insights & Recomendações */}
            {(() => {
                const topLp = landingPages.sort((a, b) => (b.views || 0) - (a.views || 0))[0];
                const topConverter = landingPages.filter(lp => lp.views > 10).sort((a, b) => ((b.leads/b.views) || 0) - ((a.leads/a.views) || 0))[0];
                const needsAttention = landingPages.filter(lp => lp.views > 50 && lp.leads === 0);
                
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-800">Mais Acessada</span>
                            </div>
                            {topLp ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-900 truncate">{topLp.title}</p>
                                    <p className="text-xs text-gray-500">/{topLp.slug}</p>
                                    <p className="text-lg font-bold text-green-600 mt-1">{topLp.views?.toLocaleString()} views</p>
                                </div>
                            ) : <p className="text-sm text-gray-500">Sem dados</p>}
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-800">Maior Conversão</span>
                            </div>
                            {topConverter ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-900 truncate">{topConverter.title}</p>
                                    <p className="text-xs text-gray-500">/{topConverter.slug}</p>
                                    <p className="text-lg font-bold text-blue-600 mt-1">
                                        {((topConverter.leads / topConverter.views) * 100).toFixed(1)}% conv.
                                    </p>
                                </div>
                            ) : <p className="text-sm text-gray-500">Sem dados suficientes</p>}
                        </div>
                        
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="font-semibold text-red-800">Precisa Atenção</span>
                            </div>
                            {needsAttention.length > 0 ? (
                                <div>
                                    <p className="text-sm text-gray-700">{needsAttention.length} LPs com tráfego mas sem leads</p>
                                    <p className="text-xs text-gray-500 mt-1">Revisar CTA e copy</p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Todas as LPs com tráfego estão convertendo! 🎉</p>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Lista de LPs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Landing Pages ({landingPages.length})</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Páginas de problema específico usadas em tráfego pago e CTAs do WhatsApp</p>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">#</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Título</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Slug</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Categoria</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Views</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Leads</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Conv. Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {landingPages
                                .sort((a, b) => (b.views || 0) - (a.views || 0))
                                .map((lp, idx) => (
                                <tr key={lp.slug} className="hover:bg-blue-50">
                                    <td className="py-3 px-4 text-sm text-gray-500">{idx + 1}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-medium text-gray-900">{lp.title}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{lp.slug}</code>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {lp.category}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm font-semibold">
                                        {(lp.views || 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm font-semibold text-green-600">
                                        {(lp.leads || 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm">
                                        {lp.views > 0 ? ((lp.leads / lp.views) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // ============================================
    // RENDER - EVENTOS
    // ============================================
    
    const renderEvents = () => (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Eventos Detalhados</h2>
                    <p className="text-sm text-gray-500">
                        {filteredEvents.length} eventos 
                        {selectedEventType !== 'Todos' && ` - Filtro: ${selectedEventType}`}
                    </p>
                </div>
                <select
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value)}
                >
                    {eventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
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
    );

    // ============================================
    // RENDER - TAB: INSIGHTS & ALERTAS
    // ============================================
    const renderInsights = () => (
        <div className="space-y-6">
            {/* Alerta sobre dados */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-1 bg-blue-100 rounded">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-blue-800">Scores baseados no período selecionado: {dateRange.startDate} até {dateRange.endDate}</p>
                    <p className="text-xs text-blue-700 mt-1">
                        Alertas e recomendações são calculados automaticamente com base no período selecionado no filtro.
                    </p>
                </div>
            </div>

            {/* Header com botão de recalcular */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-purple-500" />
                        Insights & Alertas Inteligentes
                    </h2>
                    <p className="text-sm text-gray-500">
                        Análise automática de performance e recomendações
                    </p>
                </div>
                <button
                    onClick={handleRecalculateScores}
                    disabled={recalculating}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                    {recalculating ? 'Recalculando...' : 'Recalcular Scores'}
                </button>
            </div>

            {/* Gráfico de Scores */}
            {scoringData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Ranking de Performance</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={scoringData.slice(0, 10)} layout="vertical">
                                <CartesianGrid stroke="#f0f0f0" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <YAxis dataKey="slug" type="category" width={120} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value) => [`Score: ${value}`, 'Performance']} />
                                <Bar dataKey="score" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Score" />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                            <h3 className="font-medium text-gray-700 mb-3">Distribuição de Scores</h3>
                            {scoringData.slice(0, 5).map((lp, idx) => (
                                <div key={lp.slug} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                            lp.grade === 'A' ? 'bg-green-100 text-green-700' :
                                            lp.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                            lp.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {lp.grade}
                                        </span>
                                        <span className="text-sm truncate max-w-[150px]">{lp.slug}</span>
                                    </div>
                                    <span className="font-bold text-purple-600">{lp.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Cards de Alertas por Prioridade */}
            {alertsData?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-medium text-gray-600">Crítico</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">{alertsData.summary.critical || 0}</div>
                        <div className="text-xs text-gray-500">alertas ativos</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-medium text-gray-600">Alto</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{alertsData.summary.high || 0}</div>
                        <div className="text-xs text-gray-500">alertas ativos</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-600">Médio</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">{alertsData.summary.medium || 0}</div>
                        <div className="text-xs text-gray-500">alertas ativos</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium text-gray-600">Baixo</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{alertsData.summary.low || 0}</div>
                        <div className="text-xs text-gray-500">alertas ativos</div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabela de Landing Pages com Score */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            Ranking de Landing Pages
                        </h3>
                        <span className="text-xs text-gray-500">Score Inteligente</span>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        {insightsLoading ? (
                            <div className="p-8 flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                            </div>
                        ) : scoringData.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Nenhuma landing page encontrada
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">#</th>
                                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Landing Page</th>
                                        <th className="text-center text-xs font-medium text-gray-500 uppercase py-3 px-4">Nota</th>
                                        <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {scoringData
                                        .sort((a, b) => (b.score || 0) - (a.score || 0))
                                        .map((lp, idx) => (
                                        <tr key={lp.slug} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm text-gray-500">{idx + 1}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900 text-sm">{lp.title || lp.slug}</div>
                                                <div className="text-xs text-gray-500">{lp.slug}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                                                    lp.grade === 'A' ? 'bg-green-100 text-green-700' :
                                                    lp.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                                    lp.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {lp.grade || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="text-sm font-bold text-gray-900">{lp.score || 0}</div>
                                                <div className="text-xs text-gray-500">/ 100</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Lista de Prioridades e Quick Wins */}
                <div className="space-y-4">
                    {insightsLoading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    ) : prioritiesData?.priorities ? (
                        prioritiesData.priorities.map((priority: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                        {idx === 0 ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                                         idx === 1 ? <Zap className="w-4 h-4 text-yellow-500" /> :
                                         <TrendingUp className="w-4 h-4 text-blue-500" />}
                                        {priority.title}
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {priority.items?.length > 0 ? (
                                        priority.items.map((item: any, itemIdx: number) => (
                                            <div key={itemIdx} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-medium text-gray-900">{item.action}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                item.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                                item.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {item.severity}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mb-1">
                                                            LP: <span className="font-medium">{item.landingPage}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">{item.description}</p>
                                                        {item.expectedResult && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="text-xs text-green-600 font-medium">
                                                                    {item.expectedResult}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            item.effort === 'low' ? 'bg-green-400' :
                                                            item.effort === 'medium' ? 'bg-yellow-400' :
                                                            'bg-red-400'
                                                        }`} />
                                                        {item.effort}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-sm text-gray-500 text-center">
                                            Nenhuma prioridade nesta categoria
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                            Nenhuma prioridade encontrada
                        </div>
                    )}

                    {/* Resumo de Quick Wins */}
                    {prioritiesData?.summary && (
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-5 h-5 text-purple-500" />
                                <span className="font-semibold text-purple-900">Resumo de Oportunidades</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-purple-600">{prioritiesData.summary.quickWins || 0}</div>
                                    <div className="text-xs text-purple-700">Quick Wins</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{prioritiesData.summary.critical || 0}</div>
                                    <div className="text-xs text-purple-700">Críticos</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-600">{prioritiesData.summary.high || 0}</div>
                                    <div className="text-xs text-purple-700">Alta Prioridade</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Alertas Recentes */}
            {alertsData?.recent && alertsData.recent.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Alertas Recentes
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                        {alertsData.recent.map((alert: any, idx: number) => (
                            <div key={idx} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start gap-3">
                                    <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                        alert.level === 'critical' ? 'bg-red-500' :
                                        alert.level === 'high' ? 'bg-orange-500' :
                                        alert.level === 'medium' ? 'bg-yellow-500' :
                                        'bg-blue-500'
                                    }`} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900">{alert.title}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                alert.level === 'critical' ? 'bg-red-100 text-red-700' :
                                                alert.level === 'high' ? 'bg-orange-100 text-orange-700' :
                                                alert.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {alert.level}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                                        {alert.recommendation && (
                                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                💡 {alert.recommendation}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // ============================================
    // RENDER PRINCIPAL
    // ============================================
    
    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {renderHeader()}
            {renderFilters()}
            {renderMetrics()}
            
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'daily' && renderDailyReport()}
            {activeTab === 'landing-pages' && renderLandingPages()}
            {activeTab === 'anapolis-seo' && (
                <div className="space-y-6">
                    <AnapolisSEOPagesCard pages={anapolisPages} loading={loading} />
                </div>
            )}
            {activeTab === 'insights' && renderInsights()}
            
            {renderEvents()}

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-400">
                Última atualização: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString('pt-BR') : '-'}
            </div>
        </div>
    );
};

export default SiteAnalyticsDashboard;
