import { Building2, Calendar, CheckCircle2, ChevronDown, Clock, DollarSign, Scale, Gavel, Sprout, Trash2, TrendingUp } from 'lucide-react';
import { packageService } from '../../services/packageService';
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
  isExpanded?: boolean; // 🔥 Controlado externamente
  onToggleExpand?: (expanded: boolean) => void; // 🔥 Callback para toggle
  onRefresh?: () => void; // 🔥 NOVO: Para recarregar após cancelamento em lote
};

type ModalAction = 'edit' | 'use' | null;

export default function TherapyPackageCard({
  pack,
  patient,
  doctors,
  onUseSession,
  onCardClick = () => { },
  isExpanded: externalExpanded,
  onToggleExpand,
  onRefresh,
}: Props) {
  if (!pack) return null;

  // 🐛 Debug: Log para verificar sessionsDone
  console.log(`📦 Package ${pack._id?.substring(0, 8)}:`, {
    type: pack.type || 'therapy',
    sessionsDone: pack.sessionsDone,
    totalSessions: pack.totalSessions,
    status: pack.status
  });

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
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // 🔥 NOVO: Seleção de sessões para cancelamento em lote
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isBatchCanceling, setIsBatchCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // 🔥 Usa prop externa se fornecida, senão usa estado local
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setIsExpanded = (value: boolean) => {
    if (externalExpanded !== undefined && onToggleExpand) {
      onToggleExpand(value);
    } else {
      setInternalExpanded(value);
    }
  };

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

  // 🔥 NOVO: Funções para seleção de sessões
  const scheduledSessions = pack.sessions?.filter(s => s.status === 'scheduled') || [];
  
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const selectAllScheduledSessions = () => {
    if (selectedSessionIds.size === scheduledSessions.length) {
      setSelectedSessionIds(new Set()); // Desseleciona todos
    } else {
      setSelectedSessionIds(new Set(scheduledSessions.map(s => s._id))); // Seleciona todos
    }
  };

  const handleBatchCancelSessions = async () => {
    if (selectedSessionIds.size === 0) return;
    setShowCancelModal(true);
  };

  const confirmBatchCancel = async () => {
    setShowCancelModal(false);
    setIsBatchCanceling(true);

    try {
      // 🔄 Usa endpoint de bulk cancel (uma única requisição!)
      const sessionIds = Array.from(selectedSessionIds);
      const response = await packageService.bulkCancelSessions(pack._id, sessionIds, false);
      
      const { canceledCount, totalRequested } = response.data;

      if (canceledCount > 0) {
        toast.success(`${canceledCount} sessão(ões) cancelada(s) com sucesso!`);
      }
      if (canceledCount < totalRequested) {
        toast.error(`Falha ao cancelar ${totalRequested - canceledCount} sessão(ões).`);
      }

      // Limpa seleção
      setSelectedSessionIds(new Set());
      
      // 🔥 SÓ NO FINAL: Recarrega a página (único reload!)
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      toast.error('Erro ao processar cancelamento em lote');
      console.error(err);
    } finally {
      setIsBatchCanceling(false);
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
      {/* Header com gradiente - verde para therapy, azul para convenio, âmbar para liminar */}
      <div className={`p-6 border-b ${
        pack.type === 'convenio'
          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100'
          : pack.type === 'liminar'
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100'
          : 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              pack.type === 'convenio' 
                ? 'bg-blue-100' 
                : pack.type === 'liminar'
                ? 'bg-amber-100'
                : 'bg-emerald-100'
            }`}>
              {pack.type === 'convenio' ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : pack.type === 'liminar' ? (
                <Gavel className="h-5 w-5 text-amber-600" />
              ) : (
                <Sprout className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{patient.fullName}</h3>
                {pack.type === 'convenio' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    CONVÊNIO
                  </span>
                )}
                {pack.type === 'liminar' && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    LIMINAR
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 capitalize">{pack.sessionType?.toLowerCase()}</p>
              {pack.type === 'convenio' && pack.insuranceProvider && (
                <p className="text-xs text-blue-600 font-medium mt-1">
                  {pack.insuranceProvider.replace(/-/g, ' ').toUpperCase()}
                </p>
              )}
              {pack.type === 'liminar' && pack.liminarProcessNumber && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  Processo: {pack.liminarProcessNumber}
                </p>
              )}
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
            <span className={`text-base font-bold ${
              pack.type === 'convenio' 
                ? 'text-blue-600' 
                : pack.type === 'liminar'
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}>
              {pack.sessionsDone || 0}/{pack.totalSessions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                pack.type === 'convenio'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600'
                  : pack.type === 'liminar'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600'
              }`}
              style={{ width: `${((pack.sessionsDone || 0) / pack.totalSessions) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse-slow"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="p-6 space-y-4">
        {/* Badge de Status de Faturamento (só para convênio) */}
        {pack.type === 'convenio' && pack.insuranceBillingStatus && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 ${
            pack.insuranceBillingStatus === 'received'
              ? 'bg-green-50 border-green-200'
              : pack.insuranceBillingStatus === 'billed'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              pack.insuranceBillingStatus === 'received'
                ? 'bg-green-500'
                : pack.insuranceBillingStatus === 'billed'
                ? 'bg-blue-500'
                : 'bg-amber-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              pack.insuranceBillingStatus === 'received'
                ? 'text-green-700'
                : pack.insuranceBillingStatus === 'billed'
                ? 'text-blue-700'
                : 'text-amber-700'
            }`}>
              {pack.insuranceBillingStatus === 'pending_batch' && 'Aguardando Faturamento'}
              {pack.insuranceBillingStatus === 'in_batch' && 'Em Lote de Faturamento'}
              {pack.insuranceBillingStatus === 'billed' && 'Faturado ao Convênio'}
              {pack.insuranceBillingStatus === 'received' && 'Recebido do Convênio'}
            </span>
          </div>
        )}

        {/* Métricas Financeiras */}
        <div className="grid grid-cols-2 gap-4">
          {/* Valor Total - Condicional para convênio */}
          {pack.type === 'convenio' ? (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Valor Convênio</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format((pack.insuranceGrossAmount || 0) * pack.totalSessions)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(pack.insuranceGrossAmount || 0)}/sessão
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">Valor Total</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(pack.totalPaid)}
              </div>
            </div>
          )}

          {/* Saldo Restante - Esconder para convênio */}
          {pack.type !== 'convenio' ? (
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
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Sessões Pendentes</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {pack.totalSessions - pack.sessionsDone}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                de {pack.totalSessions} total
              </div>
            </div>
          )}
        </div>

        {/* ⚖️ Métricas de Crédito - Só para Liminar */}
        {pack.type === 'liminar' && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-700">Crédito da Liminar</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">Total</span>
                <div className="text-base font-bold text-amber-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(pack.liminarTotalCredit || 0)}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Disponível</span>
                <div className="text-base font-bold text-amber-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(pack.liminarCreditBalance || 0)}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Reconhecido</span>
                <div className="text-base font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(pack.recognizedRevenue || 0)}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Executado</span>
                <div className="text-base font-bold text-blue-600">
                  {pack.totalSessions > 0 
                    ? Math.round(((pack.recognizedRevenue || 0) / (pack.liminarTotalCredit || 1)) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

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
            
            {/* 🔥 NOVO: Contador de agendadas */}
            {scheduledSessions.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                {scheduledSessions.length} agendada(s)
              </span>
            )}
          </div>
          
          {/* 🔥 NOVO: Checkbox Selecionar Todos (só aparece se tiver sessões agendadas) */}
          {isExpanded && scheduledSessions.length > 0 && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSessionIds.size === scheduledSessions.length && scheduledSessions.length > 0}
                  onChange={(e) => {
                    e.stopPropagation();
                    selectAllScheduledSessions();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-gray-700">
                  {selectedSessionIds.size > 0 
                    ? `${selectedSessionIds.size} selec.` 
                    : 'Selec. todos'}
                </span>
              </label>
              
              {/* 🔥 NOVO: Botão Cancelar em Lote */}
              {selectedSessionIds.size > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBatchCancelSessions();
                  }}
                  disabled={isBatchCanceling}
                  className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBatchCanceling ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Cancelar {selectedSessionIds.size}
                </button>
              )}
            </div>
          )}
          
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
                  // 🔥 NOVO: Props de seleção (só para agendadas)
                  isSelected={selectedSessionIds.has(session._id)}
                  onToggleSelect={() => toggleSessionSelection(session._id)}
                  canSelect={session.status === 'scheduled'}
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
          // 🔥 NOVO: Passa info do pacote para pagamento automático
          packageData={pack}
        />
      )}

      {/* 🔥 NOVO: Modal de confirmação de cancelamento em lote */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Cancelar Sessões</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja cancelar <span className="font-bold text-red-600">{selectedSessionIds.size}</span> sessão(ões) agendada(s)?
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={confirmBatchCancel}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
              >
                Cancelar {selectedSessionIds.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NOVO: Loading centralizado para cancelamento em lote */}
      {isBatchCanceling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="text-lg font-semibold text-gray-900">Cancelando sessões...</p>
            <p className="text-sm text-gray-500">Aguarde enquanto processamos</p>
          </div>
        </div>
      )}
    </div>
  );
}