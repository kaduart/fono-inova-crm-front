import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
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

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** Grupo da lista: "Hoje", "sex 13/11" (dia em que a mensagem sai) ou "Desmarcados". */
const dayGroup = (p: BulkSendPerson): string => {
  if (p.excluded) return 'Desmarcados (não recebem)';
  if (p.today) return 'Hoje';
  if (!p.scheduledFor) return 'Depois';
  const d = new Date(p.scheduledFor);
  return `${WEEKDAYS[d.getDay()]} ${formatDateBR(p.scheduledFor).slice(0, 5)}`;
};

const skipReasonText = (p: BulkSendPerson) =>
  p.reason === 'sessao_futura'
    ? 'já tem sessão marcada'
    : `a clínica falou em ${formatDateBR(p.lastClinicMessageAt).slice(0, 5)}`;

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

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

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
  // Ordem da lista: hoje, próximos dias e, no fim, os desmarcados.
  const recipients = useMemo(
    () => [...(preview?.recipients ?? [])].sort((a, b) => Number(Boolean(a.excluded)) - Number(Boolean(b.excluded))),
    [preview],
  );
  const skipped = preview?.skipped ?? [];

  // Plano por dia (quem está marcado): vira a faixa "Hoje 40 | sex 13/11 40 | seg 16/11 22".
  const dayPlan = useMemo(() => {
    const plan: Array<{ label: string; count: number; today: boolean }> = [];
    for (const p of recipients) {
      if (p.excluded) continue;
      const label = dayGroup(p);
      const last = plan[plan.length - 1];
      if (last?.label === label) last.count++;
      else plan.push({ label, count: 1, today: Boolean(p.today) });
    }
    return plan;
  }, [recipients]);
  const showConvenio = !convenio;
  const shortDate = (iso: string | null | undefined) => formatDateBR(iso).slice(0, 5);

  const leftOut = useMemo(() => {
    if (!preview) return [];
    const rows: string[] = [];
    if (preview.alreadySent) rows.push(`${preview.alreadySent} já ${preview.alreadySent === 1 ? 'recebeu' : 'receberam'} esta mensagem`);
    if (preview.skippedRecentChat) rows.push(`${preview.skippedRecentChat} ${preview.skippedRecentChat === 1 ? 'conversou' : 'conversaram'} com a clínica nos últimos ${preview.recentDays ?? 30} dias`);
    if (preview.skippedWithSession) rows.push(`${preview.skippedWithSession} já ${preview.skippedWithSession === 1 ? 'tem' : 'têm'} sessão marcada`);
    if (preview.markedContatado) rows.push(`${preview.markedContatado} ${preview.markedContatado === 1 ? 'foi marcado' : 'foram marcados'} como Contatado`);
    if (preview.unchecked) rows.push(`${preview.unchecked} ${preview.unchecked === 1 ? 'foi desmarcado' : 'foram desmarcados'} por você`);
    return rows;
  }, [preview]);

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
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

            <Box mb={2}>
              <Typography variant="h6" component="p" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {preview.willSend === 0
                  ? 'Ninguém para receber agora'
                  : (preview.days ?? 1) <= 1
                    ? `${plural(preview.willSend, 'pessoa recebe', 'pessoas recebem')} ${preview.todayCount ? 'hoje' : 'no próximo dia útil'}`
                    : `${plural(preview.willSend, 'pessoa', 'pessoas')} em ${preview.days} dias úteis`}
              </Typography>
              {preview.willSend === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {preview.eligible === 0 ? 'Todo mundo já recebeu ou ficou de fora pelos motivos abaixo.' : `Nada sai agora: ${LIMIT_TEXT[preview.limitReason]}.`}
                </Typography>
              ) : (
                <>
                  {/* Faixa do plano: cada dia ocupa a largura proporcional ao número de mensagens */}
                  <Box
                    role="img"
                    aria-label={dayPlan.map((d) => `${d.label}: ${d.count}`).join(', ')}
                    sx={{ display: 'flex', gap: 0.5, mt: 1.25, mb: 1 }}
                  >
                    {dayPlan.map((d) => (
                      <Box
                        key={d.label}
                        sx={{
                          flexGrow: d.count,
                          flexBasis: 0,
                          minWidth: 64,
                          px: 1,
                          py: 0.75,
                          borderRadius: 1,
                          bgcolor: d.today ? 'success.main' : 'action.selected',
                          color: d.today ? 'success.contrastText' : 'text.primary',
                        }}
                      >
                        <Typography variant="caption" component="div" sx={{ opacity: 0.85, lineHeight: 1.2 }}>{d.label}</Typography>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{d.count}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {(preview.days ?? 1) > 1
                      ? `Até 40 por dia, para o chip não ser bloqueado. Termina ${dayPlan[dayPlan.length - 1]?.label ?? shortDate(preview.finishesAt)} sem você precisar voltar aqui.`
                      : 'Uma mensagem a cada 1,5 minuto, mais ou menos.'}
                  </Typography>
                </>
              )}
              {leftOut.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>Não recebem de novo: </Box>
                  {leftOut.join('; ')}.
                </Typography>
              )}
            </Box>

            {recipients.length > 0 && (
              <Accordion disableGutters variant="outlined" defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2" fontWeight={600}>Quem vai receber ({preview.eligible})</Typography>
                </AccordionSummary>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} px={1.5} pb={0.5}>
                  <Typography variant="caption" color="text.secondary">{fullScreen ? 'Desmarque quem não deve' : 'Desmarque quem não deve receber'}</Typography>
                  <Box display="flex" flexShrink={0}>
                    <Button size="small" onClick={() => setExcludeIds([])} disabled={!excludeIds.length}>Todos</Button>
                    <Button size="small" onClick={() => setExcludeIds(recipients.map((p) => p.id))} disabled={excludeIds.length >= recipients.length}>Nenhum</Button>
                  </Box>
                </Box>
                <AccordionDetails sx={{ p: 0, maxHeight: fullScreen ? 'none' : 320, overflowY: 'auto' }}>
                  {recipients.map((p, i) => {
                    const group = dayGroup(p);
                    const newGroup = i === 0 || dayGroup(recipients[i - 1]) !== group;
                    const count = newGroup ? recipients.filter((r) => dayGroup(r) === group).length : 0;
                    return (
                      <Fragment key={p.id}>
                        {newGroup && (
                          <Box px={1.5} py={0.5} sx={{ bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider', position: 'sticky', top: 0, zIndex: 1 }}>
                            <Typography variant="caption" fontWeight={700}>{group}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{plural(count, 'pessoa', 'pessoas')}</Typography>
                            {i === 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ float: 'right', pr: 0.5 }}>procurou em</Typography>
                            )}
                          </Box>
                        )}
                        <Box
                          component="label"
                          display="flex"
                          alignItems="center"
                          gap={1}
                          px={1}
                          py={0.25}
                          sx={{ borderTop: 1, borderColor: 'divider', cursor: 'pointer', opacity: p.excluded ? 0.55 : 1 }}
                        >
                          <Checkbox
                            size="small"
                            checked={!p.excluded}
                            onChange={() => toggle(p.id)}
                            inputProps={{ 'aria-label': `${p.excluded ? 'Incluir' : 'Tirar'} ${p.name}` }}
                          />
                          <Box flex={1} minWidth={0}>
                            <Typography variant="body2" noWrap>{p.name}</Typography>
                            <Typography variant="caption" color="text.secondary" component="div" noWrap>
                              {showConvenio ? `${convenioLabel(p.convenio)}, ` : ''}final {p.phoneTail}
                              {p.lastClinicMessageAt ? `, a clínica falou em ${shortDate(p.lastClinicMessageAt)}` : ''}
                            </Typography>
                          </Box>
                          {p.since && (
                            <Box textAlign="right" flexShrink={0} pr={0.5}>
                              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{shortDate(p.since)}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Fragment>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            )}

            {skipped.length > 0 && (
              <Accordion disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">Ver quem fica de fora ({skipped.length})</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, maxHeight: 240, overflowY: 'auto' }}>
                  {skipped.map((p) => (
                    <Box key={p.id} px={2} py={0.75} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {showConvenio ? `${convenioLabel(p.convenio)}, ` : ''}final {p.phoneTail}: {skipReasonText(p)}
                      </Typography>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {preview.sample && (
              <Accordion disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">Ver como a mensagem chega (exemplo)</Typography>
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
