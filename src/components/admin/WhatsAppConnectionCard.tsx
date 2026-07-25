import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Skeleton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  QrCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  AlertTriangle,
  Power,
  Signal,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { useWhatsAppWebStatus, WhatsAppStatus } from '../../hooks/useWhatsAppWebStatus';
import { useWhatsAppWebHealth } from '../../hooks/useWhatsAppWebHealth';

const statusConfig: Record<WhatsAppStatus, { label: string; color: string; icon: React.ReactNode; severity: 'info' | 'success' | 'warning' | 'error' }> = {
  starting:      { label: 'Iniciando',       color: '#64748b', icon: <Power size={18} />,       severity: 'info' },
  initializing:  { label: 'Inicializando',   color: '#64748b', icon: <Loader2 size={18} />,     severity: 'info' },
  qr:            { label: 'QR Code',         color: '#0d8a6c', icon: <QrCode size={18} />,      severity: 'warning' },
  authenticated: { label: 'Autenticado',     color: '#d97706', icon: <Smartphone size={18} />,  severity: 'warning' },
  connecting:    { label: 'Conectando',      color: '#d97706', icon: <Loader2 size={18} />,     severity: 'warning' },
  ready:         { label: 'Conectado',       color: '#16a34a', icon: <CheckCircle2 size={18} />, severity: 'success' },
  disconnected:  { label: 'Desconectado',    color: '#dc2626', icon: <XCircle size={18} />,     severity: 'error' },
  error:         { label: 'Erro',            color: '#dc2626', icon: <AlertTriangle size={18} />, severity: 'error' },
  reconnecting:  { label: 'Reconectando',    color: '#d97706', icon: <RefreshCw size={18} />,   severity: 'warning' },
  unknown:       { label: 'Desconhecido',    color: '#64748b', icon: <Signal size={18} />,      severity: 'info' },
};

