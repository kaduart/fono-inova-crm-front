// src/pages/Financial/tabs/ExpensesTab.tsx

import { useEffect, useState } from 'react';
import {
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Avatar,
  Divider,
  Tooltip,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Package,
  RotateCcw
} from 'lucide-react';
import { useExpenses } from '../../../hooks/useExpenses';
import ExpenseModal from '../components/ExpenseModal';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import API from '../../../services/api';

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
  paid: { color: '#10B981', bgColor: '#E8F5E9', label: 'Pago', icon: CheckCircle },
  pending: { color: '#F59E0B', bgColor: '#FFF3E0', label: 'Pendente', icon: Clock },
  scheduled: { color: '#3B82F6', bgColor: '#E3F2FD', label: 'Agendado', icon: Calendar },
  canceled: { color: '#EF4444', bgColor: '#FFEBEE', label: 'Cancelado', icon: XCircle }
};

// Origem financeira do atendimento que compõe a comissão (ver getCommissionSessions no backend)
const ORIGIN_CONFIG: Record<'particular' | 'convenio' | 'liminar', { color: string; bgColor: string; label: string }> = {
  particular: { color: '#059669', bgColor: '#ECFDF5', label: 'Particular' },
  convenio: { color: '#2563EB', bgColor: '#EFF6FF', label: 'Convênio' },
  liminar: { color: '#7C3AED', bgColor: '#F5F3FF', label: 'Liminar' }
};

interface ExpensesTabProps {
  month: number;
  year: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
}

