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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import convenioWaitlistApi, { type BulkSendKind, type WaitlistEntry } from '../../services/convenioWaitlistService';
import { toast } from '../../utils/toast';

const ATENDENTE_KEY = 'convenioBulkAtendente';
const readAtendente = (): string => {
  try { return window.localStorage.getItem(ATENDENTE_KEY) ?? ''; } catch { return ''; }
};
const saveAtendente = (value: string) => {
  try { window.localStorage.setItem(ATENDENTE_KEY, value); } catch { /* sem storage: só não lembra */ }
};

interface Props {
  entry: WaitlistEntry | null;
  onClose: () => void;
  onSent: () => void;
}

/** Envio individual pelo WhatsApp da clínica (igual à agenda externa): texto pronto, editável, e envia pelo servidor. */
export default function ConvenioSendDialog({ entry, onClose, onSent }: Props) {
  const [kind, setKind] = useState<BulkSendKind>('particular');
  const [atendente, setAtendente] = useState(readAtendente);
  const [especialidades, setEspecialidades] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (entry) { setKind('particular'); setEspecialidades(''); }
  }, [entry]);

  useEffect(() => {
    if (!entry) return undefined;
    let alive = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      convenioWaitlistApi.sendWhatsapp(entry._id, { kind, atendente, especialidades })
        .then((r) => { if (alive) setMessage(r.message ?? ''); })
        .catch(() => { if (alive) setMessage(''); })
        .finally(() => { if (alive) setLoading(false); });
    }, 300);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [entry, kind, atendente, especialidades]);

  const send = async () => {
    if (!entry) return;
    setSending(true);
    try {
      saveAtendente(atendente);
      await convenioWaitlistApi.sendWhatsapp(entry._id, { kind, message, atendente, especialidades, confirm: true });
      toast.success(`Mensagem para ${entry.name} na fila do WhatsApp da clínica. Vira "contatado" quando sair.`);
      onSent();
      onClose();
    } catch {
      toast.error('Não foi possível enviar. Nada foi disparado.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(entry)} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Enviar WhatsApp — {entry?.name}</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="success"
          value={kind}
          onChange={(_, value: BulkSendKind | null) => { if (value) setKind(value); }}
          sx={{ mb: 2, mt: 1 }}
        >
          <ToggleButton value="particular">Retomar contato</ToggleButton>
          <ToggleButton value="credenciado">Agora atendemos</ToggleButton>
        </ToggleButtonGroup>
        {kind === 'credenciado' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Só depois da confirmação formal do credenciamento do {entry?.convenioLabel}.
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          {kind === 'particular' ? (
            <TextField size="small" label="Seu nome (assina a mensagem)" value={atendente} onChange={(e) => setAtendente(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
          ) : (
            <TextField size="small" label="Especialidades liberadas (opcional)" placeholder="Ex.: fonoaudiologia" value={especialidades} onChange={(e) => setEspecialidades(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
          )}
        </Box>
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <TextField
            label="Mensagem (pode editar)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            minRows={8}
            fullWidth
          />
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          Sai pelo WhatsApp da clínica (*texto* fica em negrito no WhatsApp). Não abre outra página.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancelar</Button>
        <Button variant="contained" color="success" onClick={send} disabled={sending || loading || !message.trim()}>
          {sending ? 'Enviando…' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
