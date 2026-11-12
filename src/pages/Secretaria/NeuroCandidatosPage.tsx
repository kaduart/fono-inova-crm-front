// 🧠 Candidatos a neuro (recepção): pacientes da casa com indicação de consulta com neuropediatra
// para o laudo (TEA/TDAH). A recepção oferece pelo WhatsApp e registra o resultado.
// Vira "Agendou" sozinho quando a consulta de neuro aparece na agenda.
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { ManageSearch, Refresh, WhatsApp } from '@mui/icons-material';
import { toast } from '../../utils/toast';
import { notifyApiError } from '../../utils/notifyApiError';
import neuroReferralApi, {
  type NeuroReferral, type NeuroReferralStatus, type NeuroReferralSummary,
} from '../../services/neuroReferralService';
import {
  ageLabel, buildNeuroWhatsAppUrl, NEURO_MATCHED_IN_LABELS, NEURO_REASON_LABELS, NEURO_SPECIALTY_LABELS,
  NEURO_STATUS_META, patientOf,
} from '../../utils/neuroReferral';

type TabId = 'oferecer' | 'oferecido' | 'a_confirmar' | 'fechados';

const TABS: { id: TabId; label: string; status: string }[] = [
  { id: 'oferecer', label: 'Oferecer', status: 'indicado' },
  { id: 'oferecido', label: 'Oferecidos', status: 'oferecido' },
  { id: 'a_confirmar', label: 'Aguardando terapeuta', status: 'a_confirmar' },
  { id: 'fechados', label: 'Fechados', status: 'agendado,recusado,ja_tem_laudo,descartado' },
];

const fmtDate = (iso?: string | null) => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
};

export default function NeuroCandidatosPage() {
  const [tab, setTab] = useState<TabId>('oferecer');
  const [items, setItems] = useState<NeuroReferral[]>([]);
  const [summary, setSummary] = useState<NeuroReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [declineFor, setDeclineFor] = useState<NeuroReferral | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = TABS.find(t => t.id === tab)!.status;
      const [list, sum] = await Promise.all([neuroReferralApi.list(status), neuroReferralApi.summary()]);
      setItems(list);
      setSummary(sum);
    } catch (err) {
      notifyApiError(err, 'Não foi possível carregar os candidatos a neuro');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (r: NeuroReferral, status: NeuroReferralStatus, extra: { declineReason?: string } = {}) => {
    setBusyId(r._id);
    try {
      await neuroReferralApi.update(r._id, { status, ...extra });
      toast.success(`Marcado como "${NEURO_STATUS_META[status].label}"`);
      await load();
    } catch (err) {
      notifyApiError(err, 'Não foi possível atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await neuroReferralApi.scan(false);
      toast.success(res.created
        ? `${res.created} paciente(s) sugerido(s). Agora a terapeuta confirma a indicação.`
        : 'Nenhum paciente novo com sinais de TEA/TDAH.');
      await load();
    } catch (err) {
      notifyApiError(err, 'Não foi possível buscar sugestões');
    } finally {
      setScanning(false);
    }
  };

  const openWhatsApp = (r: NeuroReferral) => {
    const p = patientOf(r);
    const url = p ? buildNeuroWhatsAppUrl(p) : null;
    if (!url) { toast.warn('Paciente sem telefone válido no cadastro'); return; }
    window.open(url, '_blank', 'noopener');
  };

  const kpis = summary ? [
    { label: 'Para oferecer', value: summary.pendingOffer },
    { label: 'Aguardando terapeuta', value: summary.pendingTherapist },
    { label: 'Agendaram', value: summary.byStatus.agendado },
    { label: 'Conversão', value: summary.conversionRate === null ? '—' : `${Math.round(summary.conversionRate * 100)}%` },
  ] : [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto', textAlign: 'left' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Candidatos a neuro</Typography>
          <Typography variant="body2" color="text.secondary">
            Pacientes da casa com indicação de consulta com neuropediatra para o laudo. Consulta só particular.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Procura TEA/TDAH na queixa e na anamnese de quem faz fono, psico ou TO e ainda não passou no neuro">
            <span>
              <Button variant="outlined" startIcon={scanning ? <CircularProgress size={16} /> : <ManageSearch />} onClick={runScan} disabled={scanning}>
                Buscar sugestões
              </Button>
            </span>
          </Tooltip>
          <Button variant="text" startIcon={<Refresh />} onClick={load} disabled={loading}>Atualizar</Button>
        </Stack>
      </Stack>

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
          {kpis.map(k => (
            <Card key={k.label} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                <Typography variant="h6" fontWeight={700}>{k.value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2 }}>
        {TABS.map(t => <Tab key={t.id} value={t.id} label={t.label} />)}
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">
          {tab === 'oferecer'
            ? 'Ninguém para oferecer agora. Use "Buscar sugestões" ou peça para a terapeuta indicar pela ficha do paciente.'
            : 'Nada nesta lista.'}
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {items.map(r => {
            const p = patientOf(r);
            const meta = NEURO_STATUS_META[r.status];
            const busy = busyId === r._id;
            const canOffer = r.status === 'indicado' || r.status === 'oferecido';
            return (
              <Card key={r._id} variant="outlined" data-testid="neuro-candidate">
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                    <Box minWidth={0}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={700}>{p?.fullName || 'Paciente'}</Typography>
                        <Chip size="small" color={meta.color} label={meta.label} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {[ageLabel(p?.dateOfBirth), p?.legalGuardian && `Resp.: ${p.legalGuardian}`, p?.phone].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                      <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap" useFlexGap>
                        {r.reasons.map(reason => <Chip key={reason} size="small" variant="outlined" label={NEURO_REASON_LABELS[reason] || reason} />)}
                        {r.homeSpecialties.map(s => <Chip key={s} size="small" variant="outlined" label={NEURO_SPECIALTY_LABELS[s] || s} />)}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {r.source === 'sugestao_automatica'
                          ? `Sugestão automática (${r.matchedIn.map(w => NEURO_MATCHED_IN_LABELS[w] || w).join(', ')})`
                          : 'Indicado pela terapeuta'}
                        {` · desde ${fmtDate(r.createdAt)}`}
                        {r.offeredAt ? ` · oferecido em ${fmtDate(r.offeredAt)}` : ''}
                      </Typography>
                      {r.note && <Typography variant="body2" mt={0.5}>“{r.note}”</Typography>}
                      {r.declineReason && <Typography variant="body2" mt={0.5} color="error.main">Motivo: {r.declineReason}</Typography>}
                    </Box>
                    {canOffer && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
                        <Button size="small" variant="contained" color="success" startIcon={<WhatsApp />} onClick={() => openWhatsApp(r)}>
                          Oferecer
                        </Button>
                        {r.status === 'indicado' && (
                          <Button size="small" variant="outlined" disabled={busy} onClick={() => setStatus(r, 'oferecido')}>Já ofereci</Button>
                        )}
                        <Button size="small" variant="outlined" color="success" disabled={busy} onClick={() => setStatus(r, 'agendado')}>Agendou</Button>
                        <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => { setDeclineFor(r); setDeclineReason(''); }}>Recusou</Button>
                        <Button size="small" variant="text" disabled={busy} onClick={() => setStatus(r, 'ja_tem_laudo')}>Já tem laudo</Button>
                      </Stack>
                    )}
                    {r.status === 'recusado' && (
                      <Box><Button size="small" variant="outlined" disabled={busy} onClick={() => setStatus(r, 'indicado')}>Reabrir</Button></Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Dialog open={!!declineFor} onClose={() => setDeclineFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Família recusou</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth multiline minRows={2} margin="dense" label="Motivo (opcional)"
            placeholder="Ex.: vai pensar depois das férias; preço; já procura fora"
            value={declineReason} onChange={e => setDeclineReason(e.target.value)} inputProps={{ maxLength: 500 }} />
          <Typography variant="caption" color="text.secondary">Não volta a ser sugerido por 6 meses.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineFor(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={async () => {
            const r = declineFor; setDeclineFor(null);
            if (r) await setStatus(r, 'recusado', { declineReason: declineReason.trim() || undefined });
          }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