const ExpensesTab = ({ month, year, onMonthChange, onYearChange }: ExpensesTabProps) => {
  const { expenses, loading, generatingCommissions, totals, fetchExpenses, cancelExpense, generateCommissions } = useExpenses();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  // 🆕 Modal de detalhamento de atendimentos da comissão (ícone "i")
  const [commissionSessionsOpen, setCommissionSessionsOpen] = useState(false);
  const [commissionSessionsLoading, setCommissionSessionsLoading] = useState(false);
  const [commissionSessionsData, setCommissionSessionsData] = useState<{
    doctorName: string;
    items: Array<{ sessionId: string; date: string; time: string | null; patientName: string; value: number; commissionValue: number; isPackage: boolean; packageSessionType: string | null; origin: 'particular' | 'convenio' | 'liminar' }>;
  } | null>(null);
  const [commissionSessionsPage, setCommissionSessionsPage] = useState(1);
  const [commissionSessionFilters, setCommissionSessionFilters] = useState<{
    origin: 'all' | 'particular' | 'convenio' | 'liminar';
    patient: string;
  }>({ origin: 'all', patient: '' });
  const COMMISSION_SESSIONS_PAGE_SIZE = 5;

  useEffect(() => {
    setCommissionSessionsPage(1);
  }, [commissionSessionFilters.origin, commissionSessionFilters.patient]);

  const openCommissionSessions = async (expense: any) => {
    const doctorId = expense.relatedDoctor?._id || expense.relatedDoctor?.id;
    const start = expense.workPeriod?.start;
    const end = expense.workPeriod?.end;
    if (!doctorId || !start || !end) return;

    setCommissionSessionsOpen(true);
    setCommissionSessionsLoading(true);
    setCommissionSessionsData(null);
    setCommissionSessionsPage(1);
    setCommissionSessionFilters({ origin: 'all', patient: '' });
    try {
      const res = await API.get(`/v2/professionals/${doctorId}/commission-sessions`, {
        params: { startDate: start, endDate: end }
      });
      setCommissionSessionsData({
        doctorName: expense.relatedDoctor?.fullName || '',
        items: res.data?.data?.items || []
      });
    } catch (err) {
      setCommissionSessionsData({ doctorName: expense.relatedDoctor?.fullName || '', items: [] });
    } finally {
      setCommissionSessionsLoading(false);
    }
  };

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

  const parseExpenseNotes = (notes: string) => {
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  // Comissão nasce com description = "{Nome do profissional} - {Mês/Ano}" — nome repete a
  // coluna Profissional e a competência repete a coluna Data (e o filtro de mês). Não sobra
  // nada de útil, então a célula fica vazia. Despesas operacionais (aluguel, água...) mantêm
  // a descrição, que ali é o único identificador da linha.
  const getDisplayDescription = (expense: any): string => {
    if (expense.category === 'commission' && expense.relatedDoctor) return '';
    return expense.description || '';
  };

  const safeFormat = (dateValue: any, formatStr: string): string => {
    try {
      if (!dateValue) return '-';
      const d = typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? parseISO(dateValue)
        : new Date(dateValue);
      if (!isValid(d)) return '-';
      return format(d, formatStr);
    } catch {
      return '-';
    }
  };

  const filteredCommissionItems = commissionSessionsData
    ? commissionSessionsData.items.filter((item) => {
        const matchesOrigin = commissionSessionFilters.origin === 'all' || item.origin === commissionSessionFilters.origin;
        const normalizedPatient = commissionSessionFilters.patient.trim().toLowerCase();
        const matchesPatient = !normalizedPatient || item.patientName.toLowerCase().includes(normalizedPatient);
        return matchesOrigin && matchesPatient;
      })
    : [];

  if (loading && expenses.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: '#EF444420' }} />
            <div>
              <Skeleton variant="text" width={160} height={30} />
              <Skeleton variant="text" width={220} height={20} />
            </div>
          </div>
          <Skeleton variant="rounded" width={145} height={36} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {[{ color: '#10B981' }, { color: '#F59E0B' }, { color: '#6366F1' }].map((c, i) => (
            <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
              <div className="flex items-center gap-4">
                <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                <div className="flex-1">
                  <Skeleton variant="text" width="55%" height={20} />
                  <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                  <Skeleton variant="text" width="40%" height={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-2">
            {[150, 120, 130, 120].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={40} />)}
            <Skeleton variant="rounded" width={110} height={40} className="ml-auto" />
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-2">
            <div className="flex gap-2">
              {[24, 70, 140, 80, 90, 70, 75, 80, 56].map((w, i) => <Skeleton key={i} variant="text" width={w} />)}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center p-2 border-t">
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="rounded" width={70} height={22} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
              <Skeleton variant="text" width={140} className="ml-2" />
              <Skeleton variant="rounded" width={80} height={24} className="ml-2" sx={{ bgcolor: '#6366F115' }} />
              <Skeleton variant="text" width={90} className="ml-2" />
              <Skeleton variant="text" width={70} className="ml-auto" />
              <Skeleton variant="rounded" width={75} height={24} className="ml-2" />
              <Skeleton variant="rounded" width={80} height={24} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
              <div className="flex gap-1 ml-2">
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton variant="circular" width={28} height={28} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 🎯 Esconde canceladas da visão padrão (ex: comissão cancelada+regenerada) —
  // continuam no banco pra auditoria, só não poluem a lista. Selecionar
  // "Cancelado" no filtro de Status ainda mostra o histórico normalmente.
  const visibleExpenses = filters.status === 'canceled'
    ? expenses
    : expenses.filter((e: any) => e.status !== 'canceled');

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EF4444' }}>
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Despesas</h2>
            <p className="text-sm text-gray-500">Controle de gastos, comissões e contas a pagar</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={async () => {
              try {
                await generateCommissions(filters.month, filters.year, () => fetchExpenses(filters));
              } catch {
                fetchExpenses(filters);
              }
            }}
            disabled={generatingCommissions}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw size={18} className={generatingCommissions ? 'animate-spin' : ''} />
            {generatingCommissions ? 'Gerando...' : 'Gerar Comissões'}
          </button>
          <Tooltip title="Recalcula as comissões pendentes do período com os dados atuais de sessões (comissões já pagas nunca são alteradas)">
            <button
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={generatingCommissions}
              className="px-4 py-2 border border-amber-300 bg-amber-50 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <RotateCcw size={18} className={generatingCommissions ? 'animate-spin' : ''} />
              Regenerar Comissões
            </button>
          </Tooltip>
          <button
            onClick={() => {
              setEditingExpense(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} />
            Nova Despesa
          </button>
        </div>
        {generatingCommissions && (
          <p className="text-xs text-gray-500 mt-2 text-center md:text-right">
            Processando comissões em segundo plano. Isso pode levar alguns segundos...
          </p>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Total Pago */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div style={{ height: 3, backgroundColor: '#10B981' }} />
          <div className="p-4 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Pago</p>
            <p className="text-2xl font-black text-emerald-700 mb-1">
              R$ {totals.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">{totals.countPaid} despesas pagas</p>
          </div>
        </div>

        {/* Total Pendente */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div style={{ height: 3, backgroundColor: '#9CA3AF' }} />
          <div className="p-4 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Pendente</p>
            <p className="text-2xl font-black text-gray-700 mb-1">
              R$ {totals.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">{totals.countPending} despesas pendentes</p>
          </div>
        </div>

        {/* Total Geral */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div style={{ height: 3, backgroundColor: '#8B5CF6' }} />
          <div className="p-4 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Geral</p>
            <p className="text-2xl font-black text-violet-700 mb-1">
              R$ {(totals.totalPaid + totals.totalPending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">{totals.countPaid + totals.countPending} despesas no total</p>
          </div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
            <select
              value={filters.month}
              onChange={(e) => {
                const newMonth = Number(e.target.value);
                setFilters({ ...filters, month: newMonth });
                onMonthChange?.(newMonth);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ano</label>
            <select
              value={filters.year}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                setFilters({ ...filters, year: newYear });
                onYearChange?.(newYear);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {[2024, 2025, 2026].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">Todas</option>
              <option value="payroll">Folha</option>
              <option value="commission">Comissão</option>
              <option value="benefit">Benefício</option>
              <option value="operational">Operacional</option>
              <option value="equipment">Equipamento</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="scheduled">Agendado</option>
            </select>
          </div>
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-full text-xs text-gray-600">
              <Filter size={14} />
              <span>{visibleExpenses.length} despesas encontradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Despesas */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10 px-2 py-3 text-left"></th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Categoria</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Profissional</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Valor</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Método</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <DollarSign className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">Nenhuma despesa encontrada</p>
                      <p className="text-xs text-gray-400">Tente ajustar os filtros ou crie uma nova despesa</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleExpenses.map((expense: any) => {
                  const categoryConfig = getCategoryConfig(expense.category);
                  const CategoryIcon = categoryConfig.icon;
                  const statusConfig = getStatusConfig(expense.status);
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedRows[expense._id];
                  const notes = parseExpenseNotes(expense.notes);
                  
                  return (
                    <>
                      <tr
                        key={expense._id}
                        className={`transition-colors ${expense.status === 'canceled' ? 'bg-rose-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-2 py-2">
                          <button onClick={() => toggleRow(expense._id)} className="p-1 rounded hover:bg-gray-200">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          {safeFormat(expense.date, 'dd/MM/yyyy')}
                        </td>
                        <td className="px-3 py-2">
                          {getDisplayDescription(expense)
                            ? <div className="font-medium">{getDisplayDescription(expense)}</div>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: categoryConfig.bgColor, color: categoryConfig.color, borderColor: categoryConfig.color }}>
                            <CategoryIcon size={12} />
                            {categoryConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {expense.relatedDoctor ? (
                            <div className="flex items-center gap-2">
                              <Avatar sx={{ width: 24, height: 24, bgcolor: '#E5E7EB' }}>
                                <User size={12} />
                              </Avatar>
                              <span className="text-sm">{expense.relatedDoctor.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="font-semibold text-red-600">
                            R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          {expense.category === 'commission' && expense.workPeriod?.sessionsCount > 0 && (
                            <div className="text-xs text-gray-400">
                              {expense.workPeriod.sessionsCount} sessõe{expense.workPeriod.sessionsCount > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {expense.paymentMethod === 'transferencia_bancaria' ? 'Transferência' : expense.paymentMethod}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color, borderColor: `${statusConfig.color}40` }}>
                            <StatusIcon size={12} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {expense.category === 'commission' && expense.relatedDoctor && (
                              <Tooltip title="Ver atendimentos da comissão">
                                <button
                                  onClick={() => openCommissionSessions(expense)}
                                  className="p-1 rounded hover:bg-gray-100 text-amber-600"
                                >
                                  <Info size={16} />
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip title="Editar">
                              <button
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-gray-100 text-blue-600"
                              >
                                <Edit2 size={16} />
                              </button>
                            </Tooltip>
                            <Tooltip title="Cancelar">
                              <button
                                onClick={async () => {
                                  if (confirm('Cancelar esta despesa?')) {
                                    await cancelExpense(expense._id);
                                    fetchExpenses(filters);
                                  }
                                }}
                                className="p-1 rounded hover:bg-gray-100 text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>

                      {/* Linha expandida com detalhes */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {expense.category === 'commission' && notes && (
                                <>
                                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                    <h4 className="font-semibold text-sm mb-2">Detalhamento da Comissão</h4>
                                    <div className="space-y-2">
                                      {notes.standardSessions && notes.standardSessions.count > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Sessões padrão</span>
                                          <span className="font-medium">{notes.standardSessions.count} x R$ {notes.standardSessions.value}</span>
                                        </div>
                                      )}
                                      {notes.evaluations && notes.evaluations.count > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Avaliações</span>
                                          <span className="font-medium">{notes.evaluations.count} x R$ {notes.evaluations.value}</span>
                                        </div>
                                      )}
                                      {notes.neuropsychEvaluations && notes.neuropsychEvaluations.count > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Avaliações Neuropsic</span>
                                          <span className="font-medium">{notes.neuropsychEvaluations.count} x R$ {notes.neuropsychEvaluations.value}</span>
                                        </div>
                                      )}
                                      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span className="text-red-600">R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                    <h4 className="font-semibold text-sm mb-2">Período de Trabalho</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Data início</span>
                                        <span className="font-medium">{safeFormat(expense.workPeriod?.start, 'dd/MM/yyyy')}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Data fim</span>
                                        <span className="font-medium">{safeFormat(expense.workPeriod?.end, 'dd/MM/yyyy')}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Total de sessões</span>
                                        <span className="font-medium">{expense.workPeriod.sessionsCount}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Receita gerada</span>
                                        <span className="font-medium">R$ {expense.workPeriod.revenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              <div className="col-span-full flex justify-end gap-2">
                                <span className="text-xs text-gray-400 border rounded-full px-2 py-0.5">
                                  Criado em: {expense.createdAt ? format(new Date(expense.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                                </span>
                                {expense.isRecurring && (
                                  <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">Despesa recorrente</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ExpenseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onSaved={(savedExpense) => {
          setModalOpen(false);
          setEditingExpense(null);
          if (savedExpense?.date) {
            const d = parseISO(savedExpense.date);
            if (isValid(d)) {
              const expenseMonth = d.getMonth() + 1;
              const expenseYear = d.getFullYear();
              if (expenseMonth !== filters.month || expenseYear !== filters.year) {
                setFilters(prev => ({ ...prev, month: expenseMonth, year: expenseYear }));
                return; // useEffect on filters vai disparar fetchExpenses automaticamente
              }
            }
          }
          fetchExpenses(filters);
        }}
      />

      {/* Modal de confirmação de regeneração de comissões */}
      {regenerateConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !generatingCommissions && setRegenerateConfirmOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Regenerar comissões de {format(new Date(filters.year, filters.month - 1), 'MMMM/yyyy', { locale: ptBR })}?
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Comissões <strong>pendentes</strong> serão canceladas e recriadas com os dados atuais de sessões.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Comissões já <strong>pagas</strong> nunca são alteradas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRegenerateConfirmOpen(false)}
                disabled={generatingCommissions}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await generateCommissions(filters.month, filters.year, () => fetchExpenses(filters), true);
                  } catch {
                    fetchExpenses(filters);
                  } finally {
                    setRegenerateConfirmOpen(false);
                  }
                }}
                disabled={generatingCommissions}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generatingCommissions ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Regenerando...
                  </>
                ) : (
                  'Sim, regenerar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhamento dos atendimentos da comissão */}
      <Dialog
        open={commissionSessionsOpen}
        onClose={() => setCommissionSessionsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#F59E0B' }}>
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Atendimentos da comissão</h2>
                {commissionSessionsData?.doctorName && (
                  <p className="text-sm text-gray-500 truncate">{commissionSessionsData.doctorName}</p>
                )}
              </div>
            </div>
            <IconButton size="small" onClick={() => setCommissionSessionsOpen(false)} className="shrink-0">
              <X size={18} />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {commissionSessionsLoading ? (
            <div className="flex items-center justify-center py-10">
              <CircularProgress size={28} />
            </div>
          ) : !commissionSessionsData || commissionSessionsData.items.length === 0 ? (
            <Alert severity="info">Nenhum atendimento encontrado para este período.</Alert>
          ) : filteredCommissionItems.length === 0 ? (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="sm:w-52">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de atendimento</label>
                  <select
                    value={commissionSessionFilters.origin}
                    onChange={(e) => setCommissionSessionFilters(prev => ({ ...prev, origin: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="all">Todos</option>
                    <option value="particular">Particular</option>
                    <option value="convenio">Convênio</option>
                    <option value="liminar">Liminar</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Paciente</label>
                  <input
                    type="text"
                    value={commissionSessionFilters.patient}
                    onChange={(e) => setCommissionSessionFilters(prev => ({ ...prev, patient: e.target.value }))}
                    placeholder="Buscar paciente..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <Alert severity="info">Nenhum atendimento encontrado para os filtros selecionados.</Alert>
            </>
          ) : (
            <>
              {(() => {
                const items = filteredCommissionItems;
                const totalAtendido = items.reduce((s, i) => s + (i.value || 0), 0);
                const totalComissao = items.reduce((s, i) => s + (i.commissionValue || 0), 0);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                      <div style={{ height: 3, backgroundColor: '#6B7280' }} />
                      <div className="p-4 bg-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Atendimentos</p>
                        <p className="text-2xl font-black text-gray-800">{items.length}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                      <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
                      <div className="p-4 bg-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor total atendido</p>
                        <p className="text-2xl font-black text-blue-700">
                          R$ {totalAtendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                      <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
                      <div className="p-4 bg-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Comissão a repassar</p>
                        <p className="text-2xl font-black text-amber-700">
                          R$ {totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="sm:w-52">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de atendimento</label>
                  <select
                    value={commissionSessionFilters.origin}
                    onChange={(e) => setCommissionSessionFilters(prev => ({ ...prev, origin: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="all">Todos</option>
                    <option value="particular">Particular</option>
                    <option value="convenio">Convênio</option>
                    <option value="liminar">Liminar</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Paciente</label>
                  <input
                    type="text"
                    value={commissionSessionFilters.patient}
                    onChange={(e) => setCommissionSessionFilters(prev => ({ ...prev, patient: e.target.value }))}
                    placeholder="Buscar paciente..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {(() => {
                const items = filteredCommissionItems;
                const totalPages = Math.max(1, Math.ceil(items.length / COMMISSION_SESSIONS_PAGE_SIZE));
                const currentPage = Math.min(commissionSessionsPage, totalPages);
                const startIdx = (currentPage - 1) * COMMISSION_SESSIONS_PAGE_SIZE;
                const pageItems = items.slice(startIdx, startIdx + COMMISSION_SESSIONS_PAGE_SIZE);

                return (
                  <>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="w-10 px-3 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Hora</th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Paciente</th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Valor atendido</th>
                              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Comissão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pageItems.map((item, idx) => (
                              <tr key={item.sessionId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2.5 text-gray-400">{startIdx + idx + 1}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap">{safeFormat(item.date, 'dd/MM/yyyy')}</td>
                                <td className="px-3 py-2.5 text-gray-500">{item.time || '—'}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <Avatar sx={{ width: 22, height: 22, bgcolor: '#E5E7EB' }}>
                                      <User size={11} />
                                    </Avatar>
                                    <span className="font-medium text-gray-800">{item.patientName}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit"
                                      style={{
                                        backgroundColor: ORIGIN_CONFIG[item.origin].bgColor,
                                        color: ORIGIN_CONFIG[item.origin].color
                                      }}
                                    >
                                      {ORIGIN_CONFIG[item.origin].label}
                                    </span>
                                    {item.isPackage ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                                        <Package size={11} />
                                        Pacote{item.packageSessionType ? ` · ${item.packageSessionType}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">Avulsa</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-medium text-gray-700 whitespace-nowrap">
                                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-amber-700 whitespace-nowrap">
                                  R$ {(item.commissionValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-gray-500">
                          Mostrando {startIdx + 1}–{Math.min(startIdx + COMMISSION_SESSIONS_PAGE_SIZE, items.length)} de {items.length}
                        </span>
                        <div className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full p-1">
                          <IconButton
                            size="small"
                            disabled={currentPage === 1}
                            onClick={() => setCommissionSessionsPage(p => Math.max(1, p - 1))}
                          >
                            <ChevronLeft size={16} />
                          </IconButton>
                          <span className="text-xs font-semibold text-gray-700 px-1 min-w-[90px] text-center">
                            Página {currentPage} de {totalPages}
                          </span>
                          <IconButton
                            size="small"
                            disabled={currentPage === totalPages}
                            onClick={() => setCommissionSessionsPage(p => Math.min(totalPages, p + 1))}
                          >
                            <ChevronRight size={16} />
                          </IconButton>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesTab;