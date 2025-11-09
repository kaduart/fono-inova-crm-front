import { Calendar, CheckCircle2, ChevronDown, Clock, DollarSign, Sprout, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { IDoctors, IPatient, ISession, ITherapyPackage } from '../../utils/types/types';
import { SessionListItem } from './SessionListItem';
import { SessionModal } from './SessionModal';

type Props = {
  pack?: ITherapyPackage;
  patient: IPatient;
  doctors: IDoctors[];
  onUseSession: (id: string, session: ISession, modalAction: string) => void;
  onCardClick?: (pack: ITherapyPackage) => void;
};

type ModalAction = 'edit' | 'use' | null;

export default function TherapyPackageCard({
  pack,
  patient,
  doctors,
  onUseSession,
  onCardClick = () => { },
}: Props) {
  if (!pack) return null;

  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ISession>({
    _id: '',
    date: '',
    doctorId: '',
    package: '',
    sessionType: 'fonoaudiologia',
    status: 'pending',
    paymentAmount: 0,
    paymentMethod: 'dinheiro',
    notes: '',
    isPaid: true,
    confirmedAbsence: false
  });
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const openModalWithAction = (action: 'edit' | 'use', session?: ISession) => {
    setModalAction(action);
    setSelectedSession(session || null);
    setIsModalOpen(true);
  };

  const handleSessionSubmit = async () => {
    const payload = {
      ...selectedSession,
      package: pack._id,
      sessionType: pack.sessionType,
      serviceType: 'package_session',
    };

    setLoading(true);
    try {
      await onUseSession(pack._id, payload, modalAction);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro:", err);
      toast.error("Erro ao salvar sessão");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const base = {
      pill: 'px-3 py-1.5 text-xs font-semibold rounded-full border flex items-center gap-1',
    };

    // todas usam a paleta "brand" (verde esmeralda) — só varia a intensidade
    const map: Record<string, { color: string; label: string; icon: any }> = {
      active: {
        color: 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]',
        label: 'Ativo',
        icon: CheckCircle2
      },
      'in-progress': {
        color: 'bg-[var(--brand-100)] text-[var(--brand-700)] border-[var(--brand-200)]',
        label: 'Em andamento',
        icon: Clock
      },
      completed: {
        color: 'bg-[var(--brand-200)] text-[var(--brand-800)] border-[var(--brand-300)]',
        label: 'Concluído',
        icon: CheckCircle2
      },
      scheduled: {
        color: 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]',
        label: 'Agendado',
        icon: Calendar
      },
      pending: {
        color: 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]',
        label: 'Pendente',
        icon: Clock
      },
      canceled: {
        // mantém contraste diferente para erro, mas ainda “puxando” verde no texto
        color: 'bg-red-50 text-red-700 border-red-200',
        label: 'Cancelado',
        icon: Sprout
      }
    };

    const chosen = map[status] ?? map.pending;
    return { ...chosen, pill: base.pill + ' ' + chosen.color };
  };


  const statusConfig = getStatusConfig(pack.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
      onClick={() => onCardClick && onCardClick(pack)}
    >
      {/* Header com gradiente verde */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 border-b border-emerald-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Sprout className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{patient.fullName}</h3>
              <p className="text-sm text-gray-500 capitalize">{pack.sessionType?.toLowerCase()}</p>
            </div>
          </div>
          <div className={statusConfig.pill}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </div>
        </div>

        {/* Barra de progresso elegante */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso do Pacote</span>
            <span className="text-sm font-bold text-gray-900">
              {pack.sessionsDone}/{pack.totalSessions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-green-600 h-2.5 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${(pack.sessionsDone / pack.totalSessions) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse-slow"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="p-6 space-y-4">
        {/* Métricas Financeiras */}
        <div className="grid grid-cols-2 gap-4">
          {/* Valor Total */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Valor Total</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(pack.totalValue)}
            </div>
          </div>

          {/* Saldo Restante */}
          <div className={`p-4 rounded-xl border ${pack.balance > 0
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100'
            : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${pack.balance > 0 ? 'text-amber-600' : 'text-green-600'
                }`} />
              <span className="text-sm font-medium text-gray-700">Saldo</span>
            </div>
            <div className={`text-lg font-bold ${pack.balance > 0 ? 'text-amber-600' : 'text-green-600'
              }`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(pack.balance)}
            </div>
          </div>
        </div>

        {/* Detalhes Financeiros */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-gray-500">Valor/Sessão</span>
            <div className="font-medium text-gray-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(pack.sessionValue)}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-gray-500">Total Pago</span>
            <div className="font-medium text-emerald-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(pack.totalPaid)}
            </div>
          </div>
        </div>

        {/* Alertas Elegantes */}
        <div className="space-y-2">
          {pack.balance < 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800">Crédito Disponível</div>
                <div className="text-xs text-green-600">
                  Valor: {Math.abs(pack.balance)} • Verificar reembolso
                </div>
              </div>
            </div>
          )}

          {/* Alertas Elegantes (SUBSTITUIR TODO O BLOCO) */}
          <div className="space-y-2">
            {/* DEBUG opcional — ajuda a ver o que está chegando  */}
            {(() => {
              // Ative isso no console: window.__SHOW_PACK_DEBUG__ = true
              if (!(window as any).__SHOW_PACK_DEBUG__) return null;
              return (
                <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-200 overflow-auto">
                  {JSON.stringify({
                    sessionsDone: pack?.sessionsDone,
                    paidSessions: pack?.paidSessions,
                    totalSessions: pack?.totalSessions,
                    paymentsLen: Array.isArray(pack?.payments) ? pack.payments.length : 'no-array',
                    payments: pack?.payments?.map(p => ({ status: p?.status, amount: p?.amount })),
                  }, null, 2)}
                </pre>
              );
            })()}

            {/* Crédito (saldo negativo) */}
            {Number(pack?.balance) < 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-800">Crédito Disponível</div>
                  <div className="text-xs text-green-600">
                    Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                      .format(Math.abs(Number(pack?.balance || 0)))}
                    {' '}• Verificar reembolso
                  </div>
                </div>
              </div>
            )}

            {/* SESSÕES EXTRAS — só mostra se done > (paidSessions || totalSessions) */}
            {(() => {
              const done = Number(pack?.sessionsDone ?? 0);
              const paidOrTotal = Number(
                (pack?.paidSessions ?? null) != null
                  ? pack?.paidSessions
                  : (pack?.totalSessions ?? 0)
              );

              if (!Number.isFinite(done) || !Number.isFinite(paidOrTotal)) return null;

              const extra = done - paidOrTotal;
              if (extra <= 0) return null;

              return (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-800">Sessões Extras</div>
                    <div className="text-xs text-amber-600">{extra} sessões realizadas além do pacote</div>
                  </div>
                </div>
              );
            })()}

            {/* PAGAMENTO PENDENTE — só se REALMENTE não houver pagamento útil */}
            {(() => {
              if (!Array.isArray(pack?.payments) || pack.payments.length === 0) {
                // não tem nada registrado → pendente
                return (
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-3 rounded-lg flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-orange-800">Pagamento Pendente</div>
                      <div className="text-xs text-orange-600">Nenhum pagamento registrado para este pacote</div>
                    </div>
                  </div>
                );
              }

              // há pagamentos: só mostra pendência se TODOS forem claramente "não pagos"
              const hasUsefulPayment = pack.payments.some(p => {
                const status = String(p?.status || '').toLowerCase();
                const amount = Number(p?.amount || 0);
                return status === 'paid' || status === 'partial' || amount > 0;
              });

              if (hasUsefulPayment) return null;

              return (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-3 rounded-lg flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-800">Pagamento Pendente</div>
                    <div className="text-xs text-orange-600">Nenhum pagamento válido encontrado para este pacote</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {pack?.payments?.length === 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-3 rounded-lg flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-orange-800">Pagamento Pendente</div>
                <div className="text-xs text-orange-600">
                  Nenhum pagamento registrado para este pacote
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seção de Sessões - Acordeão Elegante */}
      <div className="border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-emerald-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-gray-700">Sessões do Pacote</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
              {pack?.sessions?.length || 0}
            </span>
          </div>
          <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
            }`}>
            <ChevronDown className="w-5 h-5 text-emerald-500" />
          </div>
        </button>

        {isExpanded && (
          <div className="px-6 pb-4 space-y-3 max-h-80 overflow-y-auto">
            {pack.sessions && pack.sessions
              .sort((a, b) => {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                if (a.time < b.time) return -1;
                if (a.time > b.time) return 1;
                return 0;
              })
              .map((session, sessionNumber) => (
                <SessionListItem
                  key={session._id}
                  session={session}
                  sessionNumber={sessionNumber + 1}
                  onEdit={(session) => {
                    openModalWithAction('edit', session);
                  }}
                  onUse={(session) => {
                    openModalWithAction('use', session);
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <SessionModal
          action={modalAction}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSession(null);
          }}
          doctors={doctors}
          onSessionDataChange={(data) => setSelectedSession(data)}
          onSubmit={handleSessionSubmit}
          loading={loading}
          sessionData={selectedSession}
        />
      )}
    </div>
  );
}