/**
 * SystemUnifiedDashboard
 *
 * Une Monitor + Observability em uma única aba "Sistema".
 * - Infraestrutura (Redis, Mongo, memória, filas)
 * - Eventos & Alertas (dead letters, recentes, reprocessar)
 * - Diagnóstico de fluxo (correlationId)
 */

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import API from '../../services/api';
import { toast } from 'react-toastify';
import { useSystemHealthCtx } from '../../contexts/SystemHealthContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import type { DomainHealth } from '../../utils/systemHealthResolver';
import {
    Box, Card, CardContent, Grid, Typography, Chip, Alert, Skeleton,
    Button, Divider, Tooltip, Tabs, Tab, TextField, LinearProgress,
    Dialog, DialogTitle, DialogContent, Stepper, Step, StepLabel, StepContent,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress,
} from '@mui/material';
import {
    Activity, Server, Clock, HardDrive, Layers, Database, Wifi,
    ExternalLink, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
    Search, Zap, RotateCcw, Check,
} from 'lucide-react';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface QueueStat {
    name: string;
    waiting?: number; active?: number; completed?: number;
    failed?: number; delayed?: number; total?: number; error?: string;
}

interface RawMonitorData {
    timestamp: string;
    uptimeSeconds: number;
    memory: { rss: string; heapUsed: string; heapTotal: string };
    redis: { status: string; connected?: boolean; message?: string };
    mongodb: { status: string; ping?: boolean; message?: string };
    queues: QueueStat[];
    totalQueues: number;
}

interface EventFlow {
    correlationId: string;
    summary: {
        totalEvents: number; duration: number; hasErrors: boolean;
        domains: string[]; startTime: string; endTime: string;
    };
    timeline: Array<{
        id: string; eventId: string; eventType: string; status: string;
        aggregateType: string; timestamp: string;
        processingTime: number | null; errorInfo?: any;
    }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number) {
    if (!ms) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
}

function formatUptime(seconds: number) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h ${m}m`;
}

function parseMB(val: string) {
    return parseInt(val.replace('MB', ''), 10) || 0;
}

function scoreColor(score: number): string {
    if (score >= 85) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

function statusLabel(status: string) {
    if (status === 'healthy') return { text: 'Saudável', color: 'success' as const };
    if (status === 'degraded') return { text: 'Degradado', color: 'warning' as const };
    if (status === 'critical') return { text: 'Crítico', color: 'error' as const };
    return { text: 'Desconhecido', color: 'default' as const };
}

function domainStatusChip(d: DomainHealth) {
    const map = {
        ok:      { label: 'OK',        color: 'success' as const },
        slow:    { label: 'Lento',     color: 'warning' as const },
        failing: { label: 'Falhando',  color: 'error'   as const },
        idle:    { label: 'Sem dados', color: 'default' as const },
        unknown: { label: '?',         color: 'default' as const },
    };
    return map[d.status] ?? map.unknown;
}

function eventStatusColor(s: string): 'success' | 'error' | 'warning' | 'default' {
    if (s === 'processed') return 'success';
    if (s === 'failed' || s === 'dead_letter') return 'error';
    if (s === 'processing') return 'warning';
    return 'default';
}

const DOMAIN_LABELS: Record<string, string> = {
    payment: '💳 Financeiro', appointment: '📅 Agendamentos',
    session: '🩺 Sessões', patient: '👤 Pacientes',
    lead: '📊 Leads', followup: '📩 Follow-up',
    notification: '🔔 Notificações', package: '📦 Pacotes',
    expense: '🧾 Despesas', balance: '💰 Saldo',
    system: '⚙️ Sistema',
};

const REFRESH_INTERVAL = 30_000;

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SystemUnifiedDashboard() {
    const {
        health, rawMetrics, rawDomains, rawAlerts, recent,
        healthScore, systemStatus, loadingHealth, refresh, lastFetchAt
    } = useSystemHealthCtx();

    const [raw, setRaw] = useState<RawMonitorData | null>(null);
    const [rawLoading, setRawLoading] = useState(true);
    const [rawError, setRawError] = useState<string | null>(null);

    const [activeSection, setActiveSection] = useState(0);
    const [correlationId, setCorrelationId] = useState('');
    const [flowLoading, setFlowLoading] = useState(false);
    const [eventFlow, setEventFlow] = useState<EventFlow | null>(null);
    const [flowDialogOpen, setFlowDialogOpen] = useState(false);
    const [reprocessing, setReprocessing] = useState(false);
    const [reprocessResult, setReprocessResult] = useState<{ requeued: number } | null>(null);

    const fetchRaw = useCallback(async () => {
        try {
            const res = await API.get('/admin/system-monitor', { timeout: 8000 });
            setRaw(res.data);
            setRawError(null);
        } catch (err: any) {
            setRawError(err?.message || 'Erro ao buscar métricas do sistema');
        } finally {
            setRawLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRaw();
        const id = setInterval(fetchRaw, REFRESH_INTERVAL);
        return () => clearInterval(id);
    }, [fetchRaw]);

    const handleRefresh = () => { fetchRaw(); refresh(); };

    const handleReprocessDeadLetters = useCallback(async () => {
        setReprocessing(true);
        setReprocessResult(null);
        try {
            const res = await axios.post('/api/observability/dead-letters/retry-batch');
            const requeued = res.data?.data?.success ?? res.data?.success ?? 0;
            setReprocessResult({ requeued });
            toast.success(`${requeued} evento(s) reenfileirado(s) com sucesso`);
            setTimeout(refresh, 2000);
        } catch (err: any) {
            toast.error(extractErrorMessage(err, 'Erro ao reprocessar dead letters'));
        } finally {
            setReprocessing(false);
        }
    }, [refresh]);

    const handleSearchFlow = useCallback(async () => {
        if (!correlationId.trim()) { toast.warn('Digite um correlationId'); return; }
        setFlowLoading(true);
        try {
            const res = await axios.get(`/api/observability/flow/${correlationId}`);
            setEventFlow(res.data.data);
            setFlowDialogOpen(true);
        } catch (err: any) {
            toast.error(extractErrorMessage(err, 'Fluxo não encontrado'));
        } finally {
            setFlowLoading(false);
        }
    }, [correlationId]);

    const loading = rawLoading || loadingHealth;

    // ── Loading global ────────────────────────────────────────────────────────
    if (loading && !raw && !rawMetrics) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={140} sx={{ mb: 2, borderRadius: 2 }} />
                <Grid container spacing={2}>
                    {[1,2,3,4,5,6].map(i => (
                        <Grid item xs={12} md={4} key={i}>
                            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    const heapUsed = raw ? parseMB(raw.memory.heapUsed) : 0;
    const heapTotal = raw ? parseMB(raw.memory.heapTotal) : 0;
    const heapPct = heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 100) : 0;
    const heapColor: 'error' | 'warning' | 'success' =
        heapPct >= 85 ? 'error' : heapPct >= 70 ? 'warning' : 'success';

    const totalWaiting = raw?.queues?.reduce((s, q) => s + (q.waiting || 0), 0) ?? 0;
    const totalFailed  = raw?.queues?.reduce((s, q) => s + (q.failed  || 0), 0) ?? 0;
    const totalActive  = raw?.queues?.reduce((s, q) => s + (q.active  || 0), 0) ?? 0;
    const stuckQueues  = raw?.queues?.filter(q => (q.waiting || 0) > 200 && (q.active || 0) === 0) ?? [];

    const sl = health ? statusLabel(health.status) : null;
    const displayScore = healthScore ?? health?.score ?? null;
    const displayStatus = systemStatus ?? health?.status ?? 'unknown';

    const totalFailures = rawMetrics
        ? (rawMetrics.byStatus.failed ?? 0) + (rawMetrics.byStatus.dead_letter ?? 0)
        : 0;

    return (
        <Box sx={{ p: 3 }}>
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Activity className="w-7 h-7 text-blue-500" />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">Sistema</Typography>
                        {lastFetchAt && (
                            <Typography variant="caption" color="text.secondary">
                                Atualizado às {lastFetchAt.toLocaleTimeString()} · cache híbrido (5s crítico / 30s saudável)
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={handleRefresh} startIcon={<RefreshCw size={15} />}>
                        Atualizar
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<ExternalLink size={15} />}
                        href={`${import.meta.env.VITE_BACKEND_URL || ''}/admin/queues`}
                        target="_blank" rel="noopener noreferrer">
                        Bull Board
                    </Button>
                </Box>
            </Box>

            {/* ── STATUS GLOBAL + SCORE ─────────────────────────────────────── */}
            {displayScore !== null && (
                <Card sx={{ mb: 3, border: `2px solid ${scoreColor(displayScore)}`, borderRadius: 2 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Chip label={sl?.text} color={sl?.color} size="small" sx={{ fontWeight: 'bold' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Coletado às {new Date(health?.collectedAt || Date.now()).toLocaleTimeString()}
                                    </Typography>
                                </Box>
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {health?.headline || (displayStatus === 'healthy' ? 'Sistema operando normalmente' : 'Verificação em andamento')}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                                <Typography variant="h3" fontWeight="bold" sx={{ color: scoreColor(displayScore) }}>
                                    {displayScore}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">/ 100</Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* ── ALERTAS ────────────────────────────────────────────────────── */}
            {health?.alerts.map((a, i) => (
                <Alert key={i} severity={a.level === 'error' ? 'error' : a.level === 'warning' ? 'warning' : 'info'}
                    sx={{ mb: 1.5, borderRadius: 2 }}
                    icon={a.level === 'error' ? <XCircle size={18} /> : <AlertTriangle size={18} />}>
                    <Typography variant="subtitle2" fontWeight="bold">{a.title}</Typography>
                    <Typography variant="body2">{a.detail}</Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontWeight: 500 }}>Ação: {a.action}</Typography>
                </Alert>
            ))}

            {raw?.redis.status !== 'ok' && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                    <Typography fontWeight="bold">Redis com problema</Typography>
                    <Typography variant="body2">{raw?.redis.message || 'Conexão Redis/Valkey falhou'}</Typography>
                </Alert>
            )}
            {raw?.mongodb.status !== 'ok' && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                    <Typography fontWeight="bold">MongoDB com problema</Typography>
                    <Typography variant="body2">{raw?.mongodb.message || 'Ping ao MongoDB falhou'}</Typography>
                </Alert>
            )}
            {stuckQueues.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
                    <Typography fontWeight="bold">Fila possivelmente travada</Typography>
                    <Typography variant="body2">{stuckQueues.map(q => q.name).join(', ')}</Typography>
                </Alert>
            )}

            {/* ── ABAS DE SEÇÃO ──────────────────────────────────────────────── */}
            <Tabs value={activeSection} onChange={(_, v) => setActiveSection(v)} sx={{ mb: 3, borderBottom: '1px solid #e5e7eb' }}>
                <Tab label="Visão Geral" icon={<Activity size={15} />} iconPosition="start" />
                <Tab label="Infraestrutura" icon={<Server size={15} />} iconPosition="start" />
                <Tab label="Eventos & Alertas" icon={<Zap size={15} />} iconPosition="start" />
                <Tab label="Diagnóstico de Fluxo" icon={<Search size={15} />} iconPosition="start" />
            </Tabs>

            {/* ── SEÇÃO 0: VISÃO GERAL ──────────────────────────────────────── */}
            {activeSection === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ height: '100%', borderLeft: '4px solid #3b82f6' }}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Total de Eventos</Typography>
                                <Typography variant="h3" fontWeight="bold" sx={{ my: 0.5 }}>
                                    {rawMetrics?.overview.totalEvents.toLocaleString() || '—'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Última hora: <strong>{rawMetrics?.overview.lastHour ?? 0}</strong></Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ height: '100%', borderLeft: '4px solid #22c55e' }}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Processados</Typography>
                                <Typography variant="h3" fontWeight="bold" color="success.main" sx={{ my: 0.5 }}>
                                    {(rawMetrics?.byStatus.processed ?? 0).toLocaleString()}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ height: '100%', borderLeft: `4px solid ${totalFailures > 0 ? '#ef4444' : '#22c55e'}` }}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Falhas</Typography>
                                <Typography variant="h3" fontWeight="bold" color={totalFailures > 0 ? 'error.main' : 'success.main'} sx={{ my: 0.5 }}>
                                    {totalFailures}
                                </Typography>
                                <Typography variant="caption" color={rawMetrics?.overview.errorsLastHour ? 'error.main' : 'text.secondary'}>
                                    Última hora: {rawMetrics?.overview.errorsLastHour ?? 0} erros
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ height: '100%', borderLeft: `4px solid ${(rawMetrics?.byStatus.pending ?? 0) > 100 ? '#f59e0b' : '#6b7280'}` }}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Pendentes</Typography>
                                <Typography variant="h3" fontWeight="bold" color={(rawMetrics?.byStatus.pending ?? 0) > 100 ? 'warning.main' : 'text.primary'} sx={{ my: 0.5 }}>
                                    {(rawMetrics?.byStatus.pending ?? 0).toLocaleString()}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Domínios */}
                    {health && health.domains.filter(d => d.totalEvents > 0).length > 0 && (
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Saúde por Domínio</Typography>
                                    <Grid container spacing={2}>
                                        {health.domains
                                            .filter(d => d.totalEvents > 0)
                                            .sort((a, b) => {
                                                const order = { failing: 0, slow: 1, ok: 2, idle: 3, unknown: 4 };
                                                return order[a.status] - order[b.status];
                                            })
                                            .map(d => {
                                                const chip = domainStatusChip(d);
                                                const hasIssue = d.status === 'failing' || d.status === 'slow';
                                                return (
                                                    <Grid item xs={12} sm={6} md={4} key={d.key}>
                                                        <Box sx={{ p: 2, border: `1px solid ${hasIssue ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 2, bgcolor: hasIssue ? '#fff7f7' : 'background.paper', height: '100%' }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                                <Typography variant="subtitle2" fontWeight="bold">{d.icon} {d.label}</Typography>
                                                                <Chip label={chip.label} color={chip.color} size="small" />
                                                            </Box>
                                                            <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                                                                <Box><Typography variant="caption" color="text.secondary">Taxa de sucesso</Typography>
                                                                    <Typography variant="body2" fontWeight="bold" color={d.successRate < 30 ? 'error.main' : d.successRate < 70 ? 'warning.main' : 'success.main'}>{d.successRate}%</Typography></Box>
                                                                <Box><Typography variant="caption" color="text.secondary">Eventos</Typography>
                                                                    <Typography variant="body2" fontWeight="bold">{d.totalEvents}</Typography></Box>
                                                            </Box>
                                                            {d.impact && <Typography variant="caption" color={hasIssue ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mt: 0.5 }}>⚠️ {d.impact}</Typography>}
                                                            {d.action && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: '#2563eb' }}>Ação: {d.action}</Typography>}
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* ── SEÇÃO 1: INFRAESTRUTURA ───────────────────────────────────── */}
            {activeSection === 1 && raw && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <HardDrive size={18} className="text-gray-500" />
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Memória Heap</Typography>
                                </Box>
                                <Typography variant="h4" fontWeight="bold">{raw.memory.heapUsed} / {raw.memory.heapTotal}</Typography>
                                <Box sx={{ mt: 1.5 }}>
                                    <LinearProgress variant="determinate" value={Math.min(heapPct, 100)} color={heapColor} sx={{ height: 8, borderRadius: 1 }} />
                                    <Typography variant="caption" color={`${heapColor}.main`} sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>{heapPct}% utilizado</Typography>
                                </Box>
                                <Divider sx={{ my: 1.5 }} />
                                <Typography variant="caption" color="text.secondary">RSS total: {raw.memory.rss}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Clock size={18} className="text-gray-500" />
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Uptime da API</Typography>
                                </Box>
                                <Typography variant="h4" fontWeight="bold">{formatUptime(raw.uptimeSeconds)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Layers size={18} className="text-gray-500" />
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Filas BullMQ</Typography>
                                    <Chip label={`${raw.totalQueues ?? '?'} filas`} size="small" variant="outlined" />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Aguardando</Typography>
                                        <Chip size="small" label={totalWaiting} color={totalWaiting > 20 ? 'warning' : 'default'} variant="outlined" />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Processando</Typography>
                                        <Chip size="small" label={totalActive} color={totalActive > 0 ? 'primary' : 'default'} variant="outlined" />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Falharam</Typography>
                                        <Chip size="small" label={totalFailed} color={totalFailed > 0 ? 'error' : 'success'} variant="outlined" />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card sx={{ bgcolor: raw.redis.status === 'ok' ? '#f0fdf4' : '#fef2f2', height: '100%' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Wifi size={18} className={raw.redis.status === 'ok' ? 'text-green-600' : 'text-red-600'} />
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Redis</Typography>
                                </Box>
                                <Typography variant="h6" fontWeight="bold" color={raw.redis.status === 'ok' ? 'success.main' : 'error.main'}>
                                    {raw.redis.status === 'ok' ? 'Conectado' : 'Erro'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card sx={{ bgcolor: raw.mongodb.status === 'ok' ? '#f0fdf4' : '#fef2f2', height: '100%' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Database size={18} className={raw.mongodb.status === 'ok' ? 'text-green-600' : 'text-red-600'} />
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">MongoDB</Typography>
                                </Box>
                                <Typography variant="h6" fontWeight="bold" color={raw.mongodb.status === 'ok' ? 'success.main' : 'error.main'}>
                                    {raw.mongodb.status === 'ok' ? 'OK' : 'Erro'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Filas BullMQ — Detalhe</Typography>
                                <Grid container spacing={1.5}>
                                    {raw.queues.map((q) => {
                                        const hasFail = (q.failed || 0) > 0;
                                        const isStuck = (q.waiting || 0) > 200 && (q.active || 0) === 0;
                                        return (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={q.name}>
                                                <Box sx={{ p: 1.5, border: `1px solid ${hasFail || isStuck ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 2, bgcolor: hasFail || isStuck ? '#fff7f7' : 'background.paper' }}>
                                                    <Tooltip title={q.name}>
                                                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ display: 'block', mb: 1 }}>{q.name}</Typography>
                                                    </Tooltip>
                                                    {q.error ? (
                                                        <Typography variant="caption" color="error">Erro: {q.error}</Typography>
                                                    ) : (
                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                            <Chip size="small" label={`W ${q.waiting ?? 0}`} color={(q.waiting || 0) > 20 ? 'warning' : 'default'} variant="outlined" />
                                                            <Chip size="small" label={`A ${q.active ?? 0}`} color={(q.active || 0) > 0 ? 'primary' : 'default'} variant="outlined" />
                                                            <Chip size="small" label={`C ${q.completed ?? 0}`} color="success" variant="outlined" />
                                                            {(q.failed || 0) > 0 && <Chip size="small" label={`F ${q.failed}`} color="error" />}
                                                            {(q.delayed || 0) > 0 && <Chip size="small" label={`D ${q.delayed}`} color="warning" variant="outlined" />}
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* ── SEÇÃO 2: EVENTOS & ALERTAS ────────────────────────────────── */}
            {activeSection === 2 && (
                <Grid container spacing={2}>
                    {/* Reprocessar dead letters */}
                    {(rawMetrics?.overview.deadLetters ?? 0) > 0 && (
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0, p: 2, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #fed7aa' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                                        {rawMetrics!.overview.deadLetters} evento(s) em dead letter
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Esses eventos não serão processados automaticamente.</Typography>
                                    {reprocessResult && (
                                        <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600 }}>✓ {reprocessResult.requeued} evento(s) reenfileirado(s)</Typography>
                                    )}
                                </Box>
                                <Button variant="contained" color="warning" size="small"
                                    startIcon={reprocessing ? <CircularProgress size={14} color="inherit" /> : <RotateCcw size={15} />}
                                    onClick={handleReprocessDeadLetters} disabled={reprocessing} sx={{ whiteSpace: 'nowrap' }}>
                                    {reprocessing ? 'Reprocessando...' : 'Reprocessar agora'}
                                </Button>
                            </Box>
                        </Grid>
                    )}

                    {/* Alertas brutos do backend */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Alertas Ativos</Typography>
                                {rawAlerts.length === 0 ? (
                                    <Alert severity="success" icon={<CheckCircle2 size={22} />} sx={{ borderRadius: 2 }}>
                                        Nenhum alerta ativo no momento.
                                    </Alert>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {rawAlerts.map((a, i) => (
                                            <Alert key={i}
                                                severity={a.level === 'error' ? 'error' : a.level === 'warning' ? 'warning' : 'info'}
                                                sx={{ borderRadius: 2 }}
                                                icon={a.level === 'error' ? <XCircle size={18} /> : <AlertTriangle size={18} />}>
                                                <Typography variant="subtitle2" fontWeight="bold">{a.message}</Typography>
                                                {a.count !== undefined && <Typography variant="caption" color="text.secondary">Quantidade: {a.count}</Typography>}
                                            </Alert>
                                        ))}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Eventos recentes */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Eventos Recentes (últimos 5 min)</Typography>
                                {recent.length === 0 ? (
                                    <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum evento nos últimos 5 minutos.</Alert>
                                ) : (
                                    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                    {['Horário', 'Evento', 'Status', 'Correlation ID'].map(h => (
                                                        <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>{h}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {recent.map((event, i) => (
                                                    <TableRow key={i} hover>
                                                        <TableCell sx={{ color: '#6b7280', fontSize: '0.8rem' }}>{new Date(event.timestamp).toLocaleTimeString()}</TableCell>
                                                        <TableCell>
                                                            <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{event.eventType}</code>
                                                        </TableCell>
                                                        <TableCell><Chip size="small" label={event.status} color={eventStatusColor(event.status)} /></TableCell>
                                                        <TableCell>
                                                            {event.correlationId && (
                                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                                    {event.correlationId.substring(0, 14)}…
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* ── SEÇÃO 3: DIAGNÓSTICO DE FLUXO ─────────────────────────────── */}
            {activeSection === 3 && (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Buscar Fluxo por Correlation ID</Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <TextField
                                        size="small"
                                        placeholder="Digite o correlationId..."
                                        value={correlationId}
                                        onChange={e => setCorrelationId(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSearchFlow()}
                                        sx={{ width: 320 }}
                                    />
                                    <Button variant="contained" size="small" onClick={handleSearchFlow} disabled={flowLoading}>
                                        {flowLoading ? <CircularProgress size={16} /> : 'Buscar Fluxo'}
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* ── DIALOG: FLUXO DE EVENTOS ──────────────────────────────────── */}
            <Dialog open={flowDialogOpen} onClose={() => setFlowDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Zap className="text-blue-500" size={20} />
                        <Box>
                            <Typography variant="h6">Fluxo de Eventos</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{eventFlow?.correlationId}</Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {eventFlow && (
                        <Box>
                            <Card sx={{ mb: 3, bgcolor: eventFlow.summary.hasErrors ? '#fef2f2' : '#f0fdf4', borderRadius: 2 }}>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">Eventos</Typography>
                                            <Typography variant="h5" fontWeight="bold">{eventFlow.summary.totalEvents}</Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">Duração</Typography>
                                            <Typography variant="h5" fontWeight="bold">{formatDuration(eventFlow.summary.duration)}</Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">Status</Typography>
                                            <Chip label={eventFlow.summary.hasErrors ? 'Com Falhas' : 'Sucesso'} color={eventFlow.summary.hasErrors ? 'error' : 'success'} size="small" />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                            <Stepper orientation="vertical" nonLinear>
                                {eventFlow.timeline.map(event => (
                                    <Step key={event.id} active expanded>
                                        <StepLabel StepIconComponent={() => (
                                            event.status === 'processed' ? <Check className="text-green-500" size={18} /> :
                                            event.status === 'failed'    ? <XCircle className="text-red-500" size={18} /> :
                                            <Clock className="text-yellow-500" size={18} />
                                        )}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <code style={{ fontSize: '0.8rem' }}>{event.eventType}</code>
                                                <Chip size="small" label={event.status} color={eventStatusColor(event.status)} />
                                            </Box>
                                        </StepLabel>
                                        <StepContent>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {event.aggregateType} · {new Date(event.timestamp).toLocaleString()}
                                            </Typography>
                                            {event.processingTime && (
                                                <Typography variant="caption" color="success.main" display="block">
                                                    Processado em {formatDuration(event.processingTime)}
                                                </Typography>
                                            )}
                                            {event.errorInfo && (
                                                <Alert severity="error" sx={{ mt: 1 }}>{event.errorInfo.errorMessage}</Alert>
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
}
