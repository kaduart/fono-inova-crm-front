import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
import { ExpandMore } from '@mui/icons-material';
import convenioWaitlistApi, {
  type BulkSendKind,
  type BulkSendPerson,
  type BulkSendPreview,
  type WaitlistConvenio,
} from '../../services/convenioWaitlistService';
import { CONVENIO_OPTIONS, convenioLabel, formatDateBR, formatDateTimeBR } from '../../utils/convenioWaitlist';
import { toast } from '../../utils/toast';

const ATENDENTE_KEY = 'convenioBulkAtendente';
const readAtendente = (): string => {
  try { return window.localStorage.getItem(ATENDENTE_KEY) ?? ''; } catch { return ''; }
};
const saveAtendente = (value: string) => {
  try { window.localStorage.setItem(ATENDENTE_KEY, value); } catch { /* sem storage: só não lembra */ }
};

const LIMIT_TEXT: Record<BulkSendPreview['limitReason'], string> = {
  limite_diario: 'limite de segurança do dia para o chip não ser bloqueado',
  fim_do_horario: 'o que cabe até 18h45',
  fim_de_semana: 'fim de semana: o envio só roda em dia útil',
  antes_do_horario: 'antes das 8h: o envio começa às 8h',
};

const POLL_MS = 6000;
const POLL_MAX = 30; // ~3 min esperando a conferência das conversas

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const skipReasonText = (p: BulkSendPerson) =>
  p.reason === 'sessao_futura'
    ? 'Já tem sessão marcada'
    : `Conversou com a clínica em ${formatDateBR(p.lastClinicMessageAt)}`;

interface Props {
  open: boolean;
  kind: BulkSendKind;
  initialConvenio: WaitlistConvenio | '';
  onClose: () => void;
  onSent: () => void;
}

/**
 * Envio em massa ("Retomar contato" ou "Agora atendemos o plano"). Prévia primeiro, envia só ao confirmar.
 * Mostra quem recebe hoje (dá para desmarcar) e quem fica de fora e por quê: já recebeu, conversou com a
 * clínica há pouco (inclusive na mão), tem sessão marcada ou foi marcado como Contatado.
 */
export default function ConvenioBulkSendDialog({ open, kind, initialConvenio, onClose, onSent }: Props) {
  const [convenio, setConvenio] = useState<WaitlistConvenio | ''>(initialConvenio);
  const [especialidades, setEspecialidades] = useState('');
  const [atendente, setAtendente] = useState(readAtendente);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<BulkSendPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTick, setPollTick] = useState(0);

  useEffect(() => {
    if (open) {
      setConvenio(initialConvenio);
      setEspecialidades('');
      setExcludeIds([]);
      setPollTick(0);
    }
  }, [open, initialConvenio]);

  const needsConvenio = kind === 'credenciado' && !convenio;

  useEffect(() => {
    if (!open || needsConvenio) {
      setPreview(null);
      return undefined;
    }
    let alive = true;
    const silent = pollTick > 0;
    if (!silent) setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      convenioWaitlistApi.bulkSend({ kind, convenio, especialidades, atendente, excludeIds })
        .then(({ preview: p }) => { if (alive) setPreview(p); })
        .catch(() => { if (alive && !silent) setError('Não foi possível carregar a prévia.'); })
        .finally(() => { if (alive) setLoading(false); });
    }, silent ? 0 : 300);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [open, kind, convenio, especialidades, atendente, excludeIds, needsConvenio, pollTick]);

  // Enquanto o worker confere as conversas no WhatsApp, recarrega a prévia sozinha.
  const checking = preview?.activity?.status === 'queued' || preview?.activity?.status === 'running';
  useEffect(() => {
    if (!open || !checking || pollTick >= POLL_MAX) return undefined;
    const t = window.setTimeout(() => setPollTick((n) => n + 1), POLL_MS);
    return () => window.clearTimeout(t);
  }, [open, checking, pollTick]);

  const toggle = (id: string) =>
    setExcludeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const send = async () => {
    setSending(true);
    try {
      saveAtendente(atendente);
      const { queued, finishesAt } = await convenioWaitlistApi.bulkSend({ kind, convenio, especialidades, atendente, excludeIds, confirm: true });
      toast.success(`${queued} ${queued === 1 ? 'mensagem agendada' : 'mensagens agendadas'}${finishesAt ? ` (termina ${formatDateBR(finishesAt)})` : ''}. Cada pessoa ganha o selo "enviado" quando a mensagem sai.`);
      onSent();
      onClose();
    } catch {
      toast.error('Não foi possível enviar. Nada foi disparado.');
    } finally {
      setSending(false);
    }
  };

  const title = kind === 'credenciado' ? 'Avisar: agora atendemos o plano' : 'Retomar contato';
  const recipients = preview?.recipients ?? [];
  const skipped = preview?.skipped ?? [];

  const leftOut = useMemo(() => {
    if (!preview) return [];
    const rows: string[] = [];
    if (preview.alreadySent) rows.push(`${plural(preview.alreadySent, 'já recebeu', 'já receberam')} esta mensagem`);
    if (preview.skippedRecentChat) rows.push(`${plural(preview.skippedRecentChat, 'conversou', 'conversaram')} com a clínica nos últimos ${preview.recentDays ?? 30} dias`);
    if (preview.skippedWithSession) rows.push(`${plural(preview.skippedWithSession, 'já tem', 'já têm')} sessão marcada`);
    if (preview.markedContatado) rows.push(`${plural(preview.markedContatado, 'marcado', 'marcados')} como Contatado pela equipe`);
    if (preview.unchecked) rows.push(`${plural(preview.unchecked, 'desmarcado', 'desmarcados')} por você`);
    return rows;
  }, [preview]);

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
              onChange={(event) => { setConvenio(event.target.value as WaitlistConvenio | ''); setExcludeIds([]); }}
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
              helperText={atendente.trim() ? `Sai como "Aqui é a ${atendente.trim()}"` : 'Sem nome, sai como "Aqui é da Clínica Fono Inova"'}
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
            {checking && (
              <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
                Conferindo no WhatsApp quem já conversou com a clínica… a lista atualiza sozinha.
              </Alert>
            )}
            {preview.activity?.status === 'failed' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Não deu para conferir as conversas agora. Mesmo assim, antes de cada mensagem o sistema confere de novo.
              </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
              <Typography variant="h6" component="p">
                {preview.willSend > 0 ? `Vão receber ${plural(preview.willSend, 'pessoa', 'pessoas')}` : 'Ninguém para receber agora'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {preview.willSend === 0
                  ? (preview.eligible === 0 ? 'Todo mundo da lista já recebeu ou está fora pelos motivos abaixo.' : `Nada sai agora: ${LIMIT_TEXT[preview.limitReason]}.`)
                  : (preview.days ?? 1) <= 1
                    ? `Todas saem ${preview.todayCount ? 'hoje' : 'no próximo dia útil'}, 1 a cada ~1,5 min.`
                    : `${preview.todayCount ?? 0} hoje e o resto sozinho nos próximos dias úteis (até 40 por dia, para o chip não ser bloqueado). Termina ${formatDateBR(preview.finishesAt)}. Você não precisa voltar aqui.`}
              </Typography>
              {leftOut.length > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" fontWeight={600}>Ficam de fora (não recebem de novo):</Typography>
                  {leftOut.map((line) => (
                    <Typography key={line} variant="body2" color="text.secondary">• {line}</Typography>
                  ))}
                </Box>
              )}
            </Paper>

            {recipients.length > 0 && (
              <Accordion disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">Ver quem vai receber ({preview.eligible}) · desmarque quem não deve</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, maxHeight: 280, overflowY: 'auto' }}>
                  {recipients.map((p) => (
                    <Box key={p.id} display="flex" alignItems="center" gap={1} px={1} py={0.25} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Checkbox
                        size="small"
                        checked={!p.excluded}
                        onChange={() => toggle(p.id)}
                        inputProps={{ 'aria-label': `${p.excluded ? 'Incluir' : 'Tirar'} ${p.name}` }}
                      />
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {convenioLabel(p.convenio)} · final {p.phoneTail}{p.since ? ` · procurou em ${formatDateBR(p.since)}` : ''}
                          {p.lastClinicMessageAt ? ` · última msg da clínica ${formatDateBR(p.lastClinicMessageAt)}` : ''}
                        </Typography>
                      </Box>
                      {!p.excluded && (
                        <Chip size="small" variant="outlined" color={p.today ? 'success' : 'default'} label={p.today ? 'hoje' : p.scheduledFor ? formatDateBR(p.scheduledFor).slice(0, 5) : 'depois'} />
                      )}
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {skipped.length > 0 && (
              <Accordion disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">Quem fica de fora agora ({skipped.length})</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, maxHeight: 240, overflowY: 'auto' }}>
                  {skipped.map((p) => (
                    <Box key={p.id} px={2} py={0.75} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {convenioLabel(p.convenio)} · final {p.phoneTail} · {skipReasonText(p)}
                      </Typography>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {preview.sample && (
              <Accordion disableGutters variant="outlined" defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">Como a mensagem chega (exemplo)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{preview.sample}</Box>
                </AccordionDetails>
              </Accordion>
            )}

            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              1 mensagem por telefone, 1 a cada ~1,5 min, pelo WhatsApp da clínica. Antes de cada envio o sistema olha a
              conversa de novo: se alguém da equipe falou com a pessoa nesse meio-tempo, não manda.
              {preview.sentToday ? ` Já saíram hoje: ${preview.sentToday}.` : ''}
              {preview.activity?.finishedAt && !checking ? ` Conversas conferidas em ${formatDateTimeBR(preview.activity.finishedAt)}.` : ''}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancelar</Button>
        <Button
          variant="contained"
          color="success"
          onClick={send}
          disabled={sending || loading || checking || !preview || preview.willSend === 0}
        >
          {sending ? 'Agendando…' : checking ? 'Conferindo conversas…' : `Enviar para ${preview?.willSend ?? 0}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
