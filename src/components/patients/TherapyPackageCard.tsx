import { Building2, Calendar, CheckCircle2, ChevronDown, Clock, DollarSign, Gavel, Plus, Sprout, Trash2, TrendingUp, X } from 'lucide-react';
import { packageService } from '../../services/packageService';
import appointmentService from '../../services/appointmentService';
import { getPatientFinancialSummary, FinancialSummary } from '../../services/financialSummaryService';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { IDoctors, IPatient, ISession, ITherapyPackage } from '../../utils/types/types';
import { mapSessionResponseDTO, sessionDTOToISession } from '../../dtos/session.response.dto';
import { SessionListItem } from './SessionListItem';
import { SessionModal } from './SessionModal';
import { PatientMiniCalendar } from './PatientMiniCalendar';
import { PatientBalanceModal } from './PatientBalanceModal';
import { extractScheduleConflictMessage } from '../../utils/errorUtils';

/**
 * ⚠️ LEGADO — condições `pack.type === 'liminar'` e `pack.type === 'convenio'`
 *
 * Essas condições renderizam dados de packages antigos que foram migrados
 * para os novos domínios:
 * - InsuranceGuide (convênio)
 * - LiminarContract (liminar)
 *
 * 🚫 NÃO adicionar novas features baseadas nessas condições
 * 🚫 NÃO usar como fonte de verdade para liminar/convênio
 *
 * ✅ Em dados novos, pack.type é sempre 'therapy' (particular)
 * ✅ Liminar e convênio têm seus próprios componentes e rotas
 *
 * TODO: remover após backfill completo dos dados legados
 */
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



  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialSessionState: ISession = {
    _id: '',
    date: '',
    time: '',
    doctorId: '',
    patientId: '',
    package: '',
    sessionType: 'fonoaudiologia',
    status: 'pending',
    paymentAmount: 0,
    paymentMethod: '',
    notes: '',
    isPaid: true,
    confirmedAbsence: false
  };
  const [selectedSession, setSelectedSession] = useState<ISession>(initialSessionState);
  const [loading, setLoading] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // 🔥 NOVO: Seleção de sessões para cancelamento em lote
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isBatchCanceling, setIsBatchCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sessionTab, setSessionTab] = useState<'active' | 'history'>('active');
  const [showSessionsCalendarModal, setShowSessionsCalendarModal] = useState(false);

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showInactivateModal, setShowInactivateModal] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);

  /**
   * 💰 FINANCEIRO MIGRADO
   *
   * NÃO usar mais dados financeiros do Package (pack.balance, pack.totalPaid).
   * Fonte de verdade: /api/v2/financial/patient/:id/summary
   *
   * TODO: remover fallbacks para pack.* após frontend 100% migrado
   */
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  useEffect(() => {
    if (!patient?._id && !patient?.patientId) return;
    const pid = patient?.patientId || patient?._id;
    const pkgId = pack?.packageId || pack?._id;
    setFinancialLoading(true);
    getPatientFinancialSummary(pid, pkgId)
      .then((data) => {
        console.log('[TherapyPackageCard] Financial summary OK:', data);
        setFinancial(data);
      })
      .catch((err) => {
        console.error('[TherapyPackageCard] Financial summary ERRO:', err?.response?.status, err?.response?.data || err.message);
        setFinancial(null);
      })
      .finally(() => setFinancialLoading(false));
  }, [patient?._id, patient?.patientId, pack?.packageId, pack?._id]);

  const sessionDebt = financial?.sessionDebt ?? 0;
  const particularPaid = financial?.particularPaid ?? 0;
  const liminarPaid = financial?.liminarPaid ?? 0;
  const completedSessions = pack.sessionsDone ?? financial?.completedSessions ?? 0;

  const isFullyPaid = pack.financialStatus === 'paid_with_credit'
    || ((pack.totalValue || 0) > 0 && particularPaid >= (pack.totalValue || 0));
  const paymentRatio = isFullyPaid ? 1 : (pack.totalValue || 0) > 0
    ? Math.min(particularPaid / (pack.totalValue || 1), 1)
    : 0;
  const hasNoPayment = financial !== null && particularPaid === 0 && !isFullyPaid;

  const paymentState: 'paid' | 'reserved' | 'overdue' | 'partial' | 'unknown' =
    financial === null || financialLoading ? 'unknown' :
    isFullyPaid ? 'paid' :
    hasNoPayment && sessionDebt === 0 ? 'reserved' :
    sessionDebt > 0 ? 'overdue' :
    'partial';

  if (!financial && !financialLoading) {
    console.warn('[TherapyPackageCard] ⚠️ Endpoint /financial/summary indisponível — dados financeiros não carregados');
  }

  // 🔥 Usa prop externa se fornecida, senão usa estado local
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setIsExpanded = (value: boolean) => {
    if (externalExpanded !== undefined && onToggleExpand) {
      onToggleExpand(value);
    } else {
      setInternalExpanded(value);
    }
  };

  const openModalWithAction = async (action: 'edit' | 'use', session?: ISession) => {
    setModalAction(action);
    if (session) {
      // 🔄 Busca pacote detalhado para ter dados atualizados (paymentMethod, etc.)
      let rawSession = session;
      if (pack?._id) {
        try {
          const detail = await packageService.getPackage(pack.packageId || pack._id);
          const pkg = detail?.package || detail;
          if (pkg?.sessions?.length) {
            const found = pkg.sessions.find(
              (s: any) => s.sessionId?.toString?.() === session.sessionId || s._id?.toString?.() === session._id
            );
            if (found) rawSession = found;
          }
        } catch (e) {
          console.warn('Falha ao buscar detalhe do pacote, usando dados locais', e);
        }
      }
      const context = {
        doctorId: pack.doctorId || (pack as any).doctor?._id?.toString?.() || (pack as any).doctor?.toString?.() || '',
        patientId: pack.patientId || (pack as any).patient?._id?.toString?.() || (pack as any).patient?.toString?.() || '',
        packageId: pack.packageId || pack._id || '',
        sessionValue: typeof pack.sessionValue === 'number' ? pack.sessionValue : 0,
        sessionType: pack.sessionType || (pack as any).specialty || '',
      };
      const dto = mapSessionResponseDTO(rawSession, context);
      const normalized = sessionDTOToISession(dto);
      // Preserva appointmentId do dado bruto (não mapeado pelo DTO)
      if (rawSession?.appointmentId) {
        normalized.appointmentId = rawSession.appointmentId;
      }

      // 🛡️ Fallback: busca agendamento real para garantir paymentMethod atualizado
      // (a PackagesView pode estar stale ou sem o campo até rebuild)
      if (normalized.appointmentId) {
        try {
          const apptRes = await appointmentService.getById(normalized.appointmentId);
          const appt = apptRes?.data?.data || apptRes?.data || apptRes;
          const apptPaymentMethod = appt?.paymentMethod || appt?.payment?.method;
          if (apptPaymentMethod && !normalized.paymentMethod) {
            normalized.paymentMethod = apptPaymentMethod;
          }
          // Também garante paymentAmount real se o appointment tiver
          if (appt?.paymentAmount && (!normalized.paymentAmount || normalized.paymentAmount === 0)) {
            normalized.paymentAmount = appt.paymentAmount;
          }
        } catch (apptErr) {
          console.warn('[DEBUG] Falha ao buscar appointment fallback:', apptErr);
        }
      }

      console.log('[DEBUG] openModalWithAction DTO - raw:', rawSession, 'context:', context, 'normalized:', normalized);
      setSelectedSession(normalized);
    } else {
      setSelectedSession(initialSessionState);
    }
    setIsModalOpen(true);
  };

  const handleSessionSubmit = async () => {
    const payload = {
      ...selectedSession,
      package: pack.packageId || pack._id,
      sessionType: pack.sessionType,
      serviceType: 'package_session',
    };

    setLoading(true);
    try {
      await onUseSession(pack.packageId || pack._id, payload, modalAction);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Erro:", err);
      // 🎯 Mensagem detalhada para conflitos de agenda (horário já ocupado)
      const conflictMsg = extractScheduleConflictMessage(err);
      if (conflictMsg) {
        toast.error(conflictMsg, { autoClose: 8000, style: { maxWidth: '420px', borderLeft: '4px solid #ef4444' } });
      } else {
        const apiMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        toast.error(apiMessage || "Erro ao salvar sessão");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NORMALIZADOR DE STATUS (blindagem contra novos status do backend)
  const normalizeStatus = (status: string): string => {
    if (status === 'pre_agendado') return 'scheduled';
    if (status === 'cancelled') return 'canceled';
    return status;
  };

  // 🔥 NOVO: Funções para seleção de sessões
  const scheduledSessions = pack.sessions?.filter(s => {
    const ns = normalizeStatus(s.status);
    return ns === 'scheduled' || ns === 'unpaid';
  }) || [];
  const activeSessions = pack.sessions?.filter(s => {
    const ns = normalizeStatus(s.status);
    return ns === 'scheduled' || ns === 'unpaid' || ns === 'pending';
  }) || [];
  const historySessions = pack.sessions?.filter(s => {
    const ns = normalizeStatus(s.status);
    return ns === 'completed' || ns === 'canceled';
  }) || [];

  // 🔥 NOVO: Eventos pro PatientMiniCalendar (mesmo componente reaproveitado
  // por liminar/ContractCard e convênio/PatientInsuranceTab). 'pending' vira
  // 'scheduled' porque o calendário não distingue os dois visualmente.
  //
  // ⚠️ pack.sessions[].date NÃO é "YYYY-MM-DD" (diferente do Appointment usado
  // por liminar/convênio) — vem como Date.toString() (ex: "Tue Jun 23 2026
  // 15:20:00 GMT-0300 (...)"), e o horário embutido nele pode nem bater com
  // `time` (é `time` que manda). Extrai a data com getters locais (não
  // toISOString) — em UTC-3, sessões >=21h virariam o dia seguinte se
  // convertidas pra UTC. Mesmo cuidado de buildLocalDateOnly em dateFormat.ts.
  // pack.sessions[] não carrega doctorId por sessão nesse endpoint — todo
  // pacote particular é de um terapeuta só, então usa o médico do pacote
  // (searchFields.doctorName já vem denormalizado da view; professional é o fallback por id).
  const packageDoctorName = pack.searchFields?.doctorName
    || doctors?.find(d => d._id === pack.professional)?.fullName;
  const sessionCalendarEvents = (pack.sessions || [])
    .map(s => {
      const ns = normalizeStatus(s.status);
      const parsedDate = new Date(s.date);
      if (isNaN(parsedDate.getTime())) return null;
      const isoDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      return {
        _id: s._id,
        start: `${isoDate}T${s.time || '08:00'}`,
        doctor: packageDoctorName ? { fullName: packageDoctorName } : undefined,
        operationalStatus: ns === 'pending' ? 'scheduled' : ns,
        __session: s,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

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
      // 🧠 BACKEND DECIDE: Sempre manda lista, backend escolhe a melhor estratégia
      const sessionIds = Array.from(selectedSessionIds);
      
      console.log('[CANCEL] Enviando para backend decidir...', { 
        packageId: pack.packageId || pack._id, 
        selectedCount: sessionIds.length,
        totalScheduled: scheduledSessions.length 
      });
      
      // 🚀 UX OTIMISTA: Atualiza UI imediatamente (antes da resposta)
      const optimisticCanceled = sessionIds.length;
      toast.info(`Cancelando ${optimisticCanceled} sessão(ões)...`);
      
      // Chama endpoint (backend decide se faz cancel-all ou bulk)
      const response = await packageService.cancelAllSessions(pack.packageId || pack._id, false);
      
      const { canceledSessions, finalStatus } = response.data;

      if (canceledSessions > 0) {
        toast.success(`${canceledSessions} sessão(ões) cancelada(s)!`);
      } else {
        toast.info('Nenhuma sessão precisava ser cancelada');
      }

      // Limpa seleção
      setSelectedSessionIds(new Set());
      
      // 🔥 ATUALIZAÇÃO OTIMISTA: Atualiza local sem reload pesado
      if (onRefresh) {
        onRefresh(); // Callback do pai para atualizar lista
      } else {
        window.location.reload(); // Fallback
      }
    } catch (err: any) {
      // Trata erro de concorrência (409)
      if (err.response?.status === 409) {
        toast.warning('Cancelamento já em andamento. Aguarde...');
      } else {
        toast.error('Erro ao cancelar sessões');
      }
      console.error(err);
    } finally {
      setIsBatchCanceling(false);
    }
  };


  const handleInactivate = async () => {
    if (!pack?._id) return;
    setIsInactivating(true);
    try {
      const result = await packageService.inactivatePackage(pack._id);
      toast.success(`Pacote inativado — ${result.data?.sessionsCanceled ?? 0} sessão(ões) cancelada(s)`);
      setShowInactivateModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.code || err?.response?.data?.message || 'Erro ao inativar pacote');
    } finally {
      setIsInactivating(false);
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
      },
      cancelled: {
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
      className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* Header com gradiente - verde para therapy, azul para convenio, âmbar para liminar */}
      <div className={`p-6 border-b ${
        pack.type === 'convenio'
          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100'
          : pack.type === 'liminar'
          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
          : paymentState === 'paid'
          ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-green-200'
          : paymentState === 'reserved'
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
          : paymentState === 'overdue'
          ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
          : paymentState === 'partial'
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
          : 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
      }`}>
        {/* Barra de status: Ativo | estado financeiro | Detalhes */}
        <div className="flex items-center gap-2 mb-4">
          {pack.status === 'active' ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowInactivateModal(true); }}
              title="Clique para inativar este pacote"
              className={statusConfig.pill + ' cursor-pointer hover:opacity-80 transition-opacity'}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </button>
          ) : (
            <div className={statusConfig.pill}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </div>
          )}
          {pack.type !== 'convenio' && !financialLoading && financial !== null && (
            paymentState === 'paid' ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Quitado
              </span>
            ) : paymentState === 'reserved' ? (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-300">
                Aguardando pag.
              </span>
            ) : paymentState === 'overdue' ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                Em aberto
              </span>
            ) : paymentState === 'partial' ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                Pago parcial
              </span>
            ) : null
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCardClick && onCardClick(pack);
            }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors font-medium ml-auto"
          >
            Detalhes
          </button>
        </div>

        {/* Info: ícone + nome/profissional */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${
            pack.type === 'convenio'
              ? 'bg-blue-100'
              : pack.type === 'liminar'
              ? 'bg-emerald-100'
              : 'bg-emerald-100'
          }`}>
            {pack.type === 'convenio' ? (
              <Building2 className="h-5 w-5 text-blue-600" />
            ) : pack.type === 'liminar' ? (
              <Gavel className="h-5 w-5 text-emerald-600" />
            ) : (
              <Sprout className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                {patient?.fullName || pack.searchFields?.patientName || 'Paciente não identificado'}
              </h3>
              {pack.type === 'convenio' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  CONVÊNIO
                </span>
              )}
              {pack.type === 'liminar' && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  LIMINAR
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {pack.searchFields?.doctorName || 'Profissional não identificado'} • {' '}
              <span className="capitalize">{pack.sessionType?.toLowerCase()}</span>
            </p>
            {pack.createdAt && (
              <p className="text-xs text-gray-400">
                Criado em {new Date(pack.createdAt).toLocaleDateString('pt-BR')}
              </p>
            )}
            {pack.type === 'convenio' && pack.insuranceProvider && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                {pack.insuranceProvider.replace(/-/g, ' ').toUpperCase()}
              </p>
            )}
            {pack.type === 'liminar' && pack.liminarProcessNumber && (
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Processo: {pack.liminarProcessNumber}
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso clínico */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso Clínico</span>
            <div className="text-right">
              <span className={`text-base font-bold ${
                pack.type === 'convenio'
                  ? 'text-blue-600'
                  : pack.type === 'liminar'
                  ? 'text-emerald-600'
                  : 'text-emerald-600'
              }`}>
                {completedSessions} de {pack.totalSessions}
              </span>
              <p className="text-[10px] text-gray-400 leading-none">utilizadas</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                pack.type === 'convenio'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600'
                  : pack.type === 'liminar'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600'
              }`}
              style={{ width: `${((completedSessions || 0) / pack.totalSessions) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse-slow"></div>
            </div>
          </div>
          {scheduledSessions.length > 0 && (
            <p className="text-xs text-gray-500">{scheduledSessions.length} futuras agendadas</p>
          )}
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
                <span className="text-sm font-medium text-gray-700">Pacote Contratado</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pack.totalValue || 0)}
              </div>
              {financial !== null && paymentState === 'reserved' && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-gray-500">Pago: <span className="text-red-600 font-semibold">R$ 0,00</span></p>
                  <p className="text-xs text-gray-500">Pendente: <span className="text-amber-700 font-semibold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pack.totalValue || 0)}
                  </span></p>
                </div>
              )}
              {financial !== null && paymentState === 'partial' && particularPaid > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-gray-500">Pago: <span className="text-blue-600 font-semibold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(particularPaid)}
                  </span></p>
                  <p className="text-xs text-gray-500">Restante: <span className="text-gray-700 font-semibold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((pack.totalValue || 0) - particularPaid)}
                  </span></p>
                </div>
              )}
              {isFullyPaid && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  {pack.financialStatus === 'paid_with_credit' ? 'Pago antecipado' : 'Pago integralmente'}
                </p>
              )}
              {/* @deprecated LEGADO — fallback pack.totalPaid. Não usar. Fonte de verdade: financial.particularPaid */}
              {financial === null && (pack.totalPaid || 0) > 0 && (
                <div className="text-xs text-emerald-600 mt-1">
                  Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pack.totalPaid)}
                </div>
              )}
            </div>
          )}

          {/* 💰 DÍVIDA REAL — Esconder para convênio */}
          {pack.type !== 'convenio' ? (
            pack.financialStatus === 'paid_with_credit' ? (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">💳 Crédito restante</span>
                </div>
                {/* @deprecated LEGADO — pack.balance é legado e pode estar inflado. Fonte de verdade: financial.sessionDebt */}
                <div className="text-lg font-bold text-blue-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(pack.balance ?? 0)}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {pack.sessionsRemaining ?? 0} sessão(ões) restante(s) no pacote
                </p>
              </div>
            ) : (
              <div className={`p-4 rounded-xl border ${
                paymentState === 'paid'
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                  : paymentState === 'reserved'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                    : paymentState === 'overdue'
                      ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'
                      : paymentState === 'partial'
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className={`h-4 w-4 ${
                    paymentState === 'paid' ? 'text-green-600'
                    : paymentState === 'reserved' ? 'text-amber-600'
                    : paymentState === 'overdue' ? 'text-red-600'
                    : paymentState === 'partial' ? 'text-blue-600'
                    : 'text-gray-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    {paymentState === 'paid' ? '✅ Quitado'
                    : paymentState === 'reserved' ? '⏳ Aguardando pag.'
                    : paymentState === 'overdue' ? '💰 Em aberto'
                    : paymentState === 'partial' ? '🔶 Pago parcial'
                    : '—'}
                  </span>
                </div>
                {paymentState === 'paid' && (
                  <>
                    <div className="text-lg font-bold text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        particularPaid > 0 ? particularPaid : (pack.totalPaid || pack.totalValue || 0)
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">pago integralmente</p>
                  </>
                )}
                {paymentState === 'reserved' && (
                  <p className="text-xs text-amber-800 font-medium mt-1">Nenhum pagamento registrado</p>
                )}
                {paymentState === 'overdue' && (
                  <>
                    <div className={`text-lg font-bold ${sessionDebt > 100 ? 'text-red-600' : 'text-amber-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sessionDebt)}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">sessões realizadas não pagas</p>
                  </>
                )}
                {paymentState === 'partial' && (
                  <>
                    <div className="text-lg font-bold text-blue-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(particularPaid)}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pack.totalValue || 0)}
                    </p>
                  </>
                )}
                {paymentState === 'unknown' && (
                  <p className="text-[10px] text-gray-400 mt-1">Carregando...</p>
                )}
              </div>
            )
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Sessões Pendentes</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {pack.totalSessions - completedSessions}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                de {pack.totalSessions} total
              </div>
            </div>
          )}
        </div>

        {/* ⚖️ Métricas de Crédito - Só para Liminar */}
        {pack.type === 'liminar' && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Crédito da Liminar</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">Total</span>
                <div className="text-base font-bold text-emerald-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(pack.liminarTotalCredit || 0)}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Disponível</span>
                <div className="text-base font-bold text-emerald-600">
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
                <div className="text-base font-bold text-emerald-700">
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
            <span className="text-gray-500">Pago até agora</span>
            <div className="font-medium text-emerald-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(particularPaid > 0 ? particularPaid : (pack.totalPaid ?? 0))}
            </div>
          </div>
        </div>

        {/* Alertas Elegantes */}
        <div className="space-y-2">
          {sessionDebt < 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800">Crédito Disponível</div>
                <div className="text-xs text-green-600">
                  Valor: {Math.abs(sessionDebt)} • Verificar reembolso
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

            {paymentState === 'reserved' && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 p-3 rounded-lg flex items-start gap-3">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-amber-900">Pacote reservado — aguardando pagamento</div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    {scheduledSessions.length > 0
                      ? `Paciente possui ${scheduledSessions.length} sessão(ões) agendada(s) sem quitação do pacote.`
                      : 'Nenhum pagamento foi registrado para este pacote.'}
                  </div>
                </div>
              </div>
            )}
            {paymentState === 'unknown' &&
             Number(pack.totalPaid || 0) === 0 &&
             pack.financialStatus !== 'paid_with_credit' &&
             pack.financialStatus !== 'paid' && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-3 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-orange-800">Pagamento Pendente</div>
                  <div className="text-xs text-orange-600">Nenhum pagamento registrado para este pacote</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🆕 Ação v2: quitar débitos do pacote (só aparece se houver dívida real) */}
        {financialLoading ? (
          <div className="w-full py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 flex items-center justify-center gap-2 font-medium text-sm">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
            Carregando financeiro...
          </div>
        ) : (
          (pack.type === 'therapy' || pack.type === 'terapia_ocupacional' || !pack.type) && Number(sessionDebt) > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBalanceModal(true);
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 hover:border-emerald-400 hover:from-emerald-100 hover:to-green-100 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm"
            >
              <span>💚</span>
              Quitar pendências
            </button>
          ) : null
        )}
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
            
            {scheduledSessions.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                {scheduledSessions.length} futuras agendadas
              </span>
            )}
          </div>
          
          {/* 🔥 NOVO: Checkbox Selecionar Todos (só aparece se tiver sessões agendadas, e só na Lista) */}
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
          <div className="px-6 pb-4 space-y-3">
            {/* Tabs: Ativas / Histórico + botão que abre o calendário em modal */}
            <div className="flex items-center justify-between gap-2 pt-1 border-b border-gray-100 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSessionTab('active'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sessionTab === 'active'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Ativas ({activeSessions.length})
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSessionTab('history'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sessionTab === 'history'
                      ? 'bg-gray-200 text-gray-700 border border-gray-300'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Histórico ({historySessions.length})
                </button>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowSessionsCalendarModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                Calendário
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(sessionTab === 'active' ? activeSessions : historySessions)
                .slice()
                .sort((a, b) => {
                  const dateA = new Date(a.date).getTime();
                  const dateB = new Date(b.date).getTime();
                  if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0;
                  if (Number.isNaN(dateA)) return 1;
                  if (Number.isNaN(dateB)) return -1;
                  if (dateA !== dateB) return dateA - dateB;
                  const timeA = a.time || '';
                  const timeB = b.time || '';
                  return timeA.localeCompare(timeB);
                })
                .map((session, sessionNumber) => (
                  <SessionListItem
                    key={session._id}
                    session={session}
                    sessionNumber={sessionNumber + 1}
                    onEdit={(session) => { openModalWithAction('edit', session); }}
                    onUse={(session) => { openModalWithAction('use', session); }}
                    isSelected={selectedSessionIds.has(session._id)}
                    onToggleSelect={() => toggleSessionSelection(session._id)}
                    canSelect={session.status === 'scheduled' || session.status === 'unpaid'}
                  />
                ))}
              {(sessionTab === 'active' ? activeSessions : historySessions).length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">
                  {sessionTab === 'active' ? 'Nenhuma sessão ativa.' : 'Nenhuma sessão no histórico.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 NOVO: Modal de calendário das sessões (mesmo padrão do specialtyModal em ContractCard.tsx / liminar e do "Detalhes da Guia" em convênio) */}
      {showSessionsCalendarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">Sessões — {pack.sessionType?.replace(/_/g, ' ')}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Realizada</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Confirmada</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Agendada</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Cancelada</span>
                </div>
              </div>
              <button
                onClick={() => setShowSessionsCalendarModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto p-5">
              {sessionCalendarEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">Nenhuma sessão registrada neste pacote.</p>
              ) : (
                <div className="min-w-[640px]">
                  <PatientMiniCalendar
                    appointments={sessionCalendarEvents as any}
                    onEventClick={(appt) => {
                      setShowSessionsCalendarModal(false);
                      openModalWithAction('edit', appt.__session);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <SessionModal
          key={selectedSession._id || 'new'}
          action={modalAction}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSession(initialSessionState);
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


      {showBalanceModal && (
        <PatientBalanceModal
          isOpen={showBalanceModal}
          onClose={() => setShowBalanceModal(false)}
          patientId={patient?.patientId || patient?._id || ''}
          patientName={patient?.fullName || ''}
          onRefresh={() => { setShowBalanceModal(false); if (onRefresh) onRefresh(); }}
        />
      )}

      {/* Modal de confirmação de inativação */}
      {showInactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInactivateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Inativar pacote</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Esta ação irá <strong>cancelar todas as sessões e agendamentos pendentes</strong> deste pacote e liberar a agenda.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Sessões já realizadas e pagamentos concluídos serão <strong>mantidos</strong> e não impactarão o financeiro.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInactivateModal(false)}
                disabled={isInactivating}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInactivate}
                disabled={isInactivating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isInactivating ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Inativando...</>
                ) : (
                  'Sim, inativar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}