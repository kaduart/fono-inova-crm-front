// src/pages/Financial/tabs/GuidePendingBillingSection.tsx

import {
    Box,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Drawer,
    IconButton,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Calendar, CheckCircle, ChevronDown, ChevronUp, Lock, Pencil, Send, X, Link2, Plus, Wand2, FileText } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { getSpecialtyLabel } from '../../../constants/specialties';
import { autoLinkOrphanSessions, createGuideFromOrphan, encerrarGuia, linkOrphanSessionsToGuide, previewAutoLinkOrphanSessions } from '../../../services/paymentService';
import { updateGuide } from '../../../services/insuranceGuideApi';
import type { Convenio } from '../../../services/insuranceService';
import { toast } from 'react-toastify';

export interface PendingGuideSession {
    sessionId: string;
    /** Payment que o command side deve receber; nulo em sessões sem Payment elegível. */
    paymentId?: string | null;
    date?: string | Date | null;
    // Horário real do atendimento (Appointment.time, "HH:mm") — Session.date
    // carrega só o dia de forma confiável; a hora embutida nele não bate com
    // a lista de presença assinada (achado 2026-07-27, guia 16145509).
    time?: string | null;
    specialty?: string | null;
    value?: number;
    doctorName?: string | null;
    /** ReadView V2: fase do ciclo desta sessão. null = fora do ciclo (não concluída) */
    phase?: 'pendingBilling' | 'documentationSent' | 'billed' | 'received' | null;
}

export interface PendingGuide {
    guideId: string;
    number: string;
    insurance: string;
    specialty?: string;
    patient?: { _id?: string; fullName?: string } | null;
    billingMode?: 'per_month' | 'per_guide';
    totalSessions?: number;
    usedSessions?: number;
    sessionValue?: number | null;
    totalAuthorizedValue?: number | null;
    sessionsThisMonth?: number;
    pendingSessions: number;
    pendingValue: number;
    firstSessionDate?: string | Date | null;
    lastSessionDate?: string | Date | null;
    /** Data do último envio de documentação (guia + lista de presença) ao convênio via wizard — não é faturamento */
    documentationSentAt?: string | Date | null;
    /** Número da Nota Fiscal informada no envio de documentação (se houver) */
    invoiceNumber?: string | null;
    /** ID da comunicação de faturamento/documentação vinculada à guia (para reenvio) */
    communicationId?: string | null;
    /** Quantas sessões desta guia já entraram em algum InsuranceBatch (faturadas antes) — o que aparece pendente aqui é só a sobra */
    alreadyBilledSessions?: number;
    /** Data de criação do lote mais recente que já pegou sessão desta guia */
    lastBatchSentAt?: string | Date | null;
    /** Status atual da guia no InsuranceGuide (active/expired/cancelled/exhausted/...) */
    guideStatus?: string;
    /**
     * Rótulo visual do faturamento. NÃO é fonte de verdade e NÃO tem valor 'mixed':
     * quando a guia tem sessões em várias fases, isto mostra a MENOS avançada (a
     * próxima ação) e `hasMixedStates` sinaliza que os contadores contam o resto.
     * 'no_sessions' = guia sem nenhuma sessão concluída (ReadView V2).
     */
    billingState?: 'no_sessions' | 'pending' | 'documentation_sent' | 'billed' | 'received' | 'closed';
    /** ReadView V2: true quando há sessões em mais de uma fase ao mesmo tempo */
    hasMixedStates?: boolean;
    /** ReadView V2: contadores por fase — a verdade do ciclo financeiro */
    phaseCounters?: {
        total: number;
        pendingBilling: number;
        documentationSent: number;
        billed: number;
        received: number;
        outOfCycle: number;
    };
    /** ReadView V2: valores por fase */
    phaseAmounts?: {
        pendingAmount: number;
        documentationSentAmount: number;
        billedAmount: number;
        receivedAmount: number;
        totalAmount: number;
    };
    /** ReadView: breakdown calculado no backend, exclusivamente de pendingBilling. */
    competenceBreakdown?: {
        referenceMonth: string;
        current: { value: number; sessions: number };
        previous: { value: number; sessions: number; oldestCompetence?: string | null };
    };
    /** ReadView V2: true = documentationSentAt veio de updatedAt (proxy), não de campo de envio real */
    documentationSentAtIsProxy?: boolean;
    /**
     * Notas fiscais que cobrem as sessões desta guia. A NF vive no LOTE, e uma
     * guia faturada mês a mês aparece em várias notas — por isso é lista.
     */
    invoices?: {
        batchId: string;
        invoiceNumber: string | null;
        invoiceDate: string | Date | null;
        origin: 'current_billing' | 'legacy_reconciliation' | null;
        batchStatus: string | null;
        sessions: number;
        amount: number;
    }[];
    sessions?: PendingGuideSession[];
}

interface OrphanSession {
    paymentId?: string;
    sessionId?: string;
    date?: string | Date | null;
    time?: string | null;
    patient?: { fullName?: string } | null;
    specialty?: string;
    sessionValue?: number;
    authorizationCode?: string | null;
    insuranceProvider?: string;
}

interface GuidePendingBillingSectionProps {
    guides: PendingGuide[];
    selectedGuides: Set<string>;
    orphanSessions: OrphanSession[];
    orphanSessionsCount?: number;
    onLoadOrphanSessions?: () => Promise<void>;
    orphanSessionsLoading?: boolean;
    orphanSessionsError?: string | null;
    loading: boolean;
    onToggleGuide: (guideId: string) => void;
    onRefresh?: () => void;
    month?: string;
    /**
     * Abas estritamente de conferência (ex.: Recebidos): esconde seleção.
     * Faturados não é read-only porque permite comandar o recebimento.
     */
    readOnly?: boolean;
    /** Substantivo da fase exibida, ex.: "faturada(s)". Default: "para faturar". */
    phaseLabel?: string;
    /** Ação operacional exibida no rodapé fixo do drawer. */
    drawerAction?: 'send_documents' | 'bill' | 'receive';
    // Pode retornar (ou resolver para) `false` quando a ação falhou — o drawer
    // do paciente só fecha quando não é explicitamente `false`.
    onDrawerAction?: (guideIds: string[], billingCompetence?: string) => void | boolean | Promise<void | boolean>;
    onLoadGuideDetails?: (guideIds: string[]) => Promise<PendingGuide[]>;
    detailsLoading?: boolean;
    phase?: 'pendingBilling' | 'documentationSent' | 'billed' | 'received';
    /**
     * Recebido do pai (InsuranceTab), que já busca a lista para uso próprio.
     * Antes este componente chamava useConvenios() de novo, independente do
     * pai — dois fetches idênticos de GET /convenios?includeInactive=false a
     * cada montagem, sem nenhum cache/dedup no hook para evitar a duplicata.
     */
    convenios: Convenio[];
    loadingConvenios?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number | undefined) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const resolveProviderConvenio = (provider: string, convenios: Convenio[]) => {
    const normalized = provider.toLowerCase().trim();
    return convenios.find(convenio =>
        convenio.code.toLowerCase().trim() === normalized
        || convenio.name.toLowerCase().trim() === normalized
    );
};

const resolveSubmissionHint = (convenio?: Convenio) => {
    const policy = convenio?.guidePolicy;
    if (!policy) return 'Prazo de envio não informado';
    if (policy.renewalType === 'advance_authorization') {
        return policy.priorAuthRequestDay
            ? `Solicitar guia até dia ${policy.priorAuthRequestDay} do mês anterior`
            : 'Solicitação prévia — dia não informado';
    }
    if (policy.billingSubmissionDay) return `Enviar faturamento até dia ${policy.billingSubmissionDay}`;
    if (policy.billingDeadlineDays) return `Enviar em até ${policy.billingDeadlineDays} dias após o atendimento`;
    return 'Prazo de envio não informado';
};

const resolveGuideRule = (convenio?: Convenio) => {
    switch (convenio?.guidePolicy?.renewalType) {
        case 'advance_authorization':
            return 'Solicitação prévia';
        case 'until_consumed':
            return 'Válida até esgotar';
        case 'fixed_date':
            return 'Renova em data fixa';
        case 'authorization_validity':
            return 'Até vencer autorização';
        case 'end_of_month':
            return 'Renovação mensal';
        default:
            return 'Regra não informada';
    }
};

const resolveGuidePendingTotal = (guide: PendingGuide) => {
    const fromSessions = (guide.sessions || []).reduce((sum, s) => sum + (Number(s.value) || 0), 0);
    if (fromSessions > 0) return fromSessions;
    return Number(guide.pendingValue || 0);
};

const resolveGuideSessionValue = (guide: PendingGuide) => {
    const sessionValues = (guide.sessions || [])
        .map(s => Number(s.value) || 0)
        .filter(v => v > 0);
    if (sessionValues.length > 0) {
        return sessionValues.reduce((sum, v) => sum + v, 0) / sessionValues.length;
    }
    return Number(guide.sessionValue || 0);
};

const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
};

