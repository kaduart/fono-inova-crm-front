import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Campaign, EditNote, FileDownload, LocalOffer, ManageSearch, MarkChatRead, Refresh, Search, WhatsApp } from '@mui/icons-material';
import ConvenioBulkSendDialog from './ConvenioBulkSendDialog';
import ConvenioSendDialog from './ConvenioSendDialog';
import { toast } from '../../utils/toast';
import useConvenioWaitlist from '../../hooks/useConvenioWaitlist';
import convenioWaitlistApi, {
  type WaitlistChannel,
  type WaitlistConvenio,
  type WaitlistEntry,
  type WaitlistListParams,
  type WaitlistStatus,
  type BulkSendKind,
  type WhatsappDeepScanRun,
  type WhatsappScanRun,
} from '../../services/convenioWaitlistService';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { brl, KpiStrip } from '../Financial/components/finUi';
import {
  buildWaitlistCsv,
  CONVENIO_OPTIONS,
  convenioLabel,
  csvFileName,
  formatDateBR,
  isFromWhatsapp,
  scanStatusText,
  sendBadgesFor,
  deepScanStatusText,
  ESPECIALIDADE_OPTIONS,
  formatAge,
  formatDateTimeBR,
  formatPhoneBR,
  STATUS_META,
  STATUS_ORDER,
  waitingLabel,
} from '../../utils/convenioWaitlist';

type StatusTab = 'todos' | WaitlistStatus;

const DEFAULT_TAB: StatusTab = 'aguardando';
const NOTES_MAX_LENGTH = 2000;
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_PAGES = 50; // teto de segurança: 5.000 linhas
const SCAN_POLL_MS = 10_000;
const SCAN_ACTIVE: Array<WhatsappScanRun['status']> = ['queued', 'running'];

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || (error instanceof Error && error.message) || fallback;
};

