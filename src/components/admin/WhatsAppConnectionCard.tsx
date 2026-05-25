import React from 'react';
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
} from 'lucide-react';
import { useWhatsAppWebStatus, WhatsAppStatus } from '../../hooks/useWhatsAppWebStatus';

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
  const { state, loading, reconnect, refresh } = useWhatsAppWebStatus();
  const cfg = statusConfig[state.status] || statusConfig.unknown;

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

          <div className="flex items-center gap-2">
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
              onClick={refresh}
              startIcon={<RefreshCw size={14} />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              size="small"
              color={state.ready ? 'error' : 'primary'}
              onClick={reconnect}
              startIcon={<RefreshCw size={14} />}
              sx={{ textTransform: 'none', borderRadius: 2, backgroundColor: state.ready ? '#dc2626' : '#0d8a6c' }}
            >
              {state.ready ? 'Desconectar' : 'Reconectar'}
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
      {!loading && state.ready && (
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
            {state.lastAuthenticatedAt && (
              <Typography variant="caption" className="text-gray-400">
                Autenticado em: {new Date(state.lastAuthenticatedAt).toLocaleString('pt-BR')}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métricas técnicas */}
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
    </Box>
  );
}
