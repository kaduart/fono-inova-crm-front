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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { commercialService, type ReengagePeriod, type ReengagePerson, type ReengagePreview } from '../../services/commercialService';
import { formatDateBR } from '../../utils/convenioWaitlist';
import { specialtyText } from './commercialCopy';
import { toast } from '../../utils/toast';

// Mesmo nome que assina o envio de convênios: a secretária digita uma vez só.
const ATENDENTE_KEY = 'convenioBulkAtendente';
const readAtendente = (): string => {
  try { return window.localStorage.getItem(ATENDENTE_KEY) ?? ''; } catch { return ''; }
};
const saveAtendente = (value: string) => {
  try { window.localStorage.setItem(ATENDENTE_KEY, value); } catch { /* sem storage: só não lembra */ }
};

const PERIODS: Array<{ value: ReengagePeriod; label: string; hint: string }> = [
  { value: 'all', label: 'Todo o histórico', hint: 'Todas as avaliações já feitas, sem sessão nem pacote depois' },
  { value: 15, label: 'Há +15 dias', hint: 'Avaliou há mais de 15 dias e não voltou' },
  { value: 30, label: 'Há +30 dias', hint: 'Avaliou há mais de 30 dias e não voltou' },
  { value: 60, label: 'Há +60 dias', hint: 'Avaliou há mais de 60 dias e não voltou' },
];

const LIMIT_TEXT: Record<ReengagePreview['limitReason'], string> = {
  limite_diario: 'limite de segurança do dia para o chip não ser bloqueado',
  fim_do_horario: 'o que cabe até 18h45',
  fim_de_semana: 'fim de semana: o envio só roda em dia útil',
  antes_do_horario: 'antes das 8h: o envio começa às 8h',
};

const SKIP_TEXT: Record<NonNullable<ReengagePerson['reason']>, string> = {
  sem_telefone: 'sem celular no cadastro',
  inativo: 'paciente inativado',
  nao_vai_fechar: 'marcado como "Não vai fechar"',
  conversa_recente: 'conversou com a clínica há pouco',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const shortDate = (iso: string | null | undefined) => formatDateBR(iso).slice(0, 5);
const dayGroup = (p: ReengagePerson): string => {
  if (p.excluded) return 'Desmarcados (não recebem)';
  if (p.today) return 'Hoje';
  if (!p.scheduledFor) return 'Depois';
  return `${WEEKDAYS[new Date(p.scheduledFor).getDay()]} ${shortDate(p.scheduledFor)}`;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

/**
 * "Retomar contato com quem sumiu": avaliou e não teve sessão nem pacote depois. Prévia primeiro, envia só ao
 * confirmar, pelo WhatsApp da clínica (mesmo motor e mesmo limite de 40/dia do envio de convênios).
 */
export default function EvaluationReengageDialog({ open, onClose, onSent }: Props) {
  const [period, setPeriod] = useState<ReengagePeriod>('all');
  const [atendente, setAtendente] = useState(readAtendente);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<ReengagePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setExcludeIds([]);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      commercialService.evaluationReengage({ period, atendente, excludeIds })
        .then(({ preview: p }) => { if (alive) setPreview(p); })
        .catch(() => { if (alive) setError('Não foi possível carregar a lista.'); })
        .finally(() => { if (alive) setLoading(false); });
    }, 300);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [open, period, atendente, excludeIds]);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  const toggle = (id: string) =>
    setExcludeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const send = async () => {
    setSending(true);
    try {
      saveAtendente(atendente);
      const { queued, finishesAt } = await commercialService.evaluationReengage({ period, atendente, excludeIds, confirm: true });
      toast.success(`${queued} ${queued === 1 ? 'mensagem agendada' : 'mensagens agendadas'}${finishesAt ? ` (termina ${formatDateBR(finishesAt)})` : ''}. Ninguém recebe duas vezes.`);
      onSent?.();
      onClose();
    } catch {
      toast.error('Não foi possível enviar. Nada foi disparado.');
    } finally {
      setSending(false);
    }
  };

  const recipients = useMemo(
    () => [...(preview?.recipients ?? [])].sort((a, b) => Number(Boolean(a.excluded)) - Number(Boolean(b.excluded))),
    [preview],
  );
  const skipped = preview?.skipped ?? [];

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

  const leftOut = useMemo(() => {
    if (!preview) return [];
    const rows: string[] = [];
    if (preview.alreadySent) rows.push(`${preview.alreadySent} já ${preview.alreadySent === 1 ? 'recebeu' : 'receberam'} esta mensagem`);
    if (preview.skippedRecentChat) rows.push(`${preview.skippedRecentChat} ${preview.skippedRecentChat === 1 ? 'conversou' : 'conversaram'} com a clínica nos últimos ${preview.recentDays} dias`);
    if (preview.skippedLost) rows.push(`${preview.skippedLost} ${preview.skippedLost === 1 ? 'foi marcado' : 'foram marcados'} como "Não vai fechar"`);
    if (preview.skippedInactive) rows.push(`${preview.skippedInactive} ${preview.skippedInactive === 1 ? 'está inativado' : 'estão inativados'}`);
    if (preview.skippedNoPhone) rows.push(`${preview.skippedNoPhone} sem celular no cadastro`);
    if (preview.unchecked) rows.push(`${preview.unchecked} ${preview.unchecked === 1 ? 'foi desmarcado' : 'foram desmarcados'} por você`);
    return rows;
  }, [preview]);

  const periodHint = PERIODS.find((p) => p.value === period)?.hint;

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Retomar contato com quem sumiu</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Quem fez avaliação e não teve sessão nem pacote depois.
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={period}
          onChange={(_, v: ReengagePeriod | null) => { if (v != null) { setPeriod(v); setExcludeIds([]); } }}
          aria-label="Período"
          sx={{ flexWrap: 'wrap', mb: 0.5 }}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={String(p.value)} value={p.value} sx={{ textTransform: 'none', px: 1.5 }}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>{periodHint}</Typography>
        <TextField
          size="small"
          fullWidth
          label="Seu nome (assina a mensagem)"
          placeholder="Ex.: Bia"
          value={atendente}
          onChange={(event) => setAtendente(event.target.value)}
          helperText={atendente.trim() ? `Sai como "Aqui é a ${atendente.trim()}"` : 'Sem nome, sai como "Aqui é da Clínica Fono Inova"'}
          sx={{ mb: 2 }}
        />

        {loading && !preview && <CircularProgress size={24} />}
        {error && <Alert severity="error">{error}</Alert>}
        {preview && (
          <Box sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
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
                  <Box role="img" aria-label={dayPlan.map((d) => `${d.label}: ${d.count}`).join(', ')} sx={{ display: 'flex', gap: 0.5, mt: 1.25, mb: 1, overflowX: 'auto' }}>
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
                      ? `Até 40 por dia (somando o envio de convênios), para o chip não ser bloqueado. Termina ${dayPlan[dayPlan.length - 1]?.label ?? shortDate(preview.finishesAt)} sem você precisar voltar aqui.`
                      : 'Uma mensagem a cada 1,5 minuto, mais ou menos.'}
                  </Typography>
                </>
              )}
              {leftOut.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>Não recebem: </Box>
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
                            {i === 0 && <Typography variant="caption" color="text.secondary" sx={{ float: 'right', pr: 0.5 }}>avaliou em</Typography>}
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
                              {p.specialty ? `${specialtyText(p.specialty)}, ` : ''}final {p.phoneTail}
                              {p.lastClinicMessageAt ? `, última conversa ${shortDate(p.lastClinicMessageAt)}` : ''}
                            </Typography>
                          </Box>
                          {p.since && (
                            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, pr: 0.5 }}>{formatDateBR(p.since).slice(0, 10)}</Typography>
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
                    <Box key={`${p.id}-${p.reason}`} px={2} py={0.75} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.phoneTail ? `final ${p.phoneTail}: ` : ''}{p.reason ? SKIP_TEXT[p.reason] : ''}
                        {p.reason === 'conversa_recente' && p.lastClinicMessageAt ? ` (${shortDate(p.lastClinicMessageAt)})` : ''}
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
              1 mensagem por telefone (irmãos recebem uma só), 1 a cada ~1,5 min, pelo WhatsApp da clínica. Antes de cada
              envio o sistema olha a conversa de novo: se alguém da equipe falou com a pessoa nesse meio-tempo, não manda.
              {preview.sentToday ? ` Já saíram hoje: ${preview.sentToday}.` : ''}
            </Typography>
          </Box>
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
          {sending ? 'Agendando…' : `Enviar para ${preview?.willSend ?? 0}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