export default function WhatsAppConnectionCard() {
  const { state, loading: loadingStatus, reconnect, refresh: refreshStatus } = useWhatsAppWebStatus();
  const { data: health, loading: loadingHealth, error: healthError, refresh: refreshHealth, cleanupCache } = useWhatsAppWebHealth();
  const [cleaning, setCleaning] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Se o health informar ready, confiamos nele mesmo quando o status legado estiver desatualizado
  const effectiveStatus: WhatsAppStatus =
    state.status === 'unknown' && health?.whatsapp?.ready
      ? 'ready'
      : state.status;

  const cfg = statusConfig[effectiveStatus] || statusConfig.unknown;
  const loading = loadingStatus && loadingHealth;

  const handleRefresh = () => {
    refreshStatus();
    refreshHealth();
  };

  const handleCleanupCache = async () => {
    setCleaning(true);
    try {
      const result = await cleanupCache();
      setToast({
        message: `${result.message} (${result.removed.length} itens removidos)`,
        severity: 'success',
      });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.error || err?.message || 'Falha ao limpar cache',
        severity: 'error',
      });
    } finally {
      setCleaning(false);
    }
  };

  const sessionSizeMB = health?.whatsapp?.sessionSizeMB;
  const diskUsagePercent = health?.whatsapp?.diskUsagePercent;
  const storageAlert = health?.whatsapp?.storageAlert;
  const queue = health?.queue;

  return (
    <Box className="space-y-4">
      {/* Header com status */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: cfg.color }}
            >
              {cfg.icon}
            </div>
            <div>
              <Typography variant="h6" fontWeight="bold" className="text-gray-900">
                WhatsApp Web
              </Typography>
              <Typography variant="body2" className="text-gray-500">
                Conexão via chip/local (whatsapp-web.js)
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                backgroundColor: cfg.color + '20',
                color: cfg.color,
                fontWeight: 600,
                borderRadius: 1.5,
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              startIcon={<RefreshCw size={14} />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Atualizar
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              onClick={handleCleanupCache}
              disabled={cleaning}
              startIcon={<Trash2 size={14} />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {cleaning ? 'Limpando...' : 'Limpar cache'}
            </Button>
            <Button
              variant="contained"
              size="small"
              color={health?.whatsapp?.ready ? 'error' : 'primary'}
              onClick={reconnect}
              startIcon={<RefreshCw size={14} />}
              sx={{ textTransform: 'none', borderRadius: 2, backgroundColor: health?.whatsapp?.ready ? '#dc2626' : '#0d8a6c' }}
            >
              {health?.whatsapp?.ready ? 'Desconectar' : 'Reconectar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Skeleton variant="rectangular" height={200} />
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {!loading && healthError && (
        <Alert severity="warning">
          <Typography variant="body2">{healthError}</Typography>
        </Alert>
      )}

      {!loading && storageAlert && (
        <Alert severity="warning" icon={<AlertTriangle size={20} />}>
          <Typography variant="body2" fontWeight={600}>
            ⚠️ Armazenamento da sessão elevado
          </Typography>
          <Typography variant="caption">
            Sessão: {sessionSizeMB?.toFixed(1)} MB · Disco: {diskUsagePercent}%.{' '}
            Clique em <strong>Limpar cache</strong> para remover arquivos temporários. Se o alerta persistir,
            a limpeza completa da sessão pode ser necessária (exigirá novo QR).
          </Typography>
        </Alert>
      )}

      {!loading && state.qrCount > 10 && (
        <Alert severity="warning" icon={<AlertTriangle size={20} />}>
          <Typography variant="body2" fontWeight={600}>
            Possível loop de autenticação detectado
          </Typography>
          <Typography variant="caption">
            O QR code foi regenerado {state.qrCount} vezes. Isso geralmente indica sessão corrompida ou problema de compatibilidade.
            Tente clicar em <strong>Reconectar</strong> para limpar a sessão.
          </Typography>
        </Alert>
      )}

      {!loading && state.status === 'error' && state.error && (
        <Alert severity="error">
          <Typography variant="body2">{state.error}</Typography>
        </Alert>
      )}

      {!loading && state.lastDisconnectReason && (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2">
            Última desconexão: <strong>{state.lastDisconnectReason}</strong>
          </Typography>
        </Alert>
      )}

      {/* QR Code */}
      {!loading && state.qrCode && !state.ready && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent className="flex flex-col items-center gap-4">
            <Typography variant="h6" fontWeight="bold" className="text-gray-900">
              Escaneie o QR Code
            </Typography>
            <Typography variant="body2" className="text-gray-500 text-center max-w-md">
              Abra o WhatsApp no celular, vá em <strong>Menu → Aparelhos conectados → Conectar aparelho</strong> e aponte a câmera para o código abaixo.
            </Typography>
            <Box
              className="rounded-xl overflow-hidden border-2 border-dashed border-emerald-200 p-2"
              sx={{ backgroundColor: '#f0fdf4' }}
            >
              <img
                src={state.qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64 object-contain"
              />
            </Box>
            <Typography variant="caption" className="text-gray-400">
              O QR code é renovado automaticamente a cada ~20 segundos
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Estado conectado */}
      {!loading && health?.whatsapp?.ready && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: '#16a34a', border: 1 }}>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <Typography variant="h6" fontWeight="bold" className="text-green-700">
              WhatsApp conectado!
            </Typography>
            <Typography variant="body2" className="text-gray-500 text-center">
              O sistema está pronto para enviar e receber mensagens.
            </Typography>
            {health?.whatsapp?.lastReady && (
              <Typography variant="caption" className="text-gray-400">
                Último ready: {new Date(health.whatsapp.lastReady).toLocaleString('pt-BR')}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métricas de saúde + fila */}
      {!loading && health && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" className="text-gray-700 mb-3">
              Saúde da sessão
            </Typography>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tooltip title="Tamanho da sessão persistente do WhatsApp">
                <Box className={`rounded-lg p-3 text-center ${storageAlert ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <Typography variant="caption" className="text-gray-400 block">Sessão</Typography>
                  <Typography variant="body2" fontWeight="bold" className={storageAlert ? 'text-red-700' : 'text-gray-700'}>
                    {sessionSizeMB != null ? `${sessionSizeMB.toFixed(1)} MB` : '—'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Uso do disco persistente no Render">
                <Box className={`rounded-lg p-3 text-center ${storageAlert ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <Typography variant="caption" className="text-gray-400 block">Disco</Typography>
                  <Typography variant="body2" fontWeight="bold" className={storageAlert ? 'text-red-700' : 'text-gray-700'}>
                    {diskUsagePercent != null ? `${diskUsagePercent}%` : '—'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Mensagens aguardando envio">
                <Box className="bg-gray-50 rounded-lg p-3 text-center">
                  <Typography variant="caption" className="text-gray-400 block">Fila (waiting)</Typography>
                  <Typography variant="body2" fontWeight="bold" className="text-gray-700">
                    {queue?.waiting ?? '—'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Jobs falhos na fila whatsapp-send">
                <Box className="bg-gray-50 rounded-lg p-3 text-center">
                  <Typography variant="caption" className="text-gray-400 block">Falhas</Typography>
                  <Typography variant="body2" fontWeight="bold" className={queue && queue.failed > 0 ? 'text-red-600' : 'text-gray-700'}>
                    {queue?.failed ?? '—'}
                  </Typography>
                </Box>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas técnicas legadas */}
      {!loading && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" className="text-gray-700 mb-3">
              Detalhes técnicos
            </Typography>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tooltip title="Process ID do worker">
                <Box className="bg-gray-50 rounded-lg p-3 text-center">
                  <Typography variant="caption" className="text-gray-400 block">PID</Typography>
                  <Typography variant="body2" fontWeight="bold" className="text-gray-700">
                    {state.pid ?? '—'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Uptime do processo">
                <Box className="bg-gray-50 rounded-lg p-3 text-center">
                  <Typography variant="caption" className="text-gray-400 block">Uptime</Typography>
                  <Typography variant="body2" fontWeight="bold" className="text-gray-700">
                    {state.uptime ? `${Math.floor(state.uptime / 60)}m` : '—'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Contador de QR gerados">
                <Box className="bg-gray-50 rounded-lg p-3 text-center">
                  <Typography variant="caption" className="text-gray-400 block">QRs gerados</Typography>
                  <Typography variant="body2" fontWeight="bold" className={state.qrCount > 10 ? 'text-red-600' : 'text-gray-700'}>
                    {state.qrCount}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Tentativas de inicialização">
                <Box className="bg-gray-50 rounded-lg p-3 text-center">
                  <Typography variant="caption" className="text-gray-400 block">Init attempts</Typography>
                  <Typography variant="body2" fontWeight="bold" className="text-gray-700">
                    {state.initAttempts ?? '—'}
                  </Typography>
                </Box>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
