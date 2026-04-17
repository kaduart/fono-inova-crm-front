/**
 * SystemUnifiedDashboard
 *
 * Layout profissional unificado: Score → Alertas → Infra/Filas/Domínios → Eventos → DLQ → Diagnóstico
 * Hierarquia visual forte, leitura de cima para baixo, ação direta.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import API from '../../services/api';
import { toast } from 'react-toastify';
import { useSystemHealthCtx } from '../../contexts/SystemHealthContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import type { DomainHealth } from '../../utils/systemHealthResolver';
import {
    Box, Card, CardContent, Grid, Typography, Chip, Alert, Skeleton,
    Button, Divider, Tooltip, TextField, LinearProgress,
    Dialog, DialogTitle, DialogContent, Stepper, Step, StepLabel, StepContent,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress,
} from '@mui/material';
import {
    Activity, Server, Clock, Layers, Database, Wifi,
    ExternalLink, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
    Search, Zap, RotateCcw, Check, FileWarning,
} from 'lucide-react';
import { Tabs, Tab } from '@mui/material';

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
        processingTime: number | null; errorInfo?: { errorMessage?: string; stack?: string; [k: string]: unknown };
    }>;
}

interface DeadLetterItem {
    eventId: string;
    eventType: string;
    aggregateType: string;
    attempts: number;
    createdAt: string;
    error?: { message?: string; code?: string; stackPreview?: string | null } | null;
    metadata?: { source?: string | null; correlationId?: string | null };
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
    if (status === 'degraded' || status === 'warning') return { text: 'Atenção', color: 'warning' as const };
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

interface ScoreItem { label: string; delta: number; emoji: string; }

function buildScoreBreakdown(
    health: ReturnType<typeof useSystemHealthCtx>['health'],
    rawMetrics: ReturnType<typeof useSystemHealthCtx>['rawMetrics'],
    domains: ReturnType<typeof useSystemHealthCtx>['rawDomains']
): ScoreItem[] {
    if (!health || !rawMetrics) return [];
    const items: ScoreItem[] = [];
    const memStatus = health.infra.memory.status;
    if (memStatus === 'critical') items.push({ label: 'Memória crítica', delta: -25, emoji: '🧠' });
    else if (memStatus === 'warning') items.push({ label: 'Memória elevada', delta: -10, emoji: '🧠' });

    const dl = rawMetrics.overview.deadLetters || 0;
    if (dl > 0) items.push({ label: `${dl} dead letter(s)`, delta: -Math.min(20, dl * 5), emoji: '💀' });

    const failing = domains.filter(d => {
        const rate = typeof d.successRate === 'string' ? parseFloat(d.successRate) : d.successRate;
        return d.counts.total > 0 && rate < 20;
    });
    if (failing.length) items.push({ label: `${failing.length} domínio(s) falhando`, delta: -failing.length * 10, emoji: '🔥' });

    const slow = domains.filter(d => {
        const rate = typeof d.successRate === 'string' ? parseFloat(d.successRate) : d.successRate;
        return d.counts.total > 0 && rate >= 20 && rate < 60;
    });
    if (slow.length) items.push({ label: `${slow.length} domínio(s) lento(s)`, delta: -slow.length * 5, emoji: '🐢' });

    const backlog = health.infra.queueBacklog;
    if (backlog > 50) items.push({ label: `Backlog alto (${backlog})`, delta: -10, emoji: '📥' });
    else if (backlog > 20) items.push({ label: `Backlog moderado (${backlog})`, delta: -5, emoji: '📥' });

    const err1h = rawMetrics.overview.errorsLastHour || 0;
    if (err1h > 10) items.push({ label: `${err1h} erros na última hora`, delta: -10, emoji: '⚠️' });
    else if (err1h > 0) items.push({ label: `${err1h} erro(s) recente(s)`, delta: -5, emoji: '⚠️' });

    return items;
}

function queueDelta(current: number, previous?: number): { value: string; color: string } | null {
    if (previous === undefined || previous === current) return null;
    const diff = current - previous;
    if (diff > 0) return { value: `↑ +${diff}`, color: '#ef4444' };
    return { value: `↓ ${diff}`, color: '#22c55e' };
}

const REFRESH_INTERVAL = 30_000;

// ─── Sub-componentes visuais ─────────────────────────────────────────────────

function SystemScoreCard({ score, status, items, collectedAt, headline }: {
    score: number; status: string; items: ScoreItem[]; collectedAt?: string; headline?: string;
}) {
    const sl = statusLabel(status);
    const tooltip = (
        <Box sx={{ p: 1, maxWidth: 280 }}>
            <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>Decomposição do Score</Typography>
            {items.length === 0 ? (
                <Typography variant="caption">Nenhuma penalidade — sistema saudável ✓</Typography>
            ) : (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {items.map((it, i) => (
                        <Typography component="li" key={i} variant="caption" sx={{ display: 'list-item', mb: 0.25 }}>
                            {it.emoji} {it.label}: <strong style={{ color: it.delta < 0 ? '#fca5a5' : '#86efac' }}>{it.delta > 0 ? '+' : ''}{it.delta}</strong>
                        </Typography>
                    ))}
                </Box>
            )}
            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Typography variant="caption">Base 100 + penalidades = <strong>{score}</strong></Typography>
        </Box>
    );

    return (
        <Tooltip title={tooltip} arrow placement="bottom-start">
            <Card sx={{ height: '100%', borderRadius: 3, border: `2px solid ${scoreColor(score)}`, cursor: 'help', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                        <Chip label={sl.text} color={sl.color} size="small" sx={{ fontWeight: 'bold', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            {collectedAt ? `Coletado às ${new Date(collectedAt).toLocaleTimeString()}` : '—'}
                        </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h1" fontWeight="bold" sx={{ color: scoreColor(score), lineHeight: 1, fontSize: { xs: '3rem', md: '4.5rem' } }}>
                            {score}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>/ 100</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, color: '#475569' }}>
                        {headline || (status === 'healthy' ? 'Sistema operando normalmente' : 'Verificação em andamento')}
                    </Typography>
                </CardContent>
            </Card>
        </Tooltip>
    );
}

function AlertsCard({ alerts, counts }: { alerts: { level: 'error' | 'warning' | 'info'; title: string; detail: string; action?: string }[]; counts: { error: number; warning: number; info: number } }) {
    return (
        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', bgcolor: counts.error > 0 ? '#fff7f7' : counts.warning > 0 ? '#fffbeb' : '#f8fafc' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AlertTriangle size={18} /> Alertas
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {counts.error > 0 && <Chip size="small" color="error" label={counts.error} />}
                        {counts.warning > 0 && <Chip size="small" color="warning" label={counts.warning} />}
                    </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', maxHeight: 180 }}>
                    {alerts.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#22c55e' }}>
                            <CheckCircle2 size={18} />
                            <Typography variant="body2">Nenhum alerta ativo</Typography>
                        </Box>
                    ) : (
                        alerts.slice(0, 5).map((a, i) => (
                            <Box key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: a.level === 'error' ? '#fef2f2' : a.level === 'warning' ? '#fff7ed' : '#eff6ff', border: `1px solid ${a.level === 'error' ? '#fca5a5' : a.level === 'warning' ? '#fed7aa' : '#bfdbfe'}` }}>
                                <Typography variant="body2" fontWeight="bold" color={a.level === 'error' ? 'error.main' : a.level === 'warning' ? 'warning.main' : 'info.main'}>
                                    {a.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{a.detail}</Typography>
                                {a.action && <Typography variant="caption" sx={{ display: 'block', mt: 0.25, fontWeight: 500, color: '#2563eb' }}>Ação: {a.action}</Typography>}
                            </Box>
                        ))
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

function InfraCard({ raw, heapPct, heapColor }: { raw: RawMonitorData | null; heapPct: number; heapColor: 'error' | 'warning' | 'success' }) {
    if (!raw) return (
        <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent><Skeleton variant="rectangular" height={140} /></CardContent>
        </Card>
    );
    return (
        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Server size={16} /> Infra
                </Typography>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Memória Heap</Typography>
                    <Typography variant="h5" fontWeight="bold">{raw.memory.heapUsed} / {raw.memory.heapTotal}</Typography>
                    <LinearProgress variant="determinate" value={Math.min(heapPct, 100)} color={heapColor} sx={{ height: 6, borderRadius: 1, mt: 0.5 }} />
                    <Typography variant="caption" color={`${heapColor}.main`} sx={{ fontWeight: 600 }}>{heapPct}% utilizado</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" icon={<Database size={14} />} label={raw.mongodb.status === 'ok' ? 'MongoDB OK' : 'MongoDB Erro'} color={raw.mongodb.status === 'ok' ? 'success' : 'error'} variant="outlined" />
                    <Chip size="small" icon={<Wifi size={14} />} label={raw.redis.status === 'ok' ? 'Redis OK' : 'Redis Erro'} color={raw.redis.status === 'ok' ? 'success' : 'error'} variant="outlined" />
                    <Chip size="small" icon={<Clock size={14} />} label={`Uptime ${formatUptime(raw.uptimeSeconds)}`} variant="outlined" />
                </Box>
            </CardContent>
        </Card>
    );
}

function QueuesCard({ raw, totalWaiting, totalActive, totalFailed, queueHistory }: {
    raw: RawMonitorData | null; totalWaiting: number; totalActive: number; totalFailed: number; queueHistory: Record<string, QueueStat>;
}) {
    if (!raw) return (
        <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent><Skeleton variant="rectangular" height={140} /></CardContent>
        </Card>
    );
    const topQueue = raw.queues.slice().sort((a, b) => (b.waiting || 0) - (a.waiting || 0))[0];
    const topDelta = topQueue ? queueDelta(topQueue.waiting || 0, queueHistory[topQueue.name]?.waiting) : null;

    return (
        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Layers size={16} /> Filas BullMQ
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Aguardando</Typography>
                    <Typography variant="body1" fontWeight="bold">{totalWaiting} {topDelta && <Typography component="span" variant="caption" sx={{ color: topDelta.color, fontWeight: 600, ml: 0.5 }}>{topDelta.value}</Typography>}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Processando</Typography>
                    <Typography variant="body1" fontWeight="bold">{totalActive}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Falharam</Typography>
                    <Typography variant="body1" fontWeight="bold" color={totalFailed > 0 ? 'error.main' : 'inherit'}>{totalFailed}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {raw.queues.slice(0, 4).map(q => {
                        const hasIssue = (q.failed || 0) > 0 || ((q.waiting || 0) > 0 && (q.active || 0) === 0 && (q.completed || 0) === 0);
                        return <Chip key={q.name} size="small" label={q.name.split('-')[0]} color={hasIssue ? 'error' : 'default'} variant="outlined" />;
                    })}
                    {raw.queues.length > 4 && <Chip size="small" label={`+${raw.queues.length - 4}`} variant="outlined" />}
                </Box>
            </CardContent>
        </Card>
    );
}

function DomainDetailModal({ domain, open, onClose }: { domain: DomainHealth | null; open: boolean; onClose: () => void }) {
    if (!domain) return null;
    const chip = domainStatusChip(domain);
    const rateColor = domain.successRate < 60 ? 'error.main' : domain.successRate < 85 ? 'warning.main' : 'success.main';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h5">{domain.icon}</Typography>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">{domain.label}</Typography>
                        <Chip size="small" label={chip.label} color={chip.color} sx={{ mt: 0.5 }} />
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                        { label: 'Total de Eventos', sub: 'chegaram ao sistema',        value: domain.totalEvents, color: 'inherit' },
                        { label: 'Processados',       sub: 'concluídos com sucesso',     value: domain.totalEvents - domain.failedEvents - domain.pendingEvents, color: 'success.main' },
                        { label: 'Falhas',            sub: 'erros — ver dead letters',   value: domain.failedEvents, color: domain.failedEvents > 0 ? 'error.main' : 'text.secondary' },
                        { label: 'Pendentes',         sub: 'na fila, aguardando worker', value: domain.pendingEvents, color: domain.pendingEvents > 0 ? 'warning.main' : 'text.secondary' },
                    ].map(item => (
                        <Grid item xs={6} sm={6} key={item.label}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold">{item.label}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontSize: '0.7rem' }}>{item.sub}</Typography>
                                <Typography variant="h5" fontWeight="bold" color={item.color}>{item.value}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Taxa de Sucesso</Typography>
                    <Typography variant="h6" fontWeight="bold" color={rateColor}>{domain.successRate}%</Typography>
                </Box>

                {domain.avgProcessingMs > 0 && (
                    <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Tempo Médio de Processamento</Typography>
                        <Typography variant="body1" fontWeight="bold">
                            {domain.avgProcessingMs < 1000 ? `${domain.avgProcessingMs}ms` : `${(domain.avgProcessingMs / 1000).toFixed(1)}s`}
                        </Typography>
                    </Box>
                )}

                {domain.impact && (
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<AlertTriangle size={18} />}>
                        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>Impacto detectado</Typography>
                        <Typography variant="body2">{domain.impact}</Typography>
                    </Alert>
                )}

                {domain.action && (
                    <Alert severity="info" sx={{ borderRadius: 2 }} icon={<Zap size={18} />}>
                        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>Ação recomendada</Typography>
                        <Typography variant="body2">{domain.action}</Typography>
                    </Alert>
                )}

                {!domain.impact && !domain.action && domain.status === 'ok' && (
                    <Alert severity="success" sx={{ borderRadius: 2 }} icon={<CheckCircle2 size={18} />}>
                        <Typography variant="body2">Domínio operando normalmente — nenhuma ação necessária.</Typography>
                    </Alert>
                )}
            </DialogContent>
        </Dialog>
    );
}

function DomainsCard({ domains, onDomainClick }: { domains: DomainHealth[]; onDomainClick: (d: DomainHealth) => void }) {
    const withData = useMemo(() => domains.filter(d => d.totalEvents > 0).sort((a, b) => {
        const order = { failing: 0, slow: 1, ok: 2, idle: 3, unknown: 4 };
        return order[a.status] - order[b.status];
    }), [domains]);

    return (
        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Activity size={16} /> Domínios
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {withData.slice(0, 5).map(d => {
                        const chip = domainStatusChip(d);
                        return (
                            <Box
                                key={d.key}
                                onClick={() => onDomainClick(d)}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', borderRadius: 2, px: 1, py: 0.5,
                                    '&:hover': { bgcolor: '#f1f5f9' },
                                    transition: 'background 0.15s',
                                }}
                            >
                                <Typography variant="body2" fontWeight="medium">{d.icon} {d.label}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color={d.successRate < 60 ? 'error.main' : d.successRate < 85 ? 'warning.main' : 'success.main'} fontWeight="bold">{d.successRate}%</Typography>
                                    <Chip size="small" label={chip.label} color={chip.color} />
                                </Box>
                            </Box>
                        );
                    })}
                    {withData.length === 0 && <Typography variant="caption" color="text.secondary">Nenhum domínio com eventos recentes</Typography>}
                </Box>
            </CardContent>
        </Card>
    );
}

function RecentEventsBlock({ recent, loading, onEventClick }: {
    recent: { eventType: string; status: string; timestamp: string; correlationId?: string }[];
    loading: boolean;
    onEventClick: (correlationId: string) => void;
}) {
    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">📜 Eventos Recentes</Typography>
                    <Typography variant="caption" color="text.secondary">Clique numa linha com Correlation ID para diagnosticar</Typography>
                </Box>
                {loading ? <Skeleton variant="rectangular" height={120} /> : recent.length === 0 ? (
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
                                {recent.slice(0, 10).map((event, i) => {
                                    const hasCorrelation = !!event.correlationId;
                                    return (
                                        <TableRow
                                            key={i}
                                            hover
                                            onClick={() => hasCorrelation && onEventClick(event.correlationId!)}
                                            sx={{
                                                cursor: hasCorrelation ? 'pointer' : 'default',
                                                '&:hover': hasCorrelation ? { bgcolor: '#eff6ff' } : {},
                                            }}
                                        >
                                            <TableCell sx={{ color: '#6b7280', fontSize: '0.8rem' }}>{new Date(event.timestamp).toLocaleTimeString()}</TableCell>
                                            <TableCell><code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{event.eventType}</code></TableCell>
                                            <TableCell><Chip size="small" label={event.status} color={eventStatusColor(event.status)} /></TableCell>
                                            <TableCell>
                                                {event.correlationId && (
                                                    <Tooltip title="Clique para diagnosticar este fluxo">
                                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#2563eb', textDecoration: 'underline dotted', cursor: 'pointer' }}>
                                                            {event.correlationId.substring(0, 14)}…
                                                        </Typography>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
}

function DeadLettersBlock({ count, items, reprocessing, onRetry, result }: { count: number; items: DeadLetterItem[]; reprocessing: boolean; onRetry: () => void; result: { requeued: number } | null }) {
    const hasItems = count > 0;

    const workerLabel = (eventType: string) => {
        if (eventType.includes('APPOINTMENT')) return 'appointmentWorker.js / createAppointmentWorker.js';
        if (eventType.includes('PAYMENT')) return 'paymentWorker.js';
        if (eventType.includes('PATIENT')) return 'patientWorker.js';
        return 'worker desconhecido';
    };

    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', bgcolor: hasItems ? '#fff7f7' : '#fafafa', border: `1px solid ${hasItems ? '#fca5a5' : '#e5e7eb'}` }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" color={hasItems ? 'error.main' : 'text.secondary'} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <XCircle size={22} /> Dead Letters ({count})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {hasItems
                                ? 'Esses eventos não serão processados automaticamente. Requerem ação manual.'
                                : 'Nenhum evento em dead letter no momento. Quando houver, você poderá reprocessá-los aqui.'}
                        </Typography>
                        {result && (
                            <Typography variant="body2" color="success.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                                ✓ {result.requeued} evento(s) reenfileirado(s)
                            </Typography>
                        )}
                    </Box>
                    <Tooltip
                        title={hasItems ? 'Reenvia todos os eventos em dead letter para suas filas originais' : 'Não há dead letters para reprocessar'}
                        arrow
                    >
                        <span>
                            <Button variant="contained" color="error" size="small"
                                startIcon={reprocessing ? <CircularProgress size={14} color="inherit" /> : <RotateCcw size={16} />}
                                onClick={onRetry} disabled={reprocessing || !hasItems}>
                                {reprocessing ? 'Reprocessando...' : 'Reprocessar todos'}
                            </Button>
                        </span>
                    </Tooltip>
                </Box>

                {hasItems && (
                    <Grid container spacing={2}>
                        {items.map(dl => (
                            <Grid item xs={12} md={6} key={dl.eventId}>
                                <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #fecaca' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                        <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{dl.eventType}</code>
                                        <Chip size="small" label={`${dl.attempts || 0} tentativas`} color="error" variant="outlined" />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        Worker: <strong>{workerLabel(dl.eventType)}</strong>
                                    </Typography>
                                    {dl.error?.code && (
                                        <Chip
                                            size="small"
                                            label={dl.error.code}
                                            color={['SCHEMA_MISMATCH','MISSING_REQUIRED_FIELD','INVALID_FIELD_TYPE','UNKNOWN_EVENT_TYPE'].includes(dl.error.code) ? 'warning' : 'error'}
                                            variant="outlined"
                                            sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.7rem' }}
                                        />
                                    )}
                                    {dl.error?.message && (
                                        <Alert
                                            severity={['SCHEMA_MISMATCH','MISSING_REQUIRED_FIELD','INVALID_FIELD_TYPE','UNKNOWN_EVENT_TYPE'].includes(dl.error.code) ? 'warning' : 'error'}
                                            sx={{ borderRadius: 1, py: 0.5 }}
                                            icon={['SCHEMA_MISMATCH','MISSING_REQUIRED_FIELD','INVALID_FIELD_TYPE','UNKNOWN_EVENT_TYPE'].includes(dl.error.code) ? <FileWarning size={16} /> : <XCircle size={16} />}
                                        >
                                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                                {dl.error.message}
                                            </Typography>
                                            {dl.error.stackPreview && (
                                                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'text.secondary', mt: 0.25, display: 'block' }}>
                                                    {dl.error.stackPreview}
                                                </Typography>
                                            )}
                                        </Alert>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        {new Date(dl.createdAt).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </CardContent>
        </Card>
    );
}

function FlowDiagnosticBlock({ correlationId, setCorrelationId, loading, onSearch }: {
    correlationId: string; setCorrelationId: (v: string) => void; loading: boolean; onSearch: () => void;
}) {
    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Search size="16" /> Diagnóstico de Fluxo
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Digite o correlationId..."
                        value={correlationId}
                        onChange={e => setCorrelationId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onSearch()}
                        sx={{ width: { xs: '100%', sm: 320 } }}
                    />
                    <Button variant="contained" size="small" onClick={onSearch} disabled={loading}>
                        {loading ? <CircularProgress size={16} /> : 'Buscar Fluxo'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

function MetricsTab({ extras, rawDomains, resolvedDomains, loading, onDomainClick }: {
    extras: ReturnType<typeof useSystemHealthCtx>['extras'];
    rawDomains: ReturnType<typeof useSystemHealthCtx>['rawDomains'];
    resolvedDomains: DomainHealth[];
    loading: boolean;
    onDomainClick: (d: DomainHealth) => void;
}) {
    if (loading) return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />;
    return (
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Success Rate (1h)</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ my: 0.5, color: (extras.successRate?.last1h ?? 100) >= 85 ? '#22c55e' : (extras.successRate?.last1h ?? 100) >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {(extras.successRate?.last1h ?? 0).toFixed(1)}%
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Success Rate (24h)</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ my: 0.5, color: (extras.successRate?.last24h ?? 100) >= 85 ? '#22c55e' : (extras.successRate?.last24h ?? 100) >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {(extras.successRate?.last24h ?? 0).toFixed(1)}%
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Error Rate (1h)</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ my: 0.5, color: (extras.errorRate?.last1h ?? 0) > 5 ? '#ef4444' : (extras.errorRate?.last1h ?? 0) > 1 ? '#f59e0b' : '#22c55e' }}>
                            {(extras.errorRate?.last1h ?? 0).toFixed(1)}%
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Tempo Médio (P95)</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ my: 0.5 }}>
                            {formatDuration(extras.processingTime?.p95Ms ?? 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">avg: {formatDuration(extras.processingTime?.avgMs ?? 0)}</Typography>
                    </CardContent>
                </Card>
            </Grid>

            {extras.appointmentStats && (
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Appointment Health</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: extras.appointmentStats.retryableNotFound > 0 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${extras.appointmentStats.retryableNotFound > 0 ? '#fcd34d' : '#bbf7d0'}` }}>
                                    <Typography variant="caption" color="text.secondary">Race Conditions (retryable)</Typography>
                                    <Typography variant="h5" fontWeight="bold" color={extras.appointmentStats.retryableNotFound > 0 ? 'warning.main' : 'success.main'}>{extras.appointmentStats.retryableNotFound}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: extras.appointmentStats.permanentNotFound > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${extras.appointmentStats.permanentNotFound > 0 ? '#fca5a5' : '#bbf7d0'}` }}>
                                    <Typography variant="caption" color="text.secondary">Permanent NOT_FOUND</Typography>
                                    <Typography variant="h5" fontWeight="bold" color={extras.appointmentStats.permanentNotFound > 0 ? 'error.main' : 'success.main'}>{extras.appointmentStats.permanentNotFound}</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            )}

            {extras.topFailingEventTypes.length > 0 && (
                <Grid item xs={12} md={extras.appointmentStats ? 6 : 12}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Top Eventos com Falha</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {extras.topFailingEventTypes.map((ft, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                                        <code style={{ fontSize: '0.8rem', background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{ft.eventType}</code>
                                        <Chip size="small" color="error" label={`${ft.count} falha(s)`} />
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            )}

            <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Domínios Detalhados</Typography>
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        {['Domínio', 'Total', 'Processados', 'Falhas', 'Success Rate'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rawDomains.map((d, i) => {
                                        const rate = typeof d.successRate === 'string' ? parseFloat(d.successRate) : d.successRate;
                                        const resolved = (resolvedDomains ?? []).find(r => r.key === d.domain);
                                        return (
                                            <TableRow
                                                key={i}
                                                hover
                                                onClick={() => resolved && onDomainClick(resolved)}
                                                sx={{ cursor: resolved ? 'pointer' : 'default' }}
                                            >
                                                <TableCell>{d.domain}</TableCell>
                                                <TableCell>{d.counts.total}</TableCell>
                                                <TableCell>{d.counts.processed}</TableCell>
                                                <TableCell>{d.counts.failed}</TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={`${rate.toFixed(1)}%`} color={rate >= 85 ? 'success' : rate >= 60 ? 'warning' : 'error'} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}

function QueuesTab({ raw, queueHistory }: { raw: RawMonitorData | null; queueHistory: Record<string, QueueStat> }) {
    if (!raw) return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />;
    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>Filas BullMQ — Detalhe Completo</Typography>
                <Grid container spacing={1.5}>
                    {raw.queues.map((q) => {
                        const hasFail = (q.failed || 0) > 0;
                        const isStuck = (q.waiting || 0) > 0 && (q.active || 0) === 0 && (q.completed || 0) === 0;
                        const prev = queueHistory[q.name];
                        const wDelta = queueDelta(q.waiting ?? 0, prev?.waiting);
                        const fDelta = queueDelta(q.failed ?? 0, prev?.failed);
                        const aDelta = queueDelta(q.active ?? 0, prev?.active);
                        return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={q.name}>
                                <Box sx={{ p: 2, border: `1px solid ${hasFail || isStuck ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 2, bgcolor: hasFail || isStuck ? '#fff7f7' : 'background.paper' }}>
                                    <Tooltip title={q.name}>
                                        <Typography variant="body2" fontWeight="bold" noWrap sx={{ display: 'block', mb: 1 }}>{q.name}</Typography>
                                    </Tooltip>
                                    {q.error ? (
                                        <Typography variant="caption" color="error">Erro: {q.error}</Typography>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Chip size="small" label={`W ${q.waiting ?? 0}`} color={(q.waiting || 0) > 20 ? 'warning' : 'default'} variant="outlined" />
                                                    {wDelta && <Typography variant="caption" sx={{ color: wDelta.color, fontWeight: 600, fontSize: '0.65rem' }}>{wDelta.value}</Typography>}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Chip size="small" label={`A ${q.active ?? 0}`} color={(q.active || 0) > 0 ? 'primary' : 'default'} variant="outlined" />
                                                    {aDelta && <Typography variant="caption" sx={{ color: aDelta.color, fontWeight: 600, fontSize: '0.65rem' }}>{aDelta.value}</Typography>}
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                <Chip size="small" label={`C ${q.completed ?? 0}`} color="success" variant="outlined" />
                                                {(q.failed || 0) > 0 && (
                                                    <>
                                                        <Chip size="small" label={`F ${q.failed}`} color="error" />
                                                        {fDelta && <Typography variant="caption" sx={{ color: fDelta.color, fontWeight: 600, fontSize: '0.65rem' }}>{fDelta.value}</Typography>}
                                                    </>
                                                )}
                                                {(q.delayed || 0) > 0 && <Chip size="small" label={`D ${q.delayed}`} color="warning" variant="outlined" />}
                                                {(q.total || 0) > 0 && <Chip size="small" label={`T ${q.total}`} variant="outlined" />}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            </CardContent>
        </Card>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function SystemUnifiedDashboard() {
    const {
        health, rawMetrics, rawDomains, recent,
        healthScore, systemStatus, extras, loadingHealth, refresh, lastFetchAt
    } = useSystemHealthCtx();

    const [raw, setRaw] = useState<RawMonitorData | null>(null);
    const [rawLoading, setRawLoading] = useState(true);
    const [, setRawError] = useState<string | null>(null);
    const [queueHistory, setQueueHistory] = useState<Record<string, QueueStat>>({});

    const [correlationId, setCorrelationId] = useState('');
    const [flowLoading, setFlowLoading] = useState(false);
    const [eventFlow, setEventFlow] = useState<EventFlow | null>(null);
    const [flowDialogOpen, setFlowDialogOpen] = useState(false);
    const [reprocessing, setReprocessing] = useState(false);
    const [reprocessResult, setReprocessResult] = useState<{ requeued: number } | null>(null);
    const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>([]);
    const [loadingDeadLetters, setLoadingDeadLetters] = useState(false);
    const [innerTab, setInnerTab] = useState(0);
    const [selectedDomain, setSelectedDomain] = useState<DomainHealth | null>(null);
    const [domainModalOpen, setDomainModalOpen] = useState(false);

    const fetchDeadLetters = useCallback(async () => {
        try {
            setLoadingDeadLetters(true);
            const res = await API.get('/observability/dead-letters?limit=20');
            setDeadLetters(res.data?.data || []);
        } catch {
            // silencioso — o contador já vem do system-health
        } finally {
            setLoadingDeadLetters(false);
        }
    }, []);

    useEffect(() => {
        fetchDeadLetters();
    }, [fetchDeadLetters]);

    const fetchRaw = useCallback(async () => {
        try {
            const res = await API.get('/admin/system-monitor', { timeout: 8000 });
            const data: RawMonitorData = res.data;
            setRaw(prev => {
                if (prev) {
                    const nextHistory: Record<string, QueueStat> = {};
                    prev.queues.forEach(q => { nextHistory[q.name] = q; });
                    setQueueHistory(nextHistory);
                }
                return data;
            });
            setRawError(null);
        } catch (err) {
            setRawError(err instanceof Error ? err.message : 'Erro ao buscar métricas do sistema');
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

    const handleDomainClick = useCallback((d: DomainHealth) => {
        setSelectedDomain(d);
        setDomainModalOpen(true);
    }, []);

    const handleEventClick = useCallback((corrId: string) => {
        setCorrelationId(corrId);
        setInnerTab(0);
        // small delay para scroll até o diagnóstico ficar visível
        setTimeout(() => {
            setFlowLoading(true);
            API.get(`/observability/flow/${corrId}`)
                .then(res => { setEventFlow(res.data.data); setFlowDialogOpen(true); })
                .catch(err => toast.error(extractErrorMessage(err, 'Fluxo não encontrado')))
                .finally(() => setFlowLoading(false));
        }, 50);
    }, []);

    const handleReprocessDeadLetters = useCallback(async () => {
        setReprocessing(true);
        setReprocessResult(null);
        try {
            const res = await API.post('/observability/dead-letters/retry-batch');
            const requeued = res.data?.data?.success ?? res.data?.success ?? 0;
            setReprocessResult({ requeued });
            toast.success(`${requeued} evento(s) reenfileirado(s) com sucesso`);
            setTimeout(() => { refresh(); fetchDeadLetters(); }, 2000);
        } catch (err) {
            toast.error(extractErrorMessage(err, 'Erro ao reprocessar dead letters'));
        } finally {
            setReprocessing(false);
        }
    }, [refresh, fetchDeadLetters]);

    const handleSearchFlow = useCallback(async () => {
        if (!correlationId.trim()) { toast.warn('Digite um correlationId'); return; }
        setFlowLoading(true);
        try {
            const res = await API.get(`/observability/flow/${correlationId}`);
            setEventFlow(res.data.data);
            setFlowDialogOpen(true);
        } catch (err) {
            toast.error(extractErrorMessage(err, 'Fluxo não encontrado'));
        } finally {
            setFlowLoading(false);
        }
    }, [correlationId]);

    const loading = rawLoading || loadingHealth;

    const heapUsed = raw ? parseMB(raw.memory.heapUsed) : 0;
    const heapTotal = raw ? parseMB(raw.memory.heapTotal) : 0;
    const heapPct = heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 100) : 0;
    const heapColor: 'error' | 'warning' | 'success' =
        heapPct >= 85 ? 'error' : heapPct >= 70 ? 'warning' : 'success';

    const totalWaiting = raw?.queues?.reduce((s, q) => s + (q.waiting || 0), 0) ?? 0;
    const totalFailed  = raw?.queues?.reduce((s, q) => s + (q.failed  || 0), 0) ?? 0;
    const totalActive  = raw?.queues?.reduce((s, q) => s + (q.active  || 0), 0) ?? 0;

    const displayScore = healthScore ?? health?.score ?? 0;
    const displayStatus = systemStatus ?? health?.status ?? 'unknown';
    const scoreItems = buildScoreBreakdown(health, rawMetrics, rawDomains);

    const allAlerts: Array<{ level: 'error' | 'warning' | 'info'; title: string; detail: string; action?: string }> = useMemo(() => {
        const stuck = raw?.queues?.filter(q => (q.waiting || 0) > 0 && (q.active || 0) === 0 && (q.completed || 0) === 0) ?? [];
        const list = [
            ...(health?.alerts || []),
            ...(raw?.redis.status !== 'ok' ? [{ level: 'error' as const, title: 'Redis com problema', detail: raw?.redis.message || 'Conexão Redis/Valkey falhou' }] : []),
            ...(raw?.mongodb.status !== 'ok' ? [{ level: 'error' as const, title: 'MongoDB com problema', detail: raw?.mongodb.message || 'Ping ao MongoDB falhou' }] : []),
            ...(stuck.length > 0 ? [{ level: 'warning' as const, title: 'Fila possivelmente travada', detail: stuck.map(q => q.name).join(', ') }] : []),
        ];
        const priority = { error: 0, warning: 1, info: 2 };
        list.sort((a, b) => priority[a.level] - priority[b.level]);
        return list;
    }, [health?.alerts, raw]);

    const alertCounts = {
        error: allAlerts.filter(a => a.level === 'error').length,
        warning: allAlerts.filter(a => a.level === 'warning').length,
        info: allAlerts.filter(a => a.level === 'info').length,
    };

    const deadLettersCount = rawMetrics?.overview.deadLetters ?? 0;
    const displayDeadLetters = deadLetters.length > 0 ? deadLetters : [];

    if (loading && !raw && !rawMetrics) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={160} sx={{ mb: 2, borderRadius: 3 }} />
                <Grid container spacing={2}>
                    {[1,2,3,4,5,6].map(i => (
                        <Grid item xs={12} md={i <= 2 ? 6 : 4} key={i}>
                            <Skeleton variant="rectangular" height={i <= 2 ? 200 : 160} sx={{ borderRadius: 3 }} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, pb: 6 }}>
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

            {/* ── LINHA 1: SCORE + ALERTAS ───────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={7}>
                    <SystemScoreCard
                        score={displayScore}
                        status={displayStatus}
                        items={scoreItems}
                        collectedAt={health?.collectedAt}
                        headline={health?.headline}
                    />
                </Grid>
                <Grid item xs={12} md={5}>
                    <AlertsCard alerts={allAlerts} counts={alertCounts} />
                </Grid>
            </Grid>

            {/* ── TABS INTERNAS ──────────────────────────────────────────────── */}
            <Tabs value={innerTab} onChange={(_, v) => setInnerTab(v)} sx={{ mb: 2, borderBottom: '1px solid #e5e7eb' }}>
                <Tab label="Visão Geral" icon={<Activity size={15} />} iconPosition="start" />
                <Tab label="Métricas Detalhadas" icon={<Zap size={15} />} iconPosition="start" />
                <Tab label="Filas BullMQ" icon={<Layers size={15} />} iconPosition="start" />
            </Tabs>

            {innerTab === 0 && (
                <>
                    {/* ── LINHA 2: INFRA + FILAS + DOMÍNIOS ──────────────────────────── */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={4}>
                            <InfraCard raw={raw} heapPct={heapPct} heapColor={heapColor} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <QueuesCard
                                raw={raw}
                                totalWaiting={totalWaiting}
                                totalActive={totalActive}
                                totalFailed={totalFailed}
                                queueHistory={queueHistory}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <DomainsCard domains={health?.domains || []} onDomainClick={handleDomainClick} />
                        </Grid>
                    </Grid>

                    {/* ── LINHA 3: EVENTOS RECENTES ──────────────────────────────────── */}
                    <Box sx={{ mb: 2 }}>
                        <RecentEventsBlock recent={recent} loading={loadingHealth} onEventClick={handleEventClick} />
                    </Box>

                    {/* ── LINHA 4: DEAD LETTERS ──────────────────────────────────────── */}
                    <Box sx={{ mb: 2 }}>
                        {loadingDeadLetters && deadLettersCount === 0 ? (
                            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
                        ) : (
                            <DeadLettersBlock
                                count={deadLettersCount}
                                items={displayDeadLetters}
                                reprocessing={reprocessing}
                                onRetry={handleReprocessDeadLetters}
                                result={reprocessResult}
                            />
                        )}
                    </Box>

                    {/* ── LINHA 5: DIAGNÓSTICO DE FLUXO ──────────────────────────────── */}
                    <Box sx={{ mb: 2 }}>
                        <FlowDiagnosticBlock
                            correlationId={correlationId}
                            setCorrelationId={setCorrelationId}
                            loading={flowLoading}
                            onSearch={handleSearchFlow}
                        />
                    </Box>
                </>
            )}

            {innerTab === 1 && (
                <MetricsTab extras={extras} rawDomains={rawDomains} resolvedDomains={health?.domains || []} loading={loadingHealth} onDomainClick={handleDomainClick} />
            )}

            {innerTab === 2 && (
                <QueuesTab raw={raw} queueHistory={queueHistory} />
            )}

            {/* ── MODAL: DETALHE DO DOMÍNIO ─────────────────────────────────── */}
            <DomainDetailModal
                domain={selectedDomain}
                open={domainModalOpen}
                onClose={() => setDomainModalOpen(false)}
            />

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
                                {eventFlow.timeline.map((event, idx) => {
                                    const isError = event.status === 'failed' || event.status === 'dead_letter';
                                    const retryMatch = event.errorInfo?.errorMessage?.match(/attempt\s+(\d+)\/(\d+)/);
                                    const retryText = retryMatch ? `Tentativa ${retryMatch[1]}/${retryMatch[2]}` : null;
                                    return (
                                        <Step key={event.id} active expanded sx={{ '& .MuiStepContent-root': { borderLeft: `2px solid ${isError ? '#ef4444' : '#e5e7eb'}` } }}>
                                            <StepLabel StepIconComponent={() => (
                                                <Box sx={{
                                                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    bgcolor: event.status === 'processed' ? '#dcfce7' : event.status === 'failed' ? '#fee2e2' : '#fef9c3',
                                                    border: `2px solid ${event.status === 'processed' ? '#22c55e' : event.status === 'failed' ? '#ef4444' : '#f59e0b'}`
                                                }}>
                                                    {event.status === 'processed' ? <Check size={14} color="#22c55e" /> :
                                                     event.status === 'failed'    ? <XCircle size={14} color="#ef4444" /> :
                                                     <Clock size={14} color="#f59e0b" />}
                                                </Box>
                                            )}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <code style={{ fontSize: '0.8rem', background: isError ? '#fee2e2' : '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: isError ? '#991b1b' : '#1e293b' }}>{event.eventType}</code>
                                                    <Chip size="small" label={event.status} color={eventStatusColor(event.status)} />
                                                    {retryText && <Chip size="small" variant="outlined" color="warning" label={retryText} />}
                                                </Box>
                                            </StepLabel>
                                            <StepContent>
                                                <Box sx={{ bgcolor: isError ? '#fef2f2' : '#f8fafc', p: 1.5, borderRadius: 2, mb: 1 }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {event.aggregateType} · {new Date(event.timestamp).toLocaleString()}
                                                    </Typography>
                                                    {event.processingTime && (
                                                        <Typography variant="caption" color={isError ? 'error.main' : 'success.main'} display="block">
                                                            {isError ? 'Falhou' : 'Processado'} em {formatDuration(event.processingTime)}
                                                        </Typography>
                                                    )}
                                                    {event.errorInfo && (
                                                        <Alert severity="error" sx={{ mt: 1, borderRadius: 1 }} icon={<XCircle size={16} />}>
                                                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                                                {event.errorInfo.errorMessage}
                                                            </Typography>
                                                            {event.errorInfo.stack && (
                                                                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'text.secondary', mt: 0.5, display: 'block' }}>
                                                                    {typeof event.errorInfo.stack === 'string' ? event.errorInfo.stack.split('\n').slice(0, 3).join('\n') : ''}
                                                                </Typography>
                                                            )}
                                                        </Alert>
                                                    )}
                                                </Box>
                                                {idx < eventFlow.timeline.length - 1 && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mb: 1 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#cbd5e1' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {(() => {
                                                                const next = eventFlow.timeline[idx + 1];
                                                                const diff = new Date(next.timestamp).getTime() - new Date(event.timestamp).getTime();
                                                                return diff > 0 ? `+ ${formatDuration(diff)}` : 'próximo evento';
                                                            })()}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </StepContent>
                                        </Step>
                                    );
                                })}
                            </Stepper>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
