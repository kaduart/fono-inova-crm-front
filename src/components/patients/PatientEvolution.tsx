import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';

import { Activity, CalendarDays, FileText, Stethoscope, UserRound } from 'lucide-react';
import API from '../../services/api';
import { getEvaluationsByPatient } from '../../services/evaluationService';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Select } from '../ui/Select';
import EvolutionForm, { EvolutionFormData } from './EvolutionForm';

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

const PatientEvolution: React.FC<PatientEvolutionProps> = ({ patientId, patientName, initialEvolutions }) => {
    const [evolutions, setEvolutions] = useState<EvolutionFormData[]>([]);
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [selectedType, setSelectedType] = useState('all');
    const [selectedMetric, setSelectedMetric] = useState('all');
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#8dd1e1', '#a4de6c', '#d0ed57'];

    const getLineColor = (index: any) => colors[index % colors.length];
    const getBarColor = (index: any) => colors[index % colors.length];
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');


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

    const handleTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedType(event.target.value as string);
        setSelectedMetric('all');
    };

    const handleMetricChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedMetric(event.target.value as string);
    };

    const handleTabChange = (event: any, newValue: any) => {
        setTabValue(newValue);
    };

    const handleFormSubmit = async (formData: any) => {
        try {
            await API.post('/v2/evolutions', {
                ...formData,
                patientId
            });

            // Recarregar evoluções (V2)
            const evolutionsRes = await getEvaluationsByPatient(patientId);
            setEvolutions(evolutionsRes);
            setMetrics(deriveMetrics(evolutionsRes));

            setShowForm(false);
        } catch (error) {
            console.error('Erro ao salvar evolução:', error);
        }
    };

    const generatePDF = async () => {
        try {
            const response = await API.get(`/reports/patient/${patientId}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Relatório_${patientName.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
        }
    };

    const orderedEvolutions = [...evolutions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestEvolution = orderedEvolutions[0] as any;
    const scoredEvolutions = orderedEvolutions.filter((evolution: any) =>
        (evolution.evaluationAreas || []).some((area: any) => area.score !== undefined && area.score !== null)
    ).length;

    return (
        <div className="space-y-6 p-2 sm:p-4">
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <LoadingSpinner />
                </Box>
            ) : (
                <Box>
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
                            <Box>
                                <Typography fontSize="0.72rem" fontWeight={800} color="#059669" textTransform="uppercase" letterSpacing="0.08em">
                                    Acompanhamento clínico
                                </Typography>
                                <Typography variant="h5" component="h1" fontWeight={800} color="#0F172A">
                                    Evolução de {patientName}
                                </Typography>
                                <Typography fontSize="0.82rem" color="#64748B" mt={0.35}>
                                    Histórico clínico, indicadores e progresso terapêutico do paciente.
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1.25 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<FileText size={16} />}
                                    onClick={generatePDF}
                                    disabled={evolutions.length === 0}
                                >
                                    Gerar Relatório
                                </Button>

                                <Button
                                    variant="contained"
                                    onClick={() => setShowForm(true)}
                                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                                >
                                    Nova evolução
                                </Button>
                            </Box>
                        </Box>

                        {evolutions.length === 0 ? (
                            <Typography>Nenhuma evolução registrada para este paciente.</Typography>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                    {[
                                        { label: 'Evoluções registradas', value: evolutions.length, icon: Activity, iconClass: 'bg-emerald-100 text-emerald-700' },
                                        { label: 'Último atendimento', value: latestEvolution ? new Date(latestEvolution.date).toLocaleDateString('pt-BR') : '—', icon: CalendarDays, iconClass: 'bg-blue-100 text-blue-700' },
                                        { label: 'Profissional', value: latestEvolution?.doctor?.fullName || 'Não informado', icon: UserRound, iconClass: 'bg-violet-100 text-violet-700' },
                                        { label: 'Avaliações pontuadas', value: scoredEvolutions, icon: Stethoscope, iconClass: 'bg-amber-100 text-amber-700' },
                                    ].map(({ label, value, icon: Icon, iconClass }) => (
                                        <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 min-w-0">
                                            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
                                                <Icon size={16} />
                                            </div>
                                            <p className="truncate text-base font-extrabold text-slate-900" title={String(value)}>{value}</p>
                                            <p className="mt-0.5 text-2xs font-semibold text-slate-500">{label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                        <div>
                                            <h2 className="text-sm font-bold text-slate-900">Evoluções recentes</h2>
                                            <p className="text-2xs text-slate-500">Registros clínicos mais recentes do acompanhamento</p>
                                        </div>
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-2xs font-bold text-emerald-700">
                                            {evolutions.length} registros
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {orderedEvolutions.slice(0, 6).map((evolution: any) => (
                                            <article key={evolution._id} className="px-4 py-3.5 hover:bg-slate-50/70 transition-colors">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <time className="text-xs font-extrabold text-slate-900">
                                                                {new Date(evolution.date).toLocaleDateString('pt-BR')} {evolution.time ? `às ${evolution.time}` : ''}
                                                            </time>
                                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700">
                                                                {getStatusLabel(evolution.treatmentStatus)}
                                                            </span>
                                                            {evolution.specialty && (
                                                                <span className="text-2xs font-medium capitalize text-slate-500">{String(evolution.specialty).replaceAll('_', ' ')}</span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1.5 text-sm leading-5 text-slate-700">{evolution.content || 'Sem descrição clínica.'}</p>
                                                        <p className="mt-1.5 text-2xs font-medium text-slate-500">
                                                            {evolution.doctor?.fullName || 'Profissional não informado'}
                                                        </p>
                                                    </div>
                                                    {(evolution.evaluationAreas || []).length > 0 && (
                                                        <div className="flex shrink-0 flex-wrap gap-1.5 sm:max-w-52 sm:justify-end">
                                                            {evolution.evaluationAreas.map((area: any) => (
                                                                <span key={area.id} className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-3xs font-bold text-blue-700">
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

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                                    <div className="mb-1">
                                        <h2 className="text-sm font-bold text-slate-900">Indicadores de evolução</h2>
                                        <p className="text-2xs text-slate-500">O gráfico considera apenas registros que possuem avaliação pontuada.</p>
                                    </div>
                                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
                                    <Tab label="Evolução Clínica" />
                                    <Tab label="Gráfico de Barras" />
                                    <Tab label="Gráfico Radar" />
                                </Tabs>

                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Tipo de Avaliação</InputLabel>
                                            <Select
                                                value={selectedType}
                                                onChange={handleTypeChange}
                                            >
                                                <MenuItem value="all">Todos os Tipos</MenuItem>
                                                <MenuItem value="language">Linguagem</MenuItem>
                                                <MenuItem value="motor">Habilidades Motoras</MenuItem>
                                                <MenuItem value="cognitive">Cognição</MenuItem>
                                                <MenuItem value="behavior">Comportamento</MenuItem>
                                                <MenuItem value="social">Interação Social</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Métrica</InputLabel>
                                            <Select
                                                value={selectedMetric}
                                                onChange={handleMetricChange}
                                                label="Métrica"
                                            >
                                                <MenuItem value="all">Todas as Métricas</MenuItem>
                                                {metrics && metrics
                                                    .filter(metric => selectedType === 'all' || metric.type === selectedType)
                                                    .map(metric => (
                                                        <MenuItem key={metric._id} value={metric._id}>
                                                            {metric.name}
                                                        </MenuItem>
                                                    ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>

                                <Box sx={{ height: 400, mb: 3 }}>
                                    {tabValue === 0 && chartData.length > 0 && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={chartData}
                                                margin={{ top: 18, right: 24, left: 0, bottom: 8 }}
                                            >
                                                <defs>
                                                    {Object.keys(chartData[0] || {})
                                                        .filter(key => key !== 'date' && key !== 'status')
                                                        .map((key, index) => (
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

                                                {selectedMetric !== 'all' ? (
                                                    <Area
                                                        type="monotone"
                                                        dataKey={Object.keys(chartData[0] || {}).find(key => key !== 'date' && key !== 'status')}
                                                        stroke="#2563eb"
                                                        strokeWidth={2.5}
                                                        fill="url(#clinicalGradient-0)"
                                                        activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                                                        connectNulls
                                                    />
                                                ) : (
                                                    Object.keys(chartData[0] || {})
                                                        .filter(key => key !== 'date' && key !== 'status')
                                                        .map((key, index) => (
                                                            <Area
                                                                key={key}
                                                                type="monotone"
                                                                dataKey={key}
                                                                stroke={getLineColor(index)}
                                                                strokeWidth={2.5}
                                                                fill={`url(#clinicalGradient-${index})`}
                                                                activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                                                                connectNulls
                                                            />
                                                        ))
                                                )}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                    {tabValue === 0 && chartData.length === 0 && (
                                        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center">
                                            <div>
                                                <Activity className="mx-auto h-8 w-8 text-slate-300" />
                                                <p className="mt-2 text-sm font-bold text-slate-700">Ainda não há pontuações para o gráfico</p>
                                                <p className="mt-1 text-xs text-slate-500">Registre avaliações com áreas pontuadas para acompanhar a evolução.</p>
                                            </div>
                                        </div>
                                    )}

                                    {tabValue === 1 && chartData.length > 0 && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart
                                                outerRadius={150}
                                                data={Object.entries(chartData[chartData.length - 1] || {})
                                                    .filter(([key]) => key !== 'date' && key !== 'status')
                                                    .map(([key, value]) => ({
                                                        name: key,
                                                        value: value
                                                    }))
                                                }
                                            >
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="name" />
                                                <PolarRadiusAxis domain={[0, 10]} />
                                                <Radar name="Avaliação" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                                <Legend />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    )}

                                    {tabValue === 2 && chartData.length > 0 && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart outerRadius={150} data={[chartData[chartData.length - 1]]}>
                                                <PolarGrid />
                                                <PolarAngleAxis
                                                    dataKey="name"
                                                    tickFormatter={() => ''}
                                                />
                                                <PolarRadiusAxis domain={[0, 10]} />
                                                <Tooltip />
                                                <Legend />

                                                {Object.keys(chartData[chartData.length - 1])
                                                    .filter(key => key !== 'date' && key !== 'status')
                                                    .map((key, index) => (
                                                        <Radar
                                                            key={key}
                                                            name={key}
                                                            dataKey={key}
                                                            stroke={getLineColor(index)}
                                                            fill={getLineColor(index)}
                                                            fillOpacity={0.6}
                                                        />
                                                    ))}
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    )}
                                </Box>

                                <Typography variant="subtitle1" gutterBottom>
                                    Status do Tratamento: {getStatusLabel(chartData[chartData.length - 1]?.status)}
                                </Typography>
                                </div>
                            </>
                        )}
                    </Paper>

                    {showForm && (
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Nova Avaliação
                            </Typography>

                            <EvolutionForm
                                metrics={metrics}
                                onSubmit={handleFormSubmit}
                                onCancel={() => setShowForm(false)}
                            />
                        </Paper>
                    )}
                </Box>
            )};
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
