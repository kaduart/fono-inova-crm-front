// src/pages/Financial/tabs/ExpensesTab.tsx

import { useCallback, useEffect, useState } from 'react';
import { getAvatarColor } from '../../../constants/avatarColors';
import { getInitials } from '../../../constants/specialtyColors';
import {
  summarizeCommissionSessions,
  type CommissionSessionItem,
  type CommissionSessionsSummary
} from './commissionSessionsSummary';
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
  RotateCcw,
  Repeat,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useExpenses } from '../../../hooks/useExpenses';
import ExpenseModal from '../components/ExpenseModal';
import FixedExpensesPanel from '../components/FixedExpensesPanel';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import API from '../../../services/api';
import {
  expenseService,
  fixedExpenseService,
  getExpenseOrigin,
  type ExpenseOrigin,
  type FixedGenerationResult,
  type FixedPendingGeneration
} from '../../../services/expenseService';

import { notifyApiError } from '../../../utils/notifyApiError';

// Configuração de categorias com cores e ícones
//
// 🐛 FIX (2026-09-17): const de nível de módulo referenciando componentes de
// ícone do lucide-react no momento em que o módulo carrega causa
// `ReferenceError: Cannot access '<ícone>' before initialization` sob o
// code-splitting de produção do Rollup — mesmo bug real confirmado via
// sourcemap em appointmentDetailModal.tsx (TDZ entre chunks). Corrigido
// tornando a construção preguiçosa: só monta no primeiro uso, dentro de
// função, bem depois do grafo de módulos já ter inicializado.
let _categoryConfigCache: Record<string, { color: string; bgColor: string; label: string; icon: any }> | null = null;
function getCategoryConfigMap() {
  if (!_categoryConfigCache) {
    _categoryConfigCache = {
      payroll: { color: '#6366F1', bgColor: '#6366F110', label: 'Folha', icon: DollarSign },
      // Teal, não âmbar: âmbar é a cor de status "Pendente" na mesma linha e as duas
      // pílulas ficavam idênticas. Categoria não deve reutilizar cor de status.
      commission: { color: '#0F766E', bgColor: '#0F766E10', label: 'Comissão', icon: TrendingDown },
      benefit: { color: '#10B981', bgColor: '#10B98110', label: 'Benefício', icon: User },
      operational: { color: '#8B5CF6', bgColor: '#8B5CF610', label: 'Operacional', icon: FileText },
      equipment: { color: '#EC4899', bgColor: '#EC489910', label: 'Equipamento', icon: CreditCard },
      marketing: { color: '#06B6D4', bgColor: '#06B6D410', label: 'Marketing', icon: BarChart3 },
      other: { color: '#6B7280', bgColor: '#6B728010', label: 'Outro', icon: FileText }
    };
  }
  return _categoryConfigCache;
}

let _statusConfigCache: Record<string, { color: string; bgColor: string; label: string; icon: any }> | null = null;
function getExpenseStatusConfigMap() {
  if (!_statusConfigCache) {
    _statusConfigCache = {
      paid: { color: '#10B981', bgColor: '#E8F5E9', label: 'Pago', icon: CheckCircle },
      pending: { color: '#F59E0B', bgColor: '#FFF3E0', label: 'Pendente', icon: Clock },
      scheduled: { color: '#3B82F6', bgColor: '#E3F2FD', label: 'Agendado', icon: Calendar },
      canceled: { color: '#EF4444', bgColor: '#FFEBEE', label: 'Cancelado', icon: XCircle }
    };
  }
  return _statusConfigCache;
}

