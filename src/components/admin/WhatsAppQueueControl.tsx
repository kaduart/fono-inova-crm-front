import { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Chip, Alert } from '@mui/material';
import { PauseCircle, PlayCircle, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmToast } from '../../utils/confirmToast';
import { extractErrorMessage } from '../../utils/errorUtils';
import whatsappQueueService, { WhatsAppQueueStatus } from '../../services/whatsappQueueService';

const POLL_INTERVAL_MS = 8000;

const countTiles: Array<{ key: keyof WhatsAppQueueStatus['counts']; label: string; danger?: boolean }> = [
  { key: 'waiting', label: 'Aguardando' },
  { key: 'delayed', label: 'Em retry', danger: true },
  { key: 'active', label: 'Enviando agora' },
  { key: 'failed', label: 'Falhou (final)' },
  { key: 'completed', label: 'Concluídos' },
];

export default function WhatsAppQueueControl() {
  const [status, setStatus] = useState<WhatsAppQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'pause' | 'resume' | 'clear' | null>(null);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await whatsappQueueService.fetchStatus();
      setStatus(res.data);
    } catch (error) {
      if (!silent) toast.error(extractErrorMessage(error, 'Erro ao buscar status da fila WhatsApp'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handlePause = async () => {
    setActionLoading('pause');
    try {
      const res = await whatsappQueueService.pause();
      setStatus(res.data);
      toast.success('🔴 Fila de envio pausada — nenhuma mensagem sai até você retomar.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Erro ao pausar fila'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading('resume');
    try {
      const res = await whatsappQueueService.resume();
      setStatus(res.data);
      toast.success('🟢 Fila de envio retomada.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Erro ao retomar fila'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearStuck = async () => {
    const confirmed = await confirmToast(
      'Remover todos os jobs presos em retry (aguardando reenvio)? Lembretes ainda não enviados nenhuma vez não são afetados.'
    );
    if (!confirmed) return;

    setActionLoading('clear');
    try {
      const res = await whatsappQueueService.clearStuck();
      setStatus(res.data.status);
      toast.success(`🧹 ${res.data.removedCount} job(s) removido(s) da fila.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Erro ao limpar jobs travados'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: status?.isPaused ? '#dc2626' : '#16a34a' }}
            >
              {status?.isPaused ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
            </div>
            <div>
              <Typography variant="h6" fontWeight="bold" className="text-gray-900">
                🚨 Emergência — Fila de Envio WhatsApp
              </Typography>
              <Typography variant="body2" className="text-gray-500">
                Kill switch da fila whatsapp-send (lembretes automáticos)
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Chip
              label={status?.isPaused ? 'Pausada' : 'Operacional'}
              size="small"
              sx={{
                backgroundColor: status?.isPaused ? '#dc262620' : '#16a34a20',
                color: status?.isPaused ? '#dc2626' : '#16a34a',
                fontWeight: 600,
                borderRadius: 1.5,
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => fetchStatus()}
              disabled={loading}
              startIcon={<RefreshCw size={14} />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {status?.lastFailed && (
          <Alert severity="warning" icon={<AlertTriangle size={20} />}>
            <Typography variant="body2" fontWeight={600}>Última falha registrada</Typography>
            <Typography variant="caption">
              {status.lastFailed.phone ? `Tel: ${status.lastFailed.phone} — ` : ''}
              {status.lastFailed.reason} ({status.lastFailed.attempts}/8 tentativas)
            </Typography>
          </Alert>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {countTiles.map(({ key, label, danger }) => {
            const value = status?.counts?.[key] ?? '—';
            const isAlert = danger && typeof value === 'number' && value > 0;
            return (
              <Box
                key={key}
                className="rounded-lg p-3 text-center"
                sx={{ backgroundColor: isAlert ? '#fef2f2' : '#f9fafb' }}
              >
                <Typography variant="caption" className="text-gray-400 block">{label}</Typography>
                <Typography variant="h6" fontWeight="bold" className={isAlert ? 'text-red-600' : 'text-gray-700'}>
                  {value}
                </Typography>
              </Box>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {status?.isPaused ? (
            <Button
              variant="contained"
              onClick={handleResume}
              disabled={actionLoading !== null}
              startIcon={<PlayCircle size={16} />}
              sx={{ textTransform: 'none', borderRadius: 2, backgroundColor: '#16a34a' }}
            >
              {actionLoading === 'resume' ? 'Retomando...' : 'Retomar envios'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handlePause}
              disabled={actionLoading !== null}
              startIcon={<PauseCircle size={16} />}
              sx={{ textTransform: 'none', borderRadius: 2, backgroundColor: '#dc2626' }}
            >
              {actionLoading === 'pause' ? 'Pausando...' : 'Parar todos os envios'}
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            onClick={handleClearStuck}
            disabled={actionLoading !== null}
            startIcon={<Trash2 size={16} />}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {actionLoading === 'clear' ? 'Limpando...' : 'Limpar jobs travados em retry'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
