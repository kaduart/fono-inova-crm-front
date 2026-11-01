
import { Activity, CalendarDays, FileText, Stethoscope, UserRound } from 'lucide-react';
import API from '../../services/api';
import { useEffect, useState } from 'react';
import {
    CartesianGrid,
    Area,
    AreaChart,
    Legend,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { LoadingSpinner } from '../ui/LoadingSpinner';
// Evolução como o back devolve (/v2/evolutions/patient/:id); só os campos usados aqui.
type EvolutionFormData = {
    _id?: string;
    date: string;
    evaluationTypes?: string[];
    evaluationAreas?: { id: string; name?: string; score?: number }[];
    treatmentStatus?: string;
    observations?: string;
    [key: string]: unknown;
};
import { toast } from '../../utils/toast';

interface Metric {
    _id: string;
    name: string;
    type: string;
}

const deriveMetrics = (evolutions: EvolutionFormData[]): Metric[] => {
    const available = new Map<string, Metric>();

    evolutions.forEach((evolution: any) => {
        (evolution.evaluationAreas || []).forEach((area: any) => {
            if (!area?.id) return;
            available.set(area.id, {
                _id: area.id,
                name: area.name || area.id,
                type: evolution.evaluationTypes?.[0] || area.id,
            });
        });

    });

    return Array.from(available.values());
};

const getMetricValue = (evolution: any, metricId: string): number | undefined => {
    const area = (evolution.evaluationAreas || []).find((item: any) => item.id === metricId);
    return area?.score !== undefined && area?.score !== null ? Number(area.score) : undefined;
};
interface ChartDataItem {
    date: string;
    [key: string]: number | string;
}
interface PatientEvolutionProps {
    patientId: string;
    patientName: string;
    initialEvolutions: EvolutionFormData[];
}

const PatientEvolution: React.FC<PatientEvolutionProps> = ({ patientName, initialEvolutions }) => {
    const [evolutions, setEvolutions] = useState<EvolutionFormData[]>([]);
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [selectedType, setSelectedType] = useState('all');
    const [selectedMetric, setSelectedMetric] = useState('all');
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#8dd1e1', '#a4de6c', '#d0ed57'];

    const getLineColor = (index: any) => colors[index % colors.length];


    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setEvolutions(initialEvolutions);
        setMetrics(deriveMetrics(initialEvolutions));
        setIsLoading(false);
    }, [initialEvolutions]);


    // Preparar dados para o gráfico
    useEffect(() => {
        if (evolutions.length === 0 || metrics.length === 0) return;

        // Filtrar evoluções pelo tipo selecionado
        let filteredEvolutions = evolutions;
        if (selectedType !== 'all') {
            filteredEvolutions = evolutions.filter(evolution =>
                (evolution?.evaluationTypes ?? []).includes(selectedType)
            );
        }

        // Preparar dados para o gráfico
        const data = filteredEvolutions.map(evolution => {
            const date = new Date(evolution.date).toLocaleDateString();

            // Se uma métrica específica for selecionada
            if (selectedMetric !== 'all') {
                const metricValue = getMetricValue(evolution, selectedMetric);
                const metricName = metrics.find(m => m._id === selectedMetric)?.name || selectedMetric;

                return {
                    date,
                    [metricName]: metricValue,
                    status: evolution.treatmentStatus,
                    timestamp: new Date(evolution.date).getTime(),
                };
            }

            // Se todas as métricas forem selecionadas
            const metricValues: { [key: string]: number } = {};

            metrics.forEach((metric: Metric) => {
                if (selectedType === 'all' || metric.type === selectedType) {
                    const value = getMetricValue(evolution, metric._id);
                    if (value !== undefined) metricValues[metric.name] = value;
                }
            });

            return {
                date,
                ...metricValues,
                status: evolution.treatmentStatus,
                timestamp: new Date(evolution.date).getTime(),
            };
        }).filter(item => Object.entries(item).some(([key, value]) =>
            !['date', 'status', 'timestamp'].includes(key)
            && typeof value === 'number'
            && Number.isFinite(value)
        ));

        // Ordenar por data
        data.sort((a, b) => {
            return a.timestamp - b.timestamp;
        });

        const normalizedData = data.map(({ timestamp: _timestamp, ...item }) => ({
            ...item,
            status: item.status ?? "unknown", // substitui undefined por 'unknown' (ou outro valor padrão)
        }));

        setChartData(normalizedData);
    }, [evolutions, metrics, selectedType, selectedMetric]);

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedType(event.target.value);
        setSelectedMetric('all');
    };

    const handleMetricChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMetric(event.target.value);
    };

    const generatePDF = async () => {
        try {
            const latest = [...evolutions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] as any;
            if (!latest?._id) return;
            const response = await API.get(`/v2/evolutions/${latest._id}/pdf`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Evolucao_${patientName.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast.error('Não foi possível gerar o PDF da evolução.');
        }
    };

    const orderedEvolutions = [...evolutions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestEvolution = orderedEvolutions[0] as any;
    const scoredEvolutions = orderedEvolutions.filter((evolution: any) =>
        (evolution.evaluationAreas || []).some((area: any) => area.score !== undefined && area.score !== null)
    ).length;

    const seriesKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'date' && key !== 'status');
    const lastPoint = chartData[chartData.length - 1];
    const radarData = Object.entries(lastPoint || {})
        .filter(([key]) => key !== 'date' && key !== 'status')
        .map(([key, value]) => ({ name: key, value }));
    const selectCls = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

    return (
        <div className="space-y-6 p-2 text-left sm:p-4">
            {isLoading ? (
                <div className="flex justify-center p-6"><LoadingSpinner /></div>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Acompanhamento clínico</p>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Evolução de {patientName}</h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Histórico clínico, indicadores e progresso terapêutico do paciente. As evoluções são registradas pelo terapeuta no painel dele.
                            </p>
                        </div>
                        <button type="button" onClick={generatePDF} disabled={evolutions.length === 0}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            <FileText size={16} aria-hidden /> PDF da última evolução
                        </button>
                    </div>

                    {evolutions.length === 0 ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300">Nenhuma evolução registrada para este paciente.</p>
                    ) : (
                        <>
                            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {[
                                    { label: 'Evoluções registradas', value: evolutions.length, icon: Activity, iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
                                    { label: 'Último atendimento', value: latestEvolution ? new Date(latestEvolution.date).toLocaleDateString('pt-BR') : '—', icon: CalendarDays, iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
                                    { label: 'Profissional', value: latestEvolution?.doctor?.fullName || 'Não informado', icon: UserRound, iconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
                                    { label: 'Avaliações pontuadas', value: scoredEvolutions, icon: Stethoscope, iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
                                ].map(({ label, value, icon: Icon, iconClass }) => (
                                    <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                                        <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
                                            <Icon size={16} aria-hidden />
                                        </div>
                                        <p className="truncate text-base font-extrabold text-slate-900 dark:text-slate-50" title={String(value)}>{value}</p>
                                        <p className="mt-0.5 text-2xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Evoluções recentes</h2>
                                        <p className="text-2xs text-slate-500 dark:text-slate-400">Registros clínicos mais recentes do acompanhamento</p>
                                    </div>
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-2xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                        {evolutions.length} registros
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {orderedEvolutions.slice(0, 6).map((evolution: any) => (
                                        <article key={evolution._id} className="px-4 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <time className="text-xs font-extrabold text-slate-900 dark:text-slate-50">
                                                            {new Date(evolution.date).toLocaleDateString('pt-BR')} {evolution.time ? `às ${evolution.time}` : ''}
                                                        </time>
                                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                            {getStatusLabel(evolution.treatmentStatus)}
                                                        </span>
                                                        {evolution.specialty && (
                                                            <span className="text-2xs font-medium capitalize text-slate-500 dark:text-slate-400">{String(evolution.specialty).replace(/_/g, ' ')}</span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1.5 text-sm leading-5 text-slate-700 dark:text-slate-200">{evolution.content || 'Sem descrição clínica.'}</p>
                                                    <p className="mt-1.5 text-2xs font-medium text-slate-500 dark:text-slate-400">
                                                        {evolution.doctor?.fullName || 'Profissional não informado'}
                                                    </p>
                                                </div>
                                                {(evolution.evaluationAreas || []).length > 0 && (
                                                    <div className="flex shrink-0 flex-wrap gap-1.5 sm:max-w-52 sm:justify-end">
                                                        {evolution.evaluationAreas.map((area: any) => (
                                                            <span key={area.id} className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-3xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                                                {area.name}: {area.score}/10
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30 sm:p-4">
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Indicadores de evolução</h2>
                                        <p className="text-2xs text-slate-500 dark:text-slate-400">O gráfico considera apenas registros que possuem avaliação pontuada.</p>
                                    </div>
                                    <div role="tablist" aria-label="Tipo de gráfico" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                                        {['Linha do tempo', 'Radar da última'].map((label, i) => (
                                            <button key={label} type="button" role="tab" aria-selected={tabValue === i} onClick={() => setTabValue(i)}
                                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${tabValue === i ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        Tipo de avaliação
                                        <select value={selectedType} onChange={handleTypeChange} className={`mt-1 ${selectCls}`}>
                                            <option value="all">Todos os tipos</option>
                                            <option value="language">Linguagem</option>
                                            <option value="motor">Habilidades motoras</option>
                                            <option value="cognitive">Cognição</option>
                                            <option value="behavior">Comportamento</option>
                                            <option value="social">Interação social</option>
                                        </select>
                                    </label>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        Métrica
                                        <select value={selectedMetric} onChange={handleMetricChange} className={`mt-1 ${selectCls}`}>
                                            <option value="all">Todas as métricas</option>
                                            {metrics
                                                .filter(metric => selectedType === 'all' || metric.type === selectedType)
                                                .map(metric => (
                                                    <option key={metric._id} value={metric._id}>{metric.name}</option>
                                                ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="mb-3 h-[400px]">
                                    {chartData.length === 0 ? (
                                        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center dark:border-slate-700 dark:bg-slate-900">
                                            <div>
                                                <Activity className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
                                                <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">Ainda não há pontuações para o gráfico</p>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registre avaliações com áreas pontuadas para acompanhar a evolução.</p>
                                            </div>
                                        </div>
                                    ) : tabValue === 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 18, right: 24, left: 0, bottom: 8 }}>
                                                <defs>
                                                    {seriesKeys.map((key, index) => (
                                                        <linearGradient key={key} id={`clinicalGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={getLineColor(index)} stopOpacity={0.34} />
                                                            <stop offset="95%" stopColor={getLineColor(index)} stopOpacity={0.03} />
                                                        </linearGradient>
                                                    ))}
                                                </defs>
                                                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="date" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                                                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={32} />
                                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,.08)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                                                {seriesKeys.map((key, index) => (
                                                    <Area key={key} type="monotone" dataKey={key}
                                                        stroke={selectedMetric !== 'all' ? '#2563eb' : getLineColor(index)} strokeWidth={2.5}
                                                        fill={`url(#clinicalGradient-${index})`}
                                                        activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }} connectNulls />
                                                ))}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart outerRadius={150} data={radarData}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                                                <PolarRadiusAxis domain={[0, 10]} />
                                                <Tooltip />
                                                <Radar name={`Avaliação de ${lastPoint?.date ?? ''}`} dataKey="value" stroke="#059669" fill="#10b981" fillOpacity={0.45} />
                                                <Legend />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>

                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Status do tratamento: {getStatusLabel(lastPoint?.status as string)}
                                </p>
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    );
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'initial_evaluation': return 'Avaliação Inicial';
        case 'in_progress': return 'Em Andamento';
        case 'improving': return 'Melhorando';
        case 'stable': return 'Estável';
        case 'regressing': return 'Regredindo';
        case 'completed': return 'Tratamento Concluído';
        default: return 'Desconhecido';
    }
};

export default PatientEvolution;