// Origem da despesa (badge e filtro): fixa gerada de modelo / comissão / avulsa
const EXPENSE_ORIGIN_CONFIG: Record<ExpenseOrigin, { color: string; bgColor: string; label: string }> = {
  fixed: { color: '#4F46E5', bgColor: '#EEF2FF', label: 'Fixa' },
  commission: { color: '#B45309', bgColor: '#FFFBEB', label: 'Comissão' },
  manual: { color: '#475569', bgColor: '#F1F5F9', label: 'Avulsa' }
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
  const { expenses, loading, generatingCommissions, totals, byOrigin, fetchExpenses, cancelExpense, deleteExpense, markAsPaid, generateCommissions } = useExpenses();
  // Sub-abas: "Do mês" (lista) e "Fixas" (CRUD dos modelos)
  const [view, setView] = useState<'month' | 'fixed'>('month');
  // Lixeira: confirma explicitamente — "Excluir" (avulsa pendente) ou "Cancelar" (demais)
  const [rowAction, setRowAction] = useState<{ expense: any; kind: 'delete' | 'cancel' } | null>(null);
  const [rowActionBusy, setRowActionBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  // 🆕 Modal de detalhamento de atendimentos da comissão (ícone "i")
  const [commissionSessionsOpen, setCommissionSessionsOpen] = useState(false);
  const [commissionSessionsLoading, setCommissionSessionsLoading] = useState(false);
  const [commissionSessionsData, setCommissionSessionsData] = useState<{
    doctorName: string;
    items: CommissionSessionItem[];
  } | null>(null);

  // Resumo por tipo/repasse exibido no card expandido (conferência com a folha assinada).
  // Carregado ao expandir a linha — vale também para despesas já geradas.
  const [commissionSummaries, setCommissionSummaries] = useState<Record<string, CommissionSessionsSummary | 'loading' | 'error'>>({});
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

  const [filters, setFilters] = useState<{
    month: number;
    year: number;
    category: string;
    status: string;
    doctorId: string;
    origin: '' | ExpenseOrigin;
  }>({
    month,
    year,
    category: '',
    status: '',
    doctorId: '',
    origin: ''
  });

  useEffect(() => {
    setFilters(prev => ({ ...prev, month, year }));
  }, [month, year]);

  useEffect(() => {
    fetchExpenses(filters);
  }, [filters, fetchExpenses]);

  // Já existe comissão (não cancelada) no mês? Define qual botão aparece: "Gerar" (nenhuma
  // ainda) ou "Regenerar" (já gerada). Consulta própria, independente dos filtros da lista —
  // senão filtrar por categoria/status/profissional faria o botão trocar sozinho. `null` =
  // ainda desconhecido (nenhum dos dois aparece, evita piscar o botão errado).
  const [commissionsGenerated, setCommissionsGenerated] = useState<boolean | null>(null);

  const refreshCommissionsGenerated = useCallback(async () => {
    try {
      const res = await expenseService.getAll({
        month: filters.month,
        year: filters.year,
        category: 'commission',
        limit: 1
      });
      const t = res?.totals;
      setCommissionsGenerated(((t?.countPaid || 0) + (t?.countPending || 0)) > 0);
    } catch {
      setCommissionsGenerated(null);
    }
  }, [filters.month, filters.year]);

  useEffect(() => {
    setCommissionsGenerated(null);
    refreshCommissionsGenerated();
  }, [refreshCommissionsGenerated]);

  // ─── Despesas fixas: aviso de modelos ativos sem ocorrência no mês + geração ───
  const [pendingFixed, setPendingFixed] = useState<FixedPendingGeneration | null>(null);
  const [generatingFixed, setGeneratingFixed] = useState(false);
  const [fixedResult, setFixedResult] = useState<FixedGenerationResult | null>(null);

  const refreshPendingFixed = useCallback(async () => {
    try {
      setPendingFixed(await fixedExpenseService.pendingGeneration({ year: filters.year, month: filters.month }));
    } catch (err) {
      // aviso é acessório: falhar não pode quebrar a lista — mas não pode falhar em silêncio
      console.warn('[ExpensesTab] não foi possível verificar despesas fixas pendentes:', err);
      setPendingFixed(null);
    }
  }, [filters.month, filters.year]);

  useEffect(() => {
    setFixedResult(null);
    refreshPendingFixed();
  }, [refreshPendingFixed]);

  const handleGenerateFixed = async () => {
    setGeneratingFixed(true);
    try {
      const result = await fixedExpenseService.generate({ year: filters.year, month: filters.month });
      setFixedResult(result);
      const c = result.created.length;
      const s = result.skipped.length;
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} despesa(s) fixa(s) com erro ao gerar${c ? ` — ${c} criada(s)` : ''}`);
      } else if (c > 0) {
        toast.success(`${c} despesa${c > 1 ? 's' : ''} fixa${c > 1 ? 's' : ''} criada${c > 1 ? 's' : ''}${s ? `, ${s} já existia${s > 1 ? 'm' : ''}` : ''}`);
      } else {
        toast.info('Nenhuma despesa nova — as fixas deste mês já existem');
      }
      await Promise.all([fetchExpenses(filters), refreshPendingFixed()]);
    } catch (error: any) {
      notifyApiError(error, 'Erro ao gerar despesas fixas');
    } finally {
      setGeneratingFixed(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    setPayingId(id);
    try {
      await markAsPaid(id);
      await fetchExpenses(filters);
    } catch {
      /* toast já exibido no hook */
    } finally {
      setPayingId(null);
    }
  };

  const confirmRowAction = async () => {
    if (!rowAction) return;
    setRowActionBusy(true);
    try {
      if (rowAction.kind === 'delete') await deleteExpense(rowAction.expense._id);
      else await cancelExpense(rowAction.expense._id);
      setRowAction(null);
      await fetchExpenses(filters);
      if (rowAction.expense.category === 'commission') refreshCommissionsGenerated();
      // Cancelar uma fixa gerada NÃO recria no "Gerar" (o doc permanece), mas o aviso é recalculado
      refreshPendingFixed();
    } catch {
      /* toast já exibido no hook */
    } finally {
      setRowActionBusy(false);
    }
  };

  // Recarregou despesas (ex.: regenerou comissões) → descarta resumos antigos
  useEffect(() => {
    setCommissionSummaries({});
  }, [expenses]);

  useEffect(() => {
    expenses.forEach((expense: any) => {
      if (!expandedRows[expense._id] || expense.category !== 'commission') return;
      if (commissionSummaries[expense._id]) return;
      const doctorId = expense.relatedDoctor?._id || expense.relatedDoctor?.id;
      const start = expense.workPeriod?.start;
      const end = expense.workPeriod?.end;
      if (!doctorId || !start || !end) return;

      setCommissionSummaries(prev => ({ ...prev, [expense._id]: 'loading' }));
      API.get(`/v2/professionals/${doctorId}/commission-sessions`, { params: { startDate: start, endDate: end } })
        .then(res => {
          const items: CommissionSessionItem[] = res.data?.data?.items || [];
          setCommissionSummaries(prev => ({ ...prev, [expense._id]: summarizeCommissionSessions(items) }));
        })
        .catch(() => setCommissionSummaries(prev => ({ ...prev, [expense._id]: 'error' })));
    });
  }, [expandedRows, expenses, commissionSummaries]);

  const toggleRow = (expenseId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  const getCategoryConfig = (category: string) => {
    const map = getCategoryConfigMap();
    return map[category] || map.other;
  };

  const getStatusConfig = (status: string) => {
    const map = getExpenseStatusConfigMap();
    return map[status] || map.pending;
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

  const viewSwitcher = (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4" role="tablist" aria-label="Visão de despesas">
      {([
        { id: 'month', label: 'Do mês', icon: <Calendar size={15} /> },
        { id: 'fixed', label: 'Fixas', icon: <Repeat size={15} /> }
      ] as const).map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={view === t.id}
          onClick={() => setView(t.id)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors ${
            view === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.icon}
          {t.label}
          {t.id === 'month' && (pendingFixed?.count ?? 0) > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
              {pendingFixed!.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  if (view === 'fixed') {
    return (
      <div className="p-4">
        {viewSwitcher}
        <FixedExpensesPanel month={filters.month} year={filters.year} onChanged={refreshPendingFixed} />
      </div>
    );
  }

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
      {viewSwitcher}

      {/* Aviso: modelos de despesa fixa ativos sem ocorrência neste mês */}
      {pendingFixed && pendingFixed.count > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {pendingFixed.count} despesa{pendingFixed.count > 1 ? 's' : ''} fixa{pendingFixed.count > 1 ? 's' : ''} não gerada{pendingFixed.count > 1 ? 's' : ''} em {String(filters.month).padStart(2, '0')}/{filters.year}
            </p>
            <p className="text-xs text-amber-800 truncate">
              {pendingFixed.items.slice(0, 4).map(i => i.description).join(' · ')}
              {pendingFixed.items.length > 4 ? ` · +${pendingFixed.items.length - 4}` : ''}
              {' — '}R$ {pendingFixed.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-700/80 mt-0.5">
              O sistema gera as fixas do mês corrente automaticamente (a cada poucas horas). Você pode gerar agora se não quiser esperar.
            </p>
          </div>
          <button
            onClick={handleGenerateFixed}
            disabled={generatingFixed}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Repeat size={16} className={generatingFixed ? 'animate-spin' : ''} />
            {generatingFixed ? 'Gerando...' : 'Gerar fixas do mês'}
          </button>
        </div>
      )}

      {/* Feedback da última geração (criadas / já existiam / erros) */}
      {fixedResult && (
        <Alert
          severity={fixedResult.errors.length ? 'warning' : 'success'}
          onClose={() => setFixedResult(null)}
          sx={{ mb: 2 }}
        >
          <strong>{fixedResult.created.length}</strong> criada{fixedResult.created.length !== 1 ? 's' : ''},{' '}
          <strong>{fixedResult.skipped.length}</strong> já existia{fixedResult.skipped.length !== 1 ? 'm' : ''}
          {fixedResult.errors.length > 0 && (
            <>, <strong>{fixedResult.errors.length}</strong> com erro: {fixedResult.errors.map(e => `${e.description} (${e.reason})`).join('; ')}</>
          )}
        </Alert>
      )}

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
          {/* Gerar e Regenerar são mutuamente exclusivos: sem comissão no mês → Gerar;
              já gerada → Regenerar. Enquanto desconhecido (null), nenhum aparece. */}
          {commissionsGenerated === false && (
            <button
              onClick={async () => {
                try {
                  await generateCommissions(filters.month, filters.year, () => fetchExpenses(filters));
                } catch {
                  fetchExpenses(filters);
                } finally {
                  refreshCommissionsGenerated();
                }
              }}
              disabled={generatingCommissions}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <RefreshCw size={18} className={generatingCommissions ? 'animate-spin' : ''} />
              {generatingCommissions ? 'Gerando...' : 'Gerar Comissões'}
            </button>
          )}
          {commissionsGenerated === true && (
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
          )}
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
            <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Total Pago</p>
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
            <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Total Pendente</p>
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
            <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Total Geral</p>
            <p className="text-2xl font-black text-violet-700 mb-1">
              R$ {(totals.totalPaid + totals.totalPending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">{totals.countPaid + totals.countPending} despesas no total</p>
          </div>
        </div>
      </div>

      {/* Quebra por origem: Fixas / Comissões / Avulsas (pago + pendente, não canceladas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {(['fixed', 'commission', 'manual'] as ExpenseOrigin[]).map((o) => {
          const cfg = EXPENSE_ORIGIN_CONFIG[o];
          const t = byOrigin[o];
          const active = filters.origin === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => setFilters({ ...filters, origin: active ? '' : o })}
              aria-pressed={active}
              title={active ? 'Limpar filtro de origem' : `Filtrar por ${cfg.label.toLowerCase()}`}
              className={`text-left rounded-2xl border px-4 py-3 transition-shadow hover:shadow-md ${active ? 'ring-2' : ''}`}
              style={{ borderColor: `${cfg.color}30`, backgroundColor: cfg.bgColor, ['--tw-ring-color' as any]: cfg.color }}
            >
              <p className="text-3xs font-black uppercase tracking-widest mb-1" style={{ color: cfg.color }}>
                {cfg.label === 'Fixa' ? 'Fixas' : cfg.label === 'Comissão' ? 'Comissões' : 'Avulsas'}
              </p>
              <p className="text-xl font-black text-gray-800">
                R$ {t.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">{t.count} despesa{t.count !== 1 ? 's' : ''}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros e Ações */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
            <select
              value={filters.origin}
              onChange={(e) => setFilters({ ...filters, origin: e.target.value as '' | ExpenseOrigin })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">Todas</option>
              <option value="fixed">Fixa</option>
              <option value="commission">Comissão</option>
              <option value="manual">Avulsa</option>
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
                          {(() => {
                            const origin = getExpenseOrigin(expense);
                            // Comissão já é a própria categoria: repetir o selo só polui a linha.
                            // Fixa/Avulsa continuam, pois dizem algo que a categoria não diz.
                            if (origin === 'commission') return null;
                            const o = EXPENSE_ORIGIN_CONFIG[origin];
                            return (
                              <span
                                className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                                style={{ backgroundColor: o.bgColor, color: o.color }}
                              >
                                {o.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          {expense.relatedDoctor ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const avatarColor = getAvatarColor(expense.relatedDoctor.fullName);
                                return (
                                  <Avatar
                                    sx={{ width: 28, height: 28, bgcolor: avatarColor.bg, color: avatarColor.text, fontSize: 11, fontWeight: 700 }}
                                  >
                                    {getInitials(expense.relatedDoctor.fullName)}
                                  </Avatar>
                                );
                              })()}
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
                                  className="p-2 rounded hover:bg-gray-100 text-amber-600"
                                >
                                  <Info size={16} />
                                </button>
                              </Tooltip>
                            )}
                            {(expense.status === 'pending' || expense.status === 'scheduled') && (
                              <Tooltip title="Marcar como pago">
                                <span>
                                  <button
                                    onClick={() => handleMarkAsPaid(expense._id)}
                                    disabled={payingId === expense._id}
                                    className="p-2 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
                                  >
                                    {payingId === expense._id
                                      ? <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                                      : <Check size={16} />}
                                  </button>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip title="Editar">
                              <button
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setModalOpen(true);
                                }}
                                className="p-2 rounded hover:bg-gray-100 text-blue-600"
                              >
                                <Edit2 size={16} />
                              </button>
                            </Tooltip>
                            {expense.status !== 'canceled' && (() => {
                              // Exclusão real só para avulsa pendente; o resto só cancela (o doc permanece)
                              const canDelete = getExpenseOrigin(expense) === 'manual'
                                && (expense.status === 'pending' || expense.status === 'scheduled');
                              return (
                                <Tooltip title={canDelete ? 'Excluir' : 'Cancelar'}>
                                  <button
                                    onClick={() => setRowAction({ expense, kind: canDelete ? 'delete' : 'cancel' })}
                                    className="p-2 rounded hover:bg-gray-100 text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </Tooltip>
                              );
                            })()}
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
                                          <span className="font-medium">{notes.standardSessions.count} atendimentos · R$ {notes.standardSessions.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      )}
                                      {notes.evaluations && notes.evaluations.count > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Avaliações</span>
                                          <span className="font-medium">{notes.evaluations.count} atendimentos · R$ {notes.evaluations.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      )}
                                      {notes.neuropsychEvaluations && notes.neuropsychEvaluations.count > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Atendimentos de neuropsicologia</span>
                                          <span className="font-medium">{notes.neuropsychEvaluations.count} atendimentos · R$ {notes.neuropsychEvaluations.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      )}
                                      {(() => {
                                        const s = commissionSummaries[expense._id];
                                        if (typeof s !== 'object' || s.nonPayable === 0) return null;
                                        return (
                                          <div className="flex justify-between text-sm text-gray-500">
                                            <span>Sem repasse (cancelamento tardio)</span>
                                            <span className="font-medium">{s.nonPayable} {s.nonPayable === 1 ? 'atendimento' : 'atendimentos'} · R$ 0,00</span>
                                          </div>
                                        );
                                      })()}
                                      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span className="text-red-600">R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </div>

                                      {/* Atendimentos por tipo — conferência com a folha assinada */}
                                      {(() => {
                                        const s = commissionSummaries[expense._id];
                                        if (!s) return null;
                                        return (
                                          <div className="border-t pt-3 mt-3 space-y-1.5">
                                            <p className="text-3xs font-black uppercase tracking-widest text-gray-400">
                                              Atendimentos por tipo
                                            </p>
                                            {s === 'loading' ? (
                                              <p className="text-sm text-gray-400">Carregando…</p>
                                            ) : s === 'error' ? (
                                              <p className="text-sm text-gray-400">Resumo por tipo indisponível.</p>
                                            ) : (
                                              <>
                                                {(['convenio', 'particular', 'liminar'] as const).map((origin) => (
                                                  <div
                                                    key={origin}
                                                    className={`flex items-center justify-between text-sm ${s.byOrigin[origin] === 0 ? 'text-gray-400' : ''}`}
                                                  >
                                                    <span className="inline-flex items-center gap-2">
                                                      <span
                                                        className="inline-block w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: ORIGIN_CONFIG[origin].color, opacity: s.byOrigin[origin] === 0 ? 0.35 : 1 }}
                                                      />
                                                      {ORIGIN_CONFIG[origin].label}
                                                    </span>
                                                    <span className="font-medium">{s.byOrigin[origin]}</span>
                                                  </div>
                                                ))}
                                                <div className="flex items-center justify-between text-sm font-semibold pt-1.5 border-t border-dashed">
                                                  <span>Total de atendimentos</span>
                                                  <span>{s.total}</span>
                                                </div>
                                                {s.nonPayableItems.map((item) => (
                                                  <p key={item.sessionId} className="text-xs text-gray-500">
                                                    Sem repasse: {safeFormat(item.date, 'dd/MM')} {item.time || ''} · {item.patientName}
                                                    {item.nonPayableReason ? ` (${item.nonPayableReason})` : ''}
                                                  </p>
                                                ))}
                                              </>
                                            )}
                                          </div>
                                        );
                                      })()}
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
                                      {(() => {
                                        const s = commissionSummaries[expense._id];
                                        if (typeof s !== 'object' || s.nonPayable === 0) return null;
                                        return (
                                          <p className="text-xs text-gray-500 text-right -mt-1">
                                            {s.payable} com repasse + {s.nonPayable} sem repasse
                                          </p>
                                        );
                                      })()}
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
          refreshCommissionsGenerated();
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

      {/* Confirmação explícita: Excluir (avulsa pendente) ou Cancelar (demais) */}
      {rowAction && (() => {
        const e = rowAction.expense;
        const isDelete = rowAction.kind === 'delete';
        const origin = getExpenseOrigin(e);
        const label = e.description || (e.relatedDoctor?.fullName ?? 'esta despesa');
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !rowActionBusy && setRowAction(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(ev) => ev.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg"><Trash2 className="h-5 w-5 text-red-600" /></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isDelete ? 'Excluir despesa?' : 'Cancelar despesa?'}
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-1 font-medium">
                {label} — R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {isDelete
                  ? 'Despesa avulsa pendente: será removida definitivamente e não poderá ser recuperada.'
                  : origin === 'fixed'
                    ? 'A despesa ficará como cancelada (não conta nos totais) e NÃO será recriada ao gerar as fixas do mês.'
                    : e.status === 'paid'
                      ? 'Esta despesa já está paga. Ela ficará como cancelada e deixará de contar nos totais; o registro é mantido para auditoria.'
                      : 'A despesa ficará como cancelada e deixará de contar nos totais; o registro é mantido para auditoria.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRowAction(null)}
                  disabled={rowActionBusy}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmRowAction}
                  disabled={rowActionBusy}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {rowActionBusy ? 'Processando...' : isDelete ? 'Sim, excluir' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                    refreshCommissionsGenerated();
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
                        <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Atendimentos</p>
                        <p className="text-2xl font-black text-gray-800">{items.length}</p>
                        {(() => {
                          const semRepasse = items.filter(i => i.professionalPaymentStatus === 'non_payable').length;
                          return semRepasse > 0 ? (
                            <p className="text-xs text-gray-500 mt-1">{items.length - semRepasse} com repasse + {semRepasse} sem repasse</p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                      <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
                      <div className="p-4 bg-white">
                        <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Valor total atendido</p>
                        <p className="text-2xl font-black text-blue-700">
                          R$ {totalAtendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                      <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
                      <div className="p-4 bg-white">
                        <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Comissão a repassar</p>
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
                                    {item.professionalPaymentStatus === 'non_payable' && (
                                      <Tooltip title={item.nonPayableReason || 'Atendimento contado pela clínica, sem repasse ao profissional'}>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit bg-gray-100 text-gray-600">
                                          Sem repasse
                                        </span>
                                      </Tooltip>
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
