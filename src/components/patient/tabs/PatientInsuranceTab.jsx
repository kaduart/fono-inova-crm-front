// src/components/patient/tabs/PatientInsuranceTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import GenerationCancellationFlow from '../../common/GenerationCancellationFlow';
import { AppointmentOrigin } from '../../patients/AppointmentOrigin';
import {
  Plus,
  Calendar,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  UserCheck,
  DollarSign,
  RefreshCw,
  XOctagon,
  Info,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '../../../utils/toast';
import { formatGuideExpiryBR } from '../../../utils/dateUtils';
import { useQueryClient } from '@tanstack/react-query';
import { useInsuranceGuides } from '../../../hooks/useInsuranceGuides';
import { useInsurancePlan, insurancePlanQueryKey } from '../../../hooks/useInsurancePlan';
import { getGuide, getGuideAppointments, updateGuideAppointmentsBulk, supersedeGuide, getGuides, moveAppointmentToGuide } from '../../../services/insuranceGuideApi';
import { buildGuidesPresentation, buildGuidePresentation } from '../../../services/guidePresentationService';
import API from '../../../services/api';
import doctorService from '../../../services/doctorService';
import { appointmentService } from '../../../services/appointmentService';
import { useAppointmentsContext } from '../../../contexts/AppointmentsContext';
import InsuranceGuideForm from './InsuranceGuideForm';
import InsurancePlanForm from './InsurancePlanForm';
import { AnchorMenu, MenuAction, ModalShell, ProgressBar, Spinner } from '../../ui/TailwindParts';
import { PatientMiniCalendar } from '../../patients/PatientMiniCalendar';
import AnimatedValue from '../../ui/insight/AnimatedValue';
import InactivateEntityModal from '../../common/InactivateEntityModal';
import AppointmentDetailModal from '../../calendar/appointmentDetailModal';

// ----------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------
const PatientInsuranceTab = ({ patientId, patientName }) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const selectedPresentation = useMemo(
    () => selectedGuide ? buildGuidePresentation(selectedGuide) : null,
    [selectedGuide]
  );
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planFormContext, setPlanFormContext] = useState(null);
  const [detailsGuide, setDetailsGuide] = useState(null);
  const [showInactivateModal, setShowInactivateModal] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [renewingGuide, setRenewingGuide] = useState(null);
  const [doctors, setDoctors] = useState([]);

  const { fetchAppointments } = useAppointmentsContext();
  const queryClient = useQueryClient();
  const invalidatePlans = () => queryClient.invalidateQueries({ queryKey: ['insurance-plan'] });

  useEffect(() => {
    doctorService.getActiveDoctors()
      .then(res => setDoctors(res?.data ?? []))
      .catch(() => toast.error('Não foi possível carregar a lista de profissionais'));
  }, []);

  const {
    guides,
    balance,
    isLoading,
    error,
    createGuide,
    updateGuide,
    inactivateGuide,
    refetch
  } = useInsuranceGuides(patientId, {
    specialty: selectedSpecialty === 'all' ? undefined : selectedSpecialty
  });

  const presentations = useMemo(() => {
    return buildGuidesPresentation(guides);
  }, [guides]);

  const specialties = useMemo(() => {
    const unique = [...new Set(presentations.map(p => p.specialty).filter(Boolean))];
    return unique.sort();
  }, [presentations]);

  // Guias usáveis vencendo em breve — agregado num único alerta em vez de enterrado card a card.
  // Usa presentation.isExpiringSoon (mesma fonte que o badge do card) em vez de recalcular threshold aqui.
  const expiringSoonPresentations = useMemo(() => {
    return presentations.filter(p => p.isUsable && p.isExpiringSoon);
  }, [presentations]);

  const availablePresentations = useMemo(() => {
    return presentations
      .filter(p => selectedSpecialty === 'all' || p.specialty === selectedSpecialty)
      .filter(p => {
        if (selectedStatus === 'cancelled') return p.isCancelled;
        if (selectedStatus === 'inactive') return !p.isUsable;
        return p.isUsable;
      });
  }, [presentations, selectedSpecialty, selectedStatus]);

  const activeCount = useMemo(() => presentations.filter(p => p.isUsable).length, [presentations]);
  const inactiveCount = useMemo(() => presentations.filter(p => !p.isUsable).length, [presentations]);
  // Aba dedicada pra achar guia cancelada sem precisar entrar em "Inativas"
  // primeiro (achado real: usuário não sabia que #16173377 estava lá dentro).
  const cancelledCount = useMemo(() => presentations.filter(p => p.isCancelled).length, [presentations]);

  const groupedGuides = useMemo(() => {
    const active = availablePresentations.filter(p => p.isUsable);
    const exhausted = availablePresentations.filter(p => p.isExhausted);
    const expired = availablePresentations.filter(p => p.isExpired && !p.isCancelled && !p.isExhausted && !p.isSuperseded);
    const superseded = availablePresentations.filter(p => p.isSuperseded && !p.isCancelled && !p.isExpired && !p.isExhausted);
    const cancelled = availablePresentations.filter(p => p.isCancelled);
    return { active, exhausted, expired, superseded, cancelled };
  }, [availablePresentations]);

  const handleOpenMenu = (event, presentation) => {
    setAnchorEl(event.currentTarget);
    setSelectedGuide(presentation.rawGuide);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleDismissMenu = () => {
    setAnchorEl(null);
    setSelectedGuide(null);
  };

  const handleOpenDetails = () => {
    setDetailsGuide(selectedGuide);
    handleCloseMenu();
  };

  const handleOpenDetailsCard = (presentation) => {
    setDetailsGuide(presentation.rawGuide);
  };

  const handleEdit = async () => {
    if (!selectedGuide?._id) return;
    const guideId = selectedGuide._id;
    handleCloseMenu();
    try {
      const currentGuide = await getGuide(guideId);
      setEditingGuide(currentGuide);
      setIsFormOpen(true);
    } catch (err) {
      toast.error(err.message || 'Não foi possível carregar a guia para edição');
    }
  };

  const handleRenovarGuia = () => {
    setRenewingGuide(selectedGuide);
    setIsFormOpen(true);
    handleDismissMenu();
  };

  const handleCancelGuide = () => {
    if (!selectedGuide) return;
    setShowInactivateModal(true);
    handleCloseMenu();
  };

  const handleInactivateFromCard = (presentation) => {
    setSelectedGuide(presentation.rawGuide);
    setShowInactivateModal(true);
  };

  const confirmInactivate = async () => {
    if (!selectedGuide) return;
    setIsInactivating(true);
    try {
      const result = await inactivateGuide(selectedGuide._id);
      toast.success(`Guia inativada — ${result.sessionsCanceled ?? 0} sessão(ões) cancelada(s)`);
      setShowInactivateModal(false);
      setSelectedGuide(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao inativar guia');
    } finally {
      setIsInactivating(false);
    }
  };

  const handleSaveGuide = async (data) => {
    try {
      if (renewingGuide) {
        const renewResult = await supersedeGuide(renewingGuide._id, {
          newGuide: {
            number: data.number,
            expiresAt: data.expiresAt,
            totalSessions: data.totalSessions,
            sessionValue: data.sessionValue,
            evaluationAmount: data.evaluationAmount,
            doctorId: data.doctorId,
            issuedAt: data.issuedAt,
            notes: data.notes
          },
          replacementTrigger: 'new_authorization',
          replacementNotes: data.notes,
          migrationStrategy: 'eligible'
        });
        const planMsg = renewResult.planCloned
          ? ` Plano terapêutico clonado (${renewResult.planGeneratedAppointmentsCount ?? 0} novos agendamentos, ${renewResult.planAppointmentsCanceledCount ?? 0} antigos cancelados).`
          : '';
        toast.success(`Guia renovada com sucesso.${planMsg}`);
        refetch();
        fetchAppointments();
        invalidatePlans();
      } else if (editingGuide) {
        await updateGuide(editingGuide._id, data);
        toast.success('Guia atualizada com sucesso');
        refetch();
        fetchAppointments();
        invalidatePlans();
      } else {
        await createGuide({ ...data, patientId });
        toast.success('Guia criada com sucesso');
        refetch();
        fetchAppointments();
        invalidatePlans();
      }
      setIsFormOpen(false);
      setEditingGuide(null);
      setRenewingGuide(null);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar guia');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGuide(null);
    setRenewingGuide(null);
  };

  const handleOpenPlanForm = (presentation, plan = null) => {
    setPlanFormContext({ guide: presentation.rawGuide, plan });
    setPlanFormOpen(true);
  };

  const handleClosePlanForm = (refetchNeeded) => {
    setPlanFormOpen(false);
    setPlanFormContext(null);
    if (refetchNeeded) {
      refetch();
      invalidatePlans();
    }
  };

  if (isLoading && guides.length === 0) {
    return (
      <div className="flex justify-center py-16"><Spinner size={40} /></div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <FileText size={32} aria-hidden />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50">Nenhuma guia cadastrada</h3>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Cadastre a primeira guia de convênio para este paciente</p>
          <button type="button" onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} aria-hidden /> Cadastrar primeira guia
          </button>
        </div>

        <InsuranceGuideForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSave={handleSaveGuide}
          guide={editingGuide}
          doctors={doctors}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full p-1 text-left sm:p-2">
      {/* Barra de ferramentas: título, filtro único de situação e nova guia */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Guias de convênio</h2>
          <div role="tablist" aria-label="Situação das guias" className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {[
              { v: 'all', l: 'Ativas', n: activeCount },
              { v: 'inactive', l: 'Inativas', n: inactiveCount },
              { v: 'cancelled', l: 'Canceladas', n: cancelledCount },
            ].map(t => (
              <button key={t.v} type="button" role="tab" aria-selected={selectedStatus === t.v} onClick={() => setSelectedStatus(t.v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${selectedStatus === t.v ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {t.l} <span className="tabular-nums text-slate-400">{t.n}</span>
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={16} /> Nova guia
        </button>
      </div>

      {specialties.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Filtrar por especialidade">
          {['all', ...specialties].map(sp => {
            const count = sp === 'all' ? presentations.length : presentations.filter(p => p.specialty === sp).length;
            const label = sp === 'all' ? 'Todas' : sp.replace(/_/g, ' ');
            const on = selectedSpecialty === sp;
            return (
              <button key={sp} type="button" aria-pressed={on} onClick={() => setSelectedSpecialty(sp)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset transition-colors ${on ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'}`}>
                {label} <span className={on ? 'text-blue-100' : 'text-slate-400'}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Resumo: o que o comercial precisa ver antes de abrir os cards */}
      {presentations.length > 0 && (() => {
        const usable = presentations.filter(p => p.isUsable);
        const remainingSum = usable.reduce((acc, p) => acc + (Number(p.remaining) || 0), 0);
        const lowOnes = usable.filter(p => Number(p.remaining) > 0 && Number(p.remaining) <= 2);
        return (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-2xs font-medium uppercase tracking-wide text-slate-500">Guias ativas</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100"><AnimatedValue value={usable.length} /></dd></div>
              <div><dt className="text-2xs font-medium uppercase tracking-wide text-slate-500">Sessões autorizadas restantes</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums text-blue-700 dark:text-blue-300"><AnimatedValue value={remainingSum} /></dd></div>
              <div><dt className="text-2xs font-medium uppercase tracking-wide text-slate-500">Vencendo em breve</dt><dd className={`mt-0.5 text-lg font-semibold tabular-nums ${expiringSoonPresentations.length ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}><AnimatedValue value={expiringSoonPresentations.length} /></dd></div>
              <div><dt className="text-2xs font-medium uppercase tracking-wide text-slate-500">Quase sem saldo</dt><dd className={`mt-0.5 text-lg font-semibold tabular-nums ${lowOnes.length ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}><AnimatedValue value={lowOnes.length} /></dd></div>
            </dl>
            {(expiringSoonPresentations.length > 0 || lowOnes.length > 0) && (
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-amber-800 dark:border-slate-800 dark:text-amber-300">
                {expiringSoonPresentations.length > 0 && <>Vencem logo: {expiringSoonPresentations.map(p => `${p.specialtyLabel} (${p.daysUntilExpiration === 0 ? 'hoje' : `${p.daysUntilExpiration}d`})`).join(', ')}. </>}
                {lowOnes.length > 0 && <>Restam 2 ou menos: {lowOnes.map(p => `${p.specialtyLabel} #${p.number}`).join(', ')}. </>}
                Peça a renovação ao convênio antes de acabar.
              </p>
            )}
          </div>
        );
      })()}

      {/* Saldo agregado por especialidade (apenas quando filtrado) */}
      {balance && selectedSpecialty !== 'all' && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-medium capitalize text-slate-500 dark:text-slate-400">Saldo total · {selectedSpecialty.replace(/_/g, ' ')}</p>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-3xl font-bold leading-tight tabular-nums text-slate-900 dark:text-slate-50"><AnimatedValue value={balance.remaining} /></p>
              <p className="text-xs text-slate-500 dark:text-slate-400">sessões restantes</p>
            </div>
            <div className="min-w-[150px] flex-1">
              <ProgressBar value={balance.total ? (balance.remaining / balance.total) * 100 : 0} className="bg-blue-600" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{balance.used} de {balance.total} sessões utilizadas</p>
            </div>
          </div>
        </div>
      )}

      {availablePresentations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">
            Nenhuma guia {selectedStatus === 'inactive' ? 'inativa' : selectedStatus === 'cancelled' ? 'cancelada' : 'ativa'} encontrada
            {selectedSpecialty !== 'all' && ` para ${selectedSpecialty.replace(/_/g, ' ')}`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tente selecionar outro filtro ou cadastre uma nova guia</p>
        </div>
      )}

      {/* Seções de guias */}
      <GuideSection
        title="Guias ativas"
        count={groupedGuides.active.length}
        presentations={groupedGuides.active}
        color="#2E7A5E"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
        onGuidesChanged={refetch}
      />

      <GuideSection
        title="Guias esgotadas"
        count={groupedGuides.exhausted.length}
        presentations={groupedGuides.exhausted}
        color="#C75146"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
        onGuidesChanged={refetch}
      />

      <GuideSection
        title="Guias expiradas"
        count={groupedGuides.expired.length}
        presentations={groupedGuides.expired}
        color="#8A99B0"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
        onGuidesChanged={refetch}
      />

      <GuideSection
        title="Guias substituídas"
        count={groupedGuides.superseded.length}
        presentations={groupedGuides.superseded}
        color="#6366F1"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
        onGuidesChanged={refetch}
      />

      <GuideSection
        title="Guias canceladas"
        count={groupedGuides.cancelled.length}
        presentations={groupedGuides.cancelled}
        color="#A0AABF"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
        onGuidesChanged={refetch}
      />

      {/* Menu de ações */}
      <AnchorMenu anchorEl={anchorEl} onClose={handleDismissMenu}>
        <MenuAction onClick={handleEdit}><Edit2 size={14} aria-hidden /> Editar</MenuAction>
        <MenuAction onClick={handleRenovarGuia} disabled={!selectedPresentation?.canRenew} className="text-blue-800 dark:text-blue-300">
          <RefreshCw size={14} aria-hidden /> Renovar guia
        </MenuAction>
        <MenuAction onClick={handleCancelGuide} disabled={selectedPresentation?.isCancelled} className="text-red-700 dark:text-red-400">
          <Trash2 size={14} aria-hidden /> Inativar guia
        </MenuAction>
      </AnchorMenu>

      {/* Modais */}
      <InsuranceGuideForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveGuide}
        guide={renewingGuide || editingGuide}
        doctors={doctors}
        isRenewal={Boolean(renewingGuide)}
      />

      <InsurancePlanForm
        open={planFormOpen}
        onClose={handleClosePlanForm}
        guide={planFormContext?.guide}
        plan={planFormContext?.plan}
        patientId={patientId}
        patientName={patientName}
      />

      <GuideDetailsModal
        guide={detailsGuide}
        onClose={() => setDetailsGuide(null)}
        onUpdate={() => { refetch(); fetchAppointments(); invalidatePlans(); }}
      />



      {/* Modal de confirmação de inativação — compartilhado com Package/Liminar */}
      <InactivateEntityModal
        open={showInactivateModal}
        entityType="guide"
        loading={isInactivating}
        onConfirm={confirmInactivate}
        onClose={() => {
          if (!isInactivating) {
            setShowInactivateModal(false);
            setSelectedGuide(null);
          }
        }}
      />
    </div>
  );
};

// ----------------------------------------------------------------------
// Componente de seção de guias (título + grid)
// ----------------------------------------------------------------------
const GuideSection = ({ title, count, presentations, color, onOpenMenu, onCreatePlan, onOpenDetails, onInactivate, onGuidesChanged }) => {
  if (count === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-5 w-1 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{title} ({count})</h3>
      </div>
      <AnimatePresence>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
          {presentations.map(presentation => (
            <GuideCard
              key={presentation.id}
              presentation={presentation}
              onOpenMenu={onOpenMenu}
              onCreatePlan={onCreatePlan}
              onOpenDetails={onOpenDetails}
              onInactivate={onInactivate}
              onGuidesChanged={onGuidesChanged}
            />
          ))}
        </div>
      </AnimatePresence>
    </section>
  );
};

// ----------------------------------------------------------------------
// Componente de card individual (premium, clean, informativo)
// ----------------------------------------------------------------------

const DAY_NAMES = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };

// Badge de status sólido (não translúcido) — precisa ser legível em cima de QUALQUER
// gradiente de especialidade. Um tom translúcido (ex: laranja 35%) sobre um card já
// laranja praticamente some; um pill branco sólido + ponto colorido não depende da cor de fundo.
const STATUS_SEVERITY_STYLE = {
  success:  { bg: '#EFF9F6', color: '#15803D', dot: '#22C55E' },
  warning:  { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  critical: { bg: '#FDECEA', color: '#B91C1C', dot: '#EF4444' },
  neutral:  { bg: '#F1F5F9', color: '#4B5563', dot: '#9CA3AF' },
};

const GuideCard = ({ presentation, onOpenMenu, onCreatePlan, onOpenDetails, onInactivate, onGuidesChanged }) => {
  const guide = presentation.rawGuide;
  const {
    remaining,
    usedSessions,
    totalSessions,
    progressPct,
    isUsable,
    isCancelled,
    statusLabel,
    statusSeverity,
    expiryLabel,
    expiryColor,
    theme
  } = presentation;

  const severityStyle = STATUS_SEVERITY_STYLE[statusSeverity] || STATUS_SEVERITY_STYLE.neutral;

  const [generating, setGenerating] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [generateModal, setGenerateModal] = useState(null); // { open, planId, startDate } | null
  const [pastConfirm, setPastConfirm] = useState(null); // { planId, totalLabel, count, dates } | null
  const queryClient = useQueryClient();

  // 🆕 (2026-08-20) Confirmação em lote das retroativas — 1 clique deliberado,
  // chamado a partir do botão de ação no toast (ou de onde mais for exposto).
  // Nunca disparado sozinho por generate-sessions (ver comentário no backend).
  const confirmPastSessions = async (planId) => {
    try {
      const res = await API.post(`/v2/insurance-plans/${planId}/confirm-past-sessions`, {}, { timeout: 60000 });
      const { total, confirmed, failed } = res.data?.data || {};
      if (total === 0) {
        toast('Nenhuma sessão retroativa pendente encontrada.', { icon: 'ℹ️' });
      } else if (failed?.length > 0) {
        toast.error(`${confirmed}/${total} confirmada(s). ${failed.length} falharam — tente novamente pela agenda.`, { duration: 8000 });
      } else {
        toast.success(`${confirmed} sessão(ões) retroativa(s) confirmada(s) como realizada(s)`, { duration: 5000 });
      }
      queryClient.invalidateQueries({ queryKey: insurancePlanQueryKey(guide._id) });
      // Contadores do card (concluídas/canceladas/agendadas) vêm da lista de guias, não do plano.
      onGuidesChanged?.();
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      toast.error(serverMsg || 'Erro ao confirmar sessões retroativas em lote');
    }
  };

  const runGenerateSessions = async (planId, { allowPastGeneration = false } = {}) => {
    setGenerating(true);
    try {
      const res = await API.post(
        `/v2/insurance-plans/${planId}/generate-sessions`,
        { allowPastGeneration },
        { timeout: 60000 }
      );
      const {
        appointmentsGenerated,
        appointmentsCanceled,
        replanned,
        remaining,
        pastAppointmentsPending
      } = res.data?.data || {};

      if (replanned && appointmentsCanceled > 0 && appointmentsGenerated > 0) {
        toast.success(
          `🔄 ${appointmentsCanceled} antigas → ${appointmentsGenerated} novas`,
          { duration: 5000 }
        );
      } else if (appointmentsGenerated > 0) {
        toast.success(`${appointmentsGenerated} sessão(ões) gerada(s)`);
      } else if (remaining === 0) {
        // "Nada gerado" sem dizer o porquê deixava parecendo bug (ex: plano com
        // startDate no passado mas sem sessões sobrando pra preencher o passado —
        // achado real: guia 16173376, startDate 17/07, mas as 10 sessões autorizadas
        // já estavam todas alocadas em datas futuras, sem sobra pra backfill).
        toast(`Nenhuma sessão nova: as ${guide.totalSessions} autorizadas pela guia já estão todas agendadas/concluídas — não sobrou saldo pra gerar mais.`, { icon: 'ℹ️', duration: 6000 });
      } else {
        toast(`Nenhuma sessão nova foi gerada (${remaining} ainda disponível na guia) — os horários do plano já coincidem com os agendamentos existentes.`, { icon: 'ℹ️', duration: 6000 });
      }

      // 🚨 FIX (2026-08-20): sessões retroativas não são mais completadas
      // automaticamente (ver comentário no backend, routes/insurancePlans.v2.js)
      // — nascem pre_agendado, pendentes de confirmação manual. Oferece
      // confirmação EM LOTE (1 clique, deliberado) em vez de forçar confirmar
      // uma por uma — sem voltar a completar nada sozinho.
      if (pastAppointmentsPending > 0) {
        const totalLabel = appointmentsGenerated > 0
          ? `${appointmentsGenerated} sessão(ões) gerada(s), sendo ${pastAppointmentsPending} retroativa(s) (datas já passadas).`
          : `${pastAppointmentsPending} sessão(ões) retroativa(s) (datas já passadas) criada(s) como pendente.`;
        // 🆕 (2026-10-28): era um toast no canto que sumia sozinho e não mostrava QUAIS datas
        // seriam confirmadas — no caso Linda Ayla (guia 16510723) o "Gerar" reaproveitou faltas
        // canceladas nas datas antigas e o toast oferecia confirmá-las como realizadas. Agora é
        // modal central listando as datas; confirmar continua sendo 1 clique deliberado.
        const todayStr = new Date().toISOString().slice(0, 10);
        let pastDates = [];
        try {
          const appts = await getGuideAppointments(guide._id);
          pastDates = appts
            .filter(a => ['pre_agendado', 'scheduled'].includes(a.operationalStatus || a.status) && (a.date || '').slice(0, 10) < todayStr)
            .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
            .map(a => `${format(parseISO(a.date.slice(0, 10)), 'dd/MM/yyyy')}${a.time ? ` às ${a.time}` : ''}`);
        } catch {
          // Sem a lista o modal ainda abre com a contagem — a confirmação continua deliberada.
        }
        setPastConfirm({ planId, totalLabel, count: pastAppointmentsPending, dates: pastDates });
      }

      queryClient.invalidateQueries({ queryKey: insurancePlanQueryKey(guide._id) });
      // Sem isso o card só atualizava com F5: os contadores vêm da lista de guias (estado local).
      onGuidesChanged?.();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      const conflict = err?.response?.data?.conflict;

      if (status === 429) {
        toast('Já existe uma geração em andamento. Aguarde alguns segundos.', { icon: '⏳' });
      } else if (status === 409 && conflict?.withWhom) {
        // Negrito só no que importa (com quem, guia, quando) — mesmo padrão do
        // InsurancePlanForm, pra não enterrar a informação útil em texto corrido.
        toast.error(
          <span>
            Conflito de agenda com <strong>{conflict.withWhom}</strong>
            {conflict.guideNumber ? <> (guia <strong>{conflict.guideNumber}</strong>)</> : null} em{' '}
            <strong>{conflict.date}</strong> às <strong>{conflict.time}</strong>. Escolha outro horário.
          </span>,
          { duration: 9000 }
        );
      } else if (status >= 500) {
        toast.error(serverMsg || 'Erro no servidor. Aguarde um instante e tente novamente.');
      } else if (!err?.response) {
        toast.error('A requisição demorou demais ou foi interrompida. Recarregue a página e tente novamente.');
      } else {
        toast.error(serverMsg || 'Erro ao gerar sessões');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSessions = (planId) => {
    // Mesmo padrão do "Gerar sessões" da Liminar: sempre abre modal confirmando
    // quantidade e data de início antes de gerar, em vez de disparar direto.
    const startDateStr = plan?.startDate ? plan.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setGenerateModal({ open: true, planId, startDate: startDateStr, tab: 'generate' });
  };

  const handleConfirmGenerate = async () => {
    if (!generateModal?.open) return;
    const { planId, startDate } = generateModal;
    setGenerateModal(null);

    const currentStartDate = plan?.startDate ? plan.startDate.slice(0, 10) : null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const startsInPast = startDate < todayStr;

    try {
      // Data mudou em relação ao plano salvo — persiste antes de gerar (mesmo
      // endpoint da edição do plano, PATCH /:id).
      if (startDate !== currentStartDate) {
        await API.patch(`/v2/insurance-plans/${planId}`, { startDate });
        queryClient.invalidateQueries({ queryKey: insurancePlanQueryKey(guide._id) });
      }
      await runGenerateSessions(planId, { allowPastGeneration: startsInPast });
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      toast.error(serverMsg || 'Erro ao salvar a data de início do plano');
    }
  };

  // Query compartilhada — mesma key usada pelo GuideDetailsModal, sem fetch duplicado
  const { data: plan = null, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useInsurancePlan(guide._id, isUsable);

  // O bloco "Plano ativo" abaixo já mostra o profissional do plano — só repete aqui em cima
  // se a guia tiver um profissional diferente do plano (ou não houver plano ainda).
  const planDoctorName = plan?.doctor?.fullName || plan?.doctor?.name || null;
  const showGuideDoctor = Boolean(guide.doctor?.fullName) && guide.doctor.fullName !== planDoctorName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%', width: '100%', maxWidth: 380 }}
    >
      <div
        className={`flex h-full flex-col overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white text-left shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${isUsable ? 'border-l-blue-500' : 'border-l-slate-300 dark:border-l-slate-600'}`}
        style={{ opacity: isUsable ? 1 : 0.8 }}
      >

        {/* ── Header compacto ── */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-2xs font-mono text-gray-400 mb-0.5">#{presentation.number}</div>
              <h3 className="truncate text-[0.95rem] font-bold leading-tight text-slate-900 dark:text-slate-100">{presentation.specialtyLabel}</h3>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-1">
              {!plan && onOpenDetails && (
                <button type="button" onClick={() => onOpenDetails(presentation)} title="Detalhes da guia" aria-label="Detalhes da guia"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <Info size={15} aria-hidden />
                </button>
              )}
              <button type="button" onClick={(e) => onOpenMenu(e, presentation)} aria-label="Mais ações da guia" aria-haspopup="menu"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                <MoreVertical size={16} aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {presentation.insuranceLabel && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold"
                style={{ backgroundColor: theme.light, color: theme.text }}
              >
                {presentation.insuranceLabel}
              </span>
            )}
            {guide.expiresAt && (
              <span className="text-gray-500 text-xs">
                Vence <strong className="text-gray-700 font-semibold">{formatGuideExpiryBR(guide.expiresAt)}</strong>
              </span>
            )}
          </div>

          {/* Badge de status sólido — ponto colorido reforça a severidade */}
          <div className="mt-2">
            {(
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wide"
                style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: severityStyle.dot }} />
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* ── Números da guia + trilha Guia → Plano → Sessões → Faturamento ── */}
        <div className="mx-4 mb-3 space-y-3">
          <dl className="grid grid-cols-3 gap-2">
            {[
              { k: 'Autorizadas', v: totalSessions, c: 'text-slate-900 dark:text-slate-100' },
              { k: 'Usadas', v: usedSessions, c: 'text-blue-700 dark:text-blue-300' },
              { k: 'Restam', v: remaining, c: isUsable && remaining <= 2 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100' },
            ].map(f => (
              <div key={f.k} className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                <dt className="text-2xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{f.k}</dt>
                <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${f.c}`}><AnimatedValue value={Number(f.v) || 0} /></dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={totalSessions} aria-valuenow={usedSessions} aria-label="Sessões usadas da guia">
              <div className={`h-full rounded-full transition-[width] duration-700 ${isUsable && remaining <= 2 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-1 text-2xs text-slate-500 dark:text-slate-400">
              {[
                guide.scheduledCount > 0 ? `${guide.scheduledCount} agendada${guide.scheduledCount !== 1 ? 's' : ''}` : null,
                guide.canceledCount > 0 ? `${guide.canceledCount} cancelada${guide.canceledCount !== 1 ? 's' : ''}` : null,
                isUsable && remaining > 0 && remaining <= 2 ? 'hora de pedir renovação' : null,
              ].filter(Boolean).join(' · ') || `${usedSessions} de ${totalSessions} usadas`}
            </p>
          </div>
          {(() => {
            const sessionsDone = totalSessions > 0 && usedSessions >= totalSessions;
            const steps = [
              { k: 'Guia', state: presentation.isExpired ? 'warn' : 'done', sub: guide.expiresAt ? `vence ${formatGuideExpiryBR(guide.expiresAt)}` : 'ok' },
              { k: 'Plano', state: plan ? 'done' : (isUsable ? 'current' : 'todo'), sub: plan ? (plan.sessionsPerWeek ? `${plan.sessionsPerWeek}×/sem` : 'criado') : (planLoading ? '…' : 'falta criar') },
              { k: 'Sessões', state: sessionsDone ? 'done' : plan ? 'current' : 'todo', sub: `${usedSessions}/${totalSessions}` },
              { k: 'Faturamento', state: usedSessions > 0 && presentation.canBill ? 'current' : 'todo', sub: usedSessions > 0 ? 'pelo Financeiro' : '—' },
            ];
            const dot = { done: 'bg-blue-600 text-white', current: 'bg-white text-blue-700 ring-2 ring-blue-600 dark:bg-slate-900 dark:text-blue-300', warn: 'bg-amber-500 text-white', todo: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' };
            return (
              <ol className="grid grid-cols-4 gap-1" aria-label="Etapas da guia">
                {steps.map((st, i) => (
                  <li key={st.k} className="flex min-w-0 flex-col items-center text-center">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-3xs font-bold ${dot[st.state]}`}>{st.state === 'done' ? '✓' : i + 1}</span>
                    <span className="mt-1 truncate text-2xs font-semibold text-slate-700 dark:text-slate-200">{st.k}</span>
                    <span className="truncate text-3xs text-slate-500 dark:text-slate-400">{st.sub}</span>
                  </li>
                ))}
              </ol>
            );
          })()}
        </div>

        {detailsExpanded && (
        <>
        {/* ── Financial details ── */}
        <div className="px-4 pb-3 flex-1 flex flex-col gap-2.5">
          {(guide.sessionValue > 0 || guide.evaluationAmount > 0 || guide.totalValue > 0 || showGuideDoctor) && (
            <div className="flex flex-col gap-2">
              {(guide.sessionValue > 0 || guide.totalValue > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {guide.sessionValue > 0 && (
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: theme.light }}>
                      <span className="flex items-center gap-1 text-2xs text-gray-500 mb-0.5">
                        <DollarSign size={11} className="opacity-60" />
                        Valor/sessão
                      </span>
                      <div className="text-sm font-bold text-gray-900">
                        {Number(guide.sessionValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  )}
                  {guide.totalValue > 0 && (
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: theme.light }}>
                      <span className="flex items-center gap-1 text-2xs text-gray-500 mb-0.5">
                        <DollarSign size={11} className="opacity-60" />
                        Total autorizado
                      </span>
                      <div className="text-sm font-bold" style={{ color: theme.text }}>
                        {Number(guide.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {guide.evaluationAmount > 0 && (
                <div className="flex justify-between items-center px-0.5">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText size={12} className="opacity-50" />
                    Valor avaliação
                  </span>
                  <div className="flex items-center gap-2">
                    {guide.generateEvaluationBilling === false && (
                      <span className="text-3xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">sem cobrança no sistema</span>
                    )}
                    <span className="text-xs font-bold text-gray-900">
                      {Number(guide.evaluationAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}
              {showGuideDoctor && (
                <div className="flex justify-between items-center gap-2 px-0.5">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <UserCheck size={12} className="opacity-50" />
                    Profissional da guia
                  </span>
                  <span className="text-xs font-semibold text-gray-700 text-right truncate">{guide.doctor.fullName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Plan block (lazy-loaded) ── */}
        {isUsable && planLoading && (
          <div className="mx-4 mb-4 h-[110px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" aria-hidden />
        )}

        {isUsable && planError && (
          <div className="mx-4 mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-xs text-red-700 dark:text-red-300">Não foi possível carregar o plano</p>
            <button type="button" onClick={() => refetchPlan()} aria-label="Tentar de novo" className="rounded-md p-1 text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/20">
              <RefreshCw size={13} aria-hidden />
            </button>
          </div>
        )}

        {plan && (
          <div className="mx-4 mb-3 px-3.5 py-3 rounded-xl" style={{ backgroundColor: theme.light }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={12} style={{ color: theme.text }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.text }}>
                  Plano ativo
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
              </div>
              <div className="flex items-center gap-2">
                {onOpenDetails && (
                  <button
                    onClick={() => onOpenDetails(presentation)}
                    title="Detalhes da guia"
                    className="opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded"
                    style={{ color: theme.text, '--tw-ring-color': theme.to }}
                  >
                    <Info size={13} />
                  </button>
                )}
                <button
                  onClick={() => onCreatePlan(presentation, plan)}
                  title="Editar plano"
                  className="opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded"
                  style={{ color: theme.text, '--tw-ring-color': theme.to }}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {(plan.doctor?.fullName || plan.doctor?.name) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Profissional</span>
                  <span className="font-semibold text-gray-800 truncate max-w-[60%] text-right">
                    {plan.doctor?.fullName || plan.doctor?.name}
                  </span>
                </div>
              )}

              {plan.sessionsPerWeek > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Frequência</span>
                  <span className="font-semibold text-gray-800">{plan.sessionsPerWeek}×/semana</span>
                </div>
              )}

              {plan.slots?.length > 0 && (
                <div className="flex items-start justify-between text-sm gap-2">
                  <span className="text-gray-500 shrink-0 mt-0.5">Horários</span>
                  <div className="flex flex-col items-end gap-1">
                    {[...plan.slots]
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time))
                      .map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ backgroundColor: '#FFFFFF', color: theme.text, border: `1px solid ${theme.border}` }}
                      >
                        {DAY_NAMES[s.dayOfWeek] ?? s.dayOfWeek}
                        <span className="w-1 h-1 rounded-full opacity-40" style={{ backgroundColor: theme.text }} />
                        {s.time}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {plan.sessionValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Valor do plano</span>
                  <span className="font-semibold text-gray-800">
                    {Number(plan.sessionValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}

              {plan.generatedAppointments?.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Sessões geradas</span>
                  <span className="font-semibold text-gray-800">{plan.generatedAppointments.length}</span>
                </div>
              )}

              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const nextAppt = plan.generatedAppointments
                  ?.filter(a => a.date >= today && ['scheduled', 'pre_agendado'].includes(a.operationalStatus))
                  .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
                return nextAppt ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Próxima sessão</span>
                    <span className="font-semibold text-gray-800">
                      {format(parseISO(nextAppt.date), 'dd/MM')} · {nextAppt.time}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}

        </>
        )}

        {plan?.needsSessionRegeneration && (
          <div
            className="mx-4 mb-3 px-3.5 py-3 rounded-xl border flex items-start gap-2.5"
            style={{ backgroundColor: '#FDECEA', borderColor: '#F5C6C0' }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F9D5D0' }}>
              <AlertTriangle size={14} style={{ color: '#C75146' }} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 pt-0.5">
              <span className="text-xs font-bold" style={{ color: '#C75146' }}>Plano alterado</span>
              <span className="text-xs leading-relaxed" style={{ color: '#B85C52' }}>
                Clique em <strong className="font-semibold" style={{ color: '#C75146' }}>&quot;Gerar sessões&quot;</strong> para sincronizar.
              </span>
            </div>
          </div>
        )}

        {/* ── Ações: a principal é sempre o próximo passo da guia ── */}
        {(() => {
          const toGenerate = Math.max((Number(remaining) || 0) - (Number(guide.scheduledCount) || 0), 0);
          let primary = null;
          if (isUsable && onCreatePlan) {
            if (!plan && !planLoading) primary = { label: 'Criar plano e agendar', onClick: () => onCreatePlan(presentation, null) };
            else if (plan && plan.needsSessionRegeneration) primary = { label: generating ? 'Gerando…' : 'Sincronizar sessões', onClick: () => handleGenerateSessions(plan._id), disabled: generating };
            else if (plan && toGenerate > 0) primary = { label: generating ? 'Gerando…' : (toGenerate === 1 ? 'Gerar 1 sessão' : `Gerar ${toGenerate} sessões`), onClick: () => handleGenerateSessions(plan._id), disabled: generating };
            else if (plan) primary = { label: 'Ver e editar sessões', onClick: () => onCreatePlan(presentation, plan) };
          }
          return (
            <div className="mt-auto flex items-center gap-2 px-4 pb-3.5 pt-1">
              {primary && (
                <button type="button" onClick={primary.onClick} disabled={primary.disabled}
                  className="flex-1 truncate rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {primary.label}
                </button>
              )}
              {isUsable && onCreatePlan && plan && primary?.label !== 'Ver e editar sessões' && (
                <button type="button" onClick={() => onCreatePlan(presentation, plan)} title="Ver e editar sessões do plano"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Calendar size={15} /> Sessões
                </button>
              )}
              <button type="button" onClick={() => setDetailsExpanded(v => !v)} aria-expanded={detailsExpanded}
                className={`flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${primary ? '' : 'flex-1 justify-center'}`}>
                Detalhes
                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: detailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
            </div>
          );
        })()}
      </div>

      {/* Confirmar retroativas — modal central listando as datas (substitui o toast do canto) */}
      {pastConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Sessões retroativas pendentes</h3>
                <p className="text-xs text-slate-500">Guia #{guide.number} — {presentation.specialtyLabel || guide.specialty}</p>
              </div>
              <button onClick={() => setPastConfirm(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 mb-3">{pastConfirm.totalLabel}</p>

            {pastConfirm.dates.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 max-h-48 overflow-y-auto">
                <ul className="text-sm text-slate-700 space-y-1">
                  {pastConfirm.dates.map(d => <li key={d}>• {d}</li>)}
                </ul>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Confirme <strong>só se todos esses atendimentos realmente aconteceram</strong> — cada um passa a
                descontar da guia. Se algum foi falta, escolha "Confirmar depois" e conclua um por um pela agenda.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPastConfirm(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">
                Confirmar depois
              </button>
              <button
                onClick={() => { const { planId } = pastConfirm; setPastConfirm(null); confirmPastSessions(planId); }}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4" /> Confirmar {pastConfirm.count} como realizada(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gerar sessões — mesmo padrão do modal da Liminar: confirma quantidade e início antes de gerar */}
      {generateModal?.open && (() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const startsInPast = generateModal.startDate < todayStr;
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div role="dialog" aria-modal="true" aria-label="Gerar sessões da guia" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-5 text-left sm:p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.to }}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 text-left">Gerar sessões</h3>
                  <p className="text-xs text-slate-500">Guia #{guide.number} — {presentation.specialtyLabel || guide.specialty}</p>
                </div>
                <button onClick={() => setGenerateModal(null)} aria-label="Fechar geração de sessões" className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4 min-[420px]:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Data de início</label>
                  <input
                    type="date"
                    value={generateModal.startDate}
                    onChange={(e) => setGenerateModal(prev => (prev ? { ...prev, startDate: e.target.value } : prev))}
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Sessões a gerar</label>
                  <div className="w-full p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{remaining}</span>
                    <span className="text-xs text-slate-500">autorizado</span>
                  </div>
                </div>
              </div>

              {startsInPast && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-5">As datas anteriores a hoje ficarão <strong>pendentes de confirmação</strong>, sem marcar atendimento realizado ou consumir a guia.</p>
                </div>
              )}

              <GenerationCancellationFlow specialties={[plan?.specialty || guide.specialty]}
                contextKey={JSON.stringify([generateModal.startDate, generateModal.planId])} disabled={!generateModal.startDate}
                onRun={async (cancellations, dryRun) => {
                  const response = await API.post(`/v2/insurance-plans/${generateModal.planId}/generate-sessions`, {
                    startDate: generateModal.startDate, allowPastGeneration: startsInPast, cancellations, dryRun,
                  }, { timeout: 60000 });
                  return response.data?.data || response.data;
                }}
                onApplied={() => { setGenerateModal(null); queryClient.invalidateQueries({ queryKey: insurancePlanQueryKey(guide._id) }); onGuidesChanged?.(); toast.success('Sessões geradas e cancelamentos registrados.'); }} />
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};

// ----------------------------------------------------------------------
// Componente de entrada do changelog do plano
// ----------------------------------------------------------------------
const PLAN_ACTION_CONFIG = {
  insurance_plan_created:  { label: 'Plano criado',      color: '#2E7A5E', bg: '#EFF9F6', Icon: CheckCircle },
  insurance_plan_updated:  { label: 'Plano atualizado',  color: '#1B4D6E', bg: '#EEF4FB', Icon: Edit2 },
  insurance_plan_canceled: { label: 'Plano cancelado',   color: '#C75146', bg: '#FDECEA', Icon: XOctagon },
  insurance_plan_replaced: { label: 'Plano substituído', color: '#D97706', bg: '#FFFBEB', Icon: RefreshCw },
};

const DIFF_FIELD_LABELS = {
  doctor:         'Profissional',
  sessionValue:   'Valor/sessão',
  slots:          'Horários',
  notes:          'Observações',
  status:         'Status',
  sessionsPerWeek:'Frequência',
  totalSessions:  'Total de sessões',
  startDate:      'Data de início',
};

const ACTOR_ROLE_LABELS = {
  admin:      'Admin',
  secretary:  'Secretária',
  doctor:     'Profissional',
  SYSTEM:     'Sistema',
};

const PlanChangelogEntry = ({ entry }) => {
  const cfg = PLAN_ACTION_CONFIG[entry.action] || { label: entry.action, color: '#8A99B0', bg: '#F8FAFE', Icon: Clock };
  const { Icon } = cfg;

  const dateStr = entry.createdAt
    ? format(parseISO(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '—';

  const actorLabel = entry.actorRole ? (ACTOR_ROLE_LABELS[entry.actorRole] || entry.actorRole) : 'Sistema';

  const diffLines = [];
  if (entry.diff) {
    for (const [field, change] of Object.entries(entry.diff)) {
      const label = DIFF_FIELD_LABELS[field];
      if (!label) continue;
      if (field === 'sessionValue') {
        const fmt = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
        diffLines.push(`${label}: ${fmt(change.from)} → ${fmt(change.to)}`);
      } else if (field === 'slots') {
        diffLines.push(`${label}: alterados`);
      } else if (field === 'doctor') {
        diffLines.push(`${label}: alterado`);
      } else if (field === 'startDate') {
        const fmt = (v) => v ? format(parseISO(v), 'dd/MM/yyyy') : '—';
        diffLines.push(`${label}: ${fmt(change.from)} → ${fmt(change.to)}`);
      } else {
        diffLines.push(`${label}: ${change.from ?? '—'} → ${change.to ?? '—'}`);
      }
    }
  }

  return (
    <div className="flex gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}20` }}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cfg.color}15` }}>
        <Icon size={13} color={cfg.color} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[0.8rem] font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="shrink-0 text-[0.65rem] text-slate-500">{dateStr}</p>
        </div>
        <p className="mt-0.5 text-[0.7rem] text-slate-600">Por: {actorLabel}</p>
        {diffLines.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {diffLines.map((line, i) => (
              <p key={i} className="text-[0.7rem] font-medium text-slate-800">• {line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Modal de detalhes da guia — lista todos os agendamentos atrelados
// ----------------------------------------------------------------------
const APPT_STATUS_CONFIG = {
  completed:           { label: 'Realizado',    color: '#2E7A5E', bg: '#EFF9F6' },
  paid:                { label: 'Realizado',    color: '#2E7A5E', bg: '#EFF9F6' },
  scheduled:           { label: 'Agendado',     color: '#1B4D6E', bg: '#EEF4FB' },
  pre_agendado:        { label: 'Pré-agendado', color: '#5B6E8C', bg: '#F1F5F9' },
  confirmed:           { label: 'Confirmado',   color: '#1B4D6E', bg: '#EEF4FB' },
  canceled:            { label: 'Cancelado',    color: '#C75146', bg: '#FDECEA' },
  cancelled:           { label: 'Cancelado',    color: '#C75146', bg: '#FDECEA' },
  pending:             { label: 'Pendente',     color: '#ED6C02', bg: '#FFF3E0' },
  missed:              { label: 'Faltou',       color: '#C75146', bg: '#FDECEA' },
  processing_create:   { label: 'Processando',  color: '#8A99B0', bg: '#F1F5F9' },
  processing_complete: { label: 'Processando',  color: '#8A99B0', bg: '#F1F5F9' },
  processing_cancel:   { label: 'Processando',  color: '#8A99B0', bg: '#F1F5F9' },
};

export const GuideDetailsModal = ({ guide, onClose, onUpdate }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(false);

  // Concluir pelo card reaproveita o completeAppointment do contexto global
  // (mesmo usado pela agenda real) — já faz o polling do 202 assíncrono
  // (pollAppointmentStatus) e detecta lock liberado por falha de worker, sem
  // precisar reimplementar nada disso aqui (bloqueador 4 do review 2026-08-15).
  const { completeAppointment: completeAppointmentCtx } = useAppointmentsContext();

  // 🚨 FIX (2026-08-15): dialog de edição simples trocado por AppointmentDetailModal
  // (mesmo padrão já usado em ContractCard.tsx/Liminar) — corrige rótulo de status
  // errado ("Agendado" pra sessão completed, por normalizeEditStatus cair no fallback)
  // e reaproveita as guardas/tradução de status já corretas do modal canônico.
  const [editingAppointment, setEditingAppointment] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);

  const [bulkDoctorOpen, setBulkDoctorOpen] = useState(false);
  const [bulkDoctorId, setBulkDoctorId]     = useState('');
  const [bulkTime, setBulkTime]             = useState('');
  const [bulkDayOfWeek, setBulkDayOfWeek]   = useState('');
  const [bulkSaving, setBulkSaving]         = useState(false);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

  // Mover atendimento para outra guia (correção administrativa)
  const [movingAppt, setMovingAppt]           = useState(null);
  const [moveGuides, setMoveGuides]           = useState([]);
  const [moveGuidesLoading, setMoveGuidesLoading] = useState(false);
  const [moveTargetGuideId, setMoveTargetGuideId] = useState('');
  const [moveReason, setMoveReason]           = useState('');
  const [moveSubmitting, setMoveSubmitting]   = useState(false);

  // Mesma query key do GuideCard — reaproveita o cache, sem fetch duplicado
  const { data: modalPlan = null, isLoading: modalPlanLoading, isError: modalPlanError, refetch: refetchModalPlan } = useInsurancePlan(guide?._id);

  // Changelog do plano
  const [changelog, setChangelog] = useState([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [viewMode, setViewMode] = useState('calendar');

  useEffect(() => {
    if (!doctorsLoaded) {
      doctorService.getActiveDoctors()
        .then(res => { setDoctors(res?.data ?? []); setDoctorsLoaded(true); })
        .catch(() => toast.error('Não foi possível carregar a lista de profissionais'));
    }
  }, [doctorsLoaded]);

  useEffect(() => {
    if (!modalPlan?._id) { setChangelog([]); return; }
    let mounted = true;
    setChangelogLoading(true);
    API.get(`/v2/insurance-plans/${modalPlan._id}/changelog`)
      .then(res => { if (mounted) setChangelog(res.data?.data || []); })
      .catch(() => { if (mounted) setChangelog([]); })
      .finally(() => { if (mounted) setChangelogLoading(false); });
    return () => { mounted = false; };
  }, [modalPlan?._id]);

  const loadAppointments = (guideId) => {
    setLoading(true);
    setAppointmentsError(false);
    return getGuideAppointments(guideId)
      .then(data => setAppointments(data))
      .catch(() => { setAppointments([]); setAppointmentsError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!guide) return;
    loadAppointments(guide._id);
  }, [guide?._id]);

  // Adapta o formato de appointment retornado por getGuideAppointments pro
  // shape que AppointmentDetailModal espera — mesmo mapper de ContractCard.tsx.
  const sessionToEvent = (s) => {
    const dateObj = new Date(s.date);
    return {
      id: s._id,
      patient: { id: s.patient?._id ?? s.patient, fullName: s.patient?.fullName ?? '' },
      doctor: { id: s.doctor?._id ?? s.doctor, fullName: s.doctor?.fullName ?? '' },
      date: dateObj,
      startTime: s.time,
      formattedDate: dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      start: `${(s.date || '').slice(0, 10)}T${s.time}`,
      operationalStatus: s.operationalStatus || s.status,
      clinicalStatus: s.clinicalStatus,
      reason: s.reason || s.notes || '',
      sessionValue: s.sessionValue,
      paymentAmount: s.paymentAmount,
      specialty: s.specialty,
      serviceType: s.serviceType,
      billingType: s.billingType,
      paymentMethod: s.paymentMethod,
      insuranceProvider: s.insuranceProvider,
      insuranceValue: s.insuranceValue,
      authorizationCode: s.authorizationCode,
      insuranceGuide: s.insuranceGuide ?? guide?._id ?? null,
      insuranceGuideId: s.insuranceGuide?.toString?.() ?? s.insuranceGuideId ?? guide?._id ?? null,
      insurancePlan: s.insurancePlan ?? null,
      liminarContract: s.liminarContract ?? null,
      package: s.package ?? null,
      __isPreAgendamento: (s.operationalStatus || s.status) === 'pre_agendado',
    };
  };

  const openEdit = (appt) => {
    // Guarda também aqui (não só no disabled do ícone) — o calendário mini
    // (viewMode='calendar') chama openEdit direto no clique do evento, sem
    // passar pelos botões da lista.
    const status = appt.operationalStatus || appt.status;
    if (status === 'completed') {
      toast('Sessão já concluída — não pode ser editada/cancelada por aqui', { icon: 'ℹ️' });
      return;
    }
    setEditingAppointment(sessionToEvent(appt));
  };

  const openMove = (appt) => {
    setMovingAppt(appt);
    setMoveTargetGuideId('');
    setMoveReason('');
    // guide.patientId vem populado ({_id, fullName, cpf}) neste fluxo (GET /v2/insurance-guides
    // faz .populate('patientId', ...)) — aceita os dois formatos pra não quebrar a query.
    const patientIdValue = guide?.patientId?._id || guide?.patientId;
    if (!patientIdValue) return;
    setMoveGuidesLoading(true);
    // GET /v2/insurance-guides ignora filtro de specialty no backend — filtra no client
    getGuides(patientIdValue)
      .then((all) => setMoveGuides(all.filter(g => g.specialty === guide.specialty && g._id !== guide._id)))
      .catch(() => toast.error('Não foi possível carregar as guias do paciente'))
      .finally(() => setMoveGuidesLoading(false));
  };

  const confirmMove = async () => {
    if (!moveTargetGuideId) { toast.error('Selecione a guia de destino'); return; }
    setMoveSubmitting(true);
    try {
      await moveAppointmentToGuide(movingAppt._id, moveTargetGuideId, { reason: moveReason || undefined });
      toast.success('Atendimento movido para a nova guia');
      setMovingAppt(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || 'Erro ao mover atendimento');
    } finally {
      setMoveSubmitting(false);
    }
  };

  // Handlers do AppointmentDetailModal — mesmo padrão de ContractCard.tsx
  // (onCancelAppointment/onEditAppointment reaproveitam os mesmos endpoints que
  // o dialog antigo já usava; onCompleteAppointment continua redirecionando pra
  // agenda, igual ao Liminar hoje — nenhum fluxo de conclusão novo foi criado).
  const handleCancelFromModal = async (id, reason, extras) => {
    try {
      await appointmentService.cancel(id, {
        reason: reason || 'Cancelado manualmente',
        cancelRequester: extras?.cancelRequester,
        cancelRequestedAt: extras?.cancelRequestedAt,
        notifyPatient: extras?.notifyPatient,
      });
      toast.success('Agendamento cancelado');
      setEditingAppointment(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao cancelar agendamento');
    }
  };

  // 🚨 FIX (2026-08-15, auditoria Convênio): antes só mostrava um toast mandando
  // usar a agenda — não existia "Concluir" pelo card. Reaproveita o mesmo
  // primitivo já usado pela agenda real (appointmentService.complete →
  // PATCH /v2/appointments/:id/complete → backend decide o roteamento
  // financeiro por billingType, o mesmo completeInsuranceAppointmentCommand/
  // completeSessionV2 já testado em back/tests/completeInsuranceAppointmentCommand.test.js).
  // Nenhuma lógica financeira nova — só liga o botão "Realizar Atendimento" que
  // o próprio AppointmentDetailModal já constrói o payload correto (billingType/
  // insuranceProvider/insuranceValue/authorizationCode vêm do sessionToEvent).
  const handleCompleteFromModal = async (id, data) => {
    try {
      // completeAppointmentCtx (AppointmentsContext) chama appointmentService.complete
      // e, se a resposta vier processing.async=true (202), aguarda o MESMO polling
      // que a agenda real usa (pollAppointmentStatus) antes de resolver — nunca
      // fecha/atualiza o card com o processamento ainda em andamento (bloqueador 4).
      const result = await completeAppointmentCtx(id, data);
      if (result?._lockReleased) {
        // Worker falhou e liberou o lock — processamento NÃO terminou de verdade,
        // apesar de completeAppointmentCtx não ter lançado exceção.
        throw new Error('O processamento falhou. Tente novamente em alguns instantes.');
      }
    } catch (err) {
      // 🚨 FIX (review 2026-08-15, bloqueador 3): só considera sucesso quando a
      // resposta é EXPLICITAMENTE idempotente. Qualquer outro 409 (ex:
      // CONFIRM_FAILED, REACTIVATION_FAILED, SCHEDULE_FAILED) é erro real e
      // precisa propagar — nunca tratar 409 genérico como sucesso.
      const isExplicitlyIdempotent = err?.response?.status === 409 && err?.response?.data?.idempotent === true;
      if (!isExplicitlyIdempotent) {
        // Rede/timeout pode deixar ambíguo se a conclusão realmente aconteceu
        // do lado do servidor — um refetch decide com certeza antes de
        // desistir. Se o refetch também falhar, ou o status não confirmar
        // 'completed', trata como erro real (propaga o erro ORIGINAL, não o
        // do refetch — é o que explica o que aconteceu de fato).
        const statusData = await appointmentService.getStatus(id).then(
          (res) => res?.data?.data || res?.data,
          () => null
        );
        if (statusData?.operationalStatus !== 'completed') {
          throw err;
        }
        // refetch confirmou completed apesar do erro na resposta original — segue como sucesso
      }
    }
    toast.success('Sessão concluída');
    setEditingAppointment(null);
    await loadAppointments(guide._id);
    onUpdate?.();
  };

  const handleEditFromModal = async (id, data) => {
    try {
      await appointmentService.update(id, data);
      toast.success('Agendamento atualizado');
      setEditingAppointment(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch (err) {
      const data2 = err?.response?.data;
      if (data2?.conflict) {
        const conflict = data2.conflict;
        const existing = conflict.existingAppointment;
        const who = conflict.patientName || existing?.patient?.fullName || 'outro paciente';
        const time = existing?.time || data?.time;
        const status = existing?.operationalStatus || '';
        const statusLabel = {
          confirmed: 'confirmado', scheduled: 'agendado',
          pre_agendado: 'pré-agendado', completed: 'realizado'
        }[status] || status;
        toast.error(
          `Conflito de horário: ${who} já tem agendamento às ${time}${statusLabel ? ` (${statusLabel})` : ''}. Escolha outro horário ou profissional.`,
          { duration: 6000 }
        );
      } else {
        toast.error(data2?.message || data2?.error?.message || err?.message || 'Erro ao atualizar agendamento');
      }
    }
  };

  const saveBulkDoctor = async () => {
    if (!bulkDoctorId && !bulkTime && !bulkDayOfWeek) return;
    setBulkSaving(true);
    try {
      const patch = {};
      if (bulkDoctorId) patch.doctorId = bulkDoctorId;
      if (bulkTime) patch.time = bulkTime;
      if (bulkDayOfWeek !== '') patch.dayOfWeek = parseInt(bulkDayOfWeek);
      const result = await updateGuideAppointmentsBulk(guide._id, patch);
      const parts = [];
      if (bulkDoctorId) parts.push('terapeuta');
      if (bulkDayOfWeek !== '') parts.push('dia da semana');
      if (bulkTime) parts.push('horário');
      toast.success(`${parts.join(', ')} atualizado(s) em ${result.updated} sessão(ões) pendente(s)`);
      setBulkDoctorOpen(false);
      setBulkPreviewOpen(false);
      setBulkDoctorId('');
      setBulkTime('');
      setBulkDayOfWeek('');
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch {
      toast.error('Erro ao atualizar sessões pendentes');
    } finally {
      setBulkSaving(false);
    }
  };

  const closeBulkDialog = () => {
    setBulkDoctorOpen(false);
    setBulkPreviewOpen(false);
    setBulkDoctorId('');
    setBulkTime('');
    setBulkDayOfWeek('');
  };

  // Mesmo cálculo de data usado no backend (PATCH /appointments/doctor) — preview precisa bater com o resultado real
  const shiftToWeekday = (dateStr, targetDow) => {
    const current = new Date(dateStr);
    const currentDay = current.getDay();
    let diff = targetDow - currentDay;
    if (diff <= 0) diff += 7;
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + diff);
    return newDate;
  };

  const apptStatus = (a) => a.operationalStatus || a.status || '';

  // Oculta appointments cancelados por replanejamento do plano (evita poluir o
  // calendário com agendamentos antigos que foram substituídos ao gerar novamente).
  const REPLAN_CANCEL_REASONS = ['plan_frequency_changed', 'plan_slot_removed', 'plan_canceled', 'plan_reset'];

  // Oculta appointments cancelados que foram substituídos por um reagendamento
  const supersededIds = new Set(
    appointments.filter(a => a.rescheduledFrom).map(a => a.rescheduledFrom?.toString())
  );
  const visibleAppointments = appointments.filter(a => {
    if (supersededIds.has(a._id?.toString())) return false;
    const isReplanCanceled = apptStatus(a) === 'canceled' && REPLAN_CANCEL_REASONS.includes(a.cancelReason);
    return !isReplanCanceled;
  });

  // Abre o calendário no mês do primeiro agendamento da guia (ou data de emissão/hoje como fallback)
  const calendarInitialDate = useMemo(() => {
    // Sempre abre no mês atual — antes pegava a data do primeiro agendamento
    // ordenado cronologicamente (podia ser uma sessão já concluída de meses
    // atrás, ex: quando a guia foi criada), fazendo o calendário abrir em
    // maio em vez de julho mesmo com sessões futuras no mês corrente.
    return new Date().toISOString().substring(0, 10);
  }, []);

  if (!guide) return null;

  const specialtyFormatted = guide.specialty
    ?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';
  const insuranceFormatted = guide.insurance
    ?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  // Mesmo filtro do backend (pendingFilter): só pre_agendado/scheduled são afetados pelo bulk-edit
  const bulkAffectedAppointments = visibleAppointments
    .filter(a => ['pre_agendado', 'scheduled'].includes(apptStatus(a)))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));

  const bulkSelectedDoctor = doctors.find(d => d._id === bulkDoctorId);
  const bulkDayOfWeekLabel = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };

  const therapyAppointments = visibleAppointments.filter(a => a.serviceType !== 'evaluation');
  const evaluationAppointments = visibleAppointments.filter(a => a.serviceType === 'evaluation');
  const completedCount = therapyAppointments.filter(a => ['completed', 'paid'].includes(apptStatus(a))).length;
  const scheduledCount = therapyAppointments.filter(a => ['scheduled', 'confirmed', 'pre_agendado'].includes(apptStatus(a))).length;
  const canceledCount  = visibleAppointments.filter(a => ['canceled', 'cancelled', 'missed'].includes(apptStatus(a))).length;

  const btnOutline = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50';
  const fieldCls = 'mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300';

  return (
    <>
    <ModalShell open={Boolean(guide)} onClose={onClose} labelledBy="guide-details-title"
      className="h-[100dvh] w-full sm:h-auto sm:max-h-[min(90vh,920px)] sm:w-[min(1000px,94vw)] sm:rounded-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-9 w-1 shrink-0 rounded bg-blue-700" aria-hidden />
          <div className="min-w-0">
            <h2 id="guide-details-title" className="truncate text-[1.05rem] font-bold leading-tight text-slate-900 dark:text-slate-50">
              Detalhes da Guia #{guide.number}
            </h2>
            <p className="truncate text-[0.78rem] text-slate-500 dark:text-slate-400">{specialtyFormatted} • {insuranceFormatted}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          <X size={20} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={32} /></div>
        ) : (
          <>
            {/* Resumo rápido: o mesmo vocabulário do card (autorizadas, realizadas, agendadas, restam) */}
            {(() => {
              const authorized = Number(guide.totalSessions) || 0;
              const usedInGuide = Number(guide.usedSessions ?? completedCount) || 0;
              const left = guide.remaining ?? Math.max(authorized - usedInGuide, 0);
              const items = [
                { label: 'Realizados', value: completedCount, c: 'text-emerald-700 dark:text-emerald-300' },
                { label: 'Agendados', value: scheduledCount, c: 'text-blue-700 dark:text-blue-300' },
                { label: 'Cancelados', value: canceledCount, c: 'text-red-600 dark:text-red-400' },
                ...(authorized > 0 ? [{ label: 'Restam na guia', value: left, c: left <= 2 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100' }] : []),
              ];
              return (
                <dl className={`mb-5 grid gap-2 text-left ${items.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                  {items.map(item => (
                    <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                      <dt className="text-2xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</dt>
                      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${item.c}`}><AnimatedValue value={Number(item.value) || 0} /></dd>
                    </div>
                  ))}
                </dl>
              );
            })()}

            {modalPlanLoading && (
              <div className="mb-5 h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" aria-hidden />
            )}

            {modalPlanError && (
              <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-[0.8rem] text-red-700 dark:text-red-300">Não foi possível carregar o plano desta guia</p>
                <button type="button" onClick={() => refetchModalPlan()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/20">
                  <RefreshCw size={13} aria-hidden /> Tentar novamente
                </button>
              </div>
            )}

            {!modalPlanLoading && !modalPlanError && !modalPlan && (
              <p className="mb-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[0.8rem] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                Nenhum plano de atendimento configurado para esta guia
              </p>
            )}

            {/* Histórico de alterações do plano */}
            {modalPlan && (
              <div className="mb-5 border-b border-slate-100 pb-5 dark:border-slate-800">
                <button type="button" onClick={() => setShowChangelog(v => !v)} aria-expanded={showChangelog}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:bg-slate-800/60 dark:hover:bg-slate-800">
                  <History size={15} className="text-emerald-700 dark:text-emerald-400" aria-hidden />
                  <span className="flex-1 text-[0.82rem] font-semibold text-slate-700 dark:text-slate-200">Histórico do plano</span>
                  {changelog.length > 0 && (
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[0.68rem] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{changelog.length}</span>
                  )}
                  {showChangelog ? <ChevronUp size={15} className="text-slate-500" aria-hidden /> : <ChevronDown size={15} className="text-slate-400" aria-hidden />}
                </button>

                {showChangelog && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {changelogLoading ? (
                      <div className="flex justify-center py-4"><Spinner size={20} /></div>
                    ) : changelog.length === 0 ? (
                      <p className="py-4 text-center text-[0.8rem] text-slate-500">Nenhuma alteração registrada</p>
                    ) : changelog.map((entry) => (
                      <PlanChangelogEntry key={entry._id} entry={entry} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toggle Lista / Calendário — cabeçalho da seção de agenda */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agenda da guia</h3>
              <div role="tablist" aria-label="Modo de visualização" className="inline-flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  { key: 'list', label: 'Lista' },
                  { key: 'calendar', label: 'Calendário' }
                ].map(({ key, label }) => (
                  <button key={key} type="button" role="tab" aria-selected={viewMode === key} onClick={() => setViewMode(key)}
                    className={`rounded-md px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${viewMode === key ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendário */}
            {appointmentsError ? (
              <div className="py-10 text-center">
                <AlertCircle size={32} className="mx-auto mb-2 text-red-600" aria-hidden />
                <p className="mb-3 text-sm text-red-700 dark:text-red-300">Não foi possível carregar os agendamentos desta guia</p>
                <button type="button" onClick={() => loadAppointments(guide._id)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300">
                  <RefreshCw size={13} aria-hidden /> Tentar novamente
                </button>
              </div>
            ) : viewMode === 'calendar' ? (
              <div className="min-h-[480px]">
                {evaluationAppointments.map(a => (
                  <div key={a._id} className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                    <span className="font-semibold">Avaliação: </span>
                    {format(parseISO(a.date.substring(0, 10)), 'dd/MM/yyyy')}{a.time ? ` às ${a.time}` : ''}
                    <span className="ml-2 text-xs">{APPT_STATUS_CONFIG[apptStatus(a)]?.label || apptStatus(a)}</span>
                  </div>
                ))}
                <PatientMiniCalendar
                  appointments={visibleAppointments.map(a => ({
                    ...a,
                    operationalStatus: a.operationalStatus || a.status,
                    start: `${(a.date || '').substring(0, 10)}T${a.time || '08:00'}`,
                  }))}
                  onEventClick={openEdit}
                  initialDate={calendarInitialDate}
                />
              </div>
            ) : visibleAppointments.length === 0 ? (
              <div className="py-10 text-center">
                <Calendar size={32} className="mx-auto mb-2 text-slate-400" aria-hidden />
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum agendamento registrado para esta guia</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {visibleAppointments.map((appt, idx) => {
                  const statusKey = appt.operationalStatus || appt.status || '';
                  const cfg = APPT_STATUS_CONFIG[statusKey] || { label: statusKey, color: '#8A99B0', bg: '#F8FAFE' };
                  // 🚨 FIX (2026-08-15, auditoria Convênio): sessão completed não pode ser
                  // editada/movida/cancelada por aqui — já consumiu a guia e liquidou o
                  // Payment via completeSessionV2; mexer por esse caminho corrompia o
                  // estado sem contrapartida simétrica (mesma proteção existe no backend
                  // em cancelAppointmentCommand.js, escopada a billingType='convenio').
                  const isCompleted = statusKey === 'completed';
                  const dateStr = appt.date
                    ? format(parseISO(appt.date.substring(0, 10)), "dd/MM/yyyy", { locale: ptBR })
                    : '—';
                  const timeStr = appt.time || '';
                  const doctorName = appt.doctor?.fullName || appt.professionalName || '';

                  return (
                    <li key={appt._id || idx} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cfg.color }} aria-hidden />
                        <div>
                          <p className="text-[0.8125rem] font-semibold text-slate-900 dark:text-slate-100">{dateStr}{timeStr ? ` às ${timeStr}` : ''}</p>
                          <p className="mt-0.5 text-[0.7rem] text-slate-500 dark:text-slate-400">
                            {[
                              appt.serviceType === 'evaluation' ? 'Avaliação' : 'Sessão',
                              doctorName,
                              appt.sessionType ? appt.sessionType.replace(/_/g, ' ') : null
                            ].filter(Boolean).join(' • ') || '—'}
                          </p>
                          <div className="mt-1 text-slate-700 dark:text-slate-300"><AppointmentOrigin appointment={appt} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="rounded-lg px-2 py-0.5 text-[0.6rem] font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          {cfg.label}
                        </span>
                        <button type="button" onClick={() => openMove(appt)} disabled={isCompleted}
                          title={isCompleted ? 'Sessão já concluída — não pode ser movida' : 'Mover para outra guia'}
                          aria-label={isCompleted ? 'Sessão já concluída — não pode ser movida' : 'Mover para outra guia'}
                          className="rounded-md p-1.5 text-slate-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600">
                          <ArrowRightLeft size={13} aria-hidden />
                        </button>
                        <button type="button" onClick={() => openEdit(appt)} disabled={isCompleted}
                          title={isCompleted ? 'Sessão já concluída — não pode ser editada/cancelada' : 'Editar'}
                          aria-label={isCompleted ? 'Sessão já concluída — não pode ser editada/cancelada' : 'Editar'}
                          className="rounded-md p-1.5 text-slate-400 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600">
                          <Edit2 size={13} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col-reverse justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row">
        <button type="button"
          onClick={() => {
            const firstPending = appointments.find(a =>
              ['pre_agendado', 'scheduled'].includes(a.operationalStatus || a.status)
            );
            // Plan é fonte primária; firstPending é fallback
            setBulkDoctorId(modalPlan?.doctor?._id || firstPending?.doctor?._id || '');
            setBulkTime(modalPlan?.slots?.[0]?.time || firstPending?.time || '');
            if (modalPlan?.slots?.[0]?.dayOfWeek != null) {
              setBulkDayOfWeek(String(modalPlan.slots[0].dayOfWeek));
            }
            setBulkDoctorOpen(true);
          }}
          className={`${btnOutline} w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 sm:w-auto`}>
          Alterar terapeuta/horário (todas pendentes)
        </button>
        <button type="button" onClick={onClose} className={`${btnOutline} w-full sm:w-auto`}>Fechar</button>
      </div>
    </ModalShell>

    {/* ── Trocar terapeuta (todas pendentes) — form ou preview de impacto ── */}
    <ModalShell open={bulkDoctorOpen} onClose={() => !bulkSaving && closeBulkDialog()} labelledBy="bulk-title" className="w-full max-w-md rounded-2xl">
      <div className="flex items-center justify-between bg-blue-700 px-6 py-4">
        <div>
          <h2 id="bulk-title" className="text-[0.9rem] font-bold text-white">
            {bulkPreviewOpen ? 'Revisar alteração em massa' : 'Alterar sessões pendentes'}
          </h2>
          <p className="mt-0.5 text-[0.7rem] text-white/75">
            {bulkPreviewOpen
              ? 'Confira o impacto antes de aplicar'
              : 'Aplica para todos os pré-agendados e agendados desta guia'}
          </p>
        </div>
        <button type="button" onClick={closeBulkDialog} disabled={bulkSaving} aria-label="Fechar" className="rounded-md p-1 text-white/80 hover:bg-white/10 disabled:opacity-50">
          <X size={16} aria-hidden />
        </button>
      </div>

      {!bulkPreviewOpen ? (
        <>
          <div className="flex flex-col gap-4 px-6 pb-2 pt-6">
            <label className={labelCls}>
              Profissional (opcional)
              <select value={bulkDoctorId} onChange={e => setBulkDoctorId(e.target.value)} className={fieldCls}>
                <option value="">Manter atual</option>
                {doctors
                  .filter(d => {
                    if (!guide?.specialty) return true;
                    const target = guide.specialty.toLowerCase();
                    const allowed = [d.specialty, ...(d.specialties || [])].map(s => (s || '').toLowerCase());
                    return allowed.includes(target);
                  })
                  .map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
              </select>
            </label>
            <label className={labelCls}>
              Dia da semana (opcional)
              <select value={bulkDayOfWeek} onChange={e => setBulkDayOfWeek(e.target.value)} className={fieldCls}>
                <option value="">Manter dia atual</option>
                <option value="1">Segunda-feira</option>
                <option value="2">Terça-feira</option>
                <option value="3">Quarta-feira</option>
                <option value="4">Quinta-feira</option>
                <option value="5">Sexta-feira</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </label>
            <label className={labelCls}>
              Horário (opcional)
              <input type="time" value={bulkTime} onChange={e => setBulkTime(e.target.value)} className={fieldCls} />
            </label>
            <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">
              Sessões confirmadas/realizadas não serão alteradas. Preencha pelo menos um campo.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
            <button type="button" onClick={closeBulkDialog} disabled={bulkSaving} className={btnOutline}>Cancelar</button>
            <button type="button"
              onClick={() => setBulkPreviewOpen(true)}
              disabled={(!bulkDoctorId && !bulkTime && !bulkDayOfWeek) || bulkAffectedAppointments.length === 0}
              className={`${btnPrimary} bg-emerald-700 hover:bg-emerald-800`}>
              Revisar alterações ({bulkAffectedAppointments.length})
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4 px-6 pb-2 pt-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-[0.8125rem] font-bold text-amber-800 dark:text-amber-300">
                {bulkAffectedAppointments.length} sessão(ões) pendente(s) serão alteradas
              </p>
              <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-200/80">
                Período: {format(parseISO(bulkAffectedAppointments[0].date.substring(0, 10)), 'dd/MM/yyyy')}
                {' – '}
                {format(parseISO(bulkAffectedAppointments[bulkAffectedAppointments.length - 1].date.substring(0, 10)), 'dd/MM/yyyy')}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 text-[0.8125rem] text-slate-800 dark:text-slate-200">
              {bulkDoctorId && (<p><strong>Terapeuta:</strong> {bulkSelectedDoctor?.fullName || '—'}</p>)}
              {bulkTime && (<p><strong>Horário:</strong> {bulkTime}</p>)}
              {bulkDayOfWeek !== '' && (
                <p>
                  <strong>Dia da semana:</strong> {bulkDayOfWeekLabel[parseInt(bulkDayOfWeek)]}
                  <span className="mt-0.5 block text-[0.7rem] text-slate-500 dark:text-slate-400">
                    Cada sessão será movida para a próxima ocorrência desse dia após sua data atual
                  </span>
                </p>
              )}
            </div>

            <ul className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              {bulkAffectedAppointments.map((appt, idx) => {
                const currentDate = appt.date.substring(0, 10);
                const newDate = bulkDayOfWeek !== ''
                  ? shiftToWeekday(currentDate, parseInt(bulkDayOfWeek))
                  : null;
                return (
                  <li key={appt._id || idx} className="flex items-center justify-between px-1 text-xs text-slate-800 dark:text-slate-200">
                    <span>
                      {format(parseISO(currentDate), 'dd/MM')} {appt.time || ''}
                      {newDate && (
                        <> → <strong>{format(newDate, 'dd/MM')}</strong></>
                      )}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{appt.doctor?.fullName || appt.professionalName || '—'}</span>
                  </li>
                );
              })}
            </ul>

            <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">Sessões confirmadas/realizadas não serão alteradas.</p>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
            <button type="button" onClick={() => setBulkPreviewOpen(false)} disabled={bulkSaving} className={btnOutline}>Voltar</button>
            <button type="button" onClick={saveBulkDoctor} disabled={bulkSaving} className={`${btnPrimary} min-w-[150px] bg-emerald-700 hover:bg-emerald-800`}>
              {bulkSaving ? <Spinner size={16} light /> : 'Confirmar alteração'}
            </button>
          </div>
        </>
      )}
    </ModalShell>

    {/* ── Modal de edição de agendamento (mesmo AppointmentDetailModal do calendário/Liminar) ── */}
    {editingAppointment && (
      <AppointmentDetailModal
        isOpen={!!editingAppointment}
        onClose={() => setEditingAppointment(null)}
        event={editingAppointment}
        doctors={doctors}
        onCancelAppointment={handleCancelFromModal}
        onCompleteAppointment={handleCompleteFromModal}
        onEditAppointment={handleEditFromModal}
        // Precisa ficar acima do modal "Detalhes da Guia" que o abre (ModalShell usa z-index 1300).
        zIndex={1400}
      />
    )}

    <ModalShell open={!!movingAppt} onClose={() => setMovingAppt(null)} labelledBy="move-title" className="w-full max-w-md rounded-2xl">
      <h2 id="move-title" className="px-6 pt-5 text-base font-bold text-slate-900 dark:text-slate-50">Mover atendimento entre guias</h2>
      <div className="flex flex-col gap-4 px-6 pb-2 pt-2">
        <p className="text-[0.8rem] text-slate-500 dark:text-slate-400">
          {movingAppt?.date ? format(parseISO(movingAppt.date.substring(0, 10)), "dd/MM/yyyy", { locale: ptBR }) : ''}
          {movingAppt?.time ? ` às ${movingAppt.time}` : ''} · Guia atual: #{guide?.number}
        </p>
        <label className={labelCls}>
          Guia de destino
          <select value={moveTargetGuideId} onChange={e => setMoveTargetGuideId(e.target.value)} disabled={moveGuidesLoading} className={fieldCls}>
            <option value="" disabled>Selecione</option>
            {moveGuides.map(g => (
              <option key={g._id} value={g._id}>
                #{g.number} — {g.insurance} ({g.remaining ?? (g.totalSessions - g.usedSessions)} restantes, {g.status})
              </option>
            ))}
          </select>
        </label>
        {!moveGuidesLoading && moveGuides.length === 0 && (
          <p className="text-xs text-red-700 dark:text-red-400">Nenhuma outra guia de {guide?.specialty} disponível para este paciente.</p>
        )}
        <label className={labelCls}>
          Motivo (opcional)
          <input type="text" value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="Ex: correção administrativa" className={fieldCls} />
        </label>
      </div>
      <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
        <button type="button" onClick={() => setMovingAppt(null)} disabled={moveSubmitting} className={btnOutline}>Cancelar</button>
        <button type="button" onClick={confirmMove} disabled={moveSubmitting || !moveTargetGuideId} className={`${btnPrimary} min-w-[110px] bg-blue-700 hover:bg-blue-800`}>
          {moveSubmitting ? <Spinner size={16} light /> : 'Confirmar'}
        </button>
      </div>
    </ModalShell>
    </>
  );
};

export default PatientInsuranceTab;
