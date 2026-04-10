// src/components/admin/SystemMonitorDashboard.tsx
/**
 * Monitor de Sistema em Tempo Real
 *
 * Exibe:
 *   - Heap usado/total (com barra de progresso colorida)
 *   - RSS
 *   - Status das filas BullMQ
 *   - Uptime
 *
 * Poll a cada 10 segundos no endpoint /health/full
 */

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Box,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Typography,
    Chip,
    Alert,
    Skeleton
} from '@mui/material';
import {
    Activity,
    Server,
    Clock,
    HardDrive,
    Layers
} from 'lucide-react';

interface QueueCounts {
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
}

interface HealthData {
    status: string;
    node: {
        version: string;
        uptimeSeconds: number;
        pid: number;
    };
    memory: {
        heapUsedMB: number;
        heapTotalMB: number;
        heapPercent: string;
        rssMB: number;
        externalMB: number;
        status: 'healthy' | 'warning' | 'critical';
    };
    queues: Record<string, QueueCounts>;
    env: string;
    timestamp: string;
}

const REFRESH_INTERVAL = 10_000; // 10s

export default function SystemMonitorDashboard() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await axios.get('/health/full', { timeout: 5000 });
            setData(res.data);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Erro ao buscar health');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const id = setInterval(fetchHealth, REFRESH_INTERVAL);
        return () => clearInterval(id);
    }, [fetchHealth]);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const heapPercentValue = data
        ? parseFloat(data.memory.heapPercent.replace('%', ''))
        : 0;

    const getHeapColor = () => {
        if (heapPercentValue >= 85) return 'error';
        if (heapPercentValue >= 70) return 'warning';
        return 'success';
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={200} />
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    {error || 'Não foi possível carregar o monitor'}
                </Alert>
            </Box>
        );
    }

    const totalWaiting = Object.values(data.queues).reduce(
        (sum, q) => sum + (q.waiting || 0),
        0
    );
    const totalFailed = Object.values(data.queues).reduce(
        (sum, q) => sum + (q.failed || 0),
        0
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Activity className="w-8 h-8 text-blue-500" />
                <Typography variant="h4" fontWeight="bold">
                    Monitor do Sistema
                </Typography>
                <Chip
                    label={data.env}
                    size="small"
                    color="default"
                    variant="outlined"
                />
            </Box>

            {/* Alerta crítico */}
            {data.memory.status === 'critical' && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography fontWeight="bold">
                        🔴 Memória crítica: {data.memory.heapPercent}
                    </Typography>
                    O sistema pode recusar novos jobs até estabilizar.
                </Alert>
            )}

            {data.memory.status === 'warning' && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    🟡 Memória elevada: {data.memory.heapPercent}
                </Alert>
            )}

            {/* Cards de métricas */}
            <Grid container spacing={3}>
                {/* Heap */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <HardDrive size={20} className="text-gray-500" />
                                <Typography color="textSecondary">
                                    Heap (Node.js)
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {data.memory.heapUsedMB} / {data.memory.heapTotalMB} MB
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(heapPercentValue, 100)}
                                    color={getHeapColor()}
                                    sx={{ height: 10, borderRadius: 1 }}
                                />
                                <Typography
                                    variant="caption"
                                    color={
                                        heapPercentValue >= 85 ? 'error' :
                                        heapPercentValue >= 70 ? 'warning.main' : 'success.main'
                                    }
                                    sx={{ mt: 0.5, display: 'block' }}
                                >
                                    {data.memory.heapPercent} utilizado
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* RSS */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Server size={20} className="text-gray-500" />
                                <Typography color="textSecondary">
                                    RSS Total
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {data.memory.rssMB} MB
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Memória residente do processo
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Uptime */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Clock size={20} className="text-gray-500" />
                                <Typography color="textSecondary">
                                    Uptime
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {formatUptime(data.node.uptimeSeconds)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                PID: {data.node.pid}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Resumo de Filas */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Layers size={20} className="text-gray-500" />
                                <Typography color="textSecondary">
                                    Filas BullMQ
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`⏳ Waiting: ${totalWaiting}`}
                                    color={totalWaiting > 10 ? 'warning' : 'default'}
                                    variant="outlined"
                                />
                                <Chip
                                    label={`❌ Failed: ${totalFailed}`}
                                    color={totalFailed > 0 ? 'error' : 'success'}
                                    variant="outlined"
                                />
                            </Box>

                            <Grid container spacing={2}>
                                {Object.entries(data.queues).map(([name, counts]) => (
                                    <Grid item xs={12} sm={6} md={4} key={name}>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                border: '1px solid #e0e0e0',
                                                borderRadius: 1,
                                                bgcolor: 'background.paper'
                                            }}
                                        >
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {name}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                                <Chip size="small" label={`W: ${counts.waiting || 0}`} />
                                                <Chip size="small" label={`A: ${counts.active || 0}`} color="primary" variant="outlined" />
                                                {counts.failed ? (
                                                    <Chip size="small" label={`F: ${counts.failed}`} color="error" />
                                                ) : null}
                                            </Box>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                Última atualização: {new Date(data.timestamp).toLocaleTimeString()} · Node {data.node.version}
            </Typography>
        </Box>
    );
}
