import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Badge,
  Tooltip, Avatar, Divider, Stack, Alert, useTheme
} from '@mui/material';
import {
  Phone, WhatsApp, Email, CheckCircle, Delete, AssignmentInd,
  Warning, Error as ErrorIcon, Schedule, TrendingUp, PersonAdd,
  Refresh, ArrowForward
} from '@mui/icons-material';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import usePreAgendamentos, { PreAgendamento } from '../../hooks/usePreAgendamentos';
import { useDoctorsContext } from '../../contexts/DoctorsContext';

const statusColors: Record<string, any> = {
  novo: { color: 'info', label: 'Novo' },
  em_analise: { color: 'warning', label: 'Em Análise' },
  contatado: { color: 'primary', label: 'Contatado' },
  confirmado: { color: 'success', label: 'Confirmado' },
  agendado: { color: 'success', label: 'Agendado' },
  importado: { color: 'default', label: 'Importado' },
  descartado: { color: 'error', label: 'Descartado' }
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
    date: pre?.preferredDate || '',
    time: pre?.preferredTime || '09:00',
    sessionValue: pre?.suggestedValue || '',
    notes: ''
  });
  const [whatsappLinks, setWhatsappLinks] = useState<{confirmacao: string, lembrete: string} | null>(null);

  useEffect(() => {
    if (pre) {
      setForm({
        doctorId: pre.professionalId?._id || '',
        date: pre.preferredDate,
        time: pre.preferredTime || '09:00',
        sessionValue: pre.suggestedValue || '',
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
    const nome = pre.patientInfo.fullName.split(' ')[0]; // Primeiro nome
    const data = form.date ? new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    const hora = form.time || '';
    
    // Mensagem de confirmação
    const msgConfirmacao = `Olá, avaliação está CONFIRMADA! 💚\n\n` +
      `O agendamento de *${nome}* está confirmado para a avaliação inicial.\n\n` +
      `📅 Data: ${data}\n` +
      `⏰ Horário: ${hora}\n` +
      `🏥 Clínica Fono Inova\n\n` +
      `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
      `Qualquer dúvida antes da consulta, pode contar com a gente.\n\n` +
      `Um dia antes enviaremos uma mensagem de confirmação.\n\n` +
      `Até o dia e horário combinados! 😊💚`;
    
    // Mensagem de lembrete (para o dia anterior)
    const msgLembrete = `Olá ${nome}! 💚\n\n` +
      `Lembrete: sua avaliação é *AMANHÃ*! 🔔\n\n` +
      `📅 Data: ${data}\n` +
      `⏰ Horário: ${hora}\n` +
      `🏥 Clínica Fono Inova\n\n` +
      `Estamos te esperando! ✨\n\n` +
      `Precisa remarcar? Responda aqui.`;
    
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
  const [selectedPre, setSelectedPre] = useState<PreAgendamento | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ channel: 'whatsapp', success: false, notes: '' });

  useEffect(() => {
    fetchPreAgendamentos({ status: activeTab === 'todos' ? undefined : activeTab });
    fetchStats();
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
    const days = differenceInDays(parseISO(pre.preferredDate), new Date());
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
              title="Novos"
              value={stats.porStatus.novo || 0}
              color="info"
              icon={PersonAdd}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Em Análise"
              value={stats.porStatus.em_analise || 0}
              color="warning"
              icon={AssignmentInd}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Urgentes"
              value={stats.urgentes || 0}
              subtitle="Próximos 2 dias"
              color="error"
              icon={Warning}
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
                <Typography variant="body2" opacity={0.8}>Total Ativos</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {Object.values(stats.porStatus).reduce((a: any, b: any) => a + b, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alerta de Urgentes */}
      {stats?.urgentes > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>⚠️ Atenção!</strong> Você tem {stats.urgentes} pré-agendamento(s) com data para os próximos 2 dias que precisam de atenção!
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="todos" label="Pendentes" />
          <Tab value="novo" label={`Novos (${stats?.porStatus?.novo || 0})`} />
          <Tab value="em_analise" label="Em Análise" />
          <Tab value="contatado" label="Contatados" />
          <Tab value="confirmado" label="Confirmados" />
          <Tab value="agendado" label="Agendados" />
          <Tab value="importado" label="Importados" />
        </Tabs>
      </Paper>

      {/* Tabela */}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Urgência</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Especialidade</TableCell>
              <TableCell>Data Preferida</TableCell>
              <TableCell>Valor Sug.</TableCell>
              <TableCell>Status</TableCell>
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
                      {format(parseISO(pre.preferredDate), 'dd/MM/yyyy')}
                      {pre.preferredTime && ` às ${pre.preferredTime}`}
                    </TableCell>
                    <TableCell>{formatCurrency(pre.suggestedValue)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        {...statusColors[pre.status]}
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
