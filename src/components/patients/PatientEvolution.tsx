import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';

import axios from 'axios';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
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
import { Select } from '../ui/Select';
import EvolutionForm, { EvolutionFormData } from './EvolutionForm';

interface Metric {
    _id: string;
    name: string;
    type: string;
}
interface ChartDataItem {
    date: string;
    [key: string]: number | string;
}
interface PatientEvolutionProps {
    patientId: string;
    patientName: string;
}

const PatientEvolution: React.FC<PatientEvolutionProps> = ({ patientId, patientName }) => {
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


    const [evaluationTypes, setEvaluationTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        axios.get(`/api/evolutions/${patientId}`)
            .then(response => {
                setEvolutions(response.data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Error fetching evolutions:", error);
                setIsLoading(false);
            });

        // Fetch available evaluation types
        axios.get(`/api/evaluationTypes`)
            .then(response => {
                setEvaluationTypes(response.data);
            })
            .catch(error => {
                console.error("Error fetching evaluation types:", error);
            });
    }, [patientId]);


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
                const metricValue = evolution.metrics?.[selectedMetric] || 0;
                const metricName = metrics.find(m => m._id === selectedMetric)?.name || selectedMetric;

                return {
                    date,
                    [metricName]: metricValue
                };
            }

            // Se todas as métricas forem selecionadas
            const metricValues: { [key: string]: number } = {};

            metrics.forEach((metric: Metric) => {
                if (selectedType === 'all' || metric.type === selectedType) {
                    metricValues[metric.name] = evolution.metrics?.[metric._id] || 0;
                }
            });

            return {
                date,
                ...metricValues,
                status: evolution.treatmentStatus
            };
        });

        // Ordenar por data
        data.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB;
        });

        const normalizedData = data.map(item => ({
            ...item,
            status: item.status ?? "unknown", // substitui undefined por 'unknown' (ou outro valor padrão)
        }));

        setChartData(normalizedData);
    }, [evolutions, metrics, selectedType, selectedMetric]);



    const handleSaveEvolution = (data: any) => {
        axios.post('/api/evolutions', data)
            .then(() => {
                axios.get(`/api/evolutions/${patientId}`)
                    .then(response => setEvolutions(response.data))
                    .catch(error => console.error('Error fetching evolutions after saving:', error));
            })
            .catch(error => console.error('Error saving evolution:', error));
    };
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
            await axios.post('/api/evolutions', {
                ...formData,
                patientId
            });

            // Recarregar evoluções
            const evolutionsRes = await axios.get(`/api/evolutions/patient/${patientId}`);
            setEvolutions(evolutionsRes.data);

            setShowForm(false);
        } catch (error) {
            console.error('Erro ao salvar evolução:', error);
        }
    };

    const generatePDF = async () => {
        try {
            const response = await axios.get(`/api/reports/patient/${patientId}`, {
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

    return (
        <div className="space-y-6 p-4">
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ p: 3 }}>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h5" component="h1">
                                Evolução do Paciente: {patientName}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2 }}>
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
                                    color="primary"
                                    onClick={() => setShowForm(true)}
                                >
                                    Nova Avaliação
                                </Button>
                            </Box>
                        </Box>

                        {evolutions.length === 0 ? (
                            <Typography>Nenhuma evolução registrada para este paciente.</Typography>
                        ) : (
                            <>
                                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
                                    <Tab label="Gráfico de Linha" />
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
                                    {tabValue === 0 && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={chartData}
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis domain={[0, 10]} />
                                                <Tooltip />
                                                <Legend />

                                                {selectedMetric !== 'all' ? (
                                                    <Line
                                                        type="monotone"
                                                        dataKey={Object.keys(chartData[0] || {}).find(key => key !== 'date' && key !== 'status')}
                                                        stroke="#8884d8"
                                                        activeDot={{ r: 8 }}
                                                    />
                                                ) : (
                                                    Object.keys(chartData[0] || {})
                                                        .filter(key => key !== 'date' && key !== 'status')
                                                        .map((key, index) => (
                                                            <Line
                                                                key={key}
                                                                type="monotone"
                                                                dataKey={key}
                                                                stroke={getLineColor(index)}
                                                                activeDot={{ r: 8 }}
                                                            />
                                                        ))
                                                )}
                                            </LineChart>
                                        </ResponsiveContainer>
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