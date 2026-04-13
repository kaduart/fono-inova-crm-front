// src/components/admin/ObservabilityDashboard.tsx
/**
 * Dashboard de Observabilidade
 * 
 * Visualização em tempo real de:
 * - Eventos do sistema
 * - Saúde dos domínios
 * - Alertas e falhas
 * - Fluxo por correlationId
 */

import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Typography,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    Stepper,
    Step,
    StepLabel,
    StepContent
} from '@mui/material';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCw,
    Search,
    Server,
    Zap,
    XCircle,
    ChevronRight,
    Play,
    Check
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { extractErrorMessage } from '../../utils/errorUtils';

interface EventMetrics {
    timestamp: string;
    overview: {
        totalEvents: number;
        lastHour: number;
        lastDay: number;
        errorsLastHour: number;
        deadLetters: number;
    };
    byStatus: Record<string, number>;
    byDomain: Record<string, number>;
    processingTime: {
        avgTime: number;
        maxTime: number;
        minTime: number;
    };
}

interface DomainHealth {
    domain: string;
    counts: {
        total: number;
        processed: number;
        failed: number;
        processing: number;
    };
    successRate: string;
    avgProcessingTime: number;
    recentEvents: Array<{
        eventType: string;
        status: string;
        timestamp: string;
    }>;
}

interface Alert {
    level: 'error' | 'warning';
    type: string;
    message: string;
    count: number;
    events?: any[];
}

interface EventFlow {
    correlationId: string;
    summary: {
        totalEvents: number;
        duration: number;
        hasErrors: boolean;
        domains: string[];
        startTime: string;
        endTime: string;
    };
    timeline: Array<{
        id: string;
        eventId: string;
        eventType: string;
        status: string;
        aggregateType: string;
        timestamp: string;
        processingTime: number | null;
        errorInfo?: any;
    }>;
}

const ObservabilityDashboard = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [metrics, setMetrics] = useState<EventMetrics | null>(null);
    const [domains, setDomains] = useState<DomainHealth[]>([]);
    const [alerts, setAlerts] = useState<{ data: Alert[]; summary: any } | null>(null);
    const [recentEvents, setRecentEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [correlationId, setCorrelationId] = useState('');
    const [eventFlow, setEventFlow] = useState<EventFlow | null>(null);
    const [flowDialogOpen, setFlowDialogOpen] = useState(false);

    // Polling a cada 30 segundos
    const fetchData = useCallback(async () => {
        try {
            const [metricsRes, domainsRes, alertsRes, recentRes] = await Promise.all([
                axios.get('/api/observability/metrics'),
                axios.get('/api/observability/domains'),
                axios.get('/api/observability/alerts'),
                axios.get('/api/observability/recent?minutes=5&limit=50')
            ]);

            setMetrics(metricsRes.data.data);
            setDomains(domainsRes.data.data);
            setAlerts(alertsRes.data);
            setRecentEvents(recentRes.data.data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 120000); // 🔥 2min em vez de 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleSearchFlow = async () => {
        if (!correlationId.trim()) {
            toast.warn('Digite um correlationId');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`/api/observability/flow/${correlationId}`);
            setEventFlow(response.data.data);
            setFlowDialogOpen(true);
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Fluxo não encontrado'));
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'processed': return 'success';
            case 'failed': return 'error';
            case 'dead_letter': return 'error';
            case 'processing': return 'warning';
            case 'pending': return 'default';
            default: return 'default';
        }
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}min`;
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Activity className="w-8 h-8 text-blue-500" />
                    <Typography variant="h4" fontWeight="bold">
                        Observabilidade
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Buscar por correlationId..."
                        value={correlationId}
                        onChange={(e) => setCorrelationId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchFlow()}
                        InputProps={{
                            startAdornment: <Search size={18} style={{ marginRight: 8 }} />
                        }}
                        sx={{ width: 300 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSearchFlow}
                        disabled={loading}
                    >
                        Buscar Fluxo
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={fetchData}
                        startIcon={<RefreshCw size={18} />}
                        disabled={loading}
                    >
                        Atualizar
                    </Button>
                </Box>
            </Box>

            {/* Alertas */}
            {alerts && alerts.summary.status !== 'healthy' && (
                <Alert 
                    severity={alerts.summary.status === 'critical' ? 'error' : 'warning'}
                    sx={{ mb: 3 }}
                >
                    <Typography fontWeight="bold">
                        {alerts.summary.errors > 0 && `${alerts.summary.errors} erro(s) crítico(s). `}
                        {alerts.summary.warnings > 0 && `${alerts.summary.warnings} alerta(s). `}
                        Verifique a aba "Alertas" para detalhes.
                    </Typography>
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label="Visão Geral" icon={<Activity size={16} />} iconPosition="start" />
                <Tab label="Domínios" icon={<Server size={16} />} iconPosition="start" />
                <Tab label={`Alertas ${alerts?.summary.total ? `(${alerts.summary.total})` : ''}`} icon={<AlertCircle size={16} />} iconPosition="start" />
                <Tab label="Eventos em Tempo Real" icon={<Zap size={16} />} iconPosition="start" />
            </Tabs>

            {/* Tab: Visão Geral */}
            {activeTab === 0 && metrics && (
                <Grid container spacing={3}>
                    {/* Cards de Métricas */}
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total de Eventos
                                </Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {metrics.overview.totalEvents.toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Última hora: {metrics.overview.lastHour}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Processados
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                    {metrics.byStatus.processed?.toLocaleString() || 0}
                                </Typography>
                                <Typography variant="caption" color="success.main">
                                    ✓ Com sucesso
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Falhas
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="error.main">
                                    {(metrics.byStatus.failed || 0) + (metrics.byStatus.dead_letter || 0)}
                                </Typography>
                                <Typography variant="caption" color="error.main">
                                    Última hora: {metrics.overview.errorsLastHour}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Tempo Médio
                                </Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {formatDuration(metrics.processingTime.avgTime)}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Max: {formatDuration(metrics.processingTime.maxTime)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Status por Domínio */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Eventos por Domínio
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    {Object.entries(metrics.byDomain).map(([domain, count]) => (
                                        <Chip
                                            key={domain}
                                            label={`${domain}: ${count}`}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tab: Domínios */}
            {activeTab === 1 && (
                <Grid container spacing={3}>
                    {domains.map((domain) => (
                        <Grid item xs={12} md={6} key={domain.domain}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            {domain.domain}
                                        </Typography>
                                        <Chip
                                            label={`${domain.successRate}% sucesso`}
                                            color={Number(domain.successRate) > 90 ? 'success' : Number(domain.successRate) > 70 ? 'warning' : 'error'}
                                        />
                                    </Box>
                                    
                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid item xs={3}>
                                            <Typography variant="caption" color="textSecondary">Total</Typography>
                                            <Typography fontWeight="bold">{domain.counts.total}</Typography>
                                        </Grid>
                                        <Grid item xs={3}>
                                            <Typography variant="caption" color="success.main">OK</Typography>
                                            <Typography fontWeight="bold" color="success.main">{domain.counts.processed}</Typography>
                                        </Grid>
                                        <Grid item xs={3}>
                                            <Typography variant="caption" color="error.main">Falhas</Typography>
                                            <Typography fontWeight="bold" color="error.main">{domain.counts.failed}</Typography>
                                        </Grid>
                                        <Grid item xs={3}>
                                            <Typography variant="caption" color="warning.main">Processando</Typography>
                                            <Typography fontWeight="bold" color="warning.main">{domain.counts.processing}</Typography>
                                        </Grid>
                                    </Grid>
                                    
                                    <Typography variant="caption" color="textSecondary">
                                        Tempo médio: {formatDuration(domain.avgProcessingTime)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Tab: Alertas */}
            {activeTab === 2 && alerts && (
                <Box>
                    {alerts.data.length === 0 ? (
                        <Alert severity="success" icon={<CheckCircle size={24} />}>
                            <Typography variant="h6">Sistema saudável</Typography>
                            <Typography>Nenhum alerta ativo no momento</Typography>
                        </Alert>
                    ) : (
                        alerts.data.map((alert, index) => (
                            <Alert
                                key={index}
                                severity={alert.level}
                                sx={{ mb: 2 }}
                                icon={alert.level === 'error' ? <XCircle size={24} /> : <AlertCircle size={24} />}
                            >
                                <Typography fontWeight="bold">{alert.message}</Typography>
                                {alert.events && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption">
                                            Últimos eventos afetados:
                                        </Typography>
                                        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                                            {alert.events.slice(0, 3).map((e: any, i: number) => (
                                                <li key={i}>
                                                    <code>{e.eventType || e.eventId}</code>
                                                    {e.errorMessage && (
                                                        <Typography variant="caption" color="error" display="block">
                                                            {e.errorMessage.substring(0, 100)}...
                                                        </Typography>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </Box>
                                )}
                            </Alert>
                        ))
                    )}
                </Box>
            )}

            {/* Tab: Eventos em Tempo Real */}
            {activeTab === 3 && (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Evento</TableCell>
                                <TableCell>Domínio</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Correlation ID</TableCell>
                                <TableCell>Retries</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentEvents.map((event) => (
                                <TableRow key={event.id} hover>
                                    <TableCell>
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell>
                                        <code>{event.eventType}</code>
                                    </TableCell>
                                    <TableCell>{event.aggregateType}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={event.status}
                                            color={getStatusColor(event.status)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="caption"
                                            sx={{ cursor: 'pointer', color: 'primary.main' }}
                                            onClick={() => {
                                                setCorrelationId(event.correlationId);
                                                handleSearchFlow();
                                            }}
                                        >
                                            {event.correlationId.substring(0, 12)}...
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{event.retryCount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialog: Fluxo de Eventos */}
            <Dialog
                open={flowDialogOpen}
                onClose={() => setFlowDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Zap className="text-blue-500" />
                        <Box>
                            <Typography variant="h6">Fluxo de Eventos</Typography>
                            <Typography variant="caption" color="textSecondary">
                                {eventFlow?.correlationId}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {eventFlow && (
                        <Box>
                            {/* Resumo */}
                            <Card sx={{ mb: 3, bgcolor: eventFlow.summary.hasErrors ? '#fff5f5' : '#f0fff4' }}>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <Typography color="textSecondary">Eventos</Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {eventFlow.summary.totalEvents}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography color="textSecondary">Duração Total</Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {formatDuration(eventFlow.summary.duration)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography color="textSecondary">Status</Typography>
                                            <Chip
                                                label={eventFlow.summary.hasErrors ? 'Com Falhas' : 'Sucesso'}
                                                color={eventFlow.summary.hasErrors ? 'error' : 'success'}
                                            />
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="caption" color="textSecondary">
                                            Domínios: {eventFlow.summary.domains.join(', ')}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Timeline */}
                            <Stepper orientation="vertical" nonLinear>
                                {eventFlow.timeline.map((event, index) => (
                                    <Step key={event.id} active expanded>
                                        <StepLabel
                                            StepIconComponent={() => (
                                                event.status === 'processed' ? <Check className="text-green-500" size={20} /> :
                                                event.status === 'failed' ? <XCircle className="text-red-500" size={20} /> :
                                                <Clock className="text-yellow-500" size={20} />
                                            )}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <code>{event.eventType}</code>
                                                <Chip
                                                    size="small"
                                                    label={event.status}
                                                    color={getStatusColor(event.status)}
                                                />
                                            </Box>
                                        </StepLabel>
                                        <StepContent>
                                            <Typography variant="caption" color="textSecondary" display="block">
                                                Domínio: {event.aggregateType} | ID: {event.eventId.substring(0, 16)}...
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" display="block">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </Typography>
                                            {event.processingTime && (
                                                <Typography variant="caption" color="success.main" display="block">
                                                    Processado em: {formatDuration(event.processingTime)}
                                                </Typography>
                                            )}
                                            {event.errorInfo && (
                                                <Alert severity="error" sx={{ mt: 1 }}>
                                                    {event.errorInfo.errorMessage}
                                                </Alert>
                                            )}
                                        </StepContent>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ObservabilityDashboard;
