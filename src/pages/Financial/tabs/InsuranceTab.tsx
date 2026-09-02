// src/pages/Financial/tabs/InsuranceTab.tsx

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
    Avatar,
    Card,
    CardContent,
    Grid,
    Collapse,
    CircularProgress,
    Skeleton,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { Patient360Modal } from '../components/Patient360Modal';
import {
    AlertCircle,
    Building2,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Mail,
    Plus,
    Send,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    History,
    X,
    FileText,
    FileClock,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import { PatientAccordionSection } from './PatientAccordionSection';
import GuidePendingBillingSection, { PendingGuide } from './GuidePendingBillingSection';
import InsuranceHistorySection from './InsuranceHistorySection';
import ConvenioManagerModal from '../components/ConvenioManagerModal';
import BreakdownDetailsModal, { BreakdownRow, BreakdownTab } from '../components/BreakdownDetailsModal';
import doctorService from '../../../services/doctorService';
import { usePatients } from '../../../hooks/usePatients';
import {
    createInsurancePayment,
    getInsuranceReceivables,
    InsuranceReceivableGroup,
    billInsuranceSession,
    receiveInsuranceSession,
    getInsuranceGuidesView,
    InsuranceGuideView,
    InsuranceSessionPhase,
    encerrarGuia,
    CompetenceBreakdown
} from '../../../services/paymentService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { Shield } from 'lucide-react';
import { AutorizacoesTab } from './AutorizacoesTab';
import EnviosTab from './EnviosTab';
import RascunhosTab from './RascunhosTab';
import { useConvenios } from '../../../hooks/useConvenios';
import { getConvenio } from '../../../services/insuranceService';
import BillingCommunicationWizard from '../components/BillingCommunicationWizard';
import { createBillingSubmission, cancelBillingSubmission, listBillingSubmissions, getBillingSubmission } from '../../../services/billingSubmissionService';
import InvoiceReceivablesSection from './InvoiceReceivablesSection';
import InsuranceFilterBar from '../components/InsuranceFilterBar';
import { receiveInvoiceBatch } from '../../../services/insuranceBatchReceiptService';
import { waitForCashflowLoad } from '../../../services/financialLoadCoordinator';
import { GuideDetailLoadCache } from '../../../services/guideDetailLoadCache';

/**
 * ReadView V2 → shape que GuidePendingBillingSection já consome.
 *
 * Adapter deliberado: mantém o componente de card inalterado enquanto a
 * ReadView é a fonte oficial. `pendingSessions`/`pendingValue` continuam significando
 * "o que falta faturar" — agora vindos do contador da fase, não de um estado
 * escalar. Os contadores completos seguem em `phaseCounters` para a UI mostrar
 * a composição quando `hasMixedStates` é true.
 */
const PHASE_AMOUNT_KEY = {
    pendingBilling: 'pendingAmount',
    documentationSent: 'documentationSentAmount',
    billed: 'billedAmount',
    received: 'receivedAmount'
} as const;

export function adaptGuideViewToPendingGuide(g: InsuranceGuideView, phase?: InsuranceSessionPhase): PendingGuide {
    const allSessionDetails = g.sessionDetails || [];
    const sessionDetails = phase
        ? allSessionDetails.filter(session => session.phase === phase)
        : allSessionDetails;
    // Numa aba de fase, o card mostra SOMENTE a parcela daquela fase — nunca o
    // total da guia. Uma guia 4 a faturar + 8 faturadas + 4 recebidas aparece nas
    // três abas, cada uma com o seu pedaço; exibir o total nas três seria dupla
    // contagem visual. Os valores vêm somados do backend, não recalculados aqui.
    const phaseSessions = phase ? g.sessions[phase] : g.sessions.pendingBilling + g.sessions.documentationSent;
    const phaseValue = phase
        ? g.financialSummary[PHASE_AMOUNT_KEY[phase]]
        : g.financialSummary.pendingAmount + g.financialSummary.documentationSentAmount;

    return {
        guideId: g.guideId,
        number: g.number,
        insurance: g.insurance,
        specialty: g.specialty,
        patient: g.patient as PendingGuide['patient'],
        billingMode: g.billingMode,
        totalSessions: g.totalSessions,
        usedSessions: g.usedSessions,
        sessionValue: g.sessionValue,
        totalAuthorizedValue: g.totalAuthorizedValue,
        pendingSessions: phaseSessions,
        pendingValue: phaseValue,
        sessionsThisMonth: g.sessions.total,
        firstSessionDate: g.firstSessionDate ?? sessionDetails[0]?.date ?? null,
        lastSessionDate: g.lastSessionDate ?? sessionDetails[sessionDetails.length - 1]?.date ?? null,
        documentationSentAt: g.documentationSentAt,
        documentationSentAtIsProxy: g.documentationSentAtIsProxy,
        invoices: g.invoices,
        invoiceNumber: g.invoiceNumber,
        alreadyBilledSessions: g.sessions.billed,
        lastBatchSentAt: null,
        guideStatus: g.guideStatus,
        billingState: g.billingState,
        hasMixedStates: g.hasMixedStates,
        phaseCounters: g.sessions,
        phaseAmounts: g.financialSummary,
        competenceBreakdown: g.competenceBreakdown,
        sessions: sessionDetails.map(s => ({
            sessionId: s.sessionId,
            paymentId: s.paymentId,
            date: s.date,
            time: s.time,
            doctorName: s.doctorName,
            specialty: s.specialty,
            value: s.value,
            phase: s.phase
        }))
    };
}

/**
 * Traduz seleção visual por guia para o contrato antigo do command side.
 * Deliberadamente aceita apenas Payments do bucket billed: numa guia mista,
 * pendingBilling e received nunca entram na baixa.
 */
export function billedPaymentIdsFromSelectedGuides(
    guides: PendingGuide[],
    selectedGuideIds: Set<string>
): string[] {
    const paymentIds = new Set<string>();
    for (const guide of guides) {
        if (!selectedGuideIds.has(guide.guideId)) continue;
        for (const session of guide.sessions || []) {
            if (session.phase === 'billed' && session.paymentId) paymentIds.add(session.paymentId);
        }
    }
    return [...paymentIds];
}

export const usesGuideSelection = (subTab: number) => subTab === 0 || subTab === 1 || subTab === 2;

export function buildOverdueGuidesList(guides: PendingGuide[]) {
    return guides
        .map(g => ({
            guideId: g.guideId,
            number: g.number,
            patientName: g.patient?.fullName || 'Paciente',
            overdueValue: g.competenceBreakdown?.previous.value || 0,
            overdueCount: g.competenceBreakdown?.previous.sessions || 0,
            oldestCompetence: g.competenceBreakdown?.previous.oldestCompetence || null
        }))
        .filter(g => g.overdueValue > 0)
        .sort((a, b) => b.overdueValue - a.overdueValue);
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
    pending_billing: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Aguardando Faturamento' },
    billed: { color: '#3B82F6', bgColor: '#3B82F610', label: 'Faturado' },
    received: { color: '#10B981', bgColor: '#10B98110', label: 'Recebido' },
    partial: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Recebido Parcial' },
    glosa: { color: '#EF4444', bgColor: '#EF444410', label: 'Glosado' }
};

const formatProviderName = (slug: string) => {
  if (!slug) return 'Outros';
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace('Anapolis', 'Anápolis')
    .replace('Goiania', 'Goiânia')
    .replace('Sao ', 'São ')
    .replace('Saude', 'Saúde')
    .replace('Brasilia', 'Brasília');
};

const fmtDateShort = (d?: string | Date | null) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

interface InsuranceTabProps {
    month: number;
    year: number;
}

// Mesmo padrão de front/src/pages/Financial/FinancialDashboard.tsx (useSearchParams pro
// tab principal) — sem isso, o subTab (A Faturar/Envios/Histórico/...) era só estado local
// e todo reload da página voltava pra "A Faturar", perdendo onde o usuário estava
// (achado 2026-08-04). Usa id estável (não o índice) pra não quebrar se a ordem das abas mudar.
const CONVENIO_SUBTAB_PARAM = 'convenioSubTab';
const SUB_TAB_IDS = ['a-faturar', 'aguardando', 'faturados', 'recebidos', 'historico', 'autorizacoes', 'envios', 'cadastrados', 'notas-fiscais'];

const InsuranceTab = ({ month, year }: InsuranceTabProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [subTab, setSubTabState] = useState(() => {
        const idx = SUB_TAB_IDS.indexOf(searchParams.get(CONVENIO_SUBTAB_PARAM) || '');
        return idx >= 0 ? idx : 0;
    });

    const setSubTab = (index: number) => {
        setSubTabState(index);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set(CONVENIO_SUBTAB_PARAM, SUB_TAB_IDS[index] || SUB_TAB_IDS[0]);
            return next;
        }, { replace: true });
    };
    // Filtro compartilhado por todas as sub-abas de Convênios (ver
    // InsuranceFilterBar) — vive aqui, no pai, para não se perder ao trocar de
    // sub-aba.
    const [nfFilter, setNfFilter] = useState('');
    const [patientFilter, setPatientFilter] = useState('');
    const filterGuides = useCallback((guides: PendingGuide[]) => {
        const nfQuery = nfFilter.trim().toLowerCase();
        const patientQuery = patientFilter.trim().toLowerCase();
        if (!nfQuery && !patientQuery) return guides;
        return guides.filter(guide => {
            const matchesPatient = !patientQuery || (guide.patient?.fullName || '').toLowerCase().includes(patientQuery);
            const matchesNf = !nfQuery
                || (guide.number || '').toLowerCase().includes(nfQuery)
                || (guide.invoiceNumber || '').toLowerCase().includes(nfQuery)
                || (guide.invoices || []).some(inv => (inv.invoiceNumber || '').toLowerCase().includes(nfQuery));
            return matchesPatient && matchesNf;
        });
    }, [nfFilter, patientFilter]);

    const [receivables, setReceivables] = useState<InsuranceReceivableGroup[]>([]);
    const [allReceivables, setAllReceivables] = useState<InsuranceReceivableGroup[]>([]); // Todos os status para os cards
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalProviders: 0, grandTotal: 0, pendingCount: 0, prevMonthTotal: null as number | null, change: null as number | null, changePercent: null as number | null });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Estados para seleção em lote
    const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
    const [selectedGuides, setSelectedGuides] = useState<Set<string>>(new Set());

    // Seleção é contextual à fase. Carregar IDs entre abas deixa a barra e o
    // command side divergirem sobre quais guias estão sendo operadas.
    useEffect(() => {
        setSelectedGuides(new Set());
        setSelectedPayments(new Set());
    }, [subTab]);
    // ReadView V2 — um bucket por fase. A MESMA guia pode estar em vários: uma
    // guia com 4 a faturar + 8 faturadas + 4 recebidas aparece nas três abas,
    // cada uma exibindo só a sua parcela. Totais vêm somados do backend.
    const [guidesByPhase, setGuidesByPhase] = useState<Record<InsuranceSessionPhase, PendingGuide[]>>({
        pendingBilling: [], documentationSent: [], billed: [], received: []
    });
    const [totalsByPhase, setTotalsByPhase] = useState<Record<InsuranceSessionPhase, number>>({
        pendingBilling: 0, documentationSent: 0, billed: 0, received: 0
    });

    // União deduplicada dos buckets. É o que resolve `selectedGuides` (Set de ids)
    // → objetos de guia no wizard de faturamento. Precisa ser derivado: como
    // estado próprio, ficava vazio depois que as abas viraram buckets de fase e
    // a seleção não encontrava a guia ("Guias selecionadas não encontradas").
    const pendingGuides = useMemo(() => {
        const porId = new Map<string, PendingGuide>();
        for (const fase of ['pendingBilling', 'documentationSent', 'billed', 'received'] as const) {
            for (const g of guidesByPhase[fase]) if (!porId.has(g.guideId)) porId.set(g.guideId, g);
        }
        return [...porId.values()];
    }, [guidesByPhase]);
    const [orphanSessions, setOrphanSessions] = useState<Array<{ sessionId: string; date?: string | Date | null; patient?: { fullName?: string } | null; specialty?: string; sessionValue?: number; insuranceProvider?: string }>>([]);
    const [orphanSessionsCount, setOrphanSessionsCount] = useState(0);
    const [orphanSessionsLoading, setOrphanSessionsLoading] = useState(false);
    const [orphanSessionsError, setOrphanSessionsError] = useState<string | null>(null);
    const orphanSessionsInflight = useRef<Promise<void> | null>(null);
    const [loadingGuides, setLoadingGuides] = useState(false);
    const [paymentIntegrityConflictCount, setPaymentIntegrityConflictCount] = useState(0);
    const [loadingGuideDetails, setLoadingGuideDetails] = useState<Set<string>>(new Set());
    const [guideDetailsActionLoading, setGuideDetailsActionLoading] = useState(false);
    const guideDetailLoader = useRef(new GuideDetailLoadCache<PendingGuide[]>());
    const invalidateGuideDetails = () => {
        guideDetailLoader.current.invalidate();
    };
    // Quebra do total pendente entre mês corrente e competências anteriores —
    // computada no backend (ver CompetenceBreakdown), nunca no frontend.
    const [competenceBreakdown, setCompetenceBreakdown] = useState<CompetenceBreakdown | null>(null);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const [doctors, setDoctors] = useState<any[]>([]);
    const { convenios, isLoading: loadingConvenios } = useConvenios({ includeInactive: false });
    const [formData, setFormData] = useState({
        patientId: '',
        doctorId: '',
        insuranceProvider: '',
        grossAmount: 0,
        authorizationCode: '',
        serviceType: 'session',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [receiveData, setReceiveData] = useState({
        receivedAmount: 0,
        receivedDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
    const [is360ModalOpen, setIs360ModalOpen] = useState(false);
    const [selectedMonthYear, setSelectedMonthYear] = useState(`${year}-${String(month).padStart(2, '0')}`);
    const [cardsOpen, setCardsOpen] = useState(false);

    useEffect(() => {
        setSelectedMonthYear(`${year}-${String(month).padStart(2, '0')}`);
    }, [month, year]);

    // Estado para modal de finalização de guias após faturamento
    const [postFaturamentoCloseModal, setPostFaturamentoCloseModal] = useState<{ open: boolean; guides: Array<{ guideId: string; number: string; sessionsCount: number }> }>({ open: false, guides: [] });
    const [postFaturamentoCloseLoading, setPostFaturamentoCloseLoading] = useState(false);
    const [selectedCloseGuides, setSelectedCloseGuides] = useState<Set<string>>(new Set());

    // Estados para modal de recebimento em lote
    const [receberLoteModalOpen, setReceberLoteModalOpen] = useState(false);
    const [receberLoteLoading, setReceberLoteLoading] = useState(false);
    const [receberLoteData, setReceberLoteData] = useState({
        dataRecebimento: new Date().toISOString().split('T')[0]
    });
    const [receiptTargets, setReceiptTargets] = useState<Array<{ batchId: string; guideIds: string[] }>>([]);
    const [receiptSessionsCount, setReceiptSessionsCount] = useState(0);
    const [invoiceReceivableCount, setInvoiceReceivableCount] = useState(0);
    // Contado à parte da aba: o badge precisa avisar que existem sessões travadas
    // ANTES de alguém pensar em abrir "Rascunhos" — quem está travado normalmente
    // nem sabe que a aba existe.
    const [draftSubmissionCount, setDraftSubmissionCount] = useState(0);
    const [discardDraftId, setDiscardDraftId] = useState<string | null>(null);
    const [discardingDraft, setDiscardingDraft] = useState(false);
    
    // Estado para modal de gerenciamento de convênios
    const [convenioManagerOpen, setConvenioManagerOpen] = useState(false);

    // Estado para wizard de envio de documentos de faturamento em massa
    const [billingWizardOpen, setBillingWizardOpen] = useState(false);
    const [billingWizardLoading, setBillingWizardLoading] = useState(false);
    const [billingSubmissionId, setBillingSubmissionId] = useState<string | null>(null);

    // Modal reutilizável de detalhamento — aberto pelos cards do Painel de Convênios
    // (A Faturar, Aguardando Faturamento, Faturado, Recebido) pra mostrar quais
    // guias/pagamentos compõem cada total, em vez de espremer tudo dentro do card.
    const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; accentColor: string; rows: BreakdownRow[]; tabs?: BreakdownTab[] }>(
        { open: false, title: '', accentColor: '#6366F1', rows: [] }
    );

    const openDetailsModal = (title: string, accentColor: string, rows: BreakdownRow[], tabs?: BreakdownTab[]) => {
        setDetailsModal({ open: true, title, accentColor, rows, tabs });
    };

    const getMonthLabel = () => {
        if (!selectedMonthYear) return '';
        const [year, month] = selectedMonthYear.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    };

    // Backend já filtra pelo campo correto de cada status (paymentDate/billedAt/receivedAt)
    // Frontend não deve refiltrar por paymentDate
    const paymentMatchesMonth = () => true;

    // A aba é o bucket da fase (`pendingBilling.sessions > 0`), não um estado
    // escalar da guia. Uma guia parcialmente faturada continua em "A Faturar"
    // pela parcela que falta, e também aparece em "Faturados".
    const { pendingStateGuides, waitingBillingGuides } = useMemo(() => ({
        pendingStateGuides: guidesByPhase.pendingBilling,
        waitingBillingGuides: guidesByPhase.documentationSent
    }), [guidesByPhase]);

    // Memoizados para manter a MESMA referência de array entre renders quando o
    // filtro não mudou — sem isso, GuidePendingBillingSection recebia um array
    // novo a cada render (mesmo conteúdo) e não conseguia detectar de forma
    // estável "o filtro reduziu a 1 convênio, abre ele" (ver useEffect lá).
    const filteredPendingStateGuides = useMemo(() => filterGuides(pendingStateGuides), [filterGuides, pendingStateGuides]);
    const filteredWaitingBillingGuides = useMemo(() => filterGuides(waitingBillingGuides), [filterGuides, waitingBillingGuides]);
    const filteredBilledGuides = useMemo(() => filterGuides(guidesByPhase.billed), [filterGuides, guidesByPhase.billed]);
    const filteredReceivedGuides = useMemo(() => filterGuides(guidesByPhase.received), [filterGuides, guidesByPhase.received]);

    // Detalha QUAIS guias compõem o atraso usando exclusivamente o breakdown da
    // ReadView. O frontend não interpreta datas nem recompõe competência.
    const overdueGuidesList = useMemo(() => {
        if (!competenceBreakdown || !competenceBreakdown.previous.value) return [];
        return buildOverdueGuidesList(pendingStateGuides);
    }, [pendingStateGuides, competenceBreakdown]);

    const overdueValueByGuideId = useMemo(
        () => new Map(overdueGuidesList.map(g => [g.guideId, g.overdueValue])),
        [overdueGuidesList]
    );

    // Faturado/Recebido vêm de allReceivables (provider→pacientes→payments) — precisa
    // achatar mantendo o nome do paciente junto, senão o modal não tem o que mostrar.
    const { billedPaymentsDetailed, receivedPaymentsDetailed } = useMemo(() => {
        const billed: Array<{ id: string; label: string; sublabel?: string; value: number }> = [];
        const received: Array<{ id: string; label: string; sublabel?: string; value: number }> = [];
        allReceivables.forEach(group => {
            (group.patients || []).forEach(p => {
                (p.payments || []).forEach(pay => {
                    const row = {
                        id: pay.paymentId,
                        label: p.patientName,
                        sublabel: pay.guideNumber ? `guia ${pay.guideNumber} · ${formatProviderName(group._id)}` : formatProviderName(group._id),
                        value: pay.grossAmount,
                    };
                    if (pay.status === 'billed') billed.push(row);
                    else if (pay.status === 'received') received.push(row);
                });
            });
        });
        const byPatientThenValue = (a: BreakdownRow, b: BreakdownRow) => a.label.localeCompare(b.label, 'pt-BR') || b.value - a.value;
        billed.sort(byPatientThenValue);
        received.sort(byPatientThenValue);
        return { billedPaymentsDetailed: billed, receivedPaymentsDetailed: received };
    }, [allReceivables]);

    const getGuidePendingTotal = (guide: PendingGuide) => {
        const fromSessions = (guide.sessions || []).reduce((s: number, session: any) => s + (Number(session.value) || 0), 0);
        if (fromSessions > 0) return fromSessions;
        return Number(guide.pendingValue || 0);
    };

    const getMonthSummary = () => {
        // Aba "A Faturar" usa modelo guide-based (guias + sessões sem guia)
        const guidePendingTotal = pendingStateGuides.reduce((s: number, g: PendingGuide) => s + getGuidePendingTotal(g), 0);
        const waitingTotal = waitingBillingGuides.reduce((s: number, g: PendingGuide) => s + getGuidePendingTotal(g), 0);
        const orphanTotal = orphanSessions.reduce((s: number, os) => s + (os.sessionValue || 0), 0);
        const totalAFaturar = guidePendingTotal + orphanTotal;
        const pendingCount = pendingStateGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingSessions || 0), 0) + orphanSessions.length;
        const waitingCount = waitingBillingGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingSessions || 0), 0);
        const closedCount = pendingGuides.filter(g => g.billingState === 'closed').length;

        // Outros status vêm do legado (será substituído por endpoint guide-based futuramente)
        const allPayments = allReceivables.flatMap(g =>
            (g.patients || []).flatMap((p: any) =>
                (p.payments || []).filter(paymentMatchesMonth)
            )
        );
        const billedPayments = allPayments.filter((p: any) => p.status === 'billed');
        const receivedPayments = allPayments.filter((p: any) => p.status === 'received');

        const activeProviders = new Set([
            ...pendingGuides.map(g => g.insurance),
            ...allReceivables.map(g => g._id)
        ]).size;

        return {
            totalAFaturar,
            totalWaiting: waitingTotal,
            totalFaturado: billedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            totalRecebido: receivedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            pendingCount,
            waitingCount,
            billedCount: billedPayments.length,
            receivedCount: receivedPayments.length,
            closedCount,
            totalProviders: activeProviders
        };
    };

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };



    useEffect(() => {
        loadDoctors();
    }, []);

    // 🚨 FIX (2026-07-20): eram 2 efeitos separados (um por [selectedMonthYear], outro
    // por [subTab]) — ambos disparam no mount, então toda montagem/troca de mês fazia
    // pending-billing ser chamado 2x (loadAllCounts sempre busca; loadReceivables busca
    // de novo se subTab===0). loadAllCounts já popula pendingGuides/orphanSessions —
    // loadReceivables só precisa rodar por conta própria para as abas Faturados/Recebidos.
    useEffect(() => {
        // Notas Fiscais possui read model e ciclo de loading próprios. Carregar
        // aqui as quatro fases de guia desmontava o componente filho e repetia
        // `insurance-batches/receivables` até quatro vezes.
        if (subTab === 8) return;
        loadAllCounts(selectedMonthYear);
        if (subTab > 3) {
            loadReceivables(selectedMonthYear);
        }
    }, [selectedMonthYear, subTab]);

    useEffect(() => {
        const handleRefresh = () => {
            if (subTab === 8) return;
            loadAllCounts(selectedMonthYear);
            if (subTab > 3) {
                loadReceivables(selectedMonthYear);
            }
        };
        window.addEventListener('cash:refresh', handleRefresh);
        return () => window.removeEventListener('cash:refresh', handleRefresh);
    }, [selectedMonthYear, subTab]);

    // Carrega counts de todas as abas (A Faturar, Faturados, Recebidos) antecipadamente
    const loadAllCounts = async (month?: string) => {
        invalidateGuideDetails();
        setLoadingGuides(true);
        try {
            await waitForCashflowLoad();
            // Um bucket por fase. Acumulado por padrão: sem `from`/`to` a view
            // não recorta período — o filtro de competência é opcional e, quando
            // vem, o backend aplica o eixo de data próprio de cada fase.
            const phases: InsuranceSessionPhase[] = ['pendingBilling', 'documentationSent', 'billed', 'received'];
            const [guideResponse, allResponse] = await Promise.all([
                getInsuranceGuidesView({ phases, detail: 'summary' }),
                // FinancialDashboardTab ainda depende deste endpoint — mantido.
                getInsuranceReceivables({ month })
            ]);

            // Compatibilidade durante rollout/restart: um backend ainda no contrato
            // anterior ignora `phases` e não devolve `buckets`. Nesse caso usamos as
            // quatro leituras antigas, sem esvaziar a tela nem mostrar falso erro.
            let buckets = guideResponse.data.buckets;
            if (!Array.isArray(buckets?.pendingBilling?.data) || !Array.isArray(buckets?.documentationSent?.data) || !Array.isArray(buckets?.billed?.data) || !Array.isArray(buckets?.received?.data)) {
                const [pending, documentationSent, billed, received] = await Promise.all(
                    phases.map(phase => getInsuranceGuidesView({ phase }))
                );
                buckets = {
                    pendingBilling: pending.data,
                    documentationSent: documentationSent.data,
                    billed: billed.data,
                    received: received.data
                };
            }
            const byPhase = buckets;
            setGuidesByPhase({
                pendingBilling: (buckets.pendingBilling.data || []).map(g => adaptGuideViewToPendingGuide(g, 'pendingBilling')),
                documentationSent: (buckets.documentationSent.data || []).map(g => adaptGuideViewToPendingGuide(g, 'documentationSent')),
                billed: (buckets.billed.data || []).map(g => adaptGuideViewToPendingGuide(g, 'billed')),
                received: (buckets.received.data || []).map(g => adaptGuideViewToPendingGuide(g, 'received'))
            });
            setTotalsByPhase({
                pendingBilling: byPhase.pendingBilling.totals.financialSummary.pendingAmount,
                documentationSent: byPhase.documentationSent.totals.financialSummary.documentationSentAmount,
                billed: byPhase.billed.totals.financialSummary.billedAmount,
                received: byPhase.received.totals.financialSummary.receivedAmount
            });
            setOrphanSessions(guideResponse.data.orphanSessions || []);
            setOrphanSessionsCount(guideResponse.data.orphanSessionsCount || 0);
            setCompetenceBreakdown(buckets.pendingBilling.competenceBreakdown || null);
            setPaymentIntegrityConflictCount(guideResponse.data.paymentIntegrityConflictCount || 0);
            setAllReceivables(allResponse.data.data || []);
        } catch (error) {
            console.error('Erro ao carregar counts de convênios:', error);
            // Falha da leitura precisa ser visível: sem o toast, ela fica
            // indistinguível de "não há nada a faturar" — aba vazia, nenhum aviso.
            toast.error('Falha ao carregar convênios. Os dados exibidos podem estar incompletos.', {
                id: 'insurance-guides-load-error'
            });
        } finally {
            setLoadingGuides(false);
        }
    };

    const ensureGuideDetails = async (guideIds: string[], phase: InsuranceSessionPhase): Promise<PendingGuide[]> => {
        const uniqueIds = [...new Set(guideIds)];
        const current = new Map(guidesByPhase[phase].map(guide => [guide.guideId, guide]));
        const missing = uniqueIds.filter(id => (current.get(id)?.sessions || []).length === 0);
        if (missing.length === 0) return uniqueIds.map(id => current.get(id)).filter(Boolean) as PendingGuide[];

        setLoadingGuideDetails(previous => new Set([...previous, ...missing]));
        try {
            // 🚀 PERF (2026-09-02): antes era 1 request por guia em paralelo (N+1) —
            // abrir o drawer de um paciente com 3-4 guias disparava 3-4 chamadas,
            // cada uma com vários round-trips no backend, somando ~3s. Backend agora
            // aceita `guideIds` (lista) numa chamada só; a chave do loader usa o
            // conjunto ordenado pra ainda deduplicar cliques duplos na mesma leva.
            const batchKey = `batch:${[...missing].sort().join(',')}:${phase}`;
            const loaded = missing.length > 0
                ? await guideDetailLoader.current.load(batchKey, async () => {
                    const response = await getInsuranceGuidesView({ guideIds: missing, phase, detail: 'full' });
                    const guidesRaw = response.data.data || [];
                    if (guidesRaw.length === 0) throw new Error('Detalhes das guias não encontrados');
                    return guidesRaw.map(guide => {
                        if (!Array.isArray(guide.sessionDetails)) throw new Error(`Detalhes incompletos da guia ${guide.guideId}`);
                        return adaptGuideViewToPendingGuide(guide, phase);
                    });
                })
                : [];
            const loadedById = new Map(loaded.map(guide => [guide.guideId, guide]));
            setGuidesByPhase(previous => ({
                ...previous,
                [phase]: previous[phase].map(guide => loadedById.get(guide.guideId) || guide)
            }));
            loaded.forEach(guide => current.set(guide.guideId, guide));
            return uniqueIds.map(id => current.get(id)).filter(Boolean) as PendingGuide[];
        } finally {
            setLoadingGuideDetails(previous => {
                const next = new Set(previous);
                missing.forEach(id => next.delete(id));
                return next;
            });
        }
    };

    const loadOrphanSessions = async () => {
        if (orphanSessionsInflight.current) return orphanSessionsInflight.current;
        const request = (async () => {
            setOrphanSessionsLoading(true);
            setOrphanSessionsError(null);
            try {
                const response = await getInsuranceGuidesView({ detail: 'orphans' });
                setOrphanSessions(response.data.orphanSessions || []);
                setOrphanSessionsCount(response.data.orphanSessionsCount || 0);
            } catch (error) {
                setOrphanSessionsError(extractErrorMessage(error, 'Erro ao carregar sessões órfãs'));
                throw error;
            } finally {
                setOrphanSessionsLoading(false);
            }
        })();
        orphanSessionsInflight.current = request;
        void request.finally(() => {
            if (orphanSessionsInflight.current === request) orphanSessionsInflight.current = null;
        }).catch(() => undefined);
        return request;
    };

    // Contagem de preparos em aberto. Roda fora de loadAllCounts porque não é
    // escopada por mês nem por fase de guia: um rascunho de junho trava sessões
    // independentemente do mês que estiver selecionado na tela.
    const loadDraftCount = async () => {
        try {
            const res = await listBillingSubmissions({ status: 'draft', limit: 100 });
            setDraftSubmissionCount((res.data.data || []).length);
        } catch {
            // Silencioso de propósito: é um badge auxiliar. Um toast de erro aqui
            // apareceria em toda visita à tela de convênios sem o usuário poder agir.
        }
    };

    useEffect(() => { void loadDraftCount(); }, []);

    const loadReceivables = async (month?: string) => {
        if (subTab === 8) return;
        // Todas as abas de guia (A Faturar, Aguardando, Faturados, Recebidos) são
        // buckets de fase carregados juntos — recarregar uma é recarregar todas.
        if (subTab === 0 || subTab === 1 || subTab === 2 || subTab === 3) {
            await loadAllCounts(month);
            return;
        }

        setLoading(true);
        try {
            // Garante allReceivables para contagens/cards caso ainda não tenha carregado
            let allData = allReceivables;
            if (allData.length === 0) {
                const allResponse = await getInsuranceReceivables({ month });
                allData = allResponse.data.data || [];
                setAllReceivables(allData);
            }

            // Buscar dados filtrados pela aba ativa para a lista
            const statusFilter = subTab === 2 ? 'billed' : 'received';
            const response = await getInsuranceReceivables({ month, status: statusFilter });
            const data = response.data.data || [];

            // 🆕 CORREÇÃO: Não filtrar novamente - backend já retorna dados corretos
            // Apenas garante estrutura válida
            const validData = (data || []).map((group: any) => ({
                ...group,
                patients: (group.patients || []).map((p: any) => ({
                    ...p,
                    payments: p.payments || []
                })).filter((p: any) => (p.payments || []).length > 0)
            })).filter((group: any) => (group.patients || []).length > 0);

            setReceivables(validData);

            const totalPending = validData.reduce((acc: number, g: any) =>
                acc + (g.patients || []).reduce((pAcc: number, p: any) =>
                    pAcc + (p.payments || []).filter((pay: any) => pay.status !== 'received').length, 0
                ), 0
            );

            const apiSummary = response.data.summary || {};
            setSummary({
                totalProviders: validData.length,
                grandTotal: validData.reduce((acc: number, g: any) => acc + (g.totalPending || 0), 0),
                pendingCount: totalPending,
                prevMonthTotal: apiSummary.prevMonthTotal ?? null,
                change: apiSummary.change ?? null,
                changePercent: apiSummary.changePercent ?? null
            });

            const expanded: Record<string, boolean> = {};
            validData.forEach((g: any) => { expanded[g._id] = true; });
            setExpandedGroups(expanded);
        } catch (error) {
            console.error('Erro ao carregar recebíveis:', error);
            toast.error('Erro ao carregar dados de convênios');
        } finally {
            setLoading(false);
        }
    };


    const toggleGuideSelection = (guideId: string) => {
        // Atualização funcional é obrigatória aqui: "selecionar/desmarcar
        // todas" chama esta função em loop síncrono (guides.forEach), e todas
        // as chamadas dentro do mesmo ciclo veriam o mesmo `selectedGuides`
        // desatualizado se lêssemos do closure — só o último item do loop
        // sobreviveria.
        setSelectedGuides(prev => {
            const next = new Set(prev);
            if (next.has(guideId)) {
                next.delete(guideId);
            } else {
                next.add(guideId);
            }
            return next;
        });
    };

    const clearGuideSelection = () => setSelectedGuides(new Set());

    const selectAllGuides = () => {
        const source = subTab === 0
            ? pendingStateGuides
            : subTab === 1
            ? waitingBillingGuides
            : guidesByPhase.billed;
        setSelectedGuides(new Set(source.map(g => g.guideId)));
    };

    // Hook para pacientes
    const { patients } = usePatients();

    const loadDoctors = async () => {
        try {
            const doctorsRes = await doctorService.getAllDoctors();
            setDoctors(doctorsRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar doutores:', error);
        }
    };

    const handleCreateInsurance = async () => {
        if (!formData.patientId || !formData.doctorId || !formData.insuranceProvider || !formData.grossAmount || !formData.paymentDate) {
            toast.warn('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);
            await createInsurancePayment(formData);
            toast.success('Atendimento de convênio registrado! 💚');
            setIsNewModalOpen(false);
            setFormData({
                patientId: '',
                doctorId: '',
                insuranceProvider: '',
                grossAmount: 0,
                authorizationCode: '',
                serviceType: 'session',
                notes: '',
                paymentDate: new Date().toISOString().split('T')[0]
            });
            loadReceivables(selectedMonthYear);
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao registrar'));
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsBilled = async (payment: any) => {
        if (!payment.sessionId) {
            toast.error('Sessão não encontrada para este pagamento');
            return;
        }
        try {
            await billInsuranceSession(payment.sessionId);
            toast.success('Marcado como faturado!');
            loadReceivables(selectedMonthYear);
        } catch {
            toast.error('Erro ao faturar');
        }
    };

    const handleReceive = async () => {
        if (!selectedPayment) return;
        if (!selectedPayment.sessionId) {
            toast.error('Sessão não encontrada para este pagamento');
            return;
        }

        try {
            await receiveInsuranceSession(selectedPayment.sessionId, {
                receivedAmount: receiveData.receivedAmount || selectedPayment.grossAmount,
                receivedDate: receiveData.receivedDate
            });
            toast.success('Recebimento registrado! 💚');
            setReceiveModalOpen(false);
            setSelectedPayment(null);
            loadReceivables(selectedMonthYear);
        } catch {
            toast.error('Erro ao registrar recebimento');
        }
    };

    const getStatusChip = (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_billing;
        return (
            <Chip
                size="small"
                label={config.label}
                sx={{
                    bgcolor: config.bgColor,
                    color: config.color,
                    borderColor: config.color,
                    fontWeight: 500
                }}
                variant="outlined"
            />
        );
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Funções para seleção em lote
    const togglePaymentSelection = (paymentId: string) => {
        const newSelected = new Set(selectedPayments);
        if (newSelected.has(paymentId)) {
            newSelected.delete(paymentId);
        } else {
            newSelected.add(paymentId);
        }
        setSelectedPayments(newSelected);
    };

    const selectAllFromPatient = (patient: any) => {
        const newSelected = new Set(selectedPayments);
        patient.payments.forEach((p: any) => {
            if (subTab === 2 && p.status === 'billed') {
                newSelected.add(p.paymentId);
            } else if (subTab === 3 && ['received', 'partial', 'glosa'].includes(p.status)) {
                newSelected.add(p.paymentId);
            }
        });
        setSelectedPayments(newSelected);
    };

    const deselectAllFromPatient = (patient: any) => {
        const newSelected = new Set(selectedPayments);
        patient.payments.forEach((p: any) => {
            newSelected.delete(p.paymentId);
        });
        setSelectedPayments(newSelected);
    };

    const clearAllSelection = () => {
        setSelectedPayments(new Set());
    };

    const selectAll = () => {
        const newSelected = new Set<string>();
        receivables.forEach(group => {
            (group.patients || []).forEach((patient: any) => {
                (patient.payments || []).forEach((p: any) => {
                    if (subTab === 2 && p.status === 'billed') newSelected.add(p.paymentId);
                    else if (subTab === 3 && ['received', 'partial', 'glosa'].includes(p.status)) newSelected.add(p.paymentId);
                });
            });
        });
        setSelectedPayments(newSelected);
    };

    const totalSelectable = subTab === 3 || subTab === 4 || subTab === 5 || subTab === 6 || subTab === 7 || subTab === 8
        ? 0 // Recebidos e abas de conferência/cadastro: sem seleção em lote
        : subTab === 0
        ? pendingStateGuides.length
        : subTab === 1
        ? waitingBillingGuides.length
        : guidesByPhase.billed.length;

    const isGuideMode = usesGuideSelection(subTab);
    const currentSelectableGuides = useMemo(() => (
        subTab === 0
            ? pendingStateGuides
            : subTab === 1
            ? waitingBillingGuides
            : subTab === 2
            ? guidesByPhase.billed
            : []
    ), [subTab, pendingStateGuides, waitingBillingGuides, guidesByPhase.billed]);
    const selectedGuideSummary = useMemo(() => {
        const selected = currentSelectableGuides.filter(guide => selectedGuides.has(guide.guideId));
        return {
            guides: selected.length,
            sessions: selected.reduce((sum, guide) => sum + Number(guide.pendingSessions || 0), 0),
            value: selected.reduce((sum, guide) => sum + Number(guide.pendingValue || 0), 0),
        };
    }, [currentSelectableGuides, selectedGuides]);
    const activeSelectionCount = isGuideMode ? selectedGuideSummary.guides : selectedPayments.size;

    // Retorna se a preparação teve sucesso (abriu o wizard de faturamento) ou
    // falhou — o drawer do paciente só deve fechar no sucesso; num erro (ex:
    // BILLING_SUBMISSION_PAYMENT_PROVIDER_MISMATCH) a pessoa precisa continuar
    // vendo o que selecionou pra tentar de novo, não voltar pra estaca zero.
    const handleOpenBillingWizard = async (guideIds?: string[], competenceOverride?: string): Promise<boolean> => {
        const guideSelection = guideIds ? new Set(guideIds) : selectedGuides;
        if (guideSelection.size === 0) {
            toast.warn('Selecione pelo menos uma guia');
            return false;
        }

        setBillingWizardLoading(true);
        try {
            const sourceGuides = subTab === 1 ? waitingBillingGuides : pendingStateGuides;
            const expectedPhase: InsuranceSessionPhase = subTab === 1 ? 'documentationSent' : 'pendingBilling';
            let selected = sourceGuides.filter(g => guideSelection.has(g.guideId));
            if (selected.length === 0) {
                toast.error('Guias selecionadas não encontradas');
                return false;
            }

            const uniqueInsurances = new Set(selected.map(g => g.insurance));
            if (uniqueInsurances.size > 1) {
                toast.error('Selecione apenas guias do mesmo convênio para enviar documentos em lote');
                return false;
            }

            const patientIds = new Set(selected.map(guide => guide.patient?._id).filter(Boolean));
            if (patientIds.size !== 1) {
                toast.error('Cada envio precisa pertencer a exatamente um paciente');
                return false;
            }

            const isMonthlyBilling = selected.every(guide => guide.billingMode === 'per_month');
            const billingCompetence = competenceOverride || selectedMonthYear;
            selected = await ensureGuideDetails(selected.map(guide => guide.guideId), expectedPhase);
            const sessionIds = [...new Set(selected.flatMap(guide =>
                (guide.sessions || [])
                    // POR MÊS: a competência clínica define automaticamente o
                    // conjunto. POR GUIA: a guia acumula sessões de qualquer
                    // data até ser faturada. Em ambos os casos persistimos os
                    // sessionIds exatos no submission.
                    .filter(session => session.phase === expectedPhase
                        && (!isMonthlyBilling || String(session.date).slice(0, 7) === billingCompetence))
                    .map(session => session.sessionId)
            ))];
            if (sessionIds.length === 0) {
                toast.error('Nenhuma sessão pendente encontrada nas guias selecionadas');
                return false;
            }

            const convenio = await getConvenio(selected[0].insurance);
            const response = await createBillingSubmission({
                patientId: [...patientIds][0]!,
                insuranceProviderId: convenio._id,
                billingCompetence,
                sessionIds
            });
            setBillingSubmissionId(response.data.data._id);
            setBillingWizardOpen(true);
            return true;
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao preparar envio de documentos'));
            return false;
        } finally {
            setBillingWizardLoading(false);
        }
    };

    // Fechar o wizard antes de finalizar deixava o submission em `draft`, e um draft
    // RESERVA as sessões dele: ninguém mais conseguia faturá-las, sem nenhum aviso.
    // O sintoma aparecia dias depois, como um 409 BILLING_SUBMISSION_SESSION_RESERVED
    // que não dizia quem estava segurando (achado 2026-08-11). Agora o fechamento
    // pergunta — descartar libera as sessões, manter mostra o preparo na aba
    // "Rascunhos" para ser retomado ou cancelado depois.
    const handleBillingWizardClose = async () => {
        const closingId = billingSubmissionId;
        setBillingWizardOpen(false);
        setBillingSubmissionId(null);
        if (!closingId) return;

        try {
            const res = await getBillingSubmission(closingId);
            if (res.data.data.submission.status === 'draft') {
                setDiscardDraftId(closingId);
            }
        } catch {
            // Não dá para saber o estado: não inventa um prompt de descarte. O preparo,
            // se ficou em draft, aparece na aba "Rascunhos" de qualquer forma.
        } finally {
            void loadDraftCount();
        }
    };

    const handleDiscardDraft = async () => {
        if (!discardDraftId) return;
        setDiscardingDraft(true);
        try {
            await cancelBillingSubmission(discardDraftId);
            toast.success('Preparo descartado. As sessões foram liberadas.');
            setDiscardDraftId(null);
            await loadDraftCount();
            loadAllCounts(selectedMonthYear);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao descartar o preparo'));
        } finally {
            setDiscardingDraft(false);
        }
    };

    const handleBillingSubmissionChanged = () => {
        invalidateGuideDetails();
        loadAllCounts(selectedMonthYear);
        void loadDraftCount();
    };

    const handleFinalizarGuiasAposFaturamento = async () => {
        if (selectedCloseGuides.size === 0) return;
        setPostFaturamentoCloseLoading(true);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        for (const guideId of Array.from(selectedCloseGuides)) {
            try {
                const result = await encerrarGuia({ guideId });
                if (result.data.success) {
                    successCount++;
                } else {
                    errorCount++;
                    errors.push(result.data.error || `Erro na guia ${guideId}`);
                }
            } catch (error: any) {
                errorCount++;
                errors.push(extractErrorMessage(error, `Erro ao finalizar guia ${guideId}`));
            }
        }
        if (successCount > 0) {
            toast.success(`${successCount} guia(s) finalizada(s) com sucesso.`);
        }
        if (errorCount > 0) {
            toast.error(`Falha ao finalizar ${errorCount} guia(s): ${errors.slice(0, 3).join('; ')}`);
        }
        setPostFaturamentoCloseModal({ open: false, guides: [] });
        setSelectedCloseGuides(new Set());
        invalidateGuideDetails();
        loadAllCounts(selectedMonthYear);
        loadReceivables(selectedMonthYear);
        setPostFaturamentoCloseLoading(false);
    };

    const handleCloseGuideFromReceivables = (guides: Array<{ guideId: string; guideNumber?: string | null }>) => {
        if (!guides || guides.length === 0) return;
        setPostFaturamentoCloseModal({
            open: true,
            guides: guides.map(g => ({ guideId: g.guideId, number: g.guideNumber || g.guideId, sessionsCount: 0 }))
        });
        setSelectedCloseGuides(new Set(guides.map(g => g.guideId)));
    };

    // Mesmo motivo do handleOpenBillingWizard: só sinaliza sucesso quando o
    // modal de recebimento realmente abriu, pra não fechar o drawer do
    // paciente num erro.
    const handleOpenReceberLoteModal = async (guideIds?: string[]): Promise<boolean> => {
        const selectedIds = new Set(guideIds || [...selectedGuides]);
        setGuideDetailsActionLoading(true);
        try {
            const selected = await ensureGuideDetails(
                guidesByPhase.billed.filter(guide => selectedIds.has(guide.guideId)).map(guide => guide.guideId),
                'billed'
            );
            const byBatch = new Map<string, Set<string>>();
            for (const guide of selected) {
                for (const invoice of guide.invoices || []) {
                    if (!invoice.batchId || !invoice.invoiceNumber || invoice.batchStatus === 'received') continue;
                    if (!byBatch.has(invoice.batchId)) byBatch.set(invoice.batchId, new Set());
                    byBatch.get(invoice.batchId)?.add(guide.guideId);
                }
            }
            const targets = [...byBatch.entries()].map(([batchId, ids]) => ({ batchId, guideIds: [...ids] }));
            if (targets.length === 0) {
                toast.warn('As guias selecionadas não possuem NF pendente vinculada');
                return false;
            }
            setReceiptTargets(targets);
            setReceiptSessionsCount(selected.reduce((sum, guide) => sum + guide.pendingSessions, 0));
            setReceberLoteData({ dataRecebimento: new Date().toISOString().split('T')[0] });
            setReceberLoteModalOpen(true);
            return true;
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar detalhes para recebimento'));
            return false;
        } finally {
            setGuideDetailsActionLoading(false);
        }
    };

    const handleReceberLote = async () => {
        setReceberLoteLoading(true);
        try {
            let paymentsReceived = 0;
            for (const target of receiptTargets) {
                const result = await receiveInvoiceBatch(target.batchId, {
                    guideIds: target.guideIds,
                    receivedDate: receberLoteData.dataRecebimento
                });
                paymentsReceived += result.paymentsReceived || 0;
            }
            toast.success(`${paymentsReceived} pagamento(s) recebido(s) e refletido(s) no financeiro.`);
            setReceberLoteModalOpen(false);
            setReceiptTargets([]);
            clearAllSelection();
            clearGuideSelection();
            invalidateGuideDetails();
            loadAllCounts(selectedMonthYear);
            loadReceivables(selectedMonthYear);
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao registrar baixa das guias'));
        } finally {
            setReceberLoteLoading(false);
        }
    };

    if (loading && receivables.length === 0) {
        return (
            <Box>
                <Grid container spacing={2} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                    {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                        <Grid size={{ xs: 12, md: 4 }} key={i}>
                            <Card elevation={0} sx={{ border: `1px solid ${c.color}20`, borderRadius: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width="55%" height={20} />
                                            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                                            <Skeleton variant="text" width="45%" height={16} />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                            <Skeleton key={i} variant="rounded" width={145} height={36} sx={{ bgcolor: `${c.color}15` }} />
                        ))}
                    </Box>
                    <Box sx={{ p: 3 }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                        <Box>
                                            <Skeleton variant="text" width={150} height={20} />
                                            <Skeleton variant="text" width={100} height={16} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ '& *': { boxSizing: 'border-box' } }}>
            {/* Header */}
            <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100">
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900">Gestão de Convênios</h2>
                        <p className="text-xs leading-5 text-slate-500 sm:text-sm">Controle de faturamento e recebimentos · {getMonthLabel()}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 lg:ml-auto">
                    {subTab !== 4 && subTab !== 5 && subTab !== 6 && subTab !== 7 && subTab !== 8 && subTab !== 9 && (
                        <div className="flex items-center gap-2 sm:mr-1">
                            <Calendar size={15} className="text-slate-400 shrink-0" />
                            <TextField
                                type="month"
                                label="Mês de referência"
                                value={selectedMonthYear}
                                onChange={(e) => setSelectedMonthYear(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                sx={{ width: { xs: '100%', sm: 180 }, '& .MuiInputBase-root': { height: 38, borderRadius: '10px' } }}
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setConvenioManagerOpen(true)}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none"
                    >
                        <Building2 size={16} />
                        Gerenciar Convênios
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsNewModalOpen(true)}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:flex-none"
                    >
                        <Plus size={16} />
                        Novo Atendimento
                    </button>
                    </div>
                </div>
            </div>

            {/* Filtro de Mês — oculto no Histórico, Autorizações, Envios, Convênios Cadastrados,
                Notas Fiscais e Rascunhos (não são escopados por mês). Um rascunho de junho trava
                sessões independentemente do mês selecionado, então filtrá-lo por mês esconderia
                justamente o que está bloqueando o faturamento. */}
            {/* Cards de Resumo — accordion default fechado */}
            {(() => {
                const ms = getMonthSummary();
                const prodTotal = ms.totalAFaturar + ms.totalFaturado + ms.totalRecebido;
                return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-3 bg-white">
                        {/* Header clicável */}
                        <button
                            type="button"
                            onClick={() => setCardsOpen(o => !o)}
                            aria-expanded={cardsOpen}
                            aria-controls="insurance-summary-cards"
                            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                        >
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="mr-1 text-sm font-bold leading-5 text-slate-900">Painel de Convênios</span>
                                <span className="inline-flex items-center gap-1 rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-xs text-purple-700" title="Inclui o backlog total de A Faturar (não filtra por período) + Faturado/Recebido do período selecionado">
                                    {prodTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} produção
                                </span>
                                <span className="inline-flex rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-xs text-amber-700" title="Backlog total pendente de faturamento — não muda com o Período selecionado">
                                    {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a faturar (total)
                                </span>
                                {ms.totalWaiting > 0 && (
                                    <span className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700" title="Backlog total aguardando faturamento — não muda com o Período selecionado">
                                        {ms.totalWaiting.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} aguardando faturamento (total)
                                    </span>
                                )}
                                {ms.totalRecebido > 0 && (
                                    <span className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 font-semibold">
                                        {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido
                                    </span>
                                )}
                                {ms.closedCount > 0 && (
                                    <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                                        {ms.closedCount} guia{ms.closedCount !== 1 ? 's' : ''} finalizada{ms.closedCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {competenceBreakdown && competenceBreakdown.previous.value > 0 && (
                                    <span className="inline-flex rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-xs text-rose-700 font-semibold" title="Sessões pendentes de faturamento de meses anteriores, dentro do mesmo total acima — guias não são duplicadas.">
                                        {competenceBreakdown.previous.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} atrasado (antes de {competenceBreakdown.referenceMonth})
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={17} className={`text-slate-500 shrink-0 transition-transform ${cardsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <Collapse in={cardsOpen}>
                            <div id="insurance-summary-cards" className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch gap-3 p-3">
                                {/* Produção Total */}
                                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] h-full">
                                    <div style={{ height: 3, backgroundColor: '#8B5CF6' }} />
                                    <div className="p-3.5 bg-white h-full flex flex-col min-h-[168px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">Produção</span>
                                            {summary.changePercent !== null && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${(summary.change ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {(summary.change ?? 0) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                    {(summary.change ?? 0) >= 0 ? '+' : ''}{summary.changePercent}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="my-2 text-2xl font-bold leading-none tracking-tight tabular-nums text-slate-900">
                                            {prodTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.pendingCount + ms.receivedCount} sessões realizadas</p>
                                        <p className="text-xs text-gray-400 mt-1">valor gerado · não é caixa ainda</p>
                                        {summary.prevMonthTotal !== null && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Mês anterior: <span className="font-semibold text-gray-600">{summary.prevMonthTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* A Faturar */}
                                <button
                                    type="button"
                                    onClick={() => openDetailsModal(
                                        'A Faturar',
                                        '#F59E0B',
                                        pendingStateGuides
                                            .map(g => {
                                                const start = fmtDateShort(g.firstSessionDate);
                                                const end = fmtDateShort(g.lastSessionDate);
                                                const period = start && end ? (start === end ? start : `${start} a ${end}`) : null;
                                                const value = (g.sessions || []).reduce((s: number, session: any) => s + (Number(session.value) || 0), 0) || Number(g.pendingValue || 0);
                                                return {
                                                    id: g.guideId,
                                                    label: g.patient?.fullName || 'Paciente',
                                                    sublabel: `guia ${g.number}${period ? ` · ${period}` : ''} · ${g.pendingSessions} sessão${g.pendingSessions !== 1 ? 'ões' : ''}`,
                                                    value,
                                                    highlight: overdueValueByGuideId.has(g.guideId),
                                                    highlightLabel: 'atrasado',
                                                };
                                            })
                                            // Agrupa por paciente (mesmo nome fica adjacente) em vez de intercalar
                                            // por valor puro — muito mais fácil de escanear com várias guias.
                                            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR') || b.value - a.value),
                                        [
                                            { key: 'all', label: 'Todos', predicate: () => true },
                                            { key: 'overdue', label: 'Atrasado', predicate: (r) => !!r.highlight },
                                            { key: 'current', label: 'Mês atual', predicate: (r) => !r.highlight },
                                        ]
                                    )}
                                    className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                                >
                                    <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
                                    <div className="p-3.5 bg-white h-full flex flex-col min-h-[168px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">A Faturar</span>
                                        </div>
                                        <div className="my-2 text-2xl font-bold leading-none tracking-tight tabular-nums text-slate-900">
                                            {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.pendingCount} sessões · {pendingStateGuides.length} guia{pendingStateGuides.length !== 1 ? 's' : ''}</p>
                                        <p className="text-xs text-gray-400 mt-1">não enviado ao convênio</p>
                                        <p className="text-xs text-gray-400">total acumulado — não filtra pelo Período acima</p>
                                        {competenceBreakdown && competenceBreakdown.previous.value > 0 && (
                                            <p className="text-xs text-red-600 font-medium mt-2 rounded-lg bg-rose-50 px-2 py-1.5">
                                                {competenceBreakdown.current.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {competenceBreakdown.referenceMonth} · {competenceBreakdown.previous.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} atrasado
                                            </p>
                                        )}
                                        <p className="text-2xs text-amber-700 font-semibold mt-auto pt-2">Ver guias →</p>
                                    </div>
                                </button>

                                {/* Aguardando Faturamento */}
                                <button
                                    type="button"
                                    onClick={() => openDetailsModal(
                                        'Aguardando Faturamento',
                                        '#1D4ED8',
                                        waitingBillingGuides
                                            .map(g => ({
                                                id: g.guideId,
                                                label: g.patient?.fullName || 'Paciente',
                                                sublabel: `guia ${g.number} · ${g.pendingSessions} sessão${g.pendingSessions !== 1 ? 'ões' : ''}`,
                                                value: (g.sessions || []).reduce((s: number, session: any) => s + (Number(session.value) || 0), 0) || Number(g.pendingValue || 0),
                                            }))
                                            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR') || b.value - a.value)
                                    )}
                                    className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                >
                                    <div style={{ height: 3, backgroundColor: '#1D4ED8' }} />
                                    <div className="p-3.5 bg-white h-full flex flex-col min-h-[168px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Aguardando Faturamento</span>
                                        </div>
                                        <div className="my-2 text-2xl font-bold leading-none tracking-tight tabular-nums text-slate-900">
                                            {ms.totalWaiting.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.waitingCount} sessões · {waitingBillingGuides.length} guia{waitingBillingGuides.length !== 1 ? 's' : ''}</p>
                                        <p className="text-xs text-gray-400 mt-1">documentação já enviada</p>
                                        <p className="text-2xs text-blue-600 font-semibold mt-auto pt-2">Ver guias →</p>
                                    </div>
                                </button>

                                {/* Faturado */}
                                <button
                                    type="button"
                                    onClick={() => openDetailsModal('Faturado', '#3B82F6', billedPaymentsDetailed)}
                                    className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                >
                                    <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
                                    <div className="p-3.5 bg-white h-full flex flex-col min-h-[168px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Faturado</span>
                                        </div>
                                        <div className="my-2 text-2xl font-bold leading-none tracking-tight tabular-nums text-slate-900">
                                            {ms.totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.billedCount} sessões enviadas</p>
                                        <p className="text-xs text-gray-400 mt-1">aguardando repasse</p>
                                        <p className="text-2xs text-blue-600 font-semibold mt-auto pt-2">Ver pagamentos →</p>
                                    </div>
                                </button>

                                {/* Recebido */}
                                <button
                                    type="button"
                                    onClick={() => openDetailsModal('Recebido', '#10B981', receivedPaymentsDetailed)}
                                    className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                >
                                    <div style={{ height: 3, backgroundColor: '#10B981' }} />
                                    <div className="p-3.5 bg-white h-full flex flex-col min-h-[168px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Recebido</span>
                                        </div>
                                        <div className="my-2 text-2xl font-bold leading-none tracking-tight tabular-nums text-slate-900">
                                            {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.receivedCount} sessões pagas</p>
                                        <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Entrou no caixa</p>
                                        <p className="text-2xs text-emerald-600 font-semibold mt-auto pt-2">Ver pagamentos →</p>
                                    </div>
                                </button>
                            </div>
                        </Collapse>
                    </div>
                );
            })()}

            {/* Sub-tabs */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto overscroll-x-contain border-b border-slate-100 p-2 pb-2.5">
                    <div role="tablist" aria-label="Etapas de convênios" className="flex min-w-max gap-1 rounded-xl bg-slate-100/80 p-1">
                        {[
                            { value: 0, label: 'A Faturar', count: pendingStateGuides.length,        icon: <Clock size={15} />, amber: true },
                            { value: 1, label: 'Aguardando Faturamento', count: waitingBillingGuides.length, icon: <Mail size={15} />, amber: true },
                            // Contagem por bucket de fase. A contagem anterior lia
                            // `allReceivables`, que nunca traz 'received' (RECEIVABLE_STATUSES
                            // só tem pending_billing/billed) — por isso o badge vivia zerado.
                            { value: 2, label: 'Faturados', count: guidesByPhase.billed.length, icon: <Send size={15} />, amber: false },
                            { value: 8, label: 'Notas Fiscais', count: invoiceReceivableCount, icon: <FileText size={15} />, amber: false },
                            { value: 3, label: 'Recebidos', count: guidesByPhase.received.length, icon: <CheckCircle size={15} />, amber: false },
                            { value: 4, label: 'Histórico', count: 0,                           icon: <History size={15} />, amber: false },
                            { value: 5, label: 'Autorizações', count: 0,                       icon: <Shield size={15} />, amber: false },
                            { value: 6, label: 'Envios', count: 0,                             icon: <Mail size={15} />, amber: false },
                            // Âmbar: cada rascunho aqui é sessão reservada que ninguém consegue faturar.
                            { value: 9, label: 'Rascunhos', count: draftSubmissionCount,        icon: <FileClock size={15} />, amber: true },
                            { value: 7, label: 'Convênios Cadastrados', count: 0,               icon: <Building2 size={15} />, amber: false },
                        ].map(tab => (
                            <button key={tab.value} type="button" role="tab" aria-selected={subTab === tab.value} onClick={() => setSubTab(tab.value)}
                                className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                    subTab === tab.value
                                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-3xs font-bold ${
                                        tab.amber
                                            ? (subTab === tab.value ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700')
                                            : (subTab === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500')
                                    }`}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {subTab === 0 && paymentIntegrityConflictCount > 0 && (
                    <Paper elevation={0} sx={{
                        mx: { xs: 1.5, sm: 2 }, mt: 1.5, px: 1.5, py: 1,
                        display: 'flex', alignItems: 'center', gap: 1,
                        bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px'
                    }}>
                        <AlertCircle size={18} color="#C2410C" />
                        <Typography fontSize="0.75rem" lineHeight={1.5} color="#9A3412" fontWeight={600}>
                            {paymentIntegrityConflictCount} sessão{paymentIntegrityConflictCount !== 1 ? 'ões' : ''}
                            {' '}não {paymentIntegrityConflictCount !== 1 ? 'foram listadas' : 'foi listada'} para faturamento
                            porque não {paymentIntegrityConflictCount !== 1 ? 'possuem' : 'possui'} exatamente um Payment de convênio elegível.
                        </Typography>
                    </Paper>
                )}

                {/* No faturamento novo a seleção acontece exclusivamente dentro
                    do drawer do paciente. A barra global permanece apenas para
                    registrar recebimentos de lotes já faturados. */}
                {totalSelectable > 0 && subTab === 2 && (
                    <Paper elevation={activeSelectionCount > 0 ? 2 : 0} sx={{
                        px: 1.5, py: 1, mx: 2, mt: 1.5,
                        width: activeSelectionCount > 0 ? 'auto' : 'fit-content',
                        maxWidth: 'calc(100% - 32px)',
                        bgcolor: activeSelectionCount > 0 ? '#F0F9FF' : '#F9FAFB',
                        border: `1px solid ${activeSelectionCount > 0 ? '#3B82F6' : '#E5E7EB'}`,
                        borderRadius: 2
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {isGuideMode ? (
                                    <Button
                                        size="small"
                                        variant={selectedGuideSummary.guides === totalSelectable ? 'contained' : 'outlined'}
                                        startIcon={<Check size={15} />}
                                        onClick={selectedGuideSummary.guides === totalSelectable ? clearGuideSelection : selectAllGuides}
                                        sx={{ borderRadius: 2, fontSize: '0.75rem', lineHeight: 1.5 }}
                                    >
                                        {selectedGuideSummary.guides === totalSelectable
                                            ? `Desmarcar todas as ${totalSelectable} guias`
                                            : `Selecionar todas as ${totalSelectable} guias`}
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        variant={selectedPayments.size === totalSelectable ? 'contained' : 'outlined'}
                                        startIcon={<Check size={15} />}
                                        onClick={selectedPayments.size === totalSelectable ? clearAllSelection : selectAll}
                                        sx={{ borderRadius: 2, fontSize: '0.75rem', lineHeight: 1.5 }}
                                    >
                                        {selectedPayments.size === totalSelectable
                                            ? 'Desmarcar Todos'
                                            : `Selecionar Todos (${totalSelectable})`}
                                    </Button>
                                )}
                                {activeSelectionCount > 0 && (
                                    <>
                                        <Typography variant="body2" fontWeight={600} color="#3B82F6">
                                            {isGuideMode
                                                ? `${selectedGuideSummary.guides} guia${selectedGuideSummary.guides !== 1 ? 's' : ''} · ${selectedGuideSummary.sessions} sessão${selectedGuideSummary.sessions !== 1 ? 'ões' : ''} · ${selectedGuideSummary.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                : `${selectedPayments.size} atendimento${selectedPayments.size !== 1 ? 's' : ''}`}
                                        </Typography>
                                        <Button size="small" variant="text" onClick={isGuideMode ? clearGuideSelection : clearAllSelection} sx={{ fontSize: '0.75rem' }}>
                                            Limpar
                                        </Button>
                                    </>
                                )}
                            </Box>
                            {activeSelectionCount > 0 && (
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    {(subTab === 0 || subTab === 1) && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Send size={16} />}
                                            onClick={() => handleOpenBillingWizard()}
                                            disabled={billingWizardLoading}
                                            sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' }, borderRadius: 2 }}
                                        >
                                            {billingWizardLoading
                                                ? 'Abrindo...'
                                                : (subTab === 0 ? 'Preparar faturamento' : 'Continuar faturamento')}
                                        </Button>
                                    )}
                                    {subTab === 2 && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<CheckCircle size={16} />}
                                            onClick={() => handleOpenReceberLoteModal()}
                                            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2 }}
                                        >
                                            Receber Selecionados
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                )}

                {subTab !== 7 && (
                    <Box sx={{ px: 3, pt: 2 }}>
                        <InsuranceFilterBar
                            nfValue={nfFilter}
                            onNfChange={setNfFilter}
                            patientValue={patientFilter}
                            onPatientChange={setPatientFilter}
                            showNfFilter={subTab === 0 || subTab === 1 || subTab === 2 || subTab === 3 || subTab === 8}
                            nfPlaceholder="Filtrar por número da guia/NF"
                        />
                    </Box>
                )}

                <Box sx={{ p: 3 }}>
                    {subTab === 8 ? (
                        <InvoiceReceivablesSection
                            nfFilter={nfFilter}
                            patientFilter={patientFilter}
                            onCountChange={setInvoiceReceivableCount}
                            onChanged={() => {
                                // Após uma baixa, atualiza os badges de guias.
                                // A própria seção já recarregou as NFs.
                                loadAllCounts(selectedMonthYear);
                            }}
                        />
                    ) : subTab === 7 ? (
                        <ConvenioManagerModal open onClose={() => {}} embedded />
                    ) : subTab === 9 ? (
                        <RascunhosTab
                            patientFilter={patientFilter}
                            onCountChange={setDraftSubmissionCount}
                            onChanged={() => {
                                // Cancelar um rascunho libera sessões: as abas de
                                // faturamento precisam recontar, senão continuam
                                // mostrando as sessões como indisponíveis.
                                loadReceivables(selectedMonthYear);
                                loadAllCounts(selectedMonthYear);
                            }}
                        />
                    ) : subTab === 6 ? (
                        <EnviosTab patientFilter={patientFilter} />
                    ) : subTab === 5 ? (
                        <AutorizacoesTab month={month} year={year} patientFilter={patientFilter} />
                    ) : subTab === 4 ? (
                        <InsuranceHistorySection activeYear={year} activeMonth={month} patientFilter={patientFilter} />
                    ) : subTab === 0 || subTab === 1 ? (
                        <GuidePendingBillingSection
                            guides={subTab === 0 ? filteredPendingStateGuides : filteredWaitingBillingGuides}
                            selectedGuides={selectedGuides}
                            orphanSessions={subTab === 0 ? orphanSessions : []}
                            orphanSessionsCount={subTab === 0 ? orphanSessionsCount : 0}
                            orphanSessionsLoading={orphanSessionsLoading}
                            orphanSessionsError={orphanSessionsError}
                            onLoadOrphanSessions={loadOrphanSessions}
                            loading={loadingGuides}
                            detailsLoading={guideDetailsActionLoading || loadingGuideDetails.size > 0}
                            onLoadGuideDetails={(guideIds) => ensureGuideDetails(guideIds, subTab === 0 ? 'pendingBilling' : 'documentationSent')}
                            onToggleGuide={toggleGuideSelection}
                            onRefresh={() => {
                                invalidateGuideDetails();
                                loadAllCounts(selectedMonthYear);
                                loadReceivables(selectedMonthYear);
                            }}
                            month={selectedMonthYear}
                            drawerAction={subTab === 0 ? 'send_documents' : 'bill'}
                            onDrawerAction={handleOpenBillingWizard}
                            phase={subTab === 0 ? 'pendingBilling' : 'documentationSent'}
                            convenios={convenios}
                            loadingConvenios={loadingConvenios}
                        />
                    ) : subTab === 2 || subTab === 3 ? (
                        // Faturados/Recebidos derivam da ReadView pelo bucket da fase.
                        // Faturados preserva o command de recebimento; somente Recebidos
                        // é read-only. A fonte de leitura não remove ação existente.
                        <GuidePendingBillingSection
                            guides={subTab === 2 ? filteredBilledGuides : filteredReceivedGuides}
                            selectedGuides={selectedGuides}
                            orphanSessions={[]}
                            orphanSessionsCount={0}
                            loading={loadingGuides}
                            detailsLoading={guideDetailsActionLoading || loadingGuideDetails.size > 0}
                            onLoadGuideDetails={(guideIds) => ensureGuideDetails(guideIds, subTab === 2 ? 'billed' : 'received')}
                            onToggleGuide={toggleGuideSelection}
                            onRefresh={() => {
                                invalidateGuideDetails();
                                loadAllCounts(selectedMonthYear);
                                loadReceivables(selectedMonthYear);
                            }}
                            month={selectedMonthYear}
                            readOnly={subTab === 3}
                            phaseLabel={subTab === 2 ? 'faturada(s)' : 'recebida(s)'}
                            drawerAction={subTab === 2 ? 'receive' : undefined}
                            onDrawerAction={subTab === 2 ? handleOpenReceberLoteModal : undefined}
                            phase={subTab === 2 ? 'billed' : 'received'}
                            convenios={convenios}
                            loadingConvenios={loadingConvenios}
                        />
                    ) : loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                        <Box>
                                            <Skeleton variant="text" width={150} height={20} />
                                            <Skeleton variant="text" width={100} height={16} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))
                    ) : receivables.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhum atendimento de convênio
                            </Typography>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 🆕 UX: Ordena convênios por valor total (maior primeiro) */}
                            {[...receivables]
                                .sort((a, b) => (b.totalPending || 0) - (a.totalPending || 0))
                                .map((group) => {
                                // 🆕 CORREÇÃO: Não filtrar novamente - backend já filtrou por status
                                const patientsToShow = (group.patients || [])
                                    .slice()
                                    .sort((a: any, b: any) => (b.total || 0) - (a.total || 0));
                                if (patientsToShow.length === 0) return null;
                                const groupTotal = group.totalPending || 0;
                                const isExpanded = expandedGroups[group._id] !== false;

                                const tabAccent = subTab === 3 ? '#3B82F6' : '#10B981';
                                // Para aba Recebidos: extrai datas de entrada no caixa
                                const allPaidDates = subTab === 4
                                    ? patientsToShow.flatMap((p: any) =>
                                        (p.payments || []).filter((pay: any) => pay.paidAt).map((pay: any) => pay.paidAt as string)
                                      ).sort()
                                    : [];
                                const formatDateBR = (d: string) => { const dt = new Date(d); return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`; };
                                const cashDateLabel = allPaidDates.length > 0
                                    ? allPaidDates[0] === allPaidDates[allPaidDates.length - 1]
                                        ? `caixa ${formatDateBR(allPaidDates[0])}`
                                        : `caixa ${formatDateBR(allPaidDates[0])} – ${formatDateBR(allPaidDates[allPaidDates.length - 1])}`
                                    : null;
                                return (
                                    <Card key={group._id} elevation={0} sx={{
                                        width: '100%', borderRadius: 3,
                                        border: '1.5px solid #E2E8F0', overflow: 'hidden',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                        transition: 'box-shadow 0.15s',
                                        '&:hover': { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }
                                    }}>
                                        <Box sx={{ height: 3, bgcolor: tabAccent }} />
                                        <Box
                                            onClick={() => toggleGroup(group._id)}
                                            sx={{
                                                px: 2.5, py: 2,
                                                bgcolor: isExpanded ? '#FAFAFA' : 'white',
                                                borderBottom: isExpanded ? '1px solid #F1F5F9' : 'none',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: '#F8FAFC' },
                                            }}
                                        >
                                            <Box>
                                                <Typography className="text-base" fontWeight="700" lineHeight={1.5} color="#0F172A" sx={{ mb: 0.25 }}>
                                                    {formatProviderName(group._id)}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                    <Typography fontSize="0.76rem" color="#94A3B8">
                                                        {patientsToShow.reduce((sum, p) => sum + (p.payments?.length || 0), 0)} atendimentos · {patientsToShow.length} paciente{patientsToShow.length !== 1 ? 's' : ''}
                                                    </Typography>
                                                    {cashDateLabel && (
                                                        <Box sx={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                            px: 0.75, py: 0.2,
                                                            bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 1
                                                        }}>
                                                            <Typography fontSize="0.75rem" lineHeight={1.5} fontWeight={600} color="#15803D">
                                                                ✓ {cashDateLabel}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ px: 1.75, py: 0.6, bgcolor: tabAccent, borderRadius: 2 }}>
                                                    <Typography fontWeight="800" fontSize="0.85rem" color="white">
                                                        {groupTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ color: '#CBD5E1', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                    <ChevronDown size={18} />
                                                </Box>
                                            </Box>
                                        </Box>

                                        <Collapse in={isExpanded}>
                                            <div className="divide-y divide-slate-50">
                                                {patientsToShow.map((patient) => (
                                                    <PatientAccordionSection
                                                        key={patient.patientId}
                                                        patient={patient}
                                                        provider={group._id}
                                                        onOpen360={handleOpen360}
                                                        onMarkAsBilled={handleMarkAsBilled}
                                                        onReceive={(payment) => {
                                                            setSelectedPayment(payment);
                                                            setReceiveData({
                                                                receivedAmount: payment.grossAmount,
                                                                receivedDate: new Date().toISOString().split('T')[0],
                                                                notes: ''
                                                            });
                                                            setReceiveModalOpen(true);
                                                        }}
                                                        getStatusChip={getStatusChip}
                                                        selectedPayments={selectedPayments}
                                                        onTogglePayment={togglePaymentSelection}
                                                        onSelectAllFromPatient={selectAllFromPatient}
                                                        onDeselectAllFromPatient={deselectAllFromPatient}
                                                        subTab={subTab}
                                                        onCloseGuide={handleCloseGuideFromReceivables}
                                                    />
                                                ))}
                                            </div>
                                        </Collapse>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Box>
            </div>

            {/* Modal: Finalizar guias após faturamento */}
            <Dialog
                open={postFaturamentoCloseModal.open}
                onClose={() => !postFaturamentoCloseLoading && setPostFaturamentoCloseModal({ open: false, guides: [] })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#7C3AED', width: 32, height: 32 }}>
                            <Shield className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Finalizar guia</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Se não houver mais atendimentos previstos nesta guia, você pode encerrá-la agora. Sessões pendentes futuras serão canceladas.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.5, borderRadius: 2, bgcolor: '#FEF3C7', border: '1px solid #F59E0B' }}>
                            <AlertCircle size={16} style={{ color: '#92400E', marginTop: 2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#92400E' }}>
                                Ao finalizar, os agendamentos futuros pendentes serão cancelados e a guia será encerrada. Esta ação não pode ser desfeita.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Guias faturadas ({postFaturamentoCloseModal.guides.length})
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {postFaturamentoCloseModal.guides.map((g) => (
                                    <Box
                                        key={g.guideId}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: selectedCloseGuides.has(g.guideId) ? '#7C3AED' : 'grey.200',
                                            bgcolor: selectedCloseGuides.has(g.guideId) ? '#F5F3FF' : 'background.paper'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`close-guide-${g.guideId}`}
                                            checked={selectedCloseGuides.has(g.guideId)}
                                            onChange={() => {
                                                const next = new Set(selectedCloseGuides);
                                                if (next.has(g.guideId)) {
                                                    next.delete(g.guideId);
                                                } else {
                                                    next.add(g.guideId);
                                                }
                                                setSelectedCloseGuides(next);
                                            }}
                                            style={{ width: 18, height: 18, accentColor: '#7C3AED' }}
                                        />
                                        <label htmlFor={`close-guide-${g.guideId}`} style={{ flex: 1, cursor: 'pointer', margin: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                Guia {g.number}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {g.sessionsCount} sessão(ões) faturada(s)
                                            </Typography>
                                        </label>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPostFaturamentoCloseModal({ open: false, guides: [] })} disabled={postFaturamentoCloseLoading}>
                        Continuar depois
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFinalizarGuiasAposFaturamento}
                        disabled={postFaturamentoCloseLoading || selectedCloseGuides.size === 0}
                        startIcon={postFaturamentoCloseLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
                    >
                        {postFaturamentoCloseLoading ? 'Finalizando...' : `Finalizar ${selectedCloseGuides.size} guia(s)`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Receber em Lote */}
            <Dialog open={receberLoteModalOpen} onClose={() => {
                if (!receberLoteLoading) {
                    setReceberLoteModalOpen(false);
                    setReceiptTargets([]);
                }
            }} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <CheckCircle className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {receiptSessionsCount} sessão(ões), distribuída(s) em {receiptTargets.length} NF(s), será(ão) marcada(s) como recebida(s).
                            Os Payments entram no caixa na data informada; as demais guias da mesma NF continuam pendentes.
                        </Typography>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Recebimento *"
                            value={receberLoteData.dataRecebimento}
                            onChange={(e) => setReceberLoteData({ dataRecebimento: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => { setReceberLoteModalOpen(false); setReceiptTargets([]); }} disabled={receberLoteLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleReceberLote}
                        disabled={receberLoteLoading}
                        startIcon={receberLoteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                    >
                        {receberLoteLoading ? 'Registrando...' : 'Confirmar Recebimento'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Novo Atendimento */}
            <Dialog open={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32 }}>
                            <Building2 className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Novo Atendimento de Convênio</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Atendimento *"
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <FormControl fullWidth>
                            <InputLabel>Paciente *</InputLabel>
                            <Select
                                value={formData.patientId}
                                label="Paciente *"
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                            >
                                {patients.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>{p.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Profissional *</InputLabel>
                            <Select
                                value={formData.doctorId}
                                label="Profissional *"
                                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                            >
                                {doctors.map((d) => (
                                    <MenuItem key={d._id} value={d._id}>{d.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Convênio *</InputLabel>
                            <Select
                                value={formData.insuranceProvider}
                                label="Convênio *"
                                disabled={loadingConvenios}
                                onChange={(e) => {
                                    const selectedCode = e.target.value;
                                    const provider = convenios.find(c => c.code === selectedCode);
                                    setFormData({
                                        ...formData,
                                        insuranceProvider: selectedCode,
                                        grossAmount: provider?.sessionValue || formData.grossAmount
                                    });
                                }}
                            >
                                <MenuItem value="">{loadingConvenios ? 'Carregando...' : 'Selecione'}</MenuItem>
                                {convenios.map((p) => (
                                    <MenuItem key={p._id} value={p.code}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box>
                            <Typography variant="body2" gutterBottom>Valor da Tabela *</Typography>
                            <InputCurrency
                                name=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.grossAmount}
                                onChange={(e) => setFormData({ ...formData, grossAmount: Number(e.target.value) })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            label="Código da Guia/Autorização"
                            value={formData.authorizationCode}
                            onChange={(e) => setFormData({ ...formData, authorizationCode: e.target.value })}
                            placeholder="Opcional"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsNewModalOpen(false)} variant="outlined">Cancelar</Button>
                    <Button variant="contained" onClick={handleCreateInsurance} disabled={loading} startIcon={<Check size={16} />} sx={{ bgcolor: '#3B82F6' }}>
                        Registrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Recebimento */}
            <Dialog open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <CheckCircle className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2">
                            <strong>Paciente:</strong> {selectedPayment?.patientName}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Valor esperado:</strong> R$ {selectedPayment?.grossAmount?.toLocaleString('pt-BR')}
                        </Typography>
                        <Box>
                            <Typography variant="body2" gutterBottom>Valor Recebido *</Typography>
                            <InputCurrency
                                name=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={receiveData.receivedAmount}
                                onChange={(e) => setReceiveData({ ...receiveData, receivedAmount: Number(e.target.value) })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Recebimento"
                            value={receiveData.receivedDate}
                            onChange={(e) => setReceiveData({ ...receiveData, receivedDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceiveModalOpen(false)} variant="outlined">Cancelar</Button>
                    <Button variant="contained" color="success" onClick={handleReceive} startIcon={<CheckCircle size={16} />} sx={{ bgcolor: '#10B981' }}>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>

            {selectedPatient360Id && (
                <Patient360Modal
                    patientId={selectedPatient360Id}
                    open={is360ModalOpen}
                    onClose={() => setIs360ModalOpen(false)}
                />
            )}

            {/* Modal reutilizável de detalhamento — aberto pelos cards A Faturar / Aguardando
                Faturamento / Faturado / Recebido do Painel de Convênios */}
            <BreakdownDetailsModal
                open={detailsModal.open}
                onClose={() => setDetailsModal(prev => ({ ...prev, open: false }))}
                title={detailsModal.title}
                accentColor={detailsModal.accentColor}
                rows={detailsModal.rows}
                tabs={detailsModal.tabs}
            />

            <BillingCommunicationWizard
                open={billingWizardOpen}
                submissionId={billingSubmissionId}
                onClose={handleBillingWizardClose}
                onChanged={handleBillingSubmissionChanged}
            />

            {/* Preparo fechado sem finalizar — oferece liberar as sessões na hora */}
            <Dialog
                open={!!discardDraftId}
                onClose={() => !discardingDraft && setDiscardDraftId(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Descartar este preparo?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '0.9rem' }}>
                        Você fechou o preparo antes de finalizar. Enquanto ele existir, as sessões
                        selecionadas ficam <strong>reservadas</strong> e não podem ser faturadas de novo.
                        <br /><br />
                        <strong>Descartar</strong> libera as sessões agora.
                        <br />
                        <strong>Manter</strong> guarda o preparo na aba <strong>Rascunhos</strong>,
                        para você retomar ou cancelar depois.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDiscardDraftId(null)} disabled={discardingDraft}>
                        Manter
                    </Button>
                    <Button onClick={handleDiscardDraft} variant="contained" color="error" disabled={discardingDraft}>
                        {discardingDraft ? 'Descartando...' : 'Descartar e liberar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Gerenciamento de Convênios */}
            <ConvenioManagerModal
                open={convenioManagerOpen}
                onClose={() => setConvenioManagerOpen(false)}
            />
        </Box>
    );
};

export default InsuranceTab;