const downloadTextFile = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const SummaryCard = ({
  title,
  value,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  selected?: boolean;
  onClick?: () => void;
}) => {
  const content = (
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" fontWeight="bold" color={selected ? 'primary.main' : 'text.primary'}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    </CardContent>
  );

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}
    >
      {onClick ? (
        <CardActionArea onClick={onClick} aria-pressed={selected} aria-label={`Filtrar por ${title}`} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
};

const ConvenioInteressePage = () => {
  const { entries, total, loading, error, summary, summaryError, fetchList, fetchSummary, updateEntry } =
    useConvenioWaitlist();
  const theme = useTheme();
  // layout de cartões no celular/tablet estreito: a tabela de 7 colunas esconde as ações atrás de rolagem horizontal
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  const [statusTab, setStatusTab] = useState<StatusTab>(DEFAULT_TAB);
  const [convenio, setConvenio] = useState<WaitlistConvenio | ''>('');
  const [channel, setChannel] = useState<WaitlistChannel | ''>('');
  // Busca no WhatsApp: última execução de cada convênio (a tela mostra a mais recente)
  const [scanRuns, setScanRuns] = useState<Partial<Record<WaitlistConvenio, WhatsappScanRun>>>({});
  const [scanMenuAnchor, setScanMenuAnchor] = useState<HTMLElement | null>(null);
  const [startingScan, setStartingScan] = useState(false);
  const [bulkKind, setBulkKind] = useState<BulkSendKind | null>(null);
  const [sendTarget, setSendTarget] = useState<WaitlistEntry | null>(null);
  const [deepRun, setDeepRun] = useState<WhatsappDeepScanRun | null>(null);
  const deepStatusSeen = useRef<WhatsappScanRun['status'] | null>(null);
  const deepCreatedSeen = useRef<number>(0);
  const scanStatusSeen = useRef<Partial<Record<WaitlistConvenio, WhatsappScanRun['status']>>>({});
  const [especialidade, setEspecialidade] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  // Fila por ordem de chegada (mais antigos primeiro) é o padrão: quem entrou antes é atendido antes
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuEntry, setMenuEntry] = useState<WaitlistEntry | null>(null);
  const [discardTarget, setDiscardTarget] = useState<WaitlistEntry | null>(null);
  const [notesTarget, setNotesTarget] = useState<WaitlistEntry | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const filters = useMemo<WaitlistListParams>(
    () => ({
      convenio,
      status: statusTab === 'todos' ? '' : statusTab,
      channel,
      especialidade,
      search,
      order,
    }),
    [convenio, statusTab, channel, especialidade, search, order],
  );

  const listParams = useMemo<WaitlistListParams>(
    () => ({ ...filters, page: page + 1, limit: rowsPerPage }),
    [filters, page, rowsPerPage],
  );

  useEffect(() => {
    fetchList(listParams);
  }, [fetchList, listParams]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const refresh = useCallback(() => {
    fetchList(listParams);
    fetchSummary();
  }, [fetchList, fetchSummary, listParams]);

  const loadScanRuns = useCallback(async () => {
    const results = await Promise.all(
      CONVENIO_OPTIONS.map(async (option) => {
        try {
          return [option.value, await convenioWaitlistApi.latestWhatsappScan(option.value)] as const;
        } catch {
          return [option.value, null] as const; // back sem a rota ou sem permissão: só não mostra a faixa
        }
      }),
    );
    const next: Partial<Record<WaitlistConvenio, WhatsappScanRun>> = {};
    results.forEach(([slug, run]) => { if (run) next[slug] = run; });
    setScanRuns(next);
    try {
      setDeepRun(await convenioWaitlistApi.latestDeepWhatsappScan());
    } catch {
      setDeepRun(null); // back sem a varredura profunda: só não mostra
    }
  }, []);

  useEffect(() => {
    void loadScanRuns();
  }, [loadScanRuns]);

  const activeScan = useMemo(
    () => Object.values(scanRuns).some((run) => run && SCAN_ACTIVE.includes(run.status))
      || Boolean(deepRun && SCAN_ACTIVE.includes(deepRun.status)),
    [scanRuns, deepRun],
  );

  // Enquanto alguma busca está na fila/rodando, consulta a cada 10 s
  useEffect(() => {
    if (!activeScan) return undefined;
    const timer = window.setInterval(() => { void loadScanRuns(); }, SCAN_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activeScan, loadScanRuns]);

  // Quando uma busca termina, avisa e recarrega a lista
  useEffect(() => {
    let finished = false;
    (Object.entries(scanRuns) as Array<[WaitlistConvenio, WhatsappScanRun]>).forEach(([slug, run]) => {
      const before = scanStatusSeen.current[slug];
      if (before && SCAN_ACTIVE.includes(before) && run.status === 'done') {
        finished = true;
        toast.success(scanStatusText({ ...run, convenioLabel: convenioLabel(slug) }));
      }
      scanStatusSeen.current[slug] = run.status;
    });
    if (finished) refresh();
  }, [scanRuns, refresh]);

  // Profunda: recarrega a lista quando entram novos interessados e avisa ao terminar
  useEffect(() => {
    if (!deepRun) return;
    const before = deepStatusSeen.current;
    const created = deepRun.stats?.created ?? 0;
    if (before && SCAN_ACTIVE.includes(before) && deepRun.status === 'done') toast.success(deepScanStatusText(deepRun));
    if (created > deepCreatedSeen.current && before !== null) refresh();
    deepStatusSeen.current = deepRun.status;
    deepCreatedSeen.current = created;
  }, [deepRun, refresh]);

  const startDeepScan = async () => {
    setScanMenuAnchor(null);
    setStartingScan(true);
    try {
      const { run, alreadyRunning } = await convenioWaitlistApi.startDeepWhatsappScan();
      deepStatusSeen.current = run.status;
      setDeepRun(run);
      toast(alreadyRunning
        ? 'A busca completa no WhatsApp já está em andamento.'
        : 'Busca completa iniciada: lê todo o histórico, conversa por conversa. Pode levar horas; os interessados vão entrando na lista.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível iniciar a busca completa no WhatsApp.'));
    } finally {
      setStartingScan(false);
    }
  };

  const resetPage = () => setPage(0);

  // A aba padrão (Aguardando) não conta como filtro do usuário
  const hasActiveFilters = Boolean(convenio || channel || especialidade || search || statusTab !== DEFAULT_TAB);
  const nothingRegisteredYet = summary?.total === 0;

  const clearFilters = () => {
    setConvenio('');
    setChannel('');
    setEspecialidade('');
    setSearch('');
    setSearchInput('');
    setStatusTab(DEFAULT_TAB);
    resetPage();
  };

  const applySearch = () => {
    setSearch(searchInput.trim());
    resetPage();
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    resetPage();
  };

  // Contagem de cada aba respeitando o filtro de convênio (vem do /summary, não da página atual)
  const tabCounts = useMemo(() => {
    if (!summary) return null;
    const slugs = convenio ? [convenio] : CONVENIO_OPTIONS.map((option) => option.value);
    const counts: Record<StatusTab, number> = { todos: 0, aguardando: 0, contatado: 0, agendado: 0, descartado: 0 };
    slugs.forEach((slug) => {
      const item = summary.porConvenio[slug];
      if (!item) return;
      STATUS_ORDER.forEach((status) => {
        counts[status] += item[status] ?? 0;
      });
      counts.todos += item.total ?? 0;
    });
    return counts;
  }, [summary, convenio]);

  const totalAguardando = useMemo(
    () => CONVENIO_OPTIONS.reduce((sum, option) => sum + (summary?.porConvenio[option.value]?.aguardando ?? 0), 0),
    [summary],
  );

  const runUpdate = async (
    entry: WaitlistEntry,
    body: { status?: WaitlistStatus; notes?: string },
    successMessage: string,
  ): Promise<boolean> => {
    setSavingId(entry._id);
    try {
      await updateEntry(entry._id, body);
      toast.success(successMessage);
      if (body.status) {
        // a linha pode não pertencer mais à aba atual (ex.: aguardando → contatado) e os totais mudaram
        fetchList(listParams);
        fetchSummary();
      }
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível atualizar o cadastro.'));
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const changeStatus = (entry: WaitlistEntry, next: WaitlistStatus) => {
    if (next === entry.status) return;
    if (next === 'descartado') {
      setDiscardTarget(entry);
      return;
    }
    void runUpdate(entry, { status: next }, `${entry.name}: ${STATUS_META[next].label.toLowerCase()}`);
  };

  const openStatusMenu = (event: MouseEvent<HTMLElement>, entry: WaitlistEntry) => {
    setMenuAnchor(event.currentTarget);
    setMenuEntry(entry);
  };

  const closeStatusMenu = () => {
    setMenuAnchor(null);
    setMenuEntry(null);
  };

  const confirmDiscard = async () => {
    if (!discardTarget) return;
    const target = discardTarget;
    setDiscardTarget(null);
    await runUpdate(target, { status: 'descartado' }, `${target.name} saiu da lista`);
  };

  const openNotes = (entry: WaitlistEntry) => {
    setNotesTarget(entry);
    setNotesDraft(entry.notes ?? '');
  };

  const saveNotes = async () => {
    if (!notesTarget) return;
    const target = notesTarget;
    const saved = await runUpdate(target, { notes: notesDraft }, 'Notas salvas');
    if (saved) setNotesTarget(null);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: WaitlistEntry[] = [];
      let pageNumber = 1;
      let pages = 1;
      do {
        const result = await convenioWaitlistApi.list({ ...filters, page: pageNumber, limit: EXPORT_PAGE_SIZE });
        all.push(...result.data);
        pages = result.pages;
        pageNumber += 1;
      } while (pageNumber <= pages && pageNumber <= EXPORT_MAX_PAGES);

      if (all.length === 0) {
        toast('Nada para exportar com os filtros atuais.');
        return;
      }
      downloadTextFile(csvFileName(), buildWaitlistCsv(all));
      toast.success(`${all.length} cadastro(s) exportado(s)`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível exportar a lista.'));
    } finally {
      setExporting(false);
    }
  };

  const toggleOrder = () => {
    setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    resetPage();
  };

  const interesseFor = (entry: WaitlistEntry) =>
    [formatAge(entry.idadeCrianca) !== '—' ? formatAge(entry.idadeCrianca) : null, entry.periodo]
      .filter(Boolean)
      .join(' · ');

  // Origem WhatsApp + trecho da conversa + "já é paciente" (cruzamento feito no back)
  const extrasFor = (entry: WaitlistEntry) => {
    const fromWa = isFromWhatsapp(entry);
    const match = entry.patientMatch;
    const sendBadges = sendBadgesFor(entry);
    const lastClinic = entry.whatsapp?.lastClinicMessageAt;
    if (!fromWa && !match && !entry.whatsapp?.snippet && !sendBadges.length && !lastClinic) return null;
    return (
      <Box mt={0.5} display="flex" flexDirection="column" gap={0.5} alignItems="flex-start">
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {fromWa && (
            <Tooltip title={entry.whatsapp?.mentionedBy?.includes('contato') ? 'A pessoa citou o convênio no WhatsApp' : 'Só a clínica citou o convênio nessa conversa: confira antes de chamar'}>
              <Chip size="small" color="success" variant="outlined" icon={<WhatsApp />} label={entry.whatsapp?.mentionedBy?.includes('contato') ? 'WhatsApp' : 'WhatsApp · só a clínica citou'} />
            </Tooltip>
          )}
          {match && (
            <Tooltip title={`Cadastrada como paciente: ${match.patientName}`}>
              <Chip
                size="small"
                color={match.nextAppointmentAt ? 'info' : 'default'}
                label={match.nextAppointmentAt ? `Já é paciente · próx. sessão ${formatDateBR(match.nextAppointmentAt)}` : 'Já é paciente · sem sessão marcada'}
              />
            </Tooltip>
          )}
          {sendBadges.map((badge) => (
            <Tooltip key={badge.label} title={badge.tooltip}>
              <Chip size="small" color={badge.color} icon={<MarkChatRead />} label={badge.label} />
            </Tooltip>
          ))}
        </Box>
        {lastClinic && (
          <Typography variant="caption" color="text.secondary">
            Última mensagem da clínica: {formatDateBR(lastClinic)}
          </Typography>
        )}
        {entry.whatsapp?.snippet && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', maxWidth: 360, wordBreak: 'break-word' }}>
            “{entry.whatsapp.snippet.length > 140 ? `${entry.whatsapp.snippet.slice(0, 140)}…` : entry.whatsapp.snippet}”
            {entry.whatsapp.lastMentionAt ? ` · ${formatDateBR(entry.whatsapp.lastMentionAt)}` : ''}
          </Typography>
        )}
      </Box>
    );
  };

  const statusChipFor = (entry: WaitlistEntry) => {
    const meta = STATUS_META[entry.status];
    if (savingId === entry._id) return <CircularProgress size={20} aria-label="Salvando" />;
    return (
      <Tooltip title={`${meta.hint} — clique para alterar`}>
        <Chip
          size="small"
          color={meta.color}
          label={meta.label}
          onClick={(event) => openStatusMenu(event, entry)}
          aria-label={`Alterar status de ${entry.name} (atual: ${meta.label})`}
        />
      </Tooltip>
    );
  };

  const actionsFor = (entry: WaitlistEntry) => (
    <>
      {entry.status === 'aguardando' && (
        <Button
          size="small"
          variant="contained"
          disabled={savingId === entry._id}
          onClick={() => changeStatus(entry, 'contatado')}
          sx={{ mr: 0.5 }}
        >
          Contatado
        </Button>
      )}
      <Tooltip title="Enviar pelo WhatsApp da clínica (retomar contato ou avisar que agora atendemos). Não abre outra página.">
        <Button
          size="small"
          variant="outlined"
          color="success"
          startIcon={<WhatsApp fontSize="small" />}
          onClick={() => setSendTarget(entry)}
          aria-label={`Enviar WhatsApp para ${entry.name}`}
          sx={{ mr: 0.5, whiteSpace: 'nowrap' }}
        >
          Enviar
        </Button>
      </Tooltip>
      <Tooltip title={entry.notes ? 'Ver/editar notas' : 'Adicionar nota'}>
        <IconButton size="small" onClick={() => openNotes(entry)} aria-label={`Notas de ${entry.name}`}>
          <Badge color="primary" variant="dot" invisible={!entry.notes}>
            <EditNote fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
    </>
  );

  const tabLabel = (label: string, key: StatusTab) => (tabCounts ? `${label} (${tabCounts[key]})` : label);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            📋 Interesse em Convênios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pessoas que registraram interesse enquanto o credenciamento está em andamento (site e conversas do WhatsApp).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Tooltip title="Procura nas conversas do WhatsApp da clínica quem falou do convênio e coloca na lista. Só lê, não envia nada.">
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={startingScan || activeScan ? <CircularProgress size={16} color="inherit" /> : <ManageSearch />}
                onClick={(event) => setScanMenuAnchor(event.currentTarget)}
                disabled={startingScan}
              >
                Buscar no WhatsApp
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Mensagem para quem está esperando: lembra a pessoa e pergunta se ainda precisa do atendimento. Mostra a prévia antes de enviar.">
            <Button variant="outlined" color="success" startIcon={<LocalOffer />} onClick={() => setBulkKind('particular')}>
              Retomar contato
            </Button>
          </Tooltip>
          <Tooltip title="Novidade para a lista: agora atendemos o plano. Use só depois do credenciamento confirmado. Mostra a prévia antes de enviar.">
            <Button variant="outlined" color="success" startIcon={<Campaign />} onClick={() => setBulkKind('credenciado')}>
              Agora atendemos
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <FileDownload />}
            onClick={exportCsv}
            disabled={exporting || total === 0}
          >
            Exportar CSV
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={refresh}>
            Atualizar
          </Button>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        O cadastro não garante cobertura ou vaga. Só avise as pessoas depois da confirmação formal do credenciamento e
        informe apenas as especialidades realmente liberadas para o plano.
      </Alert>

      {deepRun && (
        <Alert
          severity={deepRun.status === 'failed' ? 'error' : deepRun.status === 'done' ? 'success' : 'info'}
          icon={SCAN_ACTIVE.includes(deepRun.status) ? <CircularProgress size={18} /> : undefined}
          sx={{ mb: 2 }}
          action={(deepRun.stats?.contacts ?? 0) > 0 ? (
            <Button color="inherit" size="small" onClick={() => { setChannel('whatsapp_web'); setConvenio(''); setStatusTab('todos'); resetPage(); }}>
              Ver
            </Button>
          ) : undefined}
        >
          {deepScanStatusText(deepRun)}
          {deepRun.finishedAt ? ` (${formatDateTimeBR(deepRun.finishedAt)})` : ''}
          {SCAN_ACTIVE.includes(deepRun.status) && (deepRun.stats?.total ?? 0) > 0 && (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, ((deepRun.stats?.done ?? 0) / (deepRun.stats?.total ?? 1)) * 100)}
              sx={{ mt: 1, borderRadius: 1 }}
            />
          )}
        </Alert>
      )}


      {summaryError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summaryError}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mb: 3,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
        }}
      >
        {CONVENIO_OPTIONS.map((option) => {
          const item = summary?.porConvenio[option.value];
          // 0 sem nenhuma busca no WhatsApp quer dizer "não procurado", não "ninguém pediu"
          const neverSearched = !scanRuns[option.value] && deepRun?.status !== 'done' && !item?.total;
          return (
            <SummaryCard
              key={option.value}
              title={option.label}
              value={item ? item.aguardando : '—'}
              subtitle={neverSearched ? 'ainda não buscado no WhatsApp' : item ? `aguardando · ${item.contatado} contatados · ${item.agendado} agendados${summary?.insights?.porConvenio[option.value]?.avgDays ? ` · média ${summary.insights.porConvenio[option.value]!.avgDays} dias` : ''}` : 'carregando…'}
              selected={convenio === option.value}
              onClick={() => {
                setConvenio((current) => (current === option.value ? '' : option.value));
                resetPage();
              }}
            />
          );
        })}
        <SummaryCard
          title="Total aguardando"
          value={summary ? totalAguardando : '—'}
          subtitle={summary ? `${summary.total} cadastros no total` : 'carregando…'}
        />
      </Box>

      {summary?.insights && (
        <Box mb={3}>
          <KpiStrip items={[
            { label: 'Na lista', value: summary.insights.active, sub: 'aguardando ou já contatados' },
            { label: 'Esperando 30+ dias', value: summary.insights.aged30, danger: summary.insights.aged30 > 0, sub: `média de ${summary.insights.avgDays} dias na lista` },
            { label: 'Agendaram', value: summary.insights.scheduledMonth, hero: true, sub: 'neste mês' },
            { label: 'Potencial por mês', value: brl(summary.insights.potentialMonthly), sub: 'se todos fechassem o pacote 1x/semana' },
          ]} />
          {summary.insights.aged30 > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {summary.insights.aged30} {summary.insights.aged30 === 1 ? 'família espera' : 'famílias esperam'} há mais de 30 dias e {summary.insights.aged30 === 1 ? 'pode desistir' : 'podem desistir'}. Use "Retomar contato" para não perder o atendimento.
            </Alert>
          )}
        </Box>
      )}

      <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && applySearch()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: { xs: '100%', sm: 320 } }}
        />
        <Button variant="outlined" size="small" onClick={applySearch}>
          Buscar
        </Button>
        {(search || searchInput) && (
          <Button size="small" onClick={clearSearch}>
            Limpar busca
          </Button>
        )}
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="waitlist-especialidade-label">Especialidade</InputLabel>
          <Select
            labelId="waitlist-especialidade-label"
            label="Especialidade"
            value={especialidade}
            onChange={(event) => {
              setEspecialidade(event.target.value);
              resetPage();
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {ESPECIALIDADE_OPTIONS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="waitlist-origem-label">Origem</InputLabel>
          <Select
            labelId="waitlist-origem-label"
            label="Origem"
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value as WaitlistChannel | '');
              resetPage();
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="site">Site</MenuItem>
            <MenuItem value="whatsapp_web">WhatsApp</MenuItem>
          </Select>
        </FormControl>
        {hasActiveFilters && (
          <Button size="small" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </Box>

      <Paper sx={{ mb: 2 }}>
        <SegmentedTabs label="Status do interesse" value={statusTab}
          onValueChange={(value: StatusTab) => { setStatusTab(value); resetPage(); }}
          options={[
            { id: 'aguardando' as StatusTab, label: tabLabel('Aguardando', 'aguardando') },
            { id: 'contatado' as StatusTab, label: tabLabel('Contatados', 'contatado') },
            { id: 'agendado' as StatusTab, label: tabLabel('Agendados', 'agendado') },
            { id: 'descartado' as StatusTab, label: tabLabel('Descartados', 'descartado') },
            { id: 'todos' as StatusTab, label: tabLabel('Todos', 'todos') },
          ]} />
      </Paper>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refresh}>
              Tentar novamente
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Paper>
        {loading && <LinearProgress />}

        {!loading && !error && entries.length === 0 && (
          <Box py={4} px={2} textAlign="center">
            <Typography color="text.secondary">
              {nothingRegisteredYet
                ? 'Nenhum interesse registrado ainda. Os cadastros do site e quem falar do convênio no WhatsApp aparecem aqui. Use "Buscar no WhatsApp" para trazer as conversas antigas.'
                : hasActiveFilters
                  ? 'Nenhum cadastro encontrado com esses filtros.'
                  : 'Ninguém aguardando contato no momento.'}
            </Typography>
            {hasActiveFilters && !nothingRegisteredYet && (
              <Button size="small" sx={{ mt: 1 }} onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </Box>
        )}

        {isMobile ? (
          <Box data-testid="interesse-cards">
            {entries.length > 0 && (
              <Box display="flex" justifyContent="flex-end" px={1} pt={1}>
                <Button size="small" onClick={toggleOrder}>
                  {order === 'asc' ? 'Mais antigos primeiro ↑' : 'Mais recentes primeiro ↓'}
                </Button>
              </Box>
            )}
            {entries.map((entry) => (
              <Box key={entry._id} data-testid="interesse-card" sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'left' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box minWidth={0}>
                    <Typography fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                      {entry.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatPhoneBR(entry.phone)}
                    </Typography>
                    {entry.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        {entry.email}
                      </Typography>
                    )}
                  </Box>
                  {statusChipFor(entry)}
                </Box>
                <Box display="flex" flexWrap="wrap" alignItems="center" gap={1} mt={1}>
                  <Chip size="small" variant="outlined" label={entry.convenioLabel} />
                  <Typography variant="body2">{entry.especialidade || '—'}</Typography>
                  {interesseFor(entry) && (
                    <Typography variant="caption" color="text.secondary">
                      {interesseFor(entry)}
                    </Typography>
                  )}
                </Box>
                {extrasFor(entry)}
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  {isFromWhatsapp(entry) ? 'Procurou em' : 'Cadastro'} {formatDateTimeBR(entry.createdAt)} · {waitingLabel(entry.createdAt)}
                  {entry.requestCount > 1 ? ` · ${entry.requestCount} cadastros` : ''}
                  {entry.notifiedAt ? ` · contatado ${formatDateTimeBR(entry.notifiedAt)}` : ''}
                </Typography>
                <Box display="flex" justifyContent="flex-end" alignItems="center" mt={1}>
                  {actionsFor(entry)}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          entries.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={order}>
                      <TableSortLabel active direction={order} onClick={toggleOrder}>
                        Cadastro
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Pessoa</TableCell>
                    <TableCell>Convênio</TableCell>
                    <TableCell>Interesse</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2">{formatDateTimeBR(entry.createdAt)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {waitingLabel(entry.createdAt)}
                          {entry.requestCount > 1 ? ` · ${entry.requestCount} cadastros` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{entry.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatPhoneBR(entry.phone)}
                        </Typography>
                        {entry.email && (
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                            {entry.email}
                          </Typography>
                        )}
                        {extrasFor(entry)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={entry.convenioLabel} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{entry.especialidade || '—'}</Typography>
                        {interesseFor(entry) && (
                          <Typography variant="caption" color="text.secondary">
                            {interesseFor(entry)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{statusChipFor(entry)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" color={entry.notifiedAt ? 'text.primary' : 'text.secondary'}>
                          {entry.notifiedAt ? formatDateTimeBR(entry.notifiedAt) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {actionsFor(entry)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            resetPage();
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      <Menu anchorEl={scanMenuAnchor} open={Boolean(scanMenuAnchor)} onClose={() => setScanMenuAnchor(null)}>
        <MenuItem onClick={() => { void startDeepScan(); }} disabled={Boolean(deepRun && SCAN_ACTIVE.includes(deepRun.status))}>
          <Box>
            <Typography variant="body2" fontWeight={700}>Buscar conversas novas (os 4 convênios)</Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              {deepRun && SCAN_ACTIVE.includes(deepRun.status)
                ? `Em andamento: ${deepRun.stats?.done ?? 0} de ${deepRun.stats?.total ?? '…'} conversas`
                : deepRun?.finishedAt ? `Última: ${formatDateTimeBR(deepRun.finishedAt)}. Agora lê só o que chegou depois.` : 'Os 4 convênios, conversa por conversa.'}
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeStatusMenu}>
        {STATUS_ORDER.map((status) => (
          <MenuItem
            key={status}
            selected={menuEntry?.status === status}
            onClick={() => {
              const target = menuEntry;
              closeStatusMenu();
              if (target) changeStatus(target, status);
            }}
          >
            <Chip size="small" color={STATUS_META[status].color} label={STATUS_META[status].label} sx={{ mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {STATUS_META[status].hint}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      <ConvenioSendDialog entry={sendTarget} onClose={() => setSendTarget(null)} onSent={refresh} />

      <ConvenioBulkSendDialog
        open={Boolean(bulkKind)}
        kind={bulkKind ?? 'particular'}
        initialConvenio={convenio}
        onClose={() => setBulkKind(null)}
        onSent={refresh}
      />

      <Dialog open={Boolean(discardTarget)} onClose={() => setDiscardTarget(null)}>
        <DialogTitle>Tirar da lista de interesse?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{discardTarget?.name}</strong> sai da fila do convênio {discardTarget?.convenioLabel}. O cadastro
            continua no histórico e dá para reabrir mudando o status depois.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDiscard}>
            Descartar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(notesTarget)} onClose={() => setNotesTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Notas e detalhes — {notesTarget?.name}</DialogTitle>
        <DialogContent>
          {notesTarget && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {isFromWhatsapp(notesTarget)
                  ? 'Veio de conversa no WhatsApp: a pessoa procurou a clínica (não passou pelo formulário do site).'
                  : notesTarget.consent?.accepted
                  ? `Consentimento de contato e privacidade: ${formatDateTimeBR(notesTarget.consent.acceptedAt)} (versão ${notesTarget.consent.version ?? '—'})`
                  : 'Sem consentimento registrado — não entre em contato.'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {isFromWhatsapp(notesTarget)
                  ? `Origem: WhatsApp · citou o convênio em ${formatDateTimeBR(notesTarget.whatsapp?.firstMentionAt)}${notesTarget.whatsapp?.lastMentionAt && notesTarget.whatsapp.lastMentionAt !== notesTarget.whatsapp.firstMentionAt ? ` e ${formatDateTimeBR(notesTarget.whatsapp.lastMentionAt)}` : ''}`
                  : `Origem: ${notesTarget.source?.pagePath || '—'} · ${notesTarget.requestCount} cadastro(s) enviado(s)`}
              </Typography>
              {notesTarget.whatsapp?.snippet && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  “{notesTarget.whatsapp.snippet}”
                </Typography>
              )}
            </Box>
          )}
          <TextField
            autoFocus
            multiline
            minRows={4}
            fullWidth
            margin="dense"
            label="Anotações da equipe"
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value.slice(0, NOTES_MAX_LENGTH))}
            helperText={`${notesDraft.length}/${NOTES_MAX_LENGTH}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={saveNotes}
            disabled={savingId === notesTarget?._id || notesDraft === (notesTarget?.notes ?? '')}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConvenioInteressePage;
