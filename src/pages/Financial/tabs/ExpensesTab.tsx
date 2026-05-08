// src/pages/Financial/tabs/ExpensesTab.tsx

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  Tooltip,
  Alert
} from '@mui/material';
import { FinancialLoading, FinancialTableLoading } from '../components/FinancialLoading';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Calendar, 
  TrendingDown,
  User,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useExpenses } from '../../../hooks/useExpenses';
import ExpenseModal from '../components/ExpenseModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configuração de categorias com cores e ícones
const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: any }> = {
  payroll: { color: '#6366F1', bgColor: '#6366F110', label: 'Folha', icon: DollarSign },
  commission: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Comissão', icon: TrendingDown },
  benefit: { color: '#10B981', bgColor: '#10B98110', label: 'Benefício', icon: User },
  operational: { color: '#8B5CF6', bgColor: '#8B5CF610', label: 'Operacional', icon: FileText },
  equipment: { color: '#EC4899', bgColor: '#EC489910', label: 'Equipamento', icon: CreditCard },
  marketing: { color: '#06B6D4', bgColor: '#06B6D410', label: 'Marketing', icon: BarChart3 },
  other: { color: '#6B7280', bgColor: '#6B728010', label: 'Outro', icon: FileText }
};

const STATUS_CONFIG = {
  paid: { color: '#10B981', bgColor: '#10B98110', label: 'Pago', icon: CheckCircle },
  pending: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Pendente', icon: Clock },
  scheduled: { color: '#3B82F6', bgColor: '#3B82F610', label: 'Agendado', icon: Calendar },
  canceled: { color: '#EF4444', bgColor: '#EF444410', label: 'Cancelado', icon: XCircle }
};

interface ExpensesTabProps {
  month: number;
  year: number;
}

