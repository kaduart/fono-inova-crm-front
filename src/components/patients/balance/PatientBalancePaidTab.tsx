import { useMemo, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, History, Layers, List, Search, X } from 'lucide-react';
import type { PaymentItem } from '../PatientBalanceModal';

interface Props {
  payments: PaymentItem[];
}

type ViewMode = 'receipt' | 'session';

const TZ = 'America/Sao_Paulo';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cash: 'Dinheiro',
  credit_card: 'Cartão Crédito',
  cartao_credito: 'Cartão Crédito',
  debit_card: 'Cartão Débito',
  cartao_debito: 'Cartão Débito',
  bank_transfer: 'Transferência',
  transferencia: 'Transferência',
  transferencia_bancaria: 'Transferência',
  cartão: 'Cartão',
  credito: 'Crédito',
  debito: 'Débito',
  other: 'Outro',
  outro: 'Outro',
};

const translateMethod = (method?: string | null): string => {
  if (!method) return '';
  return METHOD_LABELS[method] || method;
};

const SPECIALTY_LABELS: Record<string, string> = {
  fonoaudiologia: 'Fonoaudiologia',
  terapia_ocupacional: 'Terapia Ocupacional',
  psicologia: 'Psicologia',
  fisioterapia: 'Fisioterapia',
  pediatria: 'Pediatria',
  neuroped: 'Neuropediatria',
  psicomotricidade: 'Psicomotricidade',
  musicoterapia: 'Musicoterapia',
  psicopedagogia: 'Psicopedagogia',
  neuropsicologia: 'Neuropsicologia',
};

const translateSpecialty = (s?: string | null): string => {
  if (!s) return '';
  return SPECIALTY_LABELS[s] || s.replace(/_/g, ' ');
};

/** Rótulo do método: split vira "PIX R$ 100 + Dinheiro R$ 60". */
const methodLabel = (
  method?: string | null,
  split?: { method: string; amount: number }[] | null
): string => {
  if (split && split.length >= 2) {
    return split.map((s) => `${translateMethod(s.method)} ${formatCurrency(s.amount)}`).join(' + ');
  }
  return translateMethod(method) || 'Não informado';
};

const formatSessionDate = (dateString?: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
};

/** YYYY-MM-DD no fuso da clínica — para comparar com <input type="date">. */
const toLocalISODate = (dateString?: string | null): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-CA', { timeZone: TZ });
};

/** Data efetiva de quitação: a do recibo, senão a do próprio payment. */
const settledAtOf = (p: PaymentItem): string | undefined =>
  p.settlement?.paidAt || p.paidAt || undefined;

/** Título da sessão: nunca o genérico "Pagamento" quando há dados melhores. */
const sessionTitle = (p: PaymentItem): string => {
  const specialty = translateSpecialty(p.specialty);
  if (specialty) return `Sessão de ${specialty}`;
  if (p.description && p.description.trim().toLowerCase() !== 'pagamento') return p.description;
  if (p.appointment) return 'Sessão';
  return 'Pagamento avulso';
};

interface ReceiptGroup {
  key: string;
  settledAt?: string;
  method: string;
  isRealReceipt: boolean;
  items: PaymentItem[];
  total: number;
}

const buildGroups = (items: PaymentItem[]): ReceiptGroup[] => {
  const map = new Map<string, ReceiptGroup>();
  for (const p of items) {
    const settledAt = settledAtOf(p);
    // Com recibo: agrupa pelo id. Sem recibo (quitação individual): agrupa por minuto + forma.
    const key = p.settlement
      ? `receipt:${p.settlement.id}`
      : `solo:${(settledAt || '').slice(0, 16)}:${p.paymentMethod || ''}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        settledAt,
        method: methodLabel(
          p.settlement?.paymentMethod || p.paymentMethod,
          p.settlement?.splitMethods || p.splitMethods
        ),
        isRealReceipt: !!p.settlement,
        items: [],
        total: 0,
      };
      map.set(key, g);
    }
    g.items.push(p);
    g.total += p.amount || 0;
  }
  const groups = Array.from(map.values());
  groups.forEach((g) =>
    g.items.sort((a, b) => (a.appointment?.date || '').localeCompare(b.appointment?.date || ''))
  );
  return groups.sort((a, b) => (b.settledAt || '').localeCompare(a.settledAt || ''));
};

/** Chips "Fono 5 · TO 3" para resumir o que há dentro de um recebimento. */
const SPECIALTY_SHORT: Record<string, string> = {
  fonoaudiologia: 'Fono',
  terapia_ocupacional: 'TO',
  psicologia: 'Psico',
  fisioterapia: 'Fisio',
  psicopedagogia: 'Psicoped.',
  neuropsicologia: 'Neuropsi',
  psicomotricidade: 'Psicomot.',
  musicoterapia: 'Musico',
};

const specialtySummary = (items: PaymentItem[]): string => {
  const count = new Map<string, number>();
  items.forEach((p) => {
    const k = p.specialty || 'outros';
    count.set(k, (count.get(k) || 0) + 1);
  });
  return Array.from(count.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${SPECIALTY_SHORT[k] || translateSpecialty(k) || 'Outros'} ${n}`)
    .join(' · ');
};

const SPECIALTY_STYLE: Record<string, string> = {
  fonoaudiologia: 'bg-sky-100 text-sky-700 ring-sky-200',
  terapia_ocupacional: 'bg-amber-100 text-amber-700 ring-amber-200',
  psicologia: 'bg-violet-100 text-violet-700 ring-violet-200',
  fisioterapia: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  psicopedagogia: 'bg-pink-100 text-pink-700 ring-pink-200',
  neuropsicologia: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  psicomotricidade: 'bg-orange-100 text-orange-700 ring-orange-200',
  musicoterapia: 'bg-rose-100 text-rose-700 ring-rose-200',
};
const DEFAULT_SPECIALTY_STYLE = 'bg-gray-100 text-gray-600 ring-gray-200';

const SessionLine = ({
  payment,
  index,
  compact,
}: {
  payment: PaymentItem;
  index: number;
  compact?: boolean;
}) => {
  const appt = payment.appointment;
  const d = appt?.date ? new Date(appt.date) : null;
  const day = d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const year = d ? d.getFullYear() : '';
  const weekday = d ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : '';
  const specialtyLabel = translateSpecialty(payment.specialty);
  const style = SPECIALTY_STYLE[payment.specialty || ''] || DEFAULT_SPECIALTY_STYLE;

  return (
    <div className="flex items-center gap-3 text-left">
      <span className="w-5 text-right text-[11px] font-medium text-gray-300 tabular-nums flex-shrink-0">
        {index}
      </span>

      {/* Data em destaque */}
      <div className="w-14 flex-shrink-0 rounded-lg bg-gray-50 border border-gray-100 py-1 text-center leading-tight">
        {d ? (
          <>
            <p className="text-sm font-bold text-gray-800 tabular-nums">{day}</p>
            <p className="text-[10px] uppercase text-gray-400">
              {weekday} · {year}
            </p>
          </>
        ) : (
          <p className="text-[10px] text-gray-400 px-1">sem sessão</p>
        )}
      </div>

      {/* Especialidade + horário/profissional */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style}`}
          >
            {specialtyLabel || (appt ? 'Sessão' : 'Avulso')}
          </span>
          {appt?.time && <span className="text-xs font-medium text-gray-600 tabular-nums">{appt.time}</span>}
        </div>
        {payment.doctorName && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{payment.doctorName}</p>
        )}
        {!compact && (
          <p className="text-[11px] text-gray-400 mt-0.5">Lançado em {formatDateTime(payment.createdAt)}</p>
        )}
      </div>

      <p className="text-sm font-bold text-green-600 tabular-nums flex-shrink-0">
        {formatCurrency(payment.amount)}
      </p>
    </div>
  );
};

export const PatientBalancePaidTab: React.FC<Props> = ({ payments }) => {
  const [view, setView] = useState<ViewMode>('receipt');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const methodOptions = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      const m = p.settlement?.paymentMethod || p.paymentMethod;
      if (m) set.add(translateMethod(m));
    });
    return Array.from(set).sort();
  }, [payments]);

  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => p.specialty && set.add(p.specialty));
    return Array.from(set).sort();
  }, [payments]);

  const hasFilters = !!(search || method || specialty || dateFrom || dateTo);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (method) {
        const m = translateMethod(p.settlement?.paymentMethod || p.paymentMethod);
        const inSplit = (p.settlement?.splitMethods || p.splitMethods || []).some(
          (s) => translateMethod(s.method) === method
        );
        if (m !== method && !inSplit) return false;
      }
      if (specialty && p.specialty !== specialty) return false;
      const settledDay = toLocalISODate(settledAtOf(p));
      if (dateFrom && (!settledDay || settledDay < dateFrom)) return false;
      if (dateTo && (!settledDay || settledDay > dateTo)) return false;
      if (q) {
        const haystack = [
          p.description,
          translateSpecialty(p.specialty),
          p.doctorName,
          p.appointment ? formatSessionDate(p.appointment.date) : '',
          formatDateTime(settledAtOf(p)),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, search, method, specialty, dateFrom, dateTo]);

  // Número do recebimento é estável (1 = mais antigo) e calculado sobre TODOS os pagamentos,
  // para não mudar quando o usuário filtra.
  const receiptNumber = useMemo(() => {
    const all = buildGroups(payments).sort((a, b) => (a.settledAt || '').localeCompare(b.settledAt || ''));
    return new Map(all.map((g, i) => [g.key, i + 1]));
  }, [payments]);

  const groups = useMemo(() => buildGroups(filtered), [filtered]);
  const filteredTotal = useMemo(() => filtered.reduce((s, p) => s + (p.amount || 0), 0), [filtered]);

  const sessionsSorted = useMemo(
    () => [...filtered].sort((a, b) => (settledAtOf(b) || '').localeCompare(settledAtOf(a) || '')),
    [filtered]
  );

  const clearFilters = () => {
    setSearch('');
    setMethod('');
    setSpecialty('');
    setDateFrom('');
    setDateTo('');
  };

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum pagamento quitado</p>
      </div>
    );
  }

  const inputCls =
    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white';

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por especialidade, profissional ou data (ex: 17/08)"
            className={`${inputCls} pl-8`}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="text-xs text-gray-500">
            Quitado de
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`${inputCls} mt-0.5`}
            />
          </label>
          <label className="text-xs text-gray-500">
            até
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`${inputCls} mt-0.5`}
            />
          </label>
          <label className="text-xs text-gray-500">
            Forma
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} mt-0.5`}>
              <option value="">Todas</option>
              {methodOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            Especialidade
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className={`${inputCls} mt-0.5`}
            >
              <option value="">Todas</option>
              {specialtyOptions.map((s) => (
                <option key={s} value={s}>
                  {translateSpecialty(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Barra de resultado + alternância de visão */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-green-700">{formatCurrency(filteredTotal)}</span>
          {' · '}
          {filtered.length} {filtered.length === 1 ? 'sessão' : 'sessões'}
          {view === 'receipt' && groups.length > 0 && (
            <>
              {' em '}
              {groups.length} {groups.length === 1 ? 'recebimento' : 'recebimentos'}
            </>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-2 inline-flex items-center gap-0.5 text-xs text-gray-500 hover:text-gray-800 underline"
            >
              <X className="w-3 h-3" /> limpar filtros
            </button>
          )}
        </p>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setView('receipt')}
            className={`px-2.5 py-1.5 flex items-center gap-1 ${
              view === 'receipt' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Por recebimento
          </button>
          <button
            type="button"
            onClick={() => setView('session')}
            className={`px-2.5 py-1.5 flex items-center gap-1 ${
              view === 'session' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Por sessão
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum pagamento encontrado com esses filtros</p>
        </div>
      ) : view === 'receipt' ? (
        <div className="space-y-2">
          {groups.map((g) => {
            const open = expanded.has(g.key);
            return (
              <div key={g.key} className="rounded-xl border border-green-200 bg-green-50/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-green-50"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                      <span className="text-green-700">#{receiptNumber.get(g.key)}</span>{' '}
                      {g.isRealReceipt ? 'Recebimento' : 'Pagamento'} de {formatDateTime(g.settledAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {g.items.length} {g.items.length === 1 ? 'sessão' : 'sessões'} · {g.method}
                    </p>
                    <p className="text-xs text-gray-400">{specialtySummary(g.items)}</p>
                  </div>
                  <p className="font-bold text-lg text-green-600 flex-shrink-0">{formatCurrency(g.total)}</p>
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="border-t border-green-100 bg-white px-3 py-1 divide-y divide-gray-100 text-left [&>*]:py-2.5">
                    {g.items.map((p, i) => (
                      <SessionLine key={p.id} payment={p} index={i + 1} compact />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sessionsSorted.map((p, i) => (
            <div key={p.id} className="p-3 rounded-xl border border-green-200 bg-green-50/30">
              <SessionLine payment={p} index={i + 1} />
              <p className="mt-2 pt-2 border-t border-green-100 text-xs text-green-700">
                {p.settlement && (
                  <span className="font-semibold">
                    Recebimento #{receiptNumber.get(`receipt:${p.settlement.id}`)} ·{' '}
                  </span>
                )}
                Quitado em {formatDateTime(settledAtOf(p))} ·{' '}
                {methodLabel(
                  p.settlement?.paymentMethod || p.paymentMethod,
                  p.settlement?.splitMethods || p.splitMethods
                )}
                {p.settlement && p.settlement.sessionCount > 1 && (
                  <span className="text-gray-500">
                    {' '}
                    · junto com {p.settlement.sessionCount - 1}{' '}
                    {p.settlement.sessionCount - 1 === 1 ? 'outra sessão' : 'outras sessões'}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
