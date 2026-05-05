import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Badge,
  Tooltip, Divider, Stack, Alert, useTheme,
  TablePagination, InputAdornment
} from '@mui/material';
import { Search } from '@mui/icons-material';
import {
  Phone, WhatsApp, Email, CheckCircle, Delete, AssignmentInd,
  Warning, Error as ErrorIcon, Schedule, TrendingUp, PersonAdd,
  Refresh, ArrowForward
} from '@mui/icons-material';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import usePreAgendamentos, { PreAgendamento } from '../../hooks/usePreAgendamentos';
import { useDoctorsContext } from '../../contexts/DoctorsContext';

const urgencyChipColors: Record<string, { color: any; label: string }> = {
  critica:    { color: 'error',   label: 'Crítica' },
  alta:       { color: 'warning', label: 'Alta' },
  media:      { color: 'info',    label: 'Média' },
  baixa:      { color: 'success', label: 'Baixa' },
  pre_agendado: { color: 'default', label: 'Pendente' },
  scheduled:    { color: 'success', label: 'Agendado' },
  confirmed:    { color: 'success', label: 'Confirmado' },
  canceled:     { color: 'error',   label: 'Cancelado' },
};

const urgencyColors: Record<string, any> = {
  baixa: { color: 'success', icon: Schedule },
  media: { color: 'info', icon: Schedule },
  alta: { color: 'warning', icon: Warning },
  critica: { color: 'error', icon: ErrorIcon }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

// Componente de Card Estatístico
const StatCard = ({ title, value, subtitle, color, icon: Icon }: any) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Icon color={color} />
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// Modal de Importação
const ImportarModal = ({ open, onClose, pre, onImport, doctors }: any) => {
  const [form, setForm] = useState({
    doctorId: '',
    date: pre?.date || pre?.preferredDate || '',
    time: pre?.time || pre?.preferredTime || '09:00',
    sessionValue: pre?.sessionValue ?? pre?.suggestedValue ?? 0,
    notes: ''
  });
  const [whatsappLinks, setWhatsappLinks] = useState<{confirmacao: string, lembrete: string} | null>(null);

  useEffect(() => {
    if (pre) {
      setForm({
        doctorId: pre.professionalId?._id || pre.doctor?._id || '',
        date: pre.date || pre.preferredDate,
        time: pre.time || pre.preferredTime || '09:00',
        sessionValue: pre.sessionValue ?? pre.suggestedValue ?? 0,
        notes: ''
      });
      setWhatsappLinks(null); // Reseta links ao abrir
    }
  }, [pre]);

  const handleSubmit = () => {
    onImport(form);
  };

  // Gera links WhatsApp (sem API) para confirmação e lembrete
  const gerarLinksWhatsApp = () => {
    if (!pre) return;
    
    const phone = pre.patientInfo.phone.replace(/\D/g, '');
    const nomeCompleto = pre.patientInfo.fullName;
    const primeiroNome = nomeCompleto.split(' ')[0];
    const dateObj = form.date ? new Date(form.date + 'T12:00:00') : null;
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const diaSemana = dateObj ? diasSemana[dateObj.getDay()] : '';
    const data = dateObj ? `${dateObj.toLocaleDateString('pt-BR')} (${diaSemana})` : '';
    const hora = form.time || '';

    // Mensagem de confirmação — cada frase em uma linha
    const msgConfirmacao =
      `Oi, tudo certinho! 💚\n` +
      `O agendamento de *${nomeCompleto}* está confirmado para a avaliação inicial no dia *${data}* às *${hora}*.\n` +
      `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
      `Qualquer dúvida antes da consulta, pode contar com a gente.\n` +
      `📋 No dia anterior, vamos te enviar uma mensagem para confirmar, combinado?\n` +
      `Até o dia e horário combinados! 😊💛`;

    // Mensagem de lembrete (para o dia anterior) — cada frase em uma linha
    const msgLembrete =
      `Oi, ${primeiroNome}! 💚\n` +
      `Passando para lembrar que *AMANHÃ* é dia da sua avaliação na Fono Inova! 🔔\n` +
      `📅 *${data}* às *${hora}*\n` +
      `Qualquer dúvida ou imprevisto, é só me avisar aqui.\n` +
      `Estamos te esperando! ✨`;
    
    setWhatsappLinks({
      confirmacao: `https://wa.me/55${phone}?text=${encodeURIComponent(msgConfirmacao)}`,
      lembrete: `https://wa.me/55${phone}?text=${encodeURIComponent(msgLembrete)}`
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar para CRM</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Paciente"
            value={pre?.patientInfo?.fullName || ''}
            disabled
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Profissional</InputLabel>
            <Select
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              label="Profissional"
            >
              {doctors.map((doc: any) => (
                <MenuItem key={doc._id} value={doc._id}>
                  {doc.fullName} ({doc.specialty})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box display="flex" gap={2}>
            <TextField
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Horário"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <TextField
            label="Valor da Sessão"
            type="number"
            value={form.sessionValue}
            onChange={(e) => setForm({ ...form, sessionValue: Number(e.target.value) })}
            fullWidth
          />

          <TextField
            label="Notas Adicionais"
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            fullWidth
          />

          {/* 🆕 SEÇÃO WHATSAPP (SEM API) */}
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            💬 Confirmação via WhatsApp (Sem API)
          </Typography>
          
          {!whatsappLinks ? (
            <Button
              variant="outlined"
              color="success"
              startIcon={<WhatsApp />}
              onClick={gerarLinksWhatsApp}
              fullWidth
            >
              Gerar Mensagens WhatsApp
            </Button>
          ) : (
            <Stack spacing={1}>
              <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                Clique nos botões abaixo para abrir o WhatsApp Web com a mensagem pronta
              </Alert>
              
              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsApp />}
                onClick={() => window.open(whatsappLinks.confirmacao, '_blank')}
                fullWidth
              >
                1️⃣ Enviar Confirmação Agora
              </Button>
              
              <Button
                variant="outlined"
                color="success"
                startIcon={<Schedule />}
                onClick={() => {
                  navigator.clipboard.writeText(whatsappLinks.lembrete);
                  alert('🔗 Link do lembrete copiado! Cole no WhatsApp no dia anterior.');
                }}
                fullWidth
              >
                2️⃣ Copiar Link do Lembrete (Dia Anterior)
              </Button>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                💡 <strong>Dica:</strong> O link do lembrete fica salvo no agendamento. Acesse no dia anterior e clique para enviar.
              </Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!form.doctorId || !form.date || !form.sessionValue}
        >
          Confirmar Importação
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Página Principal
const PreAgendamentosPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const {
    preAgendamentos,
    stats,
    loading,
    loadingStats,
    pagination,
    fetchPreAgendamentos,
    fetchStats,
    importar,
    descartar,
    registrarContato,
    atribuir
  } = usePreAgendamentos();

  // 🎯 USA O CONTEXTO GLOBAL DE MÉDICOS
  const { activeDoctors: doctors, refreshDoctors: fetchDoctors } = useDoctorsContext();

  const [activeTab, setActiveTab] = useState('todos');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedPre, setSelectedPre] = useState<PreAgendamento | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ channel: 'whatsapp', success: false, notes: '' });

  const buildFilters = (overrides: Record<string, any> = {}) => {
    const base: Record<string, any> = {
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
    };
    if (activeTab === 'sem_contato') {
      base.semContato = '1';
    } else if (activeTab === 'urgentes') {
      base.urgency = 'alta,critica';
    } else if (activeTab === 'importados' || activeTab === 'cancelado') {
      base.status = activeTab;
    }
    // 'todos' → sem filtro extra (backend usa pre_agendado por padrão)
    return { ...base, ...overrides };
  };

  useEffect(() => {
    setPage(0);
    fetchPreAgendamentos(buildFilters({ page: 1 }));
    fetchStats();
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    fetchPreAgendamentos(buildFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleSearch = () => {
    setPage(0);
    fetchPreAgendamentos(buildFilters({ page: 1 }));
  };

  const handleImport = async (formData: any) => {
    if (!selectedPre) return;
    try {
      await importar(selectedPre._id, formData);
      setImportModalOpen(false);
      fetchPreAgendamentos();
      fetchStats();
    } catch (error) {
      alert('Erro ao importar');
    }
  };

  const handleDiscard = async () => {
    if (!selectedPre) return;
    try {
      await descartar(selectedPre._id, discardReason);
      setDiscardDialogOpen(false);
      setDiscardReason('');
      fetchPreAgendamentos();
      fetchStats();
    } catch (error) {
      alert('Erro ao descartar');
    }
  };

  const handleContact = async () => {
    if (!selectedPre) return;
    try {
      await registrarContato(selectedPre._id, contactForm);
      setContactDialogOpen(false);
      setContactForm({ channel: 'whatsapp', success: false, notes: '' });
      fetchPreAgendamentos();
    } catch (error) {
      alert('Erro ao registrar contato');
    }
  };

  const getUrgencyInfo = (pre: PreAgendamento) => {
    const dateStr = pre.date || pre.preferredDate;
    if (!dateStr) return { text: '—', color: 'default' };
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 0) return { text: 'Atrasado', color: 'error' };
    if (days === 0) return { text: 'Hoje', color: 'error' };
    if (days === 1) return { text: 'Amanhã', color: 'warning' };
    if (days <= 3) return { text: `${days} dias`, color: 'warning' };
    return { text: `${days} dias`, color: 'success' };
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📥 Pré-Agendamentos
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => { fetchPreAgendamentos(); fetchStats(); }}
        >
          Atualizar
        </Button>
      </Box>

      {/* Stats Dashboard */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Críticos"
              value={stats.porUrgencia?.critica || 0}
              subtitle="Urgência crítica"
              color="error"
              icon={ErrorIcon}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Urgentes"
              value={stats.urgentes || 0}
              subtitle="Urgência alta + crítica"
              color="warning"
              icon={Warning}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Sem Contato"
              value={stats.semContato || 0}
              subtitle="Nenhuma tentativa ainda"
              color="info"
              icon={Phone}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Taxa Conversão"
              value={`${stats.conversao?.taxa || 0}%`}
              subtitle={`${stats.conversao?.importados || 0} de ${stats.conversao?.total || 0}`}
              color="success"
              icon={TrendingUp}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Pendentes</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {stats.total || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Tipos de paciente — últimos 30 dias (só aparece se tiver dados) */}
          {(stats.novos > 0 || stats.retornos > 0 || stats.recorrentes > 0) && (
            <>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  Últimos 30 dias (importados)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  title="Novos Pacientes"
                  value={stats.novos || 0}
                  subtitle="Primeiro contato ever"
                  color="success"
                  icon={TrendingUp}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  title="Retornos"
                  value={stats.retornos || 0}
                  subtitle="Voltaram após 6+ meses"
                  color="info"
                  icon={Phone}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  title="Recorrentes"
                  value={stats.recorrentes || 0}
                  subtitle="Pacientes ativos"
                  color="warning"
                  icon={Warning}
                />
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* Alerta de Urgentes */}
      {stats?.urgentes > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>⚠️ Atenção!</strong> Você tem {stats.urgentes} pré-agendamento(s) com data para os próximos 2 dias que precisam de atenção!
        </Alert>
      )}

      {/* Busca */}
      <Box display="flex" gap={1} mb={2}>
        <TextField
          size="small"
          placeholder="Buscar por paciente ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
          }}
          sx={{ width: 320 }}
        />
        <Button variant="outlined" size="small" onClick={handleSearch}>Buscar</Button>
        {search && (
          <Button size="small" onClick={() => { setSearch(''); setPage(0); fetchPreAgendamentos(buildFilters({ page: 1, search: undefined })); }}>
            Limpar
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="todos" label={`Todos (${stats?.total || 0})`} />
          <Tab value="sem_contato" label={`Sem Contato (${stats?.semContato || 0})`} />
          <Tab value="urgentes" label={`Urgentes (${stats?.urgentes || 0})`} />
          <Tab value="importados" label="Importados" />
          <Tab value="cancelado" label="Cancelados" />
        </Tabs>
      </Paper>

      {/* Tabela */}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Prazo</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Especialidade</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Valor Sug.</TableCell>
              <TableCell>Urgência</TableCell>
              <TableCell>Tentativas</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Carregando...</TableCell>
              </TableRow>
            ) : preAgendamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={4}>
                    Nenhum pré-agendamento encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              preAgendamentos.map((pre) => {
                const urgency = getUrgencyInfo(pre);
                return (
                  <TableRow
                    key={pre._id}
                    sx={{
                      bgcolor: pre.urgency === 'critica' ? 'error.50' :
                        pre.urgency === 'alta' ? 'warning.50' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Chip
                        size="small"
                        color={urgency.color as any}
                        label={urgency.text}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={pre.urgency === 'critica' ? 'bold' : 'normal'}>
                        {pre.patientInfo.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pre.patientInfo.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>{pre.specialty}</TableCell>
                    <TableCell>
                      {format(parseISO(pre.date || pre.preferredDate), 'dd/MM/yyyy')}
                      {(pre.time || pre.preferredTime) && ` às ${pre.time || pre.preferredTime}`}
                    </TableCell>
                    <TableCell>{formatCurrency(pre.suggestedValue ?? pre.sessionValue)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={(urgencyChipColors[pre.urgency]?.color ?? 'default') as any}
                        label={urgencyChipColors[pre.urgency]?.label ?? pre.urgency ?? '—'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Badge badgeContent={pre.attemptCount} color="primary">
                        <Phone fontSize="small" />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {/* Contato */}
                        <Tooltip title="Registrar Contato">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPre(pre);
                              setContactDialogOpen(true);
                            }}
                          >
                            <WhatsApp fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Atribuir */}
                        {!pre.assignedTo && (
                          <Tooltip title="Atribuir a mim">
                            <IconButton
                              size="small"
                              onClick={() => atribuir(pre._id).then(() => fetchPreAgendamentos())}
                            >
                              <AssignmentInd fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Importar */}
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircle />}
                          onClick={() => {
                            setSelectedPre(pre);
                            setImportModalOpen(true);
                          }}
                        >
                          Importar
                        </Button>

                        {/* Descartar */}
                        <Tooltip title="Descartar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedPre(pre);
                              setDiscardDialogOpen(true);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      {/* Modal de Importação */}
      <ImportarModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        pre={selectedPre}
        onImport={handleImport}
        doctors={doctors}
      />

      {/* Dialog de Descarte */}
      <Dialog open={discardDialogOpen} onClose={() => setDiscardDialogOpen(false)}>
        <DialogTitle>Descartar Pré-Agendamento</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Tem certeza que deseja descartar <strong>{selectedPre?.patientInfo.fullName}</strong>?
          </Typography>
          <TextField
            label="Motivo"
            fullWidth
            multiline
            rows={2}
            value={discardReason}
            onChange={(e) => setDiscardReason(e.target.value)}
            placeholder="Ex: Não atendeu, desistiu, telefone errado..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardDialogOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDiscard} disabled={!discardReason}>
            Descartar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Contato */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)}>
        <DialogTitle>Registrar Tentativa de Contato</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Canal</InputLabel>
              <Select
                value={contactForm.channel}
                onChange={(e) => setContactForm({ ...contactForm, channel: e.target.value })}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="telefone">Telefone</MenuItem>
                <MenuItem value="email">Email</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Resultado</InputLabel>
              <Select
                value={contactForm.success ? 'success' : 'failed'}
                onChange={(e) => setContactForm({ ...contactForm, success: e.target.value === 'success' })}
              >
                <MenuItem value="success">Contato Realizado</MenuItem>
                <MenuItem value="failed">Não Atendeu/Sem Resposta</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notas"
              multiline
              rows={2}
              value={contactForm.notes}
              onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
              placeholder="Detalhes do contato..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleContact}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PreAgendamentosPage;