const ExpensesTab = ({ month, year }: ExpensesTabProps) => {
  const { expenses, loading, totals, fetchExpenses, cancelExpense, generateCommissions } = useExpenses();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  const [filters, setFilters] = useState({
    month,
    year,
    category: '',
    status: '',
    doctorId: ''
  });

  useEffect(() => {
    setFilters(prev => ({ ...prev, month, year }));
  }, [month, year]);

  useEffect(() => {
    fetchExpenses(filters);
  }, [filters, fetchExpenses]);

  const toggleRow = (expenseId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  };

  const getStatusColor = (status: string): "success" | "warning" | "info" | "error" | "default" => {
    const colors: Record<string, "success" | "warning" | "info" | "error"> = {
      paid: 'success',
      pending: 'warning',
      scheduled: 'info',
      canceled: 'error'
    };
    return colors[status] || 'default';
  };

  // Parse das notas para mostrar detalhes das sessões
  const parseExpenseNotes = (notes: string) => {
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Avatar sx={{ bgcolor: '#EF4444', width: 48, height: 48 }}>
            <TrendingDown className="w-6 h-6 text-white" />
          </Avatar>
          <div>
            <Typography variant="h5" fontWeight="bold">
              Despesas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Controle de gastos, comissões e contas a pagar
            </Typography>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={async () => {
              await generateCommissions();
              fetchExpenses(filters);
            }}
            sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
          >
            Gerar Comissões
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setEditingExpense(null);
              setModalOpen(true);
            }}
            sx={{
              borderRadius: 2,
              width: { xs: '100%', sm: 'auto' },
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              '&:hover': { background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }
            }}
          >
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Cards de Resumo com dados reais da API */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#10B98120', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#10B981', width: 40, height: 40 }}>
                  <CheckCircle className="w-5 h-5 text-white" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Pago
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="#10B981">
                    R$ {totals.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.countPaid} despesas pagas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#F59E0B20', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                  <Clock className="w-5 h-5 text-white" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Pendente
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="#F59E0B">
                    R$ {totals.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.countPending} despesas pendentes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#6366F120', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#6366F1', width: 40, height: 40 }}>
                  <DollarSign className="w-5 h-5 text-white" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Geral
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="#6366F1">
                    R$ {(totals.totalPaid + totals.totalPending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.countPaid + totals.countPending} despesas no total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros e Ações */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Mês"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}
              size="small"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Ano"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
              size="small"
            >
              {[2024, 2025, 2026].map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Categoria"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              size="small"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="payroll">Folha</MenuItem>
              <MenuItem value="commission">Comissão</MenuItem>
              <MenuItem value="benefit">Benefício</MenuItem>
              <MenuItem value="operational">Operacional</MenuItem>
              <MenuItem value="equipment">Equipamento</MenuItem>
              <MenuItem value="marketing">Marketing</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="paid">Pago</MenuItem>
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="scheduled">Agendado</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Chip 
              icon={<Filter size={14} />}
              label={`${expenses.length} despesas encontradas`}
              variant="outlined"
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Despesas */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
              <TableCell width={40} />
              <TableCell><Typography variant="body2" fontWeight="600">Data</Typography></TableCell>
              <TableCell><Typography variant="body2" fontWeight="600">Descrição</Typography></TableCell>
              <TableCell><Typography variant="body2" fontWeight="600">Categoria</Typography></TableCell>
              <TableCell><Typography variant="body2" fontWeight="600">Profissional</Typography></TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight="600">Valor</Typography></TableCell>
              <TableCell><Typography variant="body2" fontWeight="600">Método</Typography></TableCell>
              <TableCell><Typography variant="body2" fontWeight="600">Status</Typography></TableCell>
              <TableCell align="center"><Typography variant="body2" fontWeight="600">Ações</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <FinancialTableLoading rowCount={5} colSpan={9} />
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <div className="text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      Nenhuma despesa encontrada
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tente ajustar os filtros ou crie uma nova despesa
                    </Typography>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense: any) => {
                const categoryConfig = getCategoryConfig(expense.category);
                const CategoryIcon = categoryConfig.icon;
                const statusConfig = getStatusConfig(expense.status);
                const StatusIcon = statusConfig.icon;
                const isExpanded = expandedRows[expense._id];
                const notes = parseExpenseNotes(expense.notes);
                
                return (
                  <>
                    <TableRow 
                      key={expense._id} 
                      hover
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: isExpanded ? '#F9FAFB' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => toggleRow(expense._id)}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {expense.description}
                        </Typography>
                        {expense.workPeriod?.start && expense.workPeriod?.end && (
                          <Typography variant="caption" color="text.secondary">
                            Período: {format(new Date(expense.workPeriod.start), 'dd/MM')} - {format(new Date(expense.workPeriod.end), 'dd/MM/yyyy')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<CategoryIcon size={14} />}
                          label={categoryConfig.label}
                          sx={{ 
                            bgcolor: categoryConfig.bgColor,
                            color: categoryConfig.color,
                            borderColor: categoryConfig.color,
                            fontWeight: 500
                          }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {expense.relatedDoctor ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: '#E5E7EB' }}>
                              <User size={12} />
                            </Avatar>
                            <Typography variant="body2">
                              {expense.relatedDoctor.fullName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="600" color="#EF4444">
                          R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {expense.paymentMethod === 'transferencia_bancaria' ? 'Transferência' : expense.paymentMethod}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<StatusIcon size={14} />}
                          label={statusConfig.label}
                          sx={{ 
                            bgcolor: statusConfig.bgColor,
                            color: statusConfig.color,
                            borderColor: statusConfig.color,
                            fontWeight: 500
                          }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingExpense(expense);
                              setModalOpen(true);
                            }}
                          >
                            <Edit2 size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancelar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (confirm('Cancelar esta despesa?')) {
                                cancelExpense(expense._id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {/* Linha expandida com detalhes */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ p: 2, bgcolor: '#F9FAFB' }}>
                          <Grid container spacing={2}>
                            {/* Detalhes da comissão */}
                            {expense.category === 'commission' && notes && (
                              <>
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" gutterBottom fontWeight="600">
                                      Detalhamento da Comissão
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                    
                                    {notes.standardSessions && notes.standardSessions.count > 0 && (
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Sessões padrão</Typography>
                                        <Typography variant="body2" fontWeight="500">
                                          {notes.standardSessions.count} x R$ {notes.standardSessions.value}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {notes.evaluations && notes.evaluations.count > 0 && (
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Avaliações</Typography>
                                        <Typography variant="body2" fontWeight="500">
                                          {notes.evaluations.count} x R$ {notes.evaluations.value}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {notes.neuropsychEvaluations && notes.neuropsychEvaluations.count > 0 && (
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Avaliações Neuropsic</Typography>
                                        <Typography variant="body2" fontWeight="500">
                                          {notes.neuropsychEvaluations.count} x R$ {notes.neuropsychEvaluations.value}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    <Divider sx={{ my: 1 }} />
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <Typography variant="body2" fontWeight="600">Total</Typography>
                                      <Typography variant="body2" fontWeight="600" color="#EF4444">
                                        R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </Typography>
                                    </Box>
                                  </Paper>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" gutterBottom fontWeight="600">
                                      Período de Trabalho
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="body2">Data início</Typography>
                                      <Typography variant="body2" fontWeight="500">
                                        {expense.workPeriod?.start ? format(new Date(expense.workPeriod.start), 'dd/MM/yyyy') : '-'}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="body2">Data fim</Typography>
                                      <Typography variant="body2" fontWeight="500">
                                        {expense.workPeriod?.end ? format(new Date(expense.workPeriod.end), 'dd/MM/yyyy') : '-'}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="body2">Total de sessões</Typography>
                                      <Typography variant="body2" fontWeight="500">
                                        {expense.workPeriod.sessionsCount}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <Typography variant="body2">Receita gerada</Typography>
                                      <Typography variant="body2" fontWeight="500">
                                        R$ {expense.workPeriod.revenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </Typography>
                                    </Box>
                                  </Paper>
                                </Grid>
                              </>
                            )}

                            {/* Informações gerais */}
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Chip
                                  size="small"
                                  label={`Criado em: ${expense.createdAt ? format(new Date(expense.createdAt), 'dd/MM/yyyy HH:mm') : '-'}`}
                                  variant="outlined"
                                />
                                {expense.isRecurring && (
                                  <Chip
                                    size="small"
                                    label="Despesa recorrente"
                                    color="info"
                                  />
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal */}
      <ExpenseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onSaved={() => {
          fetchExpenses(filters);
          setModalOpen(false);
          setEditingExpense(null);
        }}
      />
    </Box>
  );
};

export default ExpensesTab;