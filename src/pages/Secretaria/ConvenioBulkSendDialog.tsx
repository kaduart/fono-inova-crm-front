import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import convenioWaitlistApi, {
  type BulkSendKind,
  type BulkSendPreview,
  type WaitlistConvenio,
} from '../../services/convenioWaitlistService';
import { CONVENIO_OPTIONS } from '../../utils/convenioWaitlist';
import { toast } from '../../utils/toast';

const ATENDENTE_KEY = 'convenioBulkAtendente';
const readAtendente = (): string => {
  try { return window.localStorage.getItem(ATENDENTE_KEY) ?? ''; } catch { return ''; }
};
const saveAtendente = (value: string) => {
  try { window.localStorage.setItem(ATENDENTE_KEY, value); } catch { /* sem storage: só não lembra */ }
};

const LIMIT_TEXT: Record<BulkSendPreview['limitReason'], string> = {
  limite_diario: 'limite de segurança do dia',
  fim_do_horario: 'o que cabe até 18h45',
  fim_de_semana: 'fim de semana: o envio só roda em dia útil',
  antes_do_horario: 'antes das 8h: o envio começa às 8h',
};

interface Props {
  open: boolean;
  kind: BulkSendKind;
  initialConvenio: WaitlistConvenio | '';
  onClose: () => void;
  onSent: () => void;
}

/** Envio em massa (oferta do particular ou "agora atendemos o plano"): prévia primeiro, envia só ao confirmar. */
export default function ConvenioBulkSendDialog({ open, kind, initialConvenio, onClose, onSent }: Props) {
  const [convenio, setConvenio] = useState<WaitlistConvenio | ''>(initialConvenio);
  const [especialidades, setEspecialidades] = useState('');
  const [atendente, setAtendente] = useState(readAtendente);
  const [preview, setPreview] = useState<BulkSendPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConvenio(initialConvenio);
      setEspecialidades('');
    }
  }, [open, initialConvenio]);

  const needsConvenio = kind === 'credenciado' && !convenio;

  useEffect(() => {
    if (!open || needsConvenio) {
      setPreview(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      convenioWaitlistApi.bulkSend({ kind, convenio, especialidades, atendente })
        .then(({ preview: p }) => { if (alive) setPreview(p); })
        .catch(() => { if (alive) setError('Não foi possível carregar a prévia.'); })
        .finally(() => { if (alive) setLoading(false); });
    }, 300);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [open, kind, convenio, especialidades, atendente, needsConvenio]);

  const send = async () => {
    setSending(true);
    try {
      saveAtendente(atendente);
      const { queued } = await convenioWaitlistApi.bulkSend({ kind, convenio, especialidades, atendente, confirm: true });
      toast.success(`${queued} ${queued === 1 ? 'mensagem entrou' : 'mensagens entraram'} na fila. Saem 1 a cada ~1,5 min; cada pessoa vira "contatado" quando a mensagem sai.`);
      onSent();
      onClose();
    } catch {
      toast.error('Não foi possível enviar. Nada foi disparado.');
    } finally {
      setSending(false);
    }
  };

  const title = kind === 'credenciado' ? 'Avisar: agora atendemos o plano' : 'Retomar contato';

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {kind === 'credenciado' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Só use depois da confirmação formal do credenciamento e informe apenas as especialidades liberadas.
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, mt: 1 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="bulk-convenio">Convênio</InputLabel>
            <Select
              labelId="bulk-convenio"
              label="Convênio"
              value={convenio}
              onChange={(event) => setConvenio(event.target.value as WaitlistConvenio | '')}
            >
              {kind === 'particular' && <MenuItem value="">Todos</MenuItem>}
              {CONVENIO_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {kind === 'particular' && (
            <TextField
              size="small"
              label="Seu nome (assina a mensagem)"
              placeholder="Ex.: Bia"
              value={atendente}
              onChange={(event) => setAtendente(event.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />
          )}
          {kind === 'credenciado' && (
            <TextField
              size="small"
              label="Especialidades liberadas (opcional)"
              placeholder="Ex.: fonoaudiologia e psicologia"
              value={especialidades}
              onChange={(event) => setEspecialidades(event.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
            />
          )}
        </Box>

        {needsConvenio && <Typography color="text.secondary">Escolha qual convênio foi credenciado.</Typography>}
        {loading && <CircularProgress size={24} />}
        {error && <Alert severity="error">{error}</Alert>}
        {preview && !loading && (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>{preview.eligible}</strong> {preview.eligible === 1 ? 'pessoa pode receber' : 'pessoas podem receber'}
              {preview.skippedWithSession > 0 ? ` (${preview.skippedWithSession} com sessão marcada ficam de fora)` : ''}.
              {' '}Hoje saem <strong>{preview.willSend}</strong> ({LIMIT_TEXT[preview.limitReason]}); o resto fica para os próximos dias.
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
              1 mensagem por telefone, 1 a cada ~1,5 min, pelo WhatsApp da clínica. Já enviadas hoje: {preview.sentToday}.
            </Typography>
            {preview.sample && (
              <Paper variant="outlined" sx={{ p: 1.5, whiteSpace: 'pre-wrap', fontSize: 14 }}>
                {preview.sample}
              </Paper>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancelar</Button>
        <Button
          variant="contained"
          color="success"
          onClick={send}
          disabled={sending || loading || !preview || preview.willSend === 0}
        >
          {sending ? 'Enviando…' : `Enviar para ${preview?.willSend ?? 0}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
