// src/components/admin/AmandaMetricsDashboard.tsx
/**
 * Amanda AI — Decision Metrics Dashboard
 *
 * Consome GET /api/metrics/decision e exibe:
 * - Distribuição RULE / HYBRID / AI
 * - Top flags ativas
 * - Latência por action
 * - Alertas automáticos
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Activity, AlertCircle, Bot, RefreshCw, Zap } from 'lucide-react';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ActionStat {
  count: number;
  pct: number;
}

interface FlagStat {
  flag: string;
  count: number;
  pct: number;
}

interface LatencyInfo {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

interface LatencyByAction {
  [action: string]: { avg: number; p95: number };
}

interface AlertInfo {
  level: 'warning' | 'error';
  code: string;
  message: string;
}

interface Snapshot {
  total: number;
  window: string;
  actions: Record<string, ActionStat>;
  domains: Record<string, ActionStat>;
  topFlags: FlagStat[];
  latency: LatencyInfo | null;
  latencyByAction: LatencyByAction;
  alerts: AlertInfo[];
  bufferSize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  RULE:    '#10b981', // verde
  HYBRID:  '#f59e0b', // âmbar
  AI:      '#6366f1', // índigo
  unknown: '#9ca3af', // cinza
};

const WINDOW_OPTIONS = [
  { label: 'Últimas 500', value: undefined },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AmandaMetricsDashboard = () => {
  const [data, setData]         = useState<Snapshot | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [window_, setWindow]    = useState<number | undefined>(undefined);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = window_ ? `?window=${window_}` : '';
      const res = await axios.get(`/api/metrics/decision${params}`);
      setData(res.data.data);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, [window_]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000); // auto-refresh 30s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bot size={24} className="text-emerald-600" />
          <Typography variant="h5" fontWeight={700}>Amanda AI — Decisões</Typography>
          {data && (
            <Chip
              label={`${data.total} decisões · ${data.window}`}
              size="small"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Filtro de janela */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {WINDOW_OPTIONS.map(opt => (
              <Chip
                key={opt.label}
                label={opt.label}
                size="small"
                color={window_ === opt.value ? 'primary' : 'default'}
                onClick={() => setWindow(opt.value)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          <Tooltip title={lastRefresh ? `Atualizado ${lastRefresh.toLocaleTimeString()}` : 'Atualizar'}>
            <IconButton size="small" onClick={fetchMetrics} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && !data && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Alertas automáticos */}
      {data?.alerts?.map(alert => (
        <Alert
          key={alert.code}
          severity={alert.level === 'error' ? 'error' : 'warning'}
          icon={<AlertCircle size={16} />}
          sx={{ mb: 1 }}
        >
          <strong>[{alert.code}]</strong> {alert.message}
        </Alert>
      ))}

      {data && (
        <Grid container spacing={2}>

          {/* ── Distribuição de Actions ─────────────────────────────────────── */}
          <Grid item xs={12} md={5}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Distribuição de Decisões
                </Typography>
                {Object.entries(data.actions).map(([action, stat]) => (
                  <Box key={action} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Chip
                        label={action}
                        size="small"
                        sx={{ backgroundColor: ACTION_COLORS[action] || '#9ca3af', color: '#fff', fontWeight: 700 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {stat.count} · <strong>{stat.pct}%</strong>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stat.pct}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#f3f4f6',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: ACTION_COLORS[action] || '#9ca3af',
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Latência ────────────────────────────────────────────────────── */}
          <Grid item xs={12} md={7}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Zap size={16} className="text-amber-500" />
                  <Typography variant="subtitle1" fontWeight={700}>Latência (ms)</Typography>
                </Box>
                {data.latency ? (
                  <>
                    {/* Global */}
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      {(['avg', 'p50', 'p95', 'p99', 'max'] as const).map(k => (
                        <Grid item xs={4} sm={2.4} key={k}>
                          <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: '#f9fafb', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {k.toUpperCase()}
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {data.latency![k]}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    {/* Por action */}
                    {Object.keys(data.latencyByAction).length > 0 && (
                      <TableContainer component={Paper} elevation={0} sx={{ bgcolor: '#f9fafb' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Action</strong></TableCell>
                              <TableCell align="right"><strong>avg</strong></TableCell>
                              <TableCell align="right"><strong>p95</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(data.latencyByAction).map(([action, l]) => (
                              <TableRow key={action}>
                                <TableCell>
                                  <Chip
                                    label={action}
                                    size="small"
                                    sx={{ backgroundColor: ACTION_COLORS[action] || '#9ca3af', color: '#fff' }}
                                  />
                                </TableCell>
                                <TableCell align="right">{l.avg}ms</TableCell>
                                <TableCell align="right">{l.p95}ms</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary" variant="body2">Sem dados de latência ainda</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Top Flags ───────────────────────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Activity size={16} className="text-indigo-500" />
                  <Typography variant="subtitle1" fontWeight={700}>Top Flags Detectadas</Typography>
                </Box>
                {data.topFlags.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Flag</strong></TableCell>
                          <TableCell align="right"><strong>Qtd</strong></TableCell>
                          <TableCell align="right"><strong>%</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.topFlags.map(f => (
                          <TableRow key={f.flag}>
                            <TableCell>
                              <code style={{ fontSize: 12 }}>{f.flag}</code>
                            </TableCell>
                            <TableCell align="right">{f.count}</TableCell>
                            <TableCell align="right">
                              <Chip label={`${f.pct}%`} size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary" variant="body2">Nenhuma flag registrada ainda</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Domínios ────────────────────────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Domínios Detectados</Typography>
                {Object.keys(data.domains).length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Domínio</strong></TableCell>
                          <TableCell align="right"><strong>Qtd</strong></TableCell>
                          <TableCell align="right"><strong>%</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(data.domains).map(([domain, stat]) => (
                          <TableRow key={domain}>
                            <TableCell>
                              <code style={{ fontSize: 12 }}>{domain}</code>
                            </TableCell>
                            <TableCell align="right">{stat.count}</TableCell>
                            <TableCell align="right">
                              <Chip label={`${stat.pct}%`} size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary" variant="body2">Nenhum domínio registrado ainda</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Estado do buffer ─────────────────────────────────────────────── */}
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Buffer em memória: {data.bufferSize}/1000 entradas · Auto-refresh 30s · Reseta ao reiniciar servidor
            </Typography>
          </Grid>

        </Grid>
      )}

      {!loading && !error && !data && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>Aguardando dados...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default AmandaMetricsDashboard;