const formatProviderName = (slug: string) => {
    if (!slug || slug === 'nao_identificado' || slug === 'convenio') return 'Convênio s/ identificação';
    return slug
        .replace(/_/g, '-')
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace('Anapolis', 'Anápolis')
        .replace('Goiania', 'Goiânia')
        .replace('Sao ', 'São ')
        .replace('Saude', 'Saúde')
        .replace('Brasilia', 'Brasília');
};

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    const d = new Date(date);
    if (isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyChip({ days }: { days: number }) {
    if (days === 0) return <span className="text-xs text-gray-400">—</span>;
    const color  = days > 30 ? '#B91C1C' : days > 15 ? '#B45309' : '#6B7280';
    const bg     = days > 30 ? '#FEE2E2' : days > 15 ? '#FEF3C7' : '#F3F4F6';
    const prefix = days > 30 ? '🔴 ' : days > 15 ? '🟡 ' : '';
    return (
        <span style={{ background: bg, color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            {prefix}{days}d
        </span>
    );
}

const TH = { fontWeight: 600, fontSize: '0.72rem', color: '#9CA3AF', py: 1, textTransform: 'uppercase' as const, letterSpacing: '0.03em' };

function BillingModeBadge({ mode }: { mode?: 'per_month' | 'per_guide' }) {
    if (mode === 'per_guide') {
        return (
            <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                POR GUIA
            </span>
        );
    }
    return (
        <span style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            MENSAL
        </span>
    );
}

/**
 * Estado derivado do faturamento da guia, calculado no backend a partir de
 * InsuranceCommunication, InsuranceBatch, Payment.insurance.status e
 * InsuranceGuide.closedAt. Sem campo mutável `billingStatus` na guia.
 */
function getGuideBillingState(guide: PendingGuide): { emoji: string; label: string; bg: string; color: string; border: string } {
    const state = guide.billingState || 'pending';

    if (guide.guideStatus === 'cancelled') {
        return { emoji: '🔴', label: 'Guia cancelada · requer correção', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' };
    }

    switch (state) {
        case 'no_sessions':
            return { emoji: '⚪', label: 'Sem sessões concluídas', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' };
        case 'closed':
            return { emoji: '🔒', label: 'Guia finalizada', bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
        case 'received':
            return { emoji: '💰', label: 'Recebida do convênio', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
        case 'billed': {
            const dateLabel = guide.lastBatchSentAt ? ` · lote enviado em ${formatDate(guide.lastBatchSentAt)}` : '';
            return { emoji: '🟡', label: `Faturada${dateLabel}`, bg: '#FEFCE8', color: '#854D0E', border: '#FDE68A' };
        }
        case 'documentation_sent': {
            const nfLabel = guide.invoiceNumber ? `NF ${guide.invoiceNumber}` : 'NF não informada';
            return { emoji: '📤', label: `Documentação enviada · ${nfLabel} · ${formatDate(guide.documentationSentAt)}`, bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
        }
        case 'pending':
        default:
            return { emoji: '🟠', label: 'Aguardando primeiro faturamento', bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' };
    }
}

// ── Drawer de detalhes do paciente ───────────────────────────────────────────

interface PatientDrawerProps {
    open: boolean;
    patientName: string;
    provider: string;
    guides: PendingGuide[];
    selectedGuides: Set<string>;
    convenios: Convenio[];
    readOnly?: boolean;
    phaseLabel?: string;
    drawerAction?: 'send_documents' | 'bill' | 'receive';
    // Pode retornar (ou resolver para) `false` quando a ação falhou — o drawer
    // do paciente só fecha quando não é explicitamente `false`.
    onDrawerAction?: (guideIds: string[], billingCompetence?: string) => void | boolean | Promise<void | boolean>;
    phase?: 'pendingBilling' | 'documentationSent' | 'billed' | 'received';
    onToggleGuide: (guideId: string) => void;
    onEditGuide: (guide: PendingGuide) => void;
    onCloseGuide: (guide: PendingGuide) => void;
    onClose: () => void;
}

/**
 * Explica POR QUE uma guia ainda não tem lote, com base na regra de faturamento
 * do próprio convênio (guidePolicy) — não é atraso nem bug, cada convênio tem um
 * ciclo diferente (Anápolis fatura ao encerrar a guia, Campinas/Bradesco fecham
 * em data do mês, Fesp funciona por autorização prévia). Achado 2026-07-21: a
 * tela tratava "sem billingBatchId" como um estado só, escondendo que isso é
 * esperado dependendo do convênio e da data.
 */
function getBillingCycleReason(convenio: Convenio | undefined): string | null {
    const gp = convenio?.guidePolicy;
    if (!gp) return null;
    switch (gp.renewalType) {
        case 'until_consumed':
            return 'Fatura ao encerrar a guia';
        case 'end_of_month':
            return gp.billingSubmissionDay ? `Fecha faturamento dia ${gp.billingSubmissionDay}` : 'Fecha faturamento no fim do mês';
        case 'advance_authorization':
            return gp.priorAuthRequestDay ? `Autorização prévia até dia ${gp.priorAuthRequestDay} do mês anterior` : null;
        case 'fixed_date':
            return gp.renewalDayOfMonth ? `Fecha faturamento dia ${gp.renewalDayOfMonth} (fixo)` : null;
        default:
            return null;
    }
}

export function PatientDrawer({ open, patientName, provider, guides, selectedGuides, convenios, onToggleGuide, onEditGuide, onCloseGuide, onClose, readOnly = false, phaseLabel = 'para faturar', drawerAction, onDrawerAction, phase = 'pendingBilling' }: PatientDrawerProps) {
    const total = guides.reduce((s, g) => s + resolveGuidePendingTotal(g), 0);
    const sessions = guides.reduce((s, g) => s + ((g.pendingSessions && g.pendingSessions > 0) ? g.pendingSessions : (g.sessions || []).length), 0);
    const sessionAverage = (() => {
        const values = guides.flatMap(g => (g.sessions || []).map(s => Number(s.value) || 0)).filter(v => v > 0);
        if (values.length > 0) {
            return values.reduce((sum, v) => sum + v, 0) / values.length;
        }
        const first = guides.find(g => Number(g.sessionValue) > 0)?.sessionValue ?? 0;
        return Number(first || 0);
    })();
    const isReceiveMode = drawerAction === 'receive';
    const isDocumentMode = drawerAction === 'send_documents';
    const isBillingMode = drawerAction === 'bill';
    const isPerGuide = guides[0]?.billingMode === 'per_guide';
    const isAutomaticMonthlySelection = !isPerGuide && (isDocumentMode || isBillingMode);
    const phasePresentation = {
        pendingBilling: { title: 'A faturar · documentos pendentes', sessions: 'sessões a faturar', value: 'a faturar', color: '#6D28D9', bg: '#EDE9FE', border: '#C4B5FD' },
        documentationSent: { title: 'Documentos enviados · pronto para faturar', sessions: 'sessões documentadas', value: 'pronto para faturar', color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
        billed: { title: 'Faturados · aguardando recebimento', sessions: 'sessões faturadas', value: 'a receber', color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' },
        received: { title: 'Recebidos · conferência', sessions: 'sessões recebidas', value: 'recebido', color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' }
    }[phase];

    const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());

    const toggleGuideExpand = (guideId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExpandedGuides(prev => {
            const next = new Set(prev);
            if (next.has(guideId)) next.delete(guideId);
            else next.add(guideId);
            return next;
        });
    };

    // Nas fases 'billed'/'received' cada guia carrega a(s) NF(s) que a cobrem
    // (guide.invoices). Sem agrupar por NF, um paciente com vários tipos de
    // atendimento vira uma lista plana de guias sem relação visível entre si —
    // achado do usuário: "se a paciente tiver 10 tipos de atendimento diferente
    // em faturados vira um caos". Uma mesma guia pode aparecer em mais de um
    // grupo (faturada mês a mês, cada mês numa NF diferente); a seleção
    // continua por guideId inteiro, igual à lista plana — agrupar é só exibição.
    interface InvoiceGroup {
        key: string;
        invoiceNumber: string | null;
        invoiceDate: string | Date | null;
        guides: PendingGuide[];
        sessions: number;
        value: number;
    }
    const useInvoiceGrouping = (phase === 'billed' || phase === 'received') && !isAutomaticMonthlySelection;
    const invoiceGroups: InvoiceGroup[] = useInvoiceGrouping
        ? (() => {
            const byInvoice = new Map<string, InvoiceGroup>();
            guides.forEach(guide => {
                const guideInvoices = (guide.invoices && guide.invoices.length > 0)
                    ? guide.invoices
                    : [{ batchId: guide.guideId, invoiceNumber: null, invoiceDate: null, origin: null, batchStatus: null, sessions: guide.pendingSessions, amount: guide.pendingValue }];
                guideInvoices.forEach(nf => {
                    const key = nf.invoiceNumber || 'sem-nf';
                    if (!byInvoice.has(key)) {
                        byInvoice.set(key, { key, invoiceNumber: nf.invoiceNumber, invoiceDate: nf.invoiceDate, guides: [], sessions: 0, value: 0 });
                    }
                    const group = byInvoice.get(key)!;
                    if (!group.guides.some(g => g.guideId === guide.guideId)) group.guides.push(guide);
                    group.sessions += nf.sessions;
                    group.value += nf.amount;
                });
            });
            return [...byInvoice.values()].sort((a, b) => (a.invoiceNumber || '').localeCompare(b.invoiceNumber || ''));
        })()
        : [];

    const [expandedInvoiceGroups, setExpandedInvoiceGroups] = useState<Set<string>>(new Set());
    const toggleInvoiceGroup = (key: string) => setExpandedInvoiceGroups(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    });
    // Quando há só uma NF no paciente, o agrupamento não ajuda a desafogar
    // nada — abre direto pra não custar um clique extra à toa.
    useEffect(() => {
        if (invoiceGroups.length === 1) {
            setExpandedInvoiceGroups(new Set([invoiceGroups[0].key]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guides, phase]);

    const accentColor = isPerGuide ? '#059669' : '#D97706';
    const accentBg    = isPerGuide ? '#ECFDF5' : '#FFFBEB';
    const accentBorder = isPerGuide ? '#6EE7B7' : '#FDE68A';

    // A ReadView V2 soma sessões pendentes de TODAS as competências não
    // faturadas de uma guia mensal (o corte da leitura legada em 13/08 tirou o
    // escopo mensal implícito que existia antes disso). Este drawer agrupa por
    // competência em vez de colapsar tudo na mais antiga e descartar o resto —
    // achado 2026-08-17. Faturamento continua 1 NF por competência (regra de
    // negócio do convênio); só a exibição deixou de esconder o backlog.
    interface CompetenceGroup {
        competence: string;
        guides: PendingGuide[];
        sessions: number;
        value: number;
    }
    const competenceGroups: CompetenceGroup[] = isAutomaticMonthlySelection
        ? (() => {
            const byCompetence = new Map<string, PendingGuide[]>();
            guides.forEach(guide => {
                const sessionsByCompetence = new Map<string, PendingGuideSession[]>();
                (guide.sessions || []).forEach(session => {
                    const competence = String(session.date).slice(0, 7);
                    if (!/^\d{4}-\d{2}$/.test(competence)) return;
                    if (!sessionsByCompetence.has(competence)) sessionsByCompetence.set(competence, []);
                    sessionsByCompetence.get(competence)!.push(session);
                });
                sessionsByCompetence.forEach((competenceSessions, competence) => {
                    const dates = competenceSessions.map(s => s.date).sort();
                    const scopedGuide: PendingGuide = {
                        ...guide,
                        sessions: competenceSessions,
                        pendingSessions: competenceSessions.length,
                        pendingValue: competenceSessions.reduce((sum, s) => sum + Number(s.value || 0), 0),
                        firstSessionDate: dates[0],
                        lastSessionDate: dates[dates.length - 1]
                    };
                    if (!byCompetence.has(competence)) byCompetence.set(competence, []);
                    byCompetence.get(competence)!.push(scopedGuide);
                });
            });
            return [...byCompetence.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([competence, competenceGuides]) => ({
                    competence,
                    guides: competenceGuides,
                    sessions: competenceGuides.reduce((sum, g) => sum + (g.pendingSessions || 0), 0),
                    value: competenceGuides.reduce((sum, g) => sum + resolveGuidePendingTotal(g), 0)
                }));
        })()
        : [];

    // Seleção por checkbox igual ao modo por guia (achado do usuário: o modo
    // mensal não tinha checkbox nenhum, todas as sessões eram sempre "tudo
    // selecionado" e cada competência tinha seu próprio botão sempre ativo).
    // Como uma MESMA guia pode ter sessões pendentes em mais de uma
    // competência (backlog), a seleção aqui não pode ser só por guideId — usa
    // chave composta competência+guia, local a este drawer.
    const [scopedSelection, setScopedSelection] = useState<Set<string>>(new Set());
    const scopedKey = (competence: string, guideId: string) => `${competence}::${guideId}`;
    const allScopedEntries = competenceGroups.flatMap(group =>
        group.guides.map(guide => ({ competence: group.competence, guide }))
    );

    const allSelected = isAutomaticMonthlySelection
        ? allScopedEntries.length > 0 && allScopedEntries.every(e => scopedSelection.has(scopedKey(e.competence, e.guide.guideId)))
        : guides.length > 0 && guides.every(g => selectedGuides.has(g.guideId));
    const someSelected = isAutomaticMonthlySelection
        ? allScopedEntries.some(e => scopedSelection.has(scopedKey(e.competence, e.guide.guideId))) && !allSelected
        : guides.some(g => selectedGuides.has(g.guideId)) && !allSelected;
    const selectedScopedEntries = allScopedEntries.filter(e => scopedSelection.has(scopedKey(e.competence, e.guide.guideId)));
    const selectedHere = isAutomaticMonthlySelection ? selectedScopedEntries.map(e => e.guide) : guides.filter(g => selectedGuides.has(g.guideId));
    const selectedSessions = selectedHere.reduce((sum, guide) => sum + (guide.pendingSessions || 0), 0);
    const selectedValue = selectedHere.reduce((sum, guide) => sum + resolveGuidePendingTotal(guide), 0);

    const toggleAllGuides = () => {
        if (isAutomaticMonthlySelection) {
            setScopedSelection(allSelected
                ? new Set()
                : new Set(allScopedEntries.map(e => scopedKey(e.competence, e.guide.guideId))));
            return;
        }
        if (allSelected) {
            guides.forEach(g => onToggleGuide(g.guideId));
            return;
        }
        guides.filter(g => !selectedGuides.has(g.guideId)).forEach(g => onToggleGuide(g.guideId));
    };

    const toggleScopedGuide = (competence: string, guideId: string) => {
        const key = scopedKey(competence, guideId);
        setScopedSelection(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Um clique em "Enviar" pode juntar guias de competências diferentes (é
    // permitido marcar mais de uma) — mas o faturamento é 1 lote por
    // competência, então despacha uma chamada por competência representada
    // na seleção atual.
    const submitScopedSelection = () => {
        const byCompetence = new Map<string, string[]>();
        selectedScopedEntries.forEach(e => {
            if (!byCompetence.has(e.competence)) byCompetence.set(e.competence, []);
            byCompetence.get(e.competence)!.push(e.guide.guideId);
        });
        byCompetence.forEach((guideIds, competence) => onDrawerAction?.(guideIds, competence));
    };

    const renderGuideCard = (guide: PendingGuide, competence?: string) => {
        const isSelected  = isAutomaticMonthlySelection
            ? scopedSelection.has(scopedKey(competence!, guide.guideId))
            : selectedGuides.has(guide.guideId);
        const handleToggleSelected = () => isAutomaticMonthlySelection
            ? toggleScopedGuide(competence!, guide.guideId)
            : onToggleGuide(guide.guideId);
        const isExpanded  = expandedGuides.has(guide.guideId);
        const hasSessions = (guide.sessions || []).length > 0;
        const billingState = getGuideBillingState(guide);
        const convenio = convenios.find(c => c.code === guide.insurance);
        const cycleReason = guide.guideStatus !== 'cancelled' ? getBillingCycleReason(convenio) : null;
        const mostRecentSessionId = hasSessions
            ? guide.sessions!.reduce((latest, s) =>
                !latest || new Date(s.date).getTime() > new Date(latest.date).getTime() ? s : latest
            , guide.sessions![0]).sessionId
            : null;

        return (
            <Card key={guide.guideId} elevation={0} sx={{
                flexShrink: 0,
                border: isSelected ? '2px solid #3B82F6' : '1.5px solid #E2E8F0',
                borderRadius: 3,
                bgcolor: isSelected ? '#F0F9FF' : 'white',
                overflow: 'hidden',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
            }}>
                {/* Linha de cor lateral — reflete o estado de faturamento da guia */}
                <Box sx={{ height: 4, bgcolor: billingState.color }} />

                <Box sx={{ p: 1.75 }}>
                    {/* Row 1: checkbox + número + badge + valor */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            {!readOnly && (
                                <Checkbox
                                    checked={isSelected}
                                    onChange={handleToggleSelected}
                                    size="small"
                                    sx={{ p: 0.25, mt: 0.1 }}
                                />
                            )}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                    <Typography fontWeight="700" fontSize="0.9rem" color="#0F172A">
                                        Guia {guide.number}
                                    </Typography>
                                    <BillingModeBadge mode={guide.billingMode} />
                                    <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); onEditGuide(guide); }}
                                        sx={{ p: 0.25, color: '#94A3B8', '&:hover': { color: '#3B82F6', bgcolor: '#EFF6FF' } }}
                                        title="Editar guia"
                                    >
                                        <Pencil size={13} />
                                    </IconButton>
                                    {guide.billingMode === 'per_month' && guide.guideStatus !== 'cancelled' && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => { e.stopPropagation(); onCloseGuide(guide); }}
                                            sx={{ p: 0.25, color: '#94A3B8', '&:hover': { color: '#B45309', bgcolor: '#FEF3C7' } }}
                                            title="Finalizar guia (cancela agendamentos pendentes)"
                                        >
                                            <Lock size={13} />
                                        </IconButton>
                                    )}
                                </Box>
                                <Chip
                                    size="small"
                                    label={getSpecialtyLabel(guide.specialty || '')}
                                    sx={{ fontSize: '0.63rem', height: 17, bgcolor: '#F3F0FF', color: '#6D28D9', fontWeight: 600, mt: 0.5, letterSpacing: '0.01em' }}
                                />
                            </Box>
                        </Box>

                        {/* Valor + sessões a faturar */}
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight="800" fontSize="1.0rem" color="#0F172A">
                                {formatCurrency(resolveGuidePendingTotal(guide))}
                            </Typography>
                            <Typography fontSize="0.72rem" color="#64748B" fontWeight={600} mt={0.25}>
                                {guide.pendingSessions} sessõe{guide.pendingSessions !== 1 ? 's' : ''} {phaseLabel} · {formatCurrency(resolveGuideSessionValue(guide))}/sessão
                            </Typography>
                        </Box>
                    </Box>

                    {/* Row 2: estado único de faturamento (substitui a barra de progresso de sessões,
                        que confundia "sessão realizada" com "sessão faturada") + motivo do ciclo do
                        convênio (guia sem lote pode ser normal dependendo da regra — ver guidePolicy) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1.25 }}>
                        <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.6,
                            px: 1.25, py: 0.5,
                            bgcolor: billingState.bg,
                            border: `1px solid ${billingState.border}`,
                            borderRadius: 20,
                        }}>
                            <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>{billingState.emoji}</span>
                            <Typography fontSize="0.72rem" fontWeight={600} color={billingState.color}>
                                {billingState.label}
                            </Typography>
                        </Box>
                        {/* Notas fiscais que cobrem esta guia. Sem isto o card diz "Faturada"
                            sem dizer por qual documento — e uma guia faturada mês a mês está
                            em várias notas ao mesmo tempo. */}
                        {(guide.invoices || []).map(nf => (
                            <Box
                                key={nf.batchId}
                                title={`Lote ${nf.batchStatus || '—'}${nf.origin === 'legacy_reconciliation' ? ' · reconciliação de nota antiga' : ''}`}
                                sx={{
                                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                    px: 0.9, py: 0.35, borderRadius: 20,
                                    bgcolor: nf.origin === 'legacy_reconciliation' ? '#F5F3FF' : '#F8FAFC',
                                    border: `1px solid ${nf.origin === 'legacy_reconciliation' ? '#DDD6FE' : '#E2E8F0'}`
                                }}
                            >
                                <FileText size={11} color={nf.origin === 'legacy_reconciliation' ? '#6D28D9' : '#475569'} />
                                <Typography fontSize="0.66rem" fontWeight={700} color={nf.origin === 'legacy_reconciliation' ? '#6D28D9' : '#475569'}>
                                    {nf.invoiceNumber || 'NF não informada'}
                                </Typography>
                                <Typography fontSize="0.63rem" color="#94A3B8">
                                    {nf.sessions} sess · {formatCurrency(nf.amount)}
                                    {nf.invoiceDate ? ` · ${formatDate(nf.invoiceDate)}` : ''}
                                </Typography>
                            </Box>
                        ))}
                        {/* Composição por fase. O rótulo acima mostra só a próxima ação; numa guia
                            per_month faturada mês a mês, ele sozinho esconderia o que já foi faturado
                            e recebido. Aqui a guia conta a história inteira. */}
                        {guide.hasMixedStates && guide.phaseCounters && (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                {([
                                    { n: guide.phaseCounters.pendingBilling, label: 'a faturar', color: '#9A3412', bg: '#FFF7ED', border: '#FED7AA' },
                                    { n: guide.phaseCounters.documentationSent, label: 'doc. enviada', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
                                    { n: guide.phaseCounters.billed, label: 'faturada(s)', color: '#854D0E', bg: '#FEFCE8', border: '#FDE68A' },
                                    { n: guide.phaseCounters.received, label: 'recebida(s)', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
                                ] as const).filter(p => p.n > 0).map(p => (
                                    <Box
                                        key={p.label}
                                        sx={{
                                            px: 0.85, py: 0.3, borderRadius: 20,
                                            bgcolor: p.bg, border: `1px solid ${p.border}`,
                                        }}
                                    >
                                        <Typography fontSize="0.66rem" fontWeight={700} color={p.color}>
                                            {p.n} {p.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        {isReceiveMode && (
                            <Typography fontSize="0.7rem" color="#047857" fontWeight={700}>
                                Aguardando recebimento
                            </Typography>
                        )}
                        {isDocumentMode && (
                            <Typography fontSize="0.7rem" color="#6D28D9" fontWeight={700}>
                                Próxima ação: preparar faturamento
                            </Typography>
                        )}
                        {isBillingMode && (
                            <Typography fontSize="0.7rem" color="#1D4ED8" fontWeight={700}>
                                Próxima ação: continuar faturamento
                            </Typography>
                        )}
                        {phase === 'received' && (
                            <Typography fontSize="0.7rem" color="#047857" fontWeight={700}>
                                Recebimento concluído
                            </Typography>
                        )}
                        {!drawerAction && phase === 'pendingBilling' && cycleReason && (
                            <Typography fontSize="0.7rem" color="#94A3B8" fontStyle="italic">
                                {cycleReason}
                            </Typography>
                        )}
                    </Box>

                    {/* Row 3: período + expandir */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 0.25 }}>
                        {guide.firstSessionDate ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#94A3B8', fontSize: '0.73rem' }}>
                                <Calendar size={11} />
                                {formatDate(guide.firstSessionDate)}
                                {guide.lastSessionDate && guide.firstSessionDate !== guide.lastSessionDate &&
                                    <> → {formatDate(guide.lastSessionDate)}</>}
                            </Box>
                        ) : <Box />}

                        {hasSessions && (
                            <Box
                                onClick={(e) => toggleGuideExpand(guide.guideId, e)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    cursor: 'pointer', color: '#3B82F6', fontSize: '0.73rem', fontWeight: 600,
                                    '&:hover': { color: '#1D4ED8' }
                                }}
                            >
                                {isExpanded ? 'Ocultar sessões' : `Ver ${guide.sessions!.length} sessões`}
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </Box>
                        )}
                    </Box>

                    {/* A lista abaixo mostra só sessões PENDENTES (guide.sessions) — as já
                        faturadas em ciclos anteriores não entram aí, de propósito, pra não
                        reaparecer num lote novo. Essa linha existe só pra deixar visível que
                        a guia tem mais sessões do que a lista de pendentes mostra, sem precisar
                        ir atrás do lote antigo pra confirmar. */}
                    {phase === 'pendingBilling' && !!guide.alreadyBilledSessions && guide.alreadyBilledSessions > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.25, mt: 0.5, color: '#94A3B8', fontSize: '0.7rem', fontStyle: 'italic' }}>
                            + {guide.alreadyBilledSessions} sessõe{guide.alreadyBilledSessions !== 1 ? 's' : ''} já faturada{guide.alreadyBilledSessions !== 1 ? 's' : ''}
                            {guide.lastBatchSentAt ? ` em ${formatDate(guide.lastBatchSentAt)}` : ''} (não aparece{guide.alreadyBilledSessions !== 1 ? 'm' : ''} na lista abaixo)
                        </Box>
                    )}

                    {/* Sessões individuais */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 1.25, borderTop: '1px solid #F1F5F9', pt: 1.25 }}>
                            {guide.sessions!.map((s, sidx) => {
                                const isMostRecent = hasSessions && s.sessionId === mostRecentSessionId;
                                return (
                                    <Box key={s.sessionId || sidx} sx={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        py: 0.4, px: isMostRecent ? 0.75 : 0,
                                        borderRadius: 1.5,
                                        bgcolor: isMostRecent ? '#F0FDF4' : 'transparent',
                                        borderBottom: !isMostRecent && sidx < guide.sessions!.length - 1 ? '1px dashed #F1F5F9' : 'none'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{
                                                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                bgcolor: isMostRecent ? '#059669' : '#E2E8F0',
                                                color: isMostRecent ? '#fff' : '#64748B',
                                                fontSize: '0.62rem', fontWeight: 700
                                            }}>
                                                {sidx + 1}
                                            </Box>
                                            <Typography fontSize="0.78rem" color="#475569" fontWeight={500}>{formatDate(s.date)}{s.time ? ` ${s.time}` : ''}</Typography>
                                            {s.doctorName && (
                                                <Typography fontSize="0.71rem" color="#94A3B8">· {s.doctorName}</Typography>
                                            )}
                                            {isMostRecent && (
                                                <Typography fontSize="0.63rem" fontWeight={700} color="#059669" sx={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    mais recente
                                                </Typography>
                                            )}
                                        </Box>
                                        <Typography fontSize="0.78rem" fontWeight={700} color="#1E293B">
                                            {formatCurrency(s.value)}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Collapse>
                </Box>
            </Card>
        );
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{
            sx: { width: { xs: '100vw', sm: 620 }, display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC', overflow: 'hidden' }
        }}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <Box sx={{
                px: 3, pt: 3, pb: 2.5,
                background: `linear-gradient(135deg, ${accentBg} 0%, #fff 100%)`,
                borderBottom: `2px solid ${accentBorder}`,
                position: 'relative', flexShrink: 0
            }}>
                <IconButton
                    size="small" onClick={onClose}
                    sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(0,0,0,0.05)', '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' } }}
                >
                    <X size={16} />
                </IconButton>

                {/* Nome + convênio */}
                <Box sx={{ mb: 2 }}>
                    <Typography fontWeight="800" fontSize="1.15rem" color="#0F172A" lineHeight={1.2}>
                        {patientName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography fontSize="0.82rem" color={accentColor} fontWeight={700}>
                            {formatProviderName(provider)}
                        </Typography>
                        <BillingModeBadge mode={guides[0]?.billingMode} />
                    </Box>
                    {phasePresentation && (
                        <Box sx={{
                            display: 'inline-flex', mt: 1, px: 1.1, py: 0.4,
                            borderRadius: 10,
                            bgcolor: phasePresentation.bg,
                            border: `1px solid ${phasePresentation.border}`
                        }}>
                            <Typography fontSize="0.68rem" fontWeight={800} color={phasePresentation.color} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {phasePresentation.title}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Stats chips */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {[
                        { label: 'guias', value: guides.length },
                        { label: phasePresentation.sessions, value: sessions, blue: true },
                        { label: 'valor/sessão', value: formatCurrency(sessionAverage), blue: true },
                        { label: phasePresentation.value, value: formatCurrency(total), green: true },
                    ].map(stat => (
                        <Box key={stat.label} sx={{
                            px: 1.5, py: 0.75,
                            bgcolor: stat.green ? '#ECFDF5' : stat.blue ? '#EFF6FF' : 'white',
                            border: `1px solid ${stat.green ? '#A7F3D0' : stat.blue ? '#BFDBFE' : '#E2E8F0'}`,
                            borderRadius: 2,
                            textAlign: 'center',
                            minWidth: 60
                        }}>
                            <Typography fontWeight="700" fontSize="0.9rem" color={stat.green ? '#065F46' : stat.blue ? '#1D4ED8' : '#1E293B'}>
                                {stat.value}
                            </Typography>
                            <Typography fontSize="0.65rem" color="#64748B" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {stat.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* ── Selecionar todas ───────────────────────────────── */}
            <Box sx={{
                px: 3, py: 1.25,
                bgcolor: 'white',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0
            }}>
                {!readOnly && (
                    <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAllGuides}
                        size="small"
                        sx={{ p: 0.5 }}
                    />
                )}
                <Typography fontSize="0.8rem" color="#475569" fontWeight={500}>
                    {readOnly
                        ? `${guides.length} guia${guides.length !== 1 ? 's' : ''} nesta fase`
                        : allSelected ? 'Desmarcar todas as guias' : `Selecionar todas as guias (${isAutomaticMonthlySelection ? allScopedEntries.length : guides.length})`}
                </Typography>
            </Box>

            {/* ── Lista de guias — agrupada por competência no modo mensal,
                por NF nas fases faturado/recebido, flat no modo por guia
                (documentos pendentes). Seleção por checkbox em todos os casos. */}
            <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0, px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: isAutomaticMonthlySelection || useInvoiceGrouping ? 2 : 1.25 }}>
                {isAutomaticMonthlySelection ? competenceGroups.map(group => (
                    <Box key={group.competence}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', px: 0.5, mb: 1 }}>
                            <Typography fontSize="0.78rem" fontWeight={800} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Competência {group.competence}
                            </Typography>
                            <Typography fontSize="0.75rem" color="#64748B" fontWeight={600}>
                                {group.guides.length} guia{group.guides.length !== 1 ? 's' : ''} · {group.sessions} sessõe{group.sessions !== 1 ? 's' : ''} · {formatCurrency(group.value)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {group.guides.map(guide => renderGuideCard(guide, group.competence))}
                        </Box>
                    </Box>
                )) : useInvoiceGrouping ? invoiceGroups.map(group => {
                    const isGroupExpanded = expandedInvoiceGroups.has(group.key);
                    const groupSelectedCount = group.guides.filter(g => selectedGuides.has(g.guideId)).length;
                    const groupAllSelected = group.guides.length > 0 && groupSelectedCount === group.guides.length;
                    const groupSomeSelected = groupSelectedCount > 0 && !groupAllSelected;
                    return (
                        <Box key={group.key} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden', bgcolor: 'white', flexShrink: 0 }}>
                            <Box
                                onClick={() => toggleInvoiceGroup(group.key)}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                                    px: 1.5, py: 1.1, cursor: 'pointer',
                                    bgcolor: isGroupExpanded ? '#F8FAFC' : 'white',
                                    '&:hover': { bgcolor: '#F8FAFC' }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                    {!readOnly && (
                                        <Checkbox
                                            checked={groupAllSelected}
                                            indeterminate={groupSomeSelected}
                                            onClick={e => e.stopPropagation()}
                                            onChange={() => {
                                                const targets = groupAllSelected ? group.guides : group.guides.filter(g => !selectedGuides.has(g.guideId));
                                                targets.forEach(g => onToggleGuide(g.guideId));
                                            }}
                                            size="small"
                                            sx={{ p: 0.5 }}
                                        />
                                    )}
                                    <FileText size={15} color="#475569" style={{ flexShrink: 0 }} />
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography fontWeight={800} fontSize="0.85rem" color="#0F172A" noWrap>
                                            {group.invoiceNumber ? `NF ${group.invoiceNumber}` : 'Sem NF informada'}
                                        </Typography>
                                        <Typography fontSize="0.71rem" color="#64748B" fontWeight={500}>
                                            {group.guides.length} guia{group.guides.length !== 1 ? 's' : ''} · {group.sessions} sessõe{group.sessions !== 1 ? 's' : ''} · {formatCurrency(group.value)}
                                            {group.invoiceDate ? ` · ${formatDate(group.invoiceDate)}` : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                                {isGroupExpanded ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
                            </Box>
                            <Collapse in={isGroupExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, p: 1.25, pt: 0, bgcolor: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                                    {group.guides.map(guide => renderGuideCard(guide))}
                                </Box>
                            </Collapse>
                        </Box>
                    );
                }) : guides.map(guide => renderGuideCard(guide))}
            </Box>

            {/* Ação contextual: conclui a baixa sem obrigar o usuário a voltar à
                tela. Compartilhada pelos dois modos — no mensal, o clique
                despacha uma chamada por competência marcada na seleção
                (faturamento continua sendo 1 lote por competência). */}
            {drawerAction && !readOnly && (
                <Box sx={{
                    px: 2.5, py: 1.75,
                    bgcolor: 'white',
                    borderTop: '1px solid #CBD5E1',
                    boxShadow: '0 -6px 18px rgba(15,23,42,0.08)'
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                        <Box>
                            <Typography fontSize="0.82rem" fontWeight={800} color="#0F172A">
                                {selectedHere.length} guia{selectedHere.length !== 1 ? 's' : ''} · {selectedSessions} sessão{selectedSessions !== 1 ? 'ões' : ''}
                            </Typography>
                            <Typography fontSize="0.78rem" color={phasePresentation.color} fontWeight={700}>
                                {formatCurrency(selectedValue)} {phasePresentation.value}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {selectedHere.length > 0 && (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => isAutomaticMonthlySelection ? setScopedSelection(new Set()) : selectedHere.forEach(g => onToggleGuide(g.guideId))}
                                >
                                    Limpar
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                startIcon={isReceiveMode ? <CheckCircle size={16} /> : <Send size={16} />}
                                disabled={selectedHere.length === 0}
                                onClick={() => isAutomaticMonthlySelection ? submitScopedSelection() : onDrawerAction?.(selectedHere.map(g => g.guideId))}
                                sx={{
                                    bgcolor: isReceiveMode ? '#059669' : isBillingMode ? '#2563EB' : '#7C3AED',
                                    '&:hover': { bgcolor: isReceiveMode ? '#047857' : isBillingMode ? '#1D4ED8' : '#6D28D9' },
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {isReceiveMode
                                    ? 'Marcar como recebido'
                                    : isBillingMode
                                    ? 'Continuar faturamento'
                                    : 'Preparar faturamento'}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
}

// ── Componente principal ─────────────────────────────────────────────────────

const GuidePendingBillingSection = ({
    guides,
    selectedGuides,
    orphanSessions,
    orphanSessionsCount = orphanSessions.length,
    onLoadOrphanSessions,
    orphanSessionsLoading = false,
    orphanSessionsError = null,
    loading,
    onToggleGuide,
    onRefresh,
    month,
    readOnly = false,
    phaseLabel = 'para faturar',
    drawerAction,
    onDrawerAction,
    onLoadGuideDetails,
    detailsLoading = false,
    phase = 'pendingBilling',
    convenios,
    loadingConvenios = false,
}: GuidePendingBillingSectionProps) => {
    const [expandedProviders, setExpandedProviders]             = useState<Record<string, boolean>>({});
    const [expandedOrphanProviders, setExpandedOrphanProviders] = useState<Record<string, boolean>>({});
    const [drawerPatient, setDrawerPatient]                     = useState<{ name: string; provider: string; guides: PendingGuide[] } | null>(null);
    const [linking, setLinking]                                 = useState(false);
    const [createModal, setCreateModal]                         = useState<OrphanSession | null>(null);
    const [linkModal, setLinkModal]                             = useState<OrphanSession | null>(null);
    const [guideNumber, setGuideNumber]                         = useState('');
    const [previewModal, setPreviewModal]                       = useState<{ open: boolean; linked: any[]; skipped: any[] } | null>(null);
    const [editGuideModal, setEditGuideModal]                   = useState<PendingGuide | null>(null);
    const [editForm, setEditForm]                               = useState({ insurance: '', totalSessions: 1, sessionValue: 0 });
    const [savingGuide, setSavingGuide]                         = useState(false);
    const [closeGuideModal, setCloseGuideModal]               = useState<PendingGuide | null>(null);
    const [closingGuide, setClosingGuide]                     = useState(false);
    const selectionInsideDrawer = drawerAction === 'send_documents' || drawerAction === 'bill';
    const toggleProvider = (provider: string) => setExpandedProviders(prev => (
        prev[provider] ? {} : { [provider]: true }
    ));

    // Quando o filtro (número da guia/NF ou paciente, aplicado pelo pai antes
    // de `guides` chegar aqui) reduz o resultado a um único convênio, abre o
    // acordeon dele direto — sem isso quem já digitou o nome do paciente
    // ainda precisava clicar pra revelar a linha que o filtro já achou.
    useEffect(() => {
        const providers = new Set(guides.map(guide => guide.insurance || 'outros'));
        if (providers.size === 1) {
            setExpandedProviders({ [[...providers][0]]: true });
        }
    }, [guides]);
    const toggleOrphanProvider = async (p: string) => {
        if (orphanSessionsLoading) return;
        if (orphanSessions.length === 0 && orphanSessionsCount > 0 && onLoadOrphanSessions) {
            try { await onLoadOrphanSessions(); } catch { return; }
        }
        setExpandedOrphanProviders(prev => ({ ...prev, [p]: !prev[p] }));
    };

    const openDrawer = async (name: string, provider: string, patientGuides: PendingGuide[]) => {
        if (detailsLoading) return;
        if (onLoadGuideDetails && patientGuides.some(guide => (guide.sessions || []).length === 0)) {
            try {
                patientGuides = await onLoadGuideDetails(patientGuides.map(guide => guide.guideId));
            } catch {
                toast.error('Não foi possível carregar os detalhes das guias');
                return;
            }
        }
        // No faturamento novo, paciente e convênio são apenas navegação. A
        // seleção canônica acontece nas guias exibidas dentro deste drawer.
        if (selectionInsideDrawer) {
            selectedGuides.forEach(guideId => onToggleGuide(guideId));
        }
        // A ReadView V2 soma sessões pendentes de todas as competências não
        // faturadas (achado 2026-08-17) — o drawer mostra tudo, agrupado por
        // competência internamente (PatientDrawer), em vez de colapsar numa só
        // e descartar o resto.
        if (patientGuides.every(guide => (guide.sessions || []).length === 0)) {
            toast.info('Nenhuma sessão pendente encontrada para este paciente');
            return;
        }
        setDrawerPatient({ name, provider, guides: patientGuides });
    };

    // Mantém o drawer sincronizado após uma baixa/refresh. Se todas as guias
    // saírem do bucket billed, fecha o drawer em vez de exibir dados obsoletos.
    useEffect(() => {
        if (!drawerPatient) return;
        const currentGuides = guides.filter(g =>
            (g.insurance || 'outros') === drawerPatient.provider &&
            (g.patient?.fullName || 'Paciente não identificado') === drawerPatient.name
        );
        if (currentGuides.length === 0 || currentGuides.every(guide => (guide.sessions || []).length === 0)) {
            setDrawerPatient(null);
        } else if (currentGuides !== drawerPatient.guides) {
            setDrawerPatient(prev => prev ? { ...prev, guides: currentGuides } : null);
        }
    }, [guides]);

    const openEditGuide = (guide: PendingGuide) => {
        setEditGuideModal(guide);
        setEditForm({
            insurance: guide.insurance,
            totalSessions: guide.totalSessions || 1,
            sessionValue: guide.sessionValue || 0,
        });
    };

    const handleUpdateGuide = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editGuideModal) return;
        setSavingGuide(true);
        try {
            await updateGuide(editGuideModal.guideId, {
                insurance: editForm.insurance,
                totalSessions: editForm.totalSessions,
                sessionValue: editForm.sessionValue,
            });
            toast.success('Guia atualizada com sucesso!');
            setEditGuideModal(null);
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao atualizar guia');
        } finally {
            setSavingGuide(false);
        }
    };

    const handleAutoLinkPreview = async () => {
        if (linking) return;
        setLinking(true);
        try {
            const res = await previewAutoLinkOrphanSessions({ month });
            if (res.data.linkedCount === 0 && res.data.skippedCount === 0) {
                toast.info('Nenhuma sessão órfã encontrada.');
                return;
            }
            setPreviewModal({ open: true, linked: res.data.linked, skipped: res.data.skipped });
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao analisar vínculos automáticos');
        } finally {
            setLinking(false);
        }
    };

    const confirmAutoLink = async () => {
        if (linking) return;
        setLinking(true);
        try {
            const res = await autoLinkOrphanSessions({ month });
            setPreviewModal(null);
            if (res.data.linkedCount > 0) {
                toast.success(`${res.data.linkedCount} sessão(ões) vinculada(s) automaticamente a guias existentes.`);
                onRefresh?.();
            }
            if (res.data.skippedCount > 0) {
                toast.warn(`${res.data.skippedCount} sessão(ões) não puderam ser vinculadas automaticamente — crie guias manualmente.`);
            }
            if (res.data.linkedCount === 0 && res.data.skippedCount === 0) {
                toast.info('Nenhuma sessão órfã encontrada.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao vincular sessões');
        } finally {
            setLinking(false);
        }
    };

    const handleCreateGuide = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!createModal) return;
        const form = e.currentTarget;
        const formData = new FormData(form);
        try {
            await createGuideFromOrphan({
                sessionId: createModal.sessionId || '',
                number: String(formData.get('number') || ''),
                totalSessions: Number(formData.get('totalSessions')),
                expiresAt: String(formData.get('expiresAt')),
                sessionValue: createModal.sessionValue
            });
            toast.success('Guia criada e sessão vinculada com sucesso!');
            setCreateModal(null);
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao criar guia');
        }
    };

    const handleLinkToGuide = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!linkModal || !guideNumber.trim()) return;
        try {
            await linkOrphanSessionsToGuide({
                guideNumber: guideNumber.trim(),
                sessionIds: [linkModal.sessionId || '']
            });
            toast.success('Sessão vinculada à guia existente!');
            setLinkModal(null);
            setGuideNumber('');
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao vincular à guia');
        }
    };

    const handleCloseGuide = async () => {
        if (!closeGuideModal) return;
        setClosingGuide(true);
        try {
            const res = await encerrarGuia({ guideId: closeGuideModal.guideId });
            toast.success(res.data.message || 'Guia finalizada com sucesso');
            setCloseGuideModal(null);
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao finalizar guia');
        } finally {
            setClosingGuide(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (guides.length === 0 && orphanSessionsCount === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Send className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma guia pendente de faturamento
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Todas as guias com sessões realizadas já foram faturadas.
                </Typography>
            </div>
        );
    }

    // Agrupar: convênio → paciente
    const groupedGuides: Record<string, Record<string, PendingGuide[]>> = {};
    guides.forEach(guide => {
        const provider = guide.insurance || 'outros';
        const name     = guide.patient?.fullName || 'Paciente não identificado';
        if (!groupedGuides[provider]) groupedGuides[provider] = {};
        if (!groupedGuides[provider][name]) groupedGuides[provider][name] = [];
        groupedGuides[provider][name].push(guide);
    });

    // Ordenar convênios por maior valor total
    const sortedProviders = Object.entries(groupedGuides).sort(([, a], [, b]) => {
        const aT = Object.values(a).flat().reduce((s, g) => s + resolveGuidePendingTotal(g), 0);
        const bT = Object.values(b).flat().reduce((s, g) => s + resolveGuidePendingTotal(g), 0);
        return bT - aT;
    });

    // Agrupar órfãs por convênio
    const groupedOrphans: Record<string, OrphanSession[]> = {};
    orphanSessions.forEach(s => {
        const provider = s.insuranceProvider || 'outros';
        if (!groupedOrphans[provider]) groupedOrphans[provider] = [];
        groupedOrphans[provider].push(s);
    });

    return (
        <>
            <div className="space-y-3">
                {/* ── Resumo por convênio ─────────────────────────────────── */}
                {(() => {
                    const allFlat = Object.values(groupedGuides).flatMap(p => Object.values(p).flat());
                    const grandTotal = allFlat.reduce((s, g) => s + resolveGuidePendingTotal(g), 0);
                    const grandSess  = allFlat.reduce((s, g) => s + ((g.pendingSessions && g.pendingSessions > 0) ? g.pendingSessions : (g.sessions || []).length), 0);
                    const grandPats  = new Set(guides.map(g => g.patient?.fullName)).size;
                    return (
                        <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflowX: 'auto', mb: 0.5, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
                            <Box sx={{ px: 2.5, py: 1.1, minWidth: 1080, bgcolor: 'white', borderBottom: '1px solid #F1F5F9' }}>
                                <Typography fontSize="0.8rem" fontWeight={700} color="#334155">
                                    Convênios <Box component="span" sx={{ color: '#94A3B8', fontWeight: 500 }}>· clique em uma linha para ver pacientes e guias</Box>
                                </Typography>
                            </Box>
                            {/* Header */}
                            <Box sx={{ px: 2.5, py: 1.15, minWidth: 1080, bgcolor: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                                {!readOnly && !selectionInsideDrawer && <Box sx={{ width: 38, flexShrink: 0 }} />}
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Convênio</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 180, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Regra da guia</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 240, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prazo operacional</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 72, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pacientes</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 56, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guias</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 72, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessões</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 110, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</Typography>
                                <Box sx={{ width: 38, flexShrink: 0 }} />
                            </Box>

                            {/* Linhas */}
                            {sortedProviders.map(([provider, providerPatients], idx) => {
                                const allGuides    = Object.values(providerPatients).flat();
                                const total        = allGuides.reduce((s, g) => s + resolveGuidePendingTotal(g), 0);
                                const sessions     = allGuides.reduce((s, g) => s + ((g.pendingSessions && g.pendingSessions > 0) ? g.pendingSessions : (g.sessions || []).length), 0);
                                const patients     = Object.keys(providerPatients).length;
                                const allSelected  = allGuides.every(g => selectedGuides.has(g.guideId));
                                const someSelected = allGuides.some(g => selectedGuides.has(g.guideId)) && !allSelected;
                                const isExpanded   = !!expandedProviders[provider];
                                const providerMode = allGuides[0]?.billingMode;
                                const providerConvenio = resolveProviderConvenio(provider, convenios);
                                const guideRule = resolveGuideRule(providerConvenio);
                                const submissionHint = resolveSubmissionHint(providerConvenio);
                                const isPerGuide   = providerMode === 'per_guide';
                                const rowAccent    = isPerGuide ? '#10B981' : '#3B82F6';
                                const accentColor  = isPerGuide ? '#059669' : '#2563EB';
                                const sortedPatients = Object.entries(providerPatients).sort(([, ag], [, bg]) => {
                                    const aOld = ag.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                                    const bOld = bg.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                                    if (!aOld) return 1;
                                    if (!bOld) return -1;
                                    return String(aOld).localeCompare(String(bOld));
                                });
                                return (
                                    <Fragment key={provider}>
                                        <Box
                                            onClick={() => toggleProvider(provider)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    toggleProvider(provider);
                                                }
                                            }}
                                            sx={{
                                                px: 2.5, py: 1.35, minWidth: 1080,
                                                display: 'flex', alignItems: 'center',
                                                borderBottom: '1px solid #F1F5F9',
                                                borderLeft: `3px solid ${isExpanded ? rowAccent : 'transparent'}`,
                                                bgcolor: isExpanded ? (isPerGuide ? '#F0FDF4' : '#EFF6FF') : 'white',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                '&:hover': { bgcolor: isPerGuide ? '#F0FDF4' : '#EFF6FF', borderLeft: `3px solid ${rowAccent}` }
                                            }}
                                        >
                                            {!readOnly && !selectionInsideDrawer && (
                                                <Checkbox
                                                    checked={allSelected}
                                                    indeterminate={someSelected}
                                                    onChange={() => {
                                                        const targets = allSelected ? allGuides : allGuides.filter(g => !selectedGuides.has(g.guideId));
                                                        targets.forEach(g => onToggleGuide(g.guideId));
                                                    }}
                                                    onClick={event => event.stopPropagation()}
                                                    inputProps={{ 'aria-label': `${allSelected ? 'Desmarcar' : 'Selecionar'} todas as ${allGuides.length} guias de ${formatProviderName(provider)}` }}
                                                    size="small"
                                                    sx={{ p: 0.5, mr: 1 }}
                                                />
                                            )}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                <Typography fontWeight="700" fontSize="0.87rem" color="#0F172A">{formatProviderName(provider)}</Typography>
                                                <BillingModeBadge mode={providerMode} />
                                            </Box>
                                            <Box sx={{ width: 180, pr: 2 }}>
                                                <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.45, borderRadius: 999, bgcolor: providerConvenio ? '#EFF6FF' : '#F8FAFC' }}>
                                                    <Typography fontSize="0.7rem" fontWeight={700} color={providerConvenio ? '#1D4ED8' : '#64748B'} noWrap>
                                                        {guideRule}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ width: 240, pr: 2 }}>
                                                <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.1, py: 0.55, borderRadius: 1.5, bgcolor: providerConvenio ? '#FFF7ED' : '#F8FAFC', border: `1px solid ${providerConvenio ? '#FED7AA' : '#E2E8F0'}` }}>
                                                    <Typography fontSize="0.72rem" fontWeight={700} color={providerConvenio ? '#9A3412' : '#64748B'} noWrap>
                                                        {submissionHint}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Typography fontSize="0.83rem" color="#64748B" sx={{ width: 72, textAlign: 'center' }}>{patients}</Typography>
                                            <Typography fontSize="0.83rem" color="#64748B" sx={{ width: 56, textAlign: 'center' }}>{allGuides.length}</Typography>
                                            <Box sx={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                                                <Typography fontSize="0.83rem" fontWeight={700} color="#1D4ED8">{sessions}</Typography>
                                            </Box>
                                            <Typography fontWeight="800" fontSize="0.87rem" color="#0F172A" sx={{ width: 110, textAlign: 'right' }}>{formatCurrency(total)}</Typography>
                                            <Box sx={{ width: 30, ml: 1, color: '#94A3B8', display: 'flex', justifyContent: 'flex-end', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                                                <ChevronDown size={17} />
                                            </Box>
                                        </Box>

                                        <Collapse in={isExpanded}>
                                            <Box sx={{ bgcolor: '#FAFCFF', borderBottom: idx < sortedProviders.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                                                <Box sx={{ px: 2.5, py: 0.8, display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
                                                    {!readOnly && !selectionInsideDrawer && <Box sx={{ width: 38, flexShrink: 0 }} />}
                                                    <Typography fontSize="0.66rem" fontWeight={700} color="#94A3B8" sx={{ flex: 1, textTransform: 'uppercase' }}>Paciente</Typography>
                                                    <Typography fontSize="0.66rem" fontWeight={700} color="#94A3B8" sx={{ width: 56, textAlign: 'center', textTransform: 'uppercase' }}>Guias</Typography>
                                                    <Typography fontSize="0.66rem" fontWeight={700} color="#94A3B8" sx={{ width: 64, textAlign: 'center', textTransform: 'uppercase' }}>Sessões</Typography>
                                                    <Typography fontSize="0.66rem" fontWeight={700} color="#94A3B8" sx={{ width: 100, textAlign: 'right', textTransform: 'uppercase' }}>Valor</Typography>
                                                    <Typography fontSize="0.66rem" fontWeight={700} color="#94A3B8" sx={{ width: 72, textAlign: 'center', textTransform: 'uppercase' }}>Há</Typography>
                                                    <Box sx={{ width: 30 }} />
                                                </Box>
                                                {sortedPatients.map(([patientName, patientGuides], patientIndex) => {
                                                    const patientTotal = patientGuides.reduce((sum, guide) => sum + resolveGuidePendingTotal(guide), 0);
                                                    const patientSessions = patientGuides.reduce((sum, guide) => sum + Number(guide.pendingSessions || 0), 0);
                                                    const allPatientSelected = patientGuides.every(guide => selectedGuides.has(guide.guideId));
                                                    const somePatientSelected = patientGuides.some(guide => selectedGuides.has(guide.guideId)) && !allPatientSelected;
                                                    const oldest = patientGuides.map(guide => guide.firstSessionDate).filter(Boolean).sort()[0];
                                                    const initials = patientName.split(' ').slice(0, 2).map((name: string) => name[0]).join('').toUpperCase();
                                                    return (
                                                        <Box key={`${provider}__${patientName}`} onClick={() => openDrawer(patientName, provider, patientGuides)} sx={{ px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', cursor: 'pointer', borderBottom: patientIndex < sortedPatients.length - 1 ? '1px solid #F1F5F9' : 'none', bgcolor: (allPatientSelected || somePatientSelected) ? '#E0F2FE' : 'transparent', '&:hover': { bgcolor: '#F0F9FF' } }}>
                                                            {!readOnly && !selectionInsideDrawer && (
                                                                <Checkbox checked={allPatientSelected} indeterminate={somePatientSelected} onChange={() => {
                                                                    const targets = allPatientSelected ? patientGuides : patientGuides.filter(guide => !selectedGuides.has(guide.guideId));
                                                                    targets.forEach(guide => onToggleGuide(guide.guideId));
                                                                }} onClick={event => event.stopPropagation()} size="small" sx={{ p: 0.5, mr: 0.75 }} />
                                                            )}
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: isPerGuide ? '#ECFDF5' : '#EFF6FF', border: `1px solid ${isPerGuide ? '#6EE7B7' : '#BFDBFE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Typography fontSize="0.62rem" fontWeight={700} color={accentColor}>{initials}</Typography>
                                                                </Box>
                                                                <Typography fontSize="0.82rem" fontWeight={600} color="#1E293B" noWrap>{patientName}</Typography>
                                                            </Box>
                                                            <Typography fontSize="0.8rem" color="#64748B" sx={{ width: 56, textAlign: 'center' }}>{patientGuides.length}</Typography>
                                                            <Typography fontSize="0.8rem" fontWeight={700} color="#1D4ED8" sx={{ width: 64, textAlign: 'center' }}>{patientSessions}</Typography>
                                                            <Typography fontSize="0.82rem" fontWeight={700} color="#0F172A" sx={{ width: 100, textAlign: 'right' }}>{formatCurrency(patientTotal)}</Typography>
                                                            <Box sx={{ width: 72, display: 'flex', justifyContent: 'center' }}><UrgencyChip days={daysSince(oldest)} /></Box>
                                                            <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-end', color: '#94A3B8' }}><ChevronDown size={14} /></Box>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Collapse>
                                    </Fragment>
                                );
                            })}

                            {/* Rodapé total */}
                            {sortedProviders.length > 1 && (
                                <Box sx={{ px: 2.5, py: 1.45, minWidth: 1080, display: 'flex', alignItems: 'center', bgcolor: '#F8FAFC', borderTop: '1px solid #CBD5E1' }}>
                                    {!readOnly && <Box sx={{ width: 38, flexShrink: 0 }} />}
                                    <Typography fontSize="0.8rem" fontWeight={700} color="#475569" sx={{ flex: 1 }}>Total</Typography>
                                    <Box sx={{ width: 180 }} />
                                    <Box sx={{ width: 240 }} />
                                    <Typography fontSize="0.83rem" fontWeight={600} color="#475569" sx={{ width: 72, textAlign: 'center' }}>{grandPats}</Typography>
                                    <Typography fontSize="0.83rem" fontWeight={600} color="#475569" sx={{ width: 56, textAlign: 'center' }}>{allFlat.length}</Typography>
                                    <Box sx={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                                        <Typography fontSize="0.83rem" fontWeight={700} color="#1D4ED8">{grandSess}</Typography>
                                    </Box>
                                    <Typography fontWeight="800" fontSize="0.92rem" color="#0F172A" sx={{ width: 110, textAlign: 'right' }}>
                                        {formatCurrency(grandTotal)}
                                    </Typography>
                                    <Box sx={{ width: 38, flexShrink: 0 }} />
                                </Box>
                            )}
                        </Card>
                    );
                })()}

                {/* ── Sessões órfãs ───────────────────────────────────────── */}
                {orphanSessionsCount > 0 && (
                    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #FDE68A' }}>
                        <Box sx={{
                            px: 2.5, py: 1.75,
                            background: 'linear-gradient(90deg, #FEF3C7 0%, #FFFBEB 100%)',
                            borderBottom: '1px solid #FDE68A',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <Box>
                                <Typography fontWeight="700" fontSize="0.95rem" color="#92400E">
                                    ⚠️ Atendimentos sem guia vinculada
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {orphanSessionsCount} sessão{orphanSessionsCount !== 1 ? 's' : ''} · sem seleção em lote disponível
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {orphanSessions.length === 0 && (
                                    <Button size="small" variant="outlined" onClick={() => onLoadOrphanSessions?.()} disabled={orphanSessionsLoading}>
                                        {orphanSessionsLoading ? 'Carregando...' : orphanSessionsError ? 'Tentar novamente' : 'Ver atendimentos'}
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Wand2 size={14} />}
                                    onClick={handleAutoLinkPreview}
                                    disabled={linking || orphanSessionsLoading || orphanSessions.length === 0}
                                    sx={{ borderColor: '#D97706', color: '#D97706', fontSize: '0.75rem' }}
                                >
                                    {linking ? 'Analisando...' : 'Vincular automaticamente'}
                                </Button>
                                <Chip
                                    size="small"
                                    label={formatCurrency(orphanSessions.reduce((s, o) => s + (o.sessionValue || 0), 0))}
                                    sx={{ bgcolor: '#D97706', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}
                                />
                            </Box>
                        </Box>
                        {orphanSessionsError && <Typography sx={{ px: 2.5, py: 1 }} color="error" fontSize="0.8rem">{orphanSessionsError}</Typography>}

                        {Object.entries(groupedOrphans).map(([provider, sessions]) => {
                            const isExpanded = !!expandedOrphanProviders[provider];
                            const total      = sessions.reduce((s, o) => s + (o.sessionValue || 0), 0);
                            return (
                                <Box key={provider}>
                                    <Box
                                        onClick={() => toggleOrphanProvider(provider)}
                                        sx={{
                                            px: 2.5, py: 1.25,
                                            bgcolor: '#FFFBEB',
                                            borderBottom: '1px solid #FDE68A',
                                            borderTop: '1px solid #FDE68A',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: '#FEF3C7' },
                                        }}
                                    >
                                        <Typography fontWeight="700" fontSize="0.82rem" color="#B45309">
                                            {formatProviderName(provider)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {sessions.length} sessão{sessions.length !== 1 ? 's' : ''} · {formatCurrency(total)}
                                            </Typography>
                                            {isExpanded ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                                        </Box>
                                    </Box>
                                    <Collapse in={isExpanded}>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                                                        <TableCell sx={TH}>Paciente</TableCell>
                                                        <TableCell sx={TH}>Especialidade</TableCell>
                                                        <TableCell sx={TH}>Data</TableCell>
                                                        <TableCell align="right" sx={TH}>Valor</TableCell>
                                                        <TableCell align="right" sx={TH}>Ações</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {sessions.map((s, idx) => (
                                                        <TableRow key={s.sessionId || s.paymentId || idx}>
                                                            <TableCell>
                                                                <Typography fontSize="0.83rem" fontWeight={500} color="#374151">
                                                                    {s.patient?.fullName || '—'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography fontSize="0.8rem" color="#6B7280">
                                                                    {getSpecialtyLabel(s.specialty || '')}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography fontSize="0.8rem" color="#6B7280">
                                                                    {formatDate(s.date)}{s.time ? ` ${s.time}` : ''}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography fontWeight="700" fontSize="0.83rem" color="#D97706">
                                                                    {formatCurrency(s.sessionValue)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                                    <Button
                                                                        size="small"
                                                                        variant="text"
                                                                        startIcon={<Plus size={14} />}
                                                                        onClick={() => setCreateModal(s)}
                                                                        sx={{ fontSize: '0.7rem', color: '#D97706', minWidth: 'auto', px: 1 }}
                                                                    >
                                                                        Criar guia
                                                                    </Button>
                                                                    <Button
                                                                        size="small"
                                                                        variant="text"
                                                                        startIcon={<Link2 size={14} />}
                                                                        onClick={() => setLinkModal(s)}
                                                                        sx={{ fontSize: '0.7rem', color: '#2563EB', minWidth: 'auto', px: 1 }}
                                                                    >
                                                                        Vincular
                                                                    </Button>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </Card>
                )}
            </div>

            {/* Drawer de detalhes do paciente */}
            {drawerPatient && (
                <PatientDrawer
                    open={!!drawerPatient}
                    patientName={drawerPatient.name}
                    provider={drawerPatient.provider}
                    guides={drawerPatient.guides}
                    selectedGuides={selectedGuides}
                    convenios={convenios}
                    onToggleGuide={onToggleGuide}
                    onEditGuide={openEditGuide}
                    onCloseGuide={(guide) => setCloseGuideModal(guide)}
                    onClose={() => setDrawerPatient(null)}
                    readOnly={readOnly}
                    phaseLabel={phaseLabel}
                    drawerAction={drawerAction}
                    onDrawerAction={async (guideIds, competence) => {
                        if (detailsLoading) return;
                        const result = await onDrawerAction?.(guideIds, competence);
                        // Só fecha no sucesso — um erro (ex: convênio incompatível no
                        // Payment) precisa deixar a pessoa ver o que selecionou e
                        // tentar de novo, não voltar pra estaca zero sem aviso.
                        if (result !== false) setDrawerPatient(null);
                    }}
                    phase={phase}
                />
            )}

            {/* Modal: Criar guia a partir de sessão órfã */}
            <Dialog open={!!createModal} onClose={() => setCreateModal(null)} maxWidth="sm" fullWidth>
                <form onSubmit={handleCreateGuide}>
                    <DialogTitle>Criar guia para sessão órfã</DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Paciente: <strong>{createModal?.patient?.fullName || '—'}</strong><br />
                                Especialidade: <strong>{getSpecialtyLabel(createModal?.specialty || '')}</strong><br />
                                Valor: <strong>{formatCurrency(createModal?.sessionValue)}</strong>
                            </Typography>
                            <TextField name="number" label="Número da guia" required fullWidth />
                            <TextField name="totalSessions" label="Total de sessões" type="number" required fullWidth inputProps={{ min: 1 }} />
                            <TextField name="expiresAt" label="Validade" type="date" required fullWidth InputLabelProps={{ shrink: true }} />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateModal(null)}>Cancelar</Button>
                        <Button type="submit" variant="contained" sx={{ bgcolor: '#D97706' }}>Criar e vincular</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Modal: Vincular a guia existente */}
            <Dialog open={!!linkModal} onClose={() => { setLinkModal(null); setGuideNumber(''); }} maxWidth="sm" fullWidth>
                <form onSubmit={handleLinkToGuide}>
                    <DialogTitle>Vincular a guia existente</DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Paciente: <strong>{linkModal?.patient?.fullName || '—'}</strong><br />
                                Informe o ID ou número da guia existente.
                            </Typography>
                            <TextField
                                value={guideNumber}
                                onChange={(e) => setGuideNumber(e.target.value)}
                                label="Número ou ID da guia"
                                required
                                fullWidth
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { setLinkModal(null); setGuideNumber(''); }}>Cancelar</Button>
                        <Button type="submit" variant="contained" sx={{ bgcolor: '#2563EB' }}>Vincular</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Modal: Editar guia */}
            <Dialog open={!!editGuideModal} onClose={() => setEditGuideModal(null)} maxWidth="sm" fullWidth>
                <form onSubmit={handleUpdateGuide}>
                    <DialogTitle>Editar guia {editGuideModal?.number}</DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Paciente: <strong>{editGuideModal?.patient?.fullName || '—'}</strong>
                            </Typography>
                            <FormControl fullWidth>
                                <InputLabel>Convênio *</InputLabel>
                                <Select
                                    value={editForm.insurance}
                                    label="Convênio *"
                                    disabled={loadingConvenios}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, insurance: e.target.value as string }))}
                                >
                                    {convenios.map((c) => (
                                        <MenuItem key={c._id} value={c.code}>{c.name}</MenuItem>
                                    ))}
                                    {/* garante que o valor atual apareça mesmo se não estiver na lista de convênios ativos */}
                                    {!convenios.some(c => c.code === editForm.insurance) && editForm.insurance && (
                                        <MenuItem value={editForm.insurance}>{formatProviderName(editForm.insurance)}</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                            <TextField
                                label="Total de sessões autorizadas"
                                type="number"
                                required
                                fullWidth
                                inputProps={{ min: editGuideModal?.usedSessions || 1 }}
                                value={editForm.totalSessions}
                                onChange={(e) => setEditForm(prev => ({ ...prev, totalSessions: Number(e.target.value) }))}
                                helperText={editGuideModal?.usedSessions ? `${editGuideModal.usedSessions} sessões já utilizadas` : undefined}
                            />
                            <TextField
                                label="Valor da sessão (R$)"
                                type="number"
                                required
                                fullWidth
                                inputProps={{ min: 0, step: '0.01' }}
                                value={editForm.sessionValue}
                                onChange={(e) => setEditForm(prev => ({ ...prev, sessionValue: Number(e.target.value) }))}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditGuideModal(null)}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={savingGuide} sx={{ bgcolor: '#3B82F6' }}>
                            {savingGuide ? 'Salvando...' : 'Salvar alterações'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Modal: Pré-visualizar vínculos automáticos */}
            <Dialog open={previewModal?.open || false} onClose={() => setPreviewModal(null)} maxWidth="md" fullWidth>
                <DialogTitle>Confirmar vínculo automático</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {previewModal && previewModal.linked.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: '#92400E' }}>
                                    {previewModal.linked.length} sessão(ões) serão vinculadas
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                                                <TableCell sx={TH}>Paciente</TableCell>
                                                <TableCell sx={TH}>Especialidade</TableCell>
                                                <TableCell sx={TH}>Data</TableCell>
                                                <TableCell sx={TH}>Guia encontrada</TableCell>
                                                <TableCell align="center" sx={TH}>Sessões</TableCell>
                                                <TableCell align="right" sx={TH}>Validade</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {previewModal.linked.map((item: any) => (
                                                <TableRow key={item.sessionId}>
                                                    <TableCell>
                                                        <Typography fontSize="0.83rem" fontWeight={500} color="#374151">
                                                            {item.patientName || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontSize="0.8rem" color="#6B7280">
                                                            {getSpecialtyLabel(item.specialty || '')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontSize="0.8rem" color="#6B7280">
                                                            {formatDate(item.date)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontSize="0.8rem" fontWeight={600} color="#1D4ED8">
                                                            {item.guideNumber || '—'}
                                                        </Typography>
                                                        <Typography fontSize="0.75rem" color="#6B7280">
                                                            {formatProviderName(item.guideInsurance || '')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography fontSize="0.8rem" color="#6B7280">
                                                            {item.guideUsedSessions || 0} / {item.guideTotalSessions || 0}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontSize="0.8rem" color="#6B7280">
                                                            {formatDate(item.guideExpiresAt)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {previewModal && previewModal.skipped.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: '#B91C1C' }}>
                                    {previewModal.skipped.length} sessão(ões) não puderam ser vinculadas automaticamente
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                                                <TableCell sx={TH}>Paciente</TableCell>
                                                <TableCell sx={TH}>Especialidade</TableCell>
                                                <TableCell sx={TH}>Data</TableCell>
                                                <TableCell sx={TH}>Motivo</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {previewModal.skipped.map((item: any) => (
                                                <TableRow key={item.sessionId}>
                                                    <TableCell>
                                                        <Typography fontSize="0.83rem" fontWeight={500} color="#374151">
                                                            {item.patientName || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontSize="0.8rem" color="#6B7280">
                                                            {getSpecialtyLabel(item.specialty || '')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontSize="0.8rem" color="#6B7280">
                                                            {formatDate(item.date)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontSize="0.8rem" color="#B91C1C">
                                                            {item.reason || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewModal(null)}>Cancelar</Button>
                    <Button
                        onClick={confirmAutoLink}
                        variant="contained"
                        disabled={linking || (previewModal?.linked.length || 0) === 0}
                        sx={{ bgcolor: '#D97706' }}
                    >
                        {linking ? 'Vinculando...' : `Confirmar vínculo (${previewModal?.linked.length || 0})`}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Modal: Confirmar finalização da guia */}
            <Dialog open={!!closeGuideModal} onClose={() => setCloseGuideModal(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Finalizar guia {closeGuideModal?.number}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Finaliza o ciclo desta guia. Ao finalizar a guia <strong>{closeGuideModal?.number}</strong>, todos os
                            agendamentos pendentes vinculados a ela serão cancelados automaticamente — incluindo
                            sessões futuras agendadas.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Eles não poderão ser realizados nem faturados posteriormente nesta guia.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Paciente: <strong>{closeGuideModal?.patient?.fullName || '—'}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Agendamentos pendentes: <strong>{closeGuideModal?.pendingSessions || 0}</strong>
                        </Typography>
                        <Typography variant="body2" color="error" sx={{ bgcolor: '#FEF2F2', p: 1.5, borderRadius: 1 }}>
                            ⚠️ Essa ação não pode ser desfeita. Só finalize a guia quando tiver certeza de que nenhuma
                            sessão futura dela será realizada.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCloseGuideModal(null)} disabled={closingGuide}>Cancelar</Button>
                    <Button
                        onClick={handleCloseGuide}
                        variant="contained"
                        disabled={closingGuide}
                        sx={{ bgcolor: '#B45309' }}
                    >
                        {closingGuide ? 'Finalizando...' : 'Finalizar guia'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reenvio NÃO mora aqui: o ponto único de envio/reenvio é a aba "Envios",
                que lista tanto o que já saiu quanto o que nunca foi enviado. Esta seção
                só informa o estado da guia. */}
        </>
    );
};

export default GuidePendingBillingSection;
