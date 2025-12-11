// src/pages/Financial/tabs/ExpensesTab.tsx (ARQUIVO COMPLETO CORRIGIDO)

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
  CardContent
} from '@mui/material';
import { Plus, Edit2, Trash2, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import { useExpenses } from '../../../hooks/useExpenses';
import ExpenseModal from '../components/ExpenseModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ExpensesTab = () => {
  const { expenses, loading, totals, fetchExpenses, cancelExpense, generateCommissions } = useExpenses();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    category: '',
    status: '',
    doctorId: ''
  });

  useEffect(() => {
    fetchExpenses(filters);
  }, [filters, fetchExpenses]);

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      payroll: 'Folha',
      commission: 'Comissão',
      benefit: 'Benefício',
      operational: 'Operacional',
      equipment: 'Equipamento',
      marketing: 'Marketing',
      other: 'Outro'
    };
    return labels[cat] || cat;
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

  return (
    <Box>
      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'error.light',
                    color: 'error.dark'
                  }}
                >
                  <TrendingDown size={28} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Pago
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    R$ {totals.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.countPaid} despesas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'warning.light',
                    color: 'warning.dark'
                  }}
                >
                  <Calendar size={28} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Pendente
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    R$ {totals.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.countPending} despesas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'info.light',
                    color: 'info.dark'
                  }}
                >
                  <DollarSign size={28} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Geral
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    R$ {(totals.totalPaid + totals.totalPending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.countPaid + totals.countPending} despesas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros e Ações */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
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

          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => generateCommissions()}
              sx={{ borderRadius: 2 }}
              size="small"
            >
              Gerar Comissões
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => {
                setEditingExpense(null);
                setModalOpen(true);
              }}
              sx={{ borderRadius: 2 }}
              size="small"
            >
              Nova Despesa
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Data</strong></TableCell>
              <TableCell><strong>Descrição</strong></TableCell>
              <TableCell><strong>Categoria</strong></TableCell>
              <TableCell><strong>Profissional</strong></TableCell>
              <TableCell><strong>Valor</strong></TableCell>
              <TableCell><strong>Método</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Ações</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Carregando...</TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Nenhuma despesa encontrada</TableCell>
              </TableRow>
            ) : (
              expenses.map((expense: any) => (
                <TableRow key={expense._id} hover>
                  <TableCell>
                    {format(new Date(expense.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{getCategoryLabel(expense.category)}</TableCell>
                  <TableCell>{expense.relatedDoctor?.fullName || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" color="error.main">
                      R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell>
                    <Chip
                      label={expense.status === 'paid' ? 'Pago' : expense.status === 'pending' ? 'Pendente' : 'Agendado'}
                      color={getStatusColor(expense.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingExpense(expense);
                        setModalOpen(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </IconButton>
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
                  </TableCell>
                </TableRow>
              ))
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