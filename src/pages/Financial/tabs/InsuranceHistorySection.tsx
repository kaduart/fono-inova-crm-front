// src/pages/Financial/tabs/InsuranceHistorySection.tsx
// Histórico de convênios — navegação 3 níveis: Convênio → Paciente → Especialidade

import {
    Box,
    CircularProgress,
    MenuItem,
    Select,
    Typography,
    TextField,
    FormControl,
    Button,
    Collapse,
    Chip,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Menu,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { TrendingUp, Download, ChevronRight, ChevronDown, SlidersHorizontal, X, ArrowLeft, Search, MoreVertical, Wallet, UserX, UserCheck } from 'lucide-react';
import InsurancePatientDrawer from '../components/InsurancePatientDrawer';
import BreakdownDetailsModal, { BreakdownRow } from '../components/BreakdownDetailsModal';
import { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { getInsuranceHistory, InsuranceHistoryMonth, getPatientInsuranceSessions, InsurancePatientSession, BILLING_MODEL, BillingModel } from '../../../services/paymentService';
import appointmentService from '../../../services/appointmentService';
import { getSpecialtyLabel } from '../../../constants/specialties';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtMonthShort(monthKey: string) {
    if (!monthKey || monthKey === 'all') return '-';
    const [y, m] = monthKey.split('-');
    return `${m}/${y}`;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending_batch:   { label: 'Aguardando Lote',  color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
    billed:          { label: 'Faturado',         color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
    received:        { label: 'Recebido',         color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
    partial_billed:  { label: 'Parcialmente Faturado', color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
    partial_received:{ label: 'Parcialmente Recebido', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
    mixed:           { label: 'Misto',            color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
};

function computeGuideStatus(sessions: InsurancePatientSession[]) {
    const statuses = new Set(sessions.map(s => s.billingStatus).filter(Boolean));
    if (statuses.size === 0) return 'pending_batch';
    if (statuses.size === 1) return sessions[0].billingStatus;
    const hasReceived = statuses.has('received');
    const hasBilled = statuses.has('billed');
    const hasPending = statuses.has('pending_batch');
    if (hasReceived && (hasBilled || hasPending)) return 'partial_received';
    if (hasBilled && hasPending) return 'partial_billed';
    return 'mixed';
}

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.pending_batch;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: s.bg, color: s.color }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
}

interface MetricStatsProps {
    production: number; billed: number; received: number; pending: number;
    onStatClick?: (label: 'Produção' | 'Faturado' | 'Recebido' | 'Pendente') => void;
}
function MetricStats({ production, billed, received, pending, onStatClick }: MetricStatsProps) {
    const stats = [
        { label: 'Produção' as const, value: production, color: '#6366F1', bg: '#F5F3FF' },
        { label: 'Faturado' as const, value: billed,     color: '#3B82F6', bg: '#EFF6FF' },
        { label: 'Recebido' as const, value: received,   color: '#10B981', bg: '#F0FDF4' },
        { label: 'Pendente' as const, value: pending,    color: '#F59E0B', bg: '#FFFBEB' },
    ];
    return (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {stats.map(s => (
                <Box
                    key={s.label}
                    onClick={() => onStatClick?.(s.label)}
                    sx={{
                        flex: '1 1 120px', px: 2, py: 1.5,
                        bgcolor: s.bg, borderRadius: 2,
                        borderTop: `3px solid ${s.color}`,
                        cursor: onStatClick ? 'pointer' : 'default',
                        transition: 'box-shadow 0.15s, transform 0.15s',
                        '&:hover': onStatClick ? { boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' } : undefined,
                    }}
                >
                    <Typography fontSize="0.67rem" fontWeight={700} color="#94A3B8" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                        {s.label}
                    </Typography>
                    <Typography fontSize="0.92rem" fontWeight={800} color="#0F172A">{fmtBRL(s.value)}</Typography>
                    {production > 0 && (
                        <Typography fontSize="0.65rem" fontWeight={600} color={s.color}>
                            {((s.value / production) * 100).toFixed(0)}%
                        </Typography>
                    )}
                    {onStatClick && (
                        <Typography fontSize="0.62rem" fontWeight={700} color={s.color} sx={{ mt: 0.5 }}>
                            Ver detalhes →
                        </Typography>
                    )}
                </Box>
            ))}
        </Box>
    );
}

// ── Tipos internos ─────────────────────────────────────────────────────────

interface FlatRow {
    monthKey: string;
    month: string;
    provider: string;
    providerSlug?: string;
    patientId?: string;
    patientName: string;
    patientPhone?: string;
    specialty: string;
    sessions: number;
    value: number;
    status: string;
}

interface ProviderSummary {
    provider: string;
    sessions: number;
    producao: number;
    faturado: number;
    recebido: number;
    pendente: number;
    /** Envio mais recente pra faturamento (mais recente entre os meses/guias filtrados) */
    lastSentAt: string | null;
}

interface PatientSummary {
    name: string;
    patientId?: string;
    phone?: string;
    sessions: number;
    value: number;
    status: string;
}

// ── Linha expansível com sessões individuais ───────────────────────────────

interface PatientSessionDetailsProps {
    rows: FlatRow[];
    patientId?: string;
    provider?: string;
}

function fmtDateTime(iso: string, time?: string | null) {
    if (!iso) return '-';
    const d = new Date(iso);
    const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return time ? `${date} ${time}` : date;
}

function fmtDateShort(iso?: string | Date | null) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function PatientSessionDetails({ rows, patientId, provider }: PatientSessionDetailsProps) {
    // Tabs por especialidade
    const specialtyTabs = useMemo(() => {
        const seen = new Map<string, FlatRow>();
        rows.forEach(r => { if (!seen.has(r.specialty)) seen.set(r.specialty, r); });
        return [...seen.values()].sort((a, b) => getSpecialtyLabel(a.specialty).localeCompare(getSpecialtyLabel(b.specialty), 'pt-BR'));
    }, [rows]);

    const [activeSpecialty, setActiveSpecialty] = useState<string>(specialtyTabs[0]?.specialty || '');

    useEffect(() => {
        if (specialtyTabs.length && !specialtyTabs.some(t => t.specialty === activeSpecialty)) {
            setActiveSpecialty(specialtyTabs[0].specialty);
        }
    }, [specialtyTabs, activeSpecialty]);

    // Cache de respostas por chave estável
    interface CachedResponse {
        data: InsurancePatientSession[];
        billingModel: BillingModel;
        groups: import('../../../services/paymentService').InsurancePatientSessionGroup[];
    }
    const [cacheByKey, setCacheByKey] = useState<Record<string, CachedResponse>>({});
    const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({});
    const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});

    // Menu de ações por sessão
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuSession, setMenuSession] = useState<InsurancePatientSession | null>(null);
    const menuSessionRef = useRef<InsurancePatientSession | null>(null);

    // Diálogo de motivo para não remunerar profissional
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogReason, setDialogReason] = useState('');
    const [dialogLoading, setDialogLoading] = useState(false);

    // Menu de ações por GUIA (não remunerar/reabilitar todas as sessões)
    const [guideMenuAnchor, setGuideMenuAnchor] = useState<HTMLElement | null>(null);
    const [guideMenuGroup, setGuideMenuGroup] = useState<import('../../../services/paymentService').InsurancePatientSessionGroup | null>(null);
    const guideMenuGroupRef = useRef<import('../../../services/paymentService').InsurancePatientSessionGroup | null>(null);
    const [guideDialogOpen, setGuideDialogOpen] = useState(false);
    const [guideDialogReason, setGuideDialogReason] = useState('');
    const [guideDialogLoading, setGuideDialogLoading] = useState(false);

    const activeRow = useMemo(
        () => specialtyTabs.find(r => r.specialty === activeSpecialty),
        [specialtyTabs, activeSpecialty]
    );

    useEffect(() => {
        if (!patientId || !activeRow) return;
        const key = `${patientId}__${activeRow.monthKey}__${activeRow.specialty}`;
        if (cacheByKey[key] || loadingByKey[key]) return;

        setLoadingByKey(prev => ({ ...prev, [key]: true }));
        setErrorByKey(prev => ({ ...prev, [key]: '' }));
        getPatientInsuranceSessions({
            patientId,
            month: activeRow.monthKey,
            specialty: activeRow.specialty,
            provider,
            status: activeRow.status
        })
            .then(res => {
                setCacheByKey(prev => ({
                    ...prev,
                    [key]: {
                        data: res.data.data || [],
                        billingModel: res.data.billingModel || 'current',
                        groups: res.data.groups || []
                    }
                }));
            })
            .catch((err: unknown) => {
                console.error('[PatientSessionDetails] Erro ao carregar sessões:', err);
                const apiError = err as { response?: { data?: { error?: string } } } | undefined;
                const message = apiError?.response?.data?.error
                    || (err instanceof Error ? err.message : String(err));
                setErrorByKey(prev => ({ ...prev, [key]: message || 'Erro ao carregar sessões' }));
            })
            .finally(() => {
                setLoadingByKey(prev => ({ ...prev, [key]: false }));
            });
    }, [patientId, activeRow, provider]);

    const key = activeRow ? `${patientId}__${activeRow.monthKey}__${activeRow.specialty}` : '';
    const cached = key ? cacheByKey[key] : null;
    const billingModel = cached?.billingModel || 'current';
    const groups = cached?.groups || [];
    const isLoading = key ? loadingByKey[key] : false;
    const error = key ? errorByKey[key] : '';

    // Total do rodapé bate com os grupos renderizados.
    const totalSessions = groups.reduce((s, g) => s + (g.summary?.sessions ?? g.sessions.length), 0);
    const total = groups.reduce((s, g) => s + (g.summary?.grossAmount ?? g.total ?? 0), 0);

    function handleOpenMenu(event: React.MouseEvent<HTMLElement>, s: InsurancePatientSession) {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
        setMenuSession(s);
        menuSessionRef.current = s;
    }

    function handleCloseMenu() {
        setMenuAnchor(null);
    }

    function handleToggleDialog() {
        const s = menuSessionRef.current;
        if (!s) return;
        setDialogReason(s.professionalPaymentOverride?.reason || '');
        setDialogOpen(true);
        handleCloseMenu();
    }

    function handleCloseDialog() {
        setDialogOpen(false);
        setDialogReason('');
        setMenuSession(null);
        menuSessionRef.current = null;
    }

    // ── Ações por GUIA ───────────────────────────────────────────────────────

    function handleOpenGuideMenu(event: React.MouseEvent<HTMLElement>, group: import('../../../services/paymentService').InsurancePatientSessionGroup) {
        event.stopPropagation();
        setGuideMenuAnchor(event.currentTarget);
        setGuideMenuGroup(group);
        guideMenuGroupRef.current = group;
    }

    function handleCloseGuideMenu() {
        setGuideMenuAnchor(null);
    }

    function handleToggleGuideDialog() {
        const g = guideMenuGroupRef.current;
        if (!g) return;
        setGuideDialogReason('');
        setGuideDialogOpen(true);
        handleCloseGuideMenu();
    }

    function handleCloseGuideDialog() {
        setGuideDialogOpen(false);
        setGuideDialogReason('');
        setGuideMenuGroup(null);
        guideMenuGroupRef.current = null;
    }

    async function handleSaveGuideProfessionalPaymentStatus() {
        const g = guideMenuGroupRef.current;
        console.log('[PPS-GUIA] handleSave chamado', { group: g, reason: guideDialogReason });
        if (!g || g.sessions.length === 0) {
            toast.error('Guia não identificada. Tente novamente.');
            return;
        }
        const targetStatus: 'payable' | 'non_payable' = g.sessions.every(s => s.professionalPaymentStatus === 'non_payable') ? 'payable' : 'non_payable';
        if (targetStatus === 'non_payable' && !guideDialogReason.trim()) {
            toast.error('Informe o motivo para não remunerar o profissional.');
            return;
        }

        setGuideDialogLoading(true);
        const reason = guideDialogReason.trim();
        const successList: string[] = [];
        const errorList: string[] = [];

        try {
            await Promise.all(g.sessions.map(async (s) => {
                if (!s.appointmentId) return;
                try {
                    await appointmentService.updateProfessionalPaymentStatus(s.appointmentId, {
                        status: targetStatus,
                        reason: targetStatus === 'non_payable' ? reason : 'Habilitado pelo usuário'
                    });
                    successList.push(s.sessionId);
                } catch (err: any) {
                    console.error('[PPS-GUIA] Erro em sessão', s.sessionId, err);
                    errorList.push(s.sessionId);
                }
            }));

            if (errorList.length > 0) {
                toast.warning(`${successList.length} sessão(ões) alterada(s), ${errorList.length} com erro.`);
            } else {
                toast.success(targetStatus === 'non_payable'
                    ? 'Profissional não será remunerado pelas sessões desta guia.'
                    : 'Profissional voltará a ser remunerado pelas sessões desta guia.');
            }

            // Atualiza o cache local
            setCacheByKey(prev => {
                const next = { ...prev };
                if (!next[key]) return prev;
                next[key] = {
                    ...next[key],
                    groups: next[key].groups.map(gr => {
                        const sameGuide = g.type === 'guide' && gr.guideNumber === g.guideNumber;
                        const sameBatch = g.type === 'batch' && gr.batchId === g.batchId;
                        if (!sameGuide && !sameBatch) return gr;
                        return {
                            ...gr,
                            sessions: gr.sessions.map(sess =>
                                successList.includes(sess.sessionId)
                                    ? {
                                        ...sess,
                                        professionalPaymentStatus: targetStatus,
                                        professionalPaymentOverride: targetStatus === 'non_payable'
                                            ? { excluded: true, reason, excludedAt: new Date().toISOString(), excludedBy: '' }
                                            : null
                                    }
                                    : sess
                            )
                        };
                    })
                };
                return next;
            });
            handleCloseGuideDialog();
        } catch (err: any) {
            console.error('[PPS-GUIA] Erro ao alterar remuneração da guia:', err);
            toast.error('Erro ao alterar remuneração das sessões da guia.');
        } finally {
            setGuideDialogLoading(false);
        }
    }

    async function handleSaveProfessionalPaymentStatus() {
        const s = menuSessionRef.current;
        console.log('[PPS] handleSave chamado', { session: s, dialogReason });
        if (!s || !s.appointmentId) {
            console.warn('[PPS] Sem sessão ou appointmentId');
            toast.error('Sessão não identificada. Tente novamente.');
            return;
        }
        const isNonPayable = s.professionalPaymentStatus === 'payable';
        if (isNonPayable && !dialogReason.trim()) {
            toast.error('Informe o motivo para não remunerar o profissional.');
            return;
        }

        setDialogLoading(true);
        try {
            console.log('[PPS] Chamando API', { appointmentId: s.appointmentId, status: isNonPayable ? 'non_payable' : 'payable' });
            const res = await appointmentService.updateProfessionalPaymentStatus(s.appointmentId, {
                status: isNonPayable ? 'non_payable' : 'payable',
                reason: isNonPayable ? dialogReason.trim() : 'Habilitado pelo usuário'
            });
            console.log('[PPS] API resposta', res.data);
            toast.success(isNonPayable ? 'Profissional não será remunerado por esta sessão.' : 'Profissional voltará a ser remunerado por esta sessão.');
            // Atualiza o cache local
            setCacheByKey(prev => {
                const next = { ...prev };
                if (!next[key]) return prev;
                next[key] = {
                    ...next[key],
                    groups: next[key].groups.map(g => ({
                        ...g,
                        sessions: g.sessions.map(sess =>
                            sess.sessionId === s.sessionId
                                ? {
                                    ...sess,
                                    professionalPaymentStatus: isNonPayable ? 'non_payable' : 'payable',
                                    professionalPaymentOverride: isNonPayable
                                        ? { excluded: true, reason: dialogReason.trim(), excludedAt: new Date().toISOString(), excludedBy: '' }
                                        : null
                                }
                                : sess
                        )
                    }))
                };
                return next;
            });
            handleCloseDialog();
        } catch (err: any) {
            console.error('[PPS] Erro ao alterar remuneração:', err);
            toast.error(err?.response?.data?.error || 'Erro ao alterar remuneração do profissional.');
        } finally {
            setDialogLoading(false);
        }
    }

    if (rows.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Nenhum registro encontrado.</Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Tabs
                value={activeSpecialty}
                onChange={(_, v) => setActiveSpecialty(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2, minHeight: 40, '& .MuiTabs-flexContainer': { gap: 1 } }}
            >
                {specialtyTabs.map(t => (
                    <Tab
                        key={t.specialty}
                        value={t.specialty}
                        label={
                            <Box sx={{ textAlign: 'left', lineHeight: 1.2 }}>
                                <Typography fontSize="0.8rem" fontWeight={700}>{getSpecialtyLabel(t.specialty)}</Typography>
                                <Typography fontSize="0.65rem" color="text.secondary">{t.sessions} sess · {fmtBRL(t.value)}</Typography>
                            </Box>
                        }
                        sx={{ textTransform: 'none', minHeight: 44, px: 1.5 }}
                    />
                ))}
            </Tabs>

            {isLoading && (
                <Box className="flex items-center gap-2 py-4 text-gray-500 text-xs">
                    <CircularProgress size={14} />
                    Carregando sessões...
                </Box>
            )}
            {error && <Box className="text-red-600 text-xs py-2">{error}</Box>}
            {!isLoading && !error && groups.length === 0 && (
                <Box className="text-gray-400 text-xs py-4">Nenhuma sessão encontrada.</Box>
            )}

            {billingModel === BILLING_MODEL.LEGACY_MONTHLY_BATCH && groups.length > 0 && (
                <Box sx={{ mb: 1.5, px: 1 }}>
                    <Chip
                        size="small"
                        label="Modelo legado: guia reutilizada em múltiplos lotes"
                        sx={{ height: 20, fontSize: '0.62rem', bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700 }}
                    />
                </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {groups.map((group, gidx) => (
                    <Accordion
                        key={group.type === 'batch' ? `${group.batchId}-${group.guideNumber}` : group.guideNumber}
                        defaultExpanded={gidx === 0}
                        elevation={0}
                        sx={{
                            border: '1.5px solid #E2E8F0',
                            borderRadius: '12px !important',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            '&:before': { display: 'none' },
                            '&.Mui-expanded': { margin: 0 }
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ChevronDown size={18} color="#64748B" />}
                            sx={{
                                px: 2,
                                py: 0.5,
                                minHeight: 52,
                                '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center' }
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography fontWeight={700} fontSize="0.85rem" color="#0F172A">
                                    {group.type === 'batch' && (group.batchNumber || group.batchId)
                                        ? `Lote ${group.batchNumber || group.batchId}`
                                        : group.type === 'batch'
                                        ? `Competência ${fmtMonthShort(group.competenceMonth || '')}`
                                        : `Guia ${group.guideNumber || 'sem número'}`}
                                </Typography>
                                <Typography fontSize="0.68rem" color="#64748B">
                                    {group.type === 'batch' && group.guideNumber && (
                                        <>Guia {group.guideNumber} · </>
                                    )}
                                    {group.type === 'batch' && group.sentDate && (
                                        <>Enviado {fmtDateShort(group.sentDate)} · </>
                                    )}
                                    {(group.summary?.sessions ?? group.sessions.length)} sessõe{(group.summary?.sessions ?? group.sessions.length) !== 1 ? 's' : ''}
                                    {group.summary && group.summary.issAmount > 0 && (
                                        <> · Bruto {fmtBRL(group.summary.grossAmount)} · ISS {fmtBRL(group.summary.issAmount)} · Líquido {fmtBRL(group.summary.netAmount)}</>
                                    )}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'right' }}>
                                <StatusBadge status={group.summary?.status || computeGuideStatus(group.sessions)} />
                                <Typography fontWeight={800} fontSize="0.9rem" color="#0F172A">{fmtBRL(group.summary?.grossAmount ?? group.total ?? 0)}</Typography>
                                {group.sessions.some(s => s.appointmentId) && (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleOpenGuideMenu(e, group)}
                                        sx={{ p: 0.5 }}
                                    >
                                        <MoreVertical size={14} color="#64748B" />
                                    </IconButton>
                                )}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                            <Box sx={{ borderTop: '1px solid #F1F5F9', pt: 1.5 }}>
                                {group.sessions.map((s, sidx) => {
                                    const isLast = sidx === group.sessions.length - 1;
                                    return (
                                        <Box
                                            key={s.sessionId || s.paymentId || sidx}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                py: 0.6,
                                                borderBottom: isLast ? 'none' : '1px dashed #F1F5F9',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                                    <Box sx={{
                                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        bgcolor: '#E2E8F0', color: '#64748B',
                                                        fontSize: '0.62rem', fontWeight: 700,
                                                    }}>
                                                        {sidx + 1}
                                                    </Box>
                                                    <Typography fontSize="0.78rem" color="#475569" fontWeight={500} sx={{ whiteSpace: 'nowrap' }}>
                                                        {fmtDateTime(String(s.date), s.time)}
                                                    </Typography>
                                                    {s.doctor?.fullName && (
                                                        <Typography fontSize="0.71rem" color="#94A3B8" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            · {s.doctor.fullName}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                                    <Typography fontSize="0.78rem" fontWeight={700} color="#1E293B">{fmtBRL(s.value)}</Typography>
                                                    {s.professionalPaymentStatus === 'non_payable' && (
                                                        <Chip
                                                            size="small"
                                                            icon={<UserX size={12} />}
                                                            label="Não remunerado"
                                                            sx={{ height: 18, fontSize: '0.58rem', bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600, '& .MuiChip-icon': { color: '#92400E' } }}
                                                        />
                                                    )}
                                                    <StatusBadge status={s.billingStatus} />
                                                    {s.appointmentId && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => handleOpenMenu(e, s)}
                                                            sx={{ p: 0.5, ml: 0.5 }}
                                                        >
                                                            <MoreVertical size={14} color="#64748B" />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </Box>
                                            {(s.invoiceNumber || s.billedAt || s.receivedAt) && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, ml: 3.25, flexWrap: 'wrap' }}>
                                                    {s.invoiceNumber && (
                                                        <Chip size="small" label={`NF ${s.invoiceNumber}`} sx={{ height: 16, fontSize: '0.58rem', bgcolor: '#F3F0FF', color: '#6D28D9', fontWeight: 600 }} />
                                                    )}
                                                    {s.billedAt && (
                                                        <Typography fontSize="0.63rem" color="#64748B">Faturado em {fmtDateShort(s.billedAt)}</Typography>
                                                    )}
                                                    {s.receivedAt && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                            <Typography fontSize="0.63rem" color="#059669">
                                                                Recebido em {fmtDateShort(s.receivedAt)}
                                                            </Typography>
                                                            {(s.grossAmount || s.receivedAmount) && (
                                                                <Typography fontSize="0.63rem" color="#64748B">
                                                                    Bruto {fmtBRL(s.grossAmount || s.receivedAmount || 0)}
                                                                    {s.issAmount ? ` · ISS ${fmtBRL(s.issAmount)}` : ''}
                                                                    {s.receivedAmount ? ` · Líquido ${fmtBRL(s.receivedAmount)}` : ''}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 1, mt: 1 }}>
                <Typography fontSize="0.72rem" fontWeight={700} color="#94A3B8" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Total · {totalSessions} sessõe{totalSessions !== 1 ? 's' : ''}
                </Typography>
                <Typography fontWeight={800} fontSize="0.95rem" color="#0F172A">{fmtBRL(total)}</Typography>
            </Box>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { minWidth: 220, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } }}
            >
                {menuSession?.professionalPaymentStatus === 'non_payable' ? (
                    <MenuItem onClick={handleToggleDialog} sx={{ gap: 1.5, fontSize: '0.85rem', py: 1 }}>
                        <UserCheck size={16} color="#059669" />
                        Voltar a remunerar profissional
                    </MenuItem>
                ) : (
                    <MenuItem onClick={handleToggleDialog} sx={{ gap: 1.5, fontSize: '0.85rem', py: 1 }}>
                        <UserX size={16} color="#92400E" />
                        Não remunerar profissional
                    </MenuItem>
                )}
            </Menu>

            <Menu
                anchorEl={guideMenuAnchor}
                open={Boolean(guideMenuAnchor)}
                onClose={handleCloseGuideMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { minWidth: 260, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } }}
            >
                {guideMenuGroup?.sessions.every(s => s.professionalPaymentStatus === 'non_payable') ? (
                    <MenuItem onClick={handleToggleGuideDialog} sx={{ gap: 1.5, fontSize: '0.85rem', py: 1 }}>
                        <UserCheck size={16} color="#059669" />
                        Voltar a remunerar profissional (guia)
                    </MenuItem>
                ) : (
                    <MenuItem onClick={handleToggleGuideDialog} sx={{ gap: 1.5, fontSize: '0.85rem', py: 1 }}>
                        <UserX size={16} color="#92400E" />
                        Não remunerar profissional (guia)
                    </MenuItem>
                )}
            </Menu>

            <Dialog open={dialogOpen} onClose={() => !dialogLoading && setDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>
                    {menuSession?.professionalPaymentStatus === 'non_payable'
                        ? 'Habilitar remuneração do profissional'
                        : 'Desabilitar remuneração do profissional'}
                </DialogTitle>
                <DialogContent sx={{ pb: 1 }}>
                    <Typography fontSize="0.85rem" color="#475569" sx={{ mb: 2 }}>
                        {menuSession?.professionalPaymentStatus === 'non_payable'
                            ? 'A sessão voltará a gerar comissão ao profissional no fechamento.'
                            : 'A sessão continuará faturada/recebida pela clínica, mas não gerará comissão ao profissional.'}
                    </Typography>
                    {menuSession?.professionalPaymentStatus !== 'non_payable' && (
                        <TextField
                            autoFocus
                            fullWidth
                            label="Motivo *"
                            placeholder="Ex: Paciente avisou com antecedência"
                            value={dialogReason}
                            onChange={(e) => setDialogReason(e.target.value)}
                            size="small"
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog} disabled={dialogLoading} size="small" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            console.log('[PPS] Botão Confirmar clicado');
                            handleSaveProfessionalPaymentStatus();
                        }}
                        disabled={dialogLoading || (menuSession?.professionalPaymentStatus !== 'non_payable' && !dialogReason.trim())}
                        size="small"
                        variant="contained"
                        sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                    >
                        {dialogLoading ? 'Salvando...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={guideDialogOpen} onClose={() => !guideDialogLoading && setGuideDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>
                    {guideMenuGroup?.sessions.every(s => s.professionalPaymentStatus === 'non_payable')
                        ? 'Habilitar remuneração do profissional (guia)'
                        : 'Desabilitar remuneração do profissional (guia)'}
                </DialogTitle>
                <DialogContent sx={{ pb: 1 }}>
                    <Typography fontSize="0.85rem" color="#475569" sx={{ mb: 2 }}>
                        {guideMenuGroup?.sessions.every(s => s.professionalPaymentStatus === 'non_payable')
                            ? 'Todas as sessões desta guia voltarão a gerar comissão ao profissional no fechamento.'
                            : 'Todas as sessões desta guia continuarão faturadas/recebidas pela clínica, mas não gerarão comissão ao profissional.'}
                    </Typography>
                    {!(guideMenuGroup?.sessions.every(s => s.professionalPaymentStatus === 'non_payable')) && (
                        <TextField
                            autoFocus
                            fullWidth
                            label="Motivo *"
                            placeholder="Ex: Paciente avisou com antecedência"
                            value={guideDialogReason}
                            onChange={(e) => setGuideDialogReason(e.target.value)}
                            size="small"
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseGuideDialog} disabled={guideDialogLoading} size="small" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            console.log('[PPS-GUIA] Botão Confirmar clicado');
                            handleSaveGuideProfessionalPaymentStatus();
                        }}
                        disabled={guideDialogLoading || (!(guideMenuGroup?.sessions.every(s => s.professionalPaymentStatus === 'non_payable')) && !guideDialogReason.trim())}
                        size="small"
                        variant="contained"
                        sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                    >
                        {guideDialogLoading ? 'Salvando...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ── Componente principal ───────────────────────────────────────────────────

interface InsuranceHistorySectionProps {
    activeYear?: number;
    activeMonth?: number;
}

export default function InsuranceHistorySection({ activeYear, activeMonth }: InsuranceHistorySectionProps) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(activeYear ?? currentYear);
    const [data, setData] = useState<InsuranceHistoryMonth[]>([]);
    const [loading, setLoading] = useState(false);

    // Navegação drill-down — só existem 2 níveis reais na tela (convênio → paciente).
    // O detalhe por especialidade/guia do paciente é sempre mostrado via drawerPatient
    // (overlay), nunca substituindo a lista — por isso não existe um 3º nível de state
    // aqui. Um `selectedPatient`/nível 3 chegou a existir neste arquivo mas nunca era
    // setado por nenhum clique real (a linha do paciente sempre abria o drawer direto),
    // e por isso a navegação "andava presa": breadcrumb/voltar/limpar resetavam esse
    // estado morto e deixavam o drawer real intocado. Achado 2026-08-03.
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    // Drawer de especialidades do paciente
    const [drawerPatient, setDrawerPatient] = useState<{ name: string; patientId?: string; provider: string; providerSlug?: string; rows: FlatRow[] } | null>(null);

    // Modal reutilizável de detalhamento — mesmo padrão do Painel de Convênios,
    // aberto pelos 4 cards do "Resumo" (Produção/Faturado/Recebido/Pendente)
    const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; accentColor: string; rows: BreakdownRow[] }>(
        { open: false, title: '', accentColor: '#6366F1', rows: [] }
    );

    // Filtros primários
    const [searchText, setSearchText] = useState('');

    const _defaultMonth = (y: number, m?: number) =>
        m ? `${y}-${String(m).padStart(2, '0')}` : 'all';

    // Filtros avançados — mês inicia no mês ativo da aba pai
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [metricsOpen, setMetricsOpen] = useState(false);
    const [filterMonth, setFilterMonth] = useState(() => _defaultMonth(activeYear ?? currentYear, activeMonth));
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSpecialty, setFilterSpecialty] = useState('all');

    const level = selectedProvider ? 2 : 1;

    useEffect(() => {
        setSelectedProvider(null);
        setDrawerPatient(null);
        load();
    }, [year]);

    // Sincroniza com o Período do painel pai (InsuranceTab) — sem isso, o "Histórico"
    // ficava travado no mês/ano de quando a aba foi montada pela 1ª vez, já que
    // year/filterMonth só liam activeYear/activeMonth no useState inicial.
    useEffect(() => {
        const targetYear = activeYear ?? currentYear;
        setYear(targetYear);
        setFilterMonth(_defaultMonth(targetYear, activeMonth));
    }, [activeYear, activeMonth]);

    // Fecha o drawer quando filtros avançados mudam — a seleção de paciente
    // pertence a um contexto de mês/status/especialidade; mantê-lo aberto ao
    // trocar esses filtros deixa a tela "presa" com dados fora de contexto.
    useEffect(() => {
        setDrawerPatient(null);
    }, [filterMonth, filterStatus, filterSpecialty]);

    async function load() {
        setLoading(true);
        try {
            const res = await getInsuranceHistory({ year });
            setData(res.data.data || []);
        } catch {
            toast.error('Erro ao carregar histórico de convênios');
        } finally {
            setLoading(false);
        }
    }

    // ── Dados planos base ──────────────────────────────────────────────────
    const flatRows = useMemo<FlatRow[]>(() => {
        const rows: FlatRow[] = [];
        data.forEach(month => {
            month.providers.forEach(prov => {
                prov.patients.forEach(pat => {
                    pat.specialties.forEach(sp => {
                        rows.push({
                            monthKey: month.monthKey,
                            month: month.monthLabel,
                            provider: prov.providerLabel,
                            providerSlug: prov.provider,
                            patientId: pat.patientId,
                            patientName: pat.name,
                            patientPhone: pat.phone,
                            specialty: sp.specialty,
                            sessions: sp.sessions,
                            value: sp.value,
                            status: sp.batchStatus,
                        });
                    });
                });
            });
        });
        return rows;
    }, [data]);

    // Filtros avançados aplicados
    const advFiltered = useMemo(() => flatRows.filter(r => {
        if (filterMonth !== 'all' && r.monthKey !== filterMonth) return false;
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterSpecialty !== 'all' && r.specialty !== filterSpecialty) return false;
        return true;
    }), [flatRows, filterMonth, filterStatus, filterSpecialty]);

    const STAT_STATUS: Record<string, string | null> = { 'Produção': null, 'Faturado': 'billed', 'Recebido': 'received', 'Pendente': 'pending_batch' };
    const STAT_COLOR: Record<string, string> = { 'Produção': '#6366F1', 'Faturado': '#3B82F6', 'Recebido': '#10B981', 'Pendente': '#F59E0B' };

    // Linhas do modal reutilizável — mesma base (advFiltered) que já alimenta os
    // totais dos cards, então o que abre bate exatamente com o número clicado.
    // No nível 2 (dentro de um convênio) escopa só àquele convênio.
    function statRowsFor(label: 'Produção' | 'Faturado' | 'Recebido' | 'Pendente') {
        const status = STAT_STATUS[label];
        const base = selectedProvider ? advFiltered.filter(r => r.provider === selectedProvider) : advFiltered;
        const rows = status ? base.filter(r => r.status === status) : base;
        return rows
            .map(r => ({
                id: `${r.monthKey}-${r.provider}-${r.patientName}-${r.specialty}`,
                label: r.patientName,
                sublabel: `${r.provider} · ${getSpecialtyLabel(r.specialty)} · ${fmtMonthShort(r.monthKey)}`,
                value: r.value,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR') || b.value - a.value);
    }

    function openDetailsModal(label: 'Produção' | 'Faturado' | 'Recebido' | 'Pendente') {
        setDetailsModal({ open: true, title: label, accentColor: STAT_COLOR[label], rows: statRowsFor(label) });
    }

    // ── Nível 1: resumo por convênio ───────────────────────────────────────
    // Lookup de lastSentAt por convênio+mês, direto do dado bruto do backend
    // (advFiltered já achatou pra nível de especialidade e perdeu esse campo).
    const lastSentAtByMonthProvider = useMemo(() => {
        const map = new Map<string, string>();
        data.forEach(month => {
            month.providers.forEach(prov => {
                if (prov.lastSentAt) map.set(`${month.monthKey}__${prov.providerLabel}`, prov.lastSentAt);
            });
        });
        return map;
    }, [data]);

    const providerSummary = useMemo<ProviderSummary[]>(() => {
        const search = searchText.toLowerCase();
        const map = new Map<string, ProviderSummary>();
        advFiltered.forEach(r => {
            if (search && !r.provider.toLowerCase().includes(search)) return;
            if (!map.has(r.provider)) map.set(r.provider, { provider: r.provider, sessions: 0, producao: 0, faturado: 0, recebido: 0, pendente: 0, lastSentAt: null });
            const e = map.get(r.provider)!;
            e.sessions += r.sessions;
            e.producao += r.value;
            if (r.status === 'received') e.recebido += r.value;
            else if (r.status === 'billed') e.faturado += r.value;
            else e.pendente += r.value;
            const sentAt = lastSentAtByMonthProvider.get(`${r.monthKey}__${r.provider}`);
            if (sentAt && (!e.lastSentAt || sentAt > e.lastSentAt)) e.lastSentAt = sentAt;
        });
        return [...map.values()].sort((a, b) => b.producao - a.producao);
    }, [advFiltered, searchText, lastSentAtByMonthProvider]);

    const globalTotals = useMemo(() => providerSummary.reduce(
        (acc, p) => ({ producao: acc.producao + p.producao, faturado: acc.faturado + p.faturado, recebido: acc.recebido + p.recebido, pendente: acc.pendente + p.pendente }),
        { producao: 0, faturado: 0, recebido: 0, pendente: 0 }
    ), [providerSummary]);

    // ── Nível 2: pacientes do convênio selecionado ─────────────────────────
    const patientSummary = useMemo<PatientSummary[]>(() => {
        if (!selectedProvider) return [];
        const search = searchText.toLowerCase();
        const map = new Map<string, { name: string; patientId?: string; phone?: string; sessions: number; value: number; statuses: Set<string> }>();
        advFiltered
            .filter(r => r.provider === selectedProvider)
            .forEach(r => {
                if (search && !r.patientName.toLowerCase().includes(search)) return;
                if (!map.has(r.patientName)) map.set(r.patientName, { name: r.patientName, patientId: r.patientId, phone: r.patientPhone, sessions: 0, value: 0, statuses: new Set() });
                const e = map.get(r.patientName)!;
                // patientId pode faltar em algumas linhas (payment avulso sem populate) — pega
                // a primeira que tiver, senão o botão de expandir nunca aparece pro paciente.
                if (r.patientId && !e.patientId) e.patientId = r.patientId;
                e.sessions += r.sessions;
                e.value += r.value;
                e.statuses.add(r.status);
            });
        return [...map.values()].map(e => ({
            name: e.name,
            patientId: e.patientId,
            phone: e.phone,
            sessions: e.sessions,
            value: e.value,
            status: e.statuses.has('pending_batch') ? 'pending_batch' : e.statuses.has('billed') ? 'billed' : 'received',
        })).sort((a, b) => b.value - a.value);
    }, [advFiltered, selectedProvider, searchText]);

    const providerTotals = useMemo(() => patientSummary.reduce(
        (acc, p) => ({ sessions: acc.sessions + p.sessions, value: acc.value + p.value }),
        { sessions: 0, value: 0 }
    ), [patientSummary]);

    // ── Listas para selects avançados ──────────────────────────────────────
    const months = useMemo(() => {
        const seen = new Map<string, string>();
        flatRows.forEach(r => { if (!seen.has(r.monthKey)) seen.set(r.monthKey, r.month); });
        return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [flatRows]);

    const specialties = useMemo(() => [...new Set(flatRows.map(r => r.specialty))], [flatRows]);

    const hasAdvancedFilters = filterMonth !== 'all' || filterStatus !== 'all' || filterSpecialty !== 'all';

    function goBack() {
        // Fecha o drawer primeiro (passo mais interno), só depois sai do convênio —
        // reflete a navegação real: Convênio → Paciente(drawer) → Voltar → Convênio → Voltar → Histórico.
        if (drawerPatient) { setDrawerPatient(null); }
        else if (selectedProvider) { setSelectedProvider(null); setSearchText(''); }
    }

    function drillToProvider(p: string) { setSelectedProvider(p); setSearchText(''); }
    function openPatientDrawer(name: string, patientId: string | undefined, provider: string, providerSlug: string | undefined, rows: FlatRow[]) {
        setDrawerPatient({ name, patientId, provider, providerSlug, rows });
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <Box>
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {level > 1 && (
                        <button onClick={goBack} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                            <button onClick={() => { setSelectedProvider(null); setDrawerPatient(null); setSearchText(''); }}
                                className={`hover:text-indigo-600 ${level === 1 ? 'font-bold text-gray-800' : ''}`}>
                                Histórico
                            </button>
                            {selectedProvider && (
                                <>
                                    <ChevronRight size={14} />
                                    <button onClick={() => setDrawerPatient(null)}
                                        className={`hover:text-indigo-600 ${level === 2 && !drawerPatient ? 'font-bold text-gray-800' : ''}`}>
                                        {selectedProvider}
                                    </button>
                                </>
                            )}
                            {drawerPatient && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className="font-bold text-gray-800">{drawerPatient.name}</span>
                                </>
                            )}
                        </div>
                        <Typography variant="caption" color="text.secondary">
                            {level === 1 && `${providerSummary.length} convênios · ${fmtBRL(globalTotals.producao)} produção`}
                            {level === 2 && `${patientSummary.length} pacientes · ${providerTotals.sessions} sessões · ${fmtBRL(providerTotals.value)}`}
                        </Typography>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select size="small" value={year} onChange={e => setYear(Number(e.target.value))} sx={{ minWidth: 90, fontSize: '0.875rem' }}>
                        {[currentYear, currentYear - 1].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                    <Button variant="outlined" size="small" startIcon={<Download size={16} />} className="text-xs">Exportar</Button>
                </div>
            </div>

            {loading && <Box className="flex justify-center py-10"><CircularProgress size={28} /></Box>}

            {!loading && data.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    <TrendingUp size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum dado encontrado para {year}</p>
                </div>
            )}

            {!loading && data.length > 0 && (
                <>
                    {/* MÉTRICAS — accordion, mesmo padrão do "Resumo do Dia" em Caixa & Fluxo */}
                    {level < 3 && (() => {
                        const production = level === 1 ? globalTotals.producao : providerTotals.value;
                        const billed = level === 1 ? globalTotals.faturado : patientSummary.filter(p => p.status === 'billed').reduce((s, p) => s + p.value, 0);
                        const received = level === 1 ? globalTotals.recebido : patientSummary.filter(p => p.status === 'received').reduce((s, p) => s + p.value, 0);
                        const pending = level === 1 ? globalTotals.pendente : patientSummary.filter(p => p.status === 'pending_batch').reduce((s, p) => s + p.value, 0);
                        return (
                            <Box sx={{ mb: 3 }}>
                                <button
                                    onClick={() => setMetricsOpen(o => !o)}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 transition-all shadow-sm border border-indigo-200 hover:brightness-95"
                                    style={{ background: 'linear-gradient(90deg, #F5F3FF 0%, #EFF6FF 100%)' }}
                                >
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">Resumo</span>
                                        {!metricsOpen && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-violet-100 text-violet-700">
                                                    💜 {fmtBRL(production)} produção
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-700">
                                                    🔵 {fmtBRL(billed)} faturado
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-700">
                                                    🟢 {fmtBRL(received)} recebido
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-700">
                                                    🟡 {fmtBRL(pending)} pendente
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronDown size={18} className={`text-indigo-600 transition-transform duration-200 ${metricsOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <Collapse in={metricsOpen}>
                                    <MetricStats production={production} billed={billed} received={received} pending={pending} onStatClick={openDetailsModal} />
                                </Collapse>
                            </Box>
                        );
                    })()}

                    {/* FILTROS */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-4">
                        {/* Busca só no nível 2 (pacientes) — no nível 1 você navega clicando */}
                        {level >= 2 && (
                            <TextField
                                size="small"
                                placeholder="Buscar paciente..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                sx={{
                                    minWidth: 220,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 999,
                                        bgcolor: '#F8FAFC',
                                        fontSize: '0.85rem',
                                        '& fieldset': { borderColor: '#E2E8F0' },
                                        '&:hover fieldset': { borderColor: '#CBD5E1' },
                                        '&.Mui-focused': { bgcolor: 'white' },
                                        '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: 1.5 },
                                    },
                                }}
                                InputProps={{
                                    startAdornment: <Search size={14} className="text-gray-400 mr-1.5 shrink-0" />,
                                    endAdornment: searchText ? (
                                        <button onClick={() => setSearchText('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                                            <X size={13} />
                                        </button>
                                    ) : undefined,
                                }}
                            />
                        )}

                        <button
                            onClick={() => setShowAdvanced(v => !v)}
                            className={`inline-flex items-center gap-1.5 pl-3 pr-2.5 py-[7px] rounded-full text-xs font-semibold border transition-colors ${
                                hasAdvancedFilters
                                    ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                                    : showAdvanced
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <SlidersHorizontal size={13} />
                            Filtros avançados
                            {hasAdvancedFilters && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/25 text-3xs font-bold">
                                    {[filterMonth !== 'all', filterStatus !== 'all', filterSpecialty !== 'all'].filter(Boolean).length}
                                </span>
                            )}
                            <ChevronDown size={12} className="transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none' }} />
                        </button>

                        {(searchText || hasAdvancedFilters || selectedProvider || drawerPatient) && (
                            <button
                                onClick={() => {
                                    // "Limpar" precisa devolver a tela inteira ao estado inicial — só resetar
                                    // os filtros avançados e manter o drill-down (convênio/paciente aberto no
                                    // drawer) deixava a tela "presa" mesmo depois de limpar.
                                    setSearchText('');
                                    setFilterMonth('all');
                                    setFilterStatus('all');
                                    setFilterSpecialty('all');
                                    setSelectedProvider(null);
                                    setDrawerPatient(null);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors px-1"
                            >
                                <X size={13} />
                                Limpar
                            </button>
                        )}
                    </div>

                    <Collapse in={showAdvanced}>
                        <div className="relative flex flex-wrap gap-4 mb-4 p-4 pt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500" />
                            {[
                                { label: 'Mês', value: filterMonth, set: setFilterMonth, options: [['all', 'Todos os meses'], ...months] as [string, string][], capitalize: true },
                                { label: 'Status', value: filterStatus, set: setFilterStatus, options: [['all', 'Todos'], ...Object.entries(STATUS_STYLE).map(([k, v]) => [k, v.label] as [string, string])] as [string, string][], capitalize: false },
                                { label: 'Especialidade', value: filterSpecialty, set: setFilterSpecialty, options: [['all', 'Todas'], ...specialties.map(s => [s, getSpecialtyLabel(s)] as [string, string])] as [string, string][], capitalize: false },
                            ].map(f => (
                                <FormControl key={f.label} size="small" sx={{ minWidth: 160 }}>
                                    <Typography fontSize="0.65rem" fontWeight={800} color="#94A3B8" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                                        {f.label}
                                    </Typography>
                                    <Select
                                        value={f.value}
                                        onChange={e => f.set(e.target.value)}
                                        sx={{
                                            borderRadius: 2.5,
                                            fontSize: '0.85rem',
                                            bgcolor: f.value !== 'all' ? '#EEF2FF' : '#F8FAFC',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: f.value !== 'all' ? '#C7D2FE' : '#E2E8F0' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#A5B4FC' },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1', borderWidth: 1.5 },
                                        }}
                                    >
                                        {f.options.map(([key, label]) => (
                                            <MenuItem key={key} value={key} sx={{ textTransform: f.capitalize ? 'capitalize' : 'none', fontSize: '0.85rem' }}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ))}
                        </div>
                    </Collapse>

                    {/* ── NÍVEL 1: Convênios ───────────────────────────────────────── */}
                    {level === 1 && (
                        <Box sx={{ border: '1.5px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            {/* cabeçalho */}
                            <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Convênio</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 60, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sess.</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 110, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Produção</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 100, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Faturado</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 100, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recebido</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 100, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pendente</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 90, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enviado</Typography>
                                <Box sx={{ width: 24 }} />
                            </Box>
                            {providerSummary.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Nenhum convênio encontrado.</Box>
                            ) : providerSummary.map((p, idx) => (
                                <Box key={p.provider} onClick={() => drillToProvider(p.provider)} sx={{
                                    px: 2.5, py: 1.5, display: 'flex', alignItems: 'center',
                                    borderBottom: idx < providerSummary.length - 1 ? '1px solid #F8FAFC' : 'none',
                                    cursor: 'pointer', bgcolor: 'white',
                                    borderLeft: '3px solid transparent',
                                    transition: 'all 0.12s',
                                    '&:hover': { bgcolor: '#F8FAFC', borderLeft: '3px solid #6366F1' }
                                }}>
                                    <Typography fontWeight={700} fontSize="0.87rem" color="#0F172A" sx={{ flex: 1 }}>{p.provider}</Typography>
                                    <Typography fontSize="0.83rem" color="#64748B" sx={{ width: 60, textAlign: 'center' }}>{p.sessions}</Typography>
                                    <Typography fontWeight={800} fontSize="0.87rem" color="#0F172A" sx={{ width: 110, textAlign: 'right' }}>{fmtBRL(p.producao)}</Typography>
                                    <Typography fontSize="0.83rem" color="#2563EB" sx={{ width: 100, textAlign: 'right' }}>{fmtBRL(p.faturado)}</Typography>
                                    <Typography fontSize="0.83rem" color="#059669" sx={{ width: 100, textAlign: 'right' }}>{fmtBRL(p.recebido)}</Typography>
                                    <Typography fontSize="0.83rem" color="#D97706" sx={{ width: 100, textAlign: 'right' }}>{fmtBRL(p.pendente)}</Typography>
                                    <Typography
                                        fontSize="0.75rem"
                                        color={p.lastSentAt ? '#64748B' : '#CBD5E1'}
                                        sx={{ width: 90, textAlign: 'right' }}
                                        title={p.lastSentAt ? `Envio mais recente — pode haver guias mais antigas enviadas em outra data` : 'Nenhum envio registrado'}
                                    >
                                        {p.lastSentAt ? new Date(p.lastSentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                    </Typography>
                                    <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: '#CBD5E1' }}>
                                        <ChevronRight size={16} />
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* ── NÍVEL 2: Pacientes ───────────────────────────────────────── */}
                    {level === 2 && (
                        <Box sx={{ border: '1.5px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            {/* cabeçalho */}
                            <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paciente</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 60, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sess.</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 110, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 130, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</Typography>
                                <Box sx={{ width: 24 }} />
                            </Box>
                            {patientSummary.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Nenhum paciente encontrado.</Box>
                            ) : patientSummary.map((p, idx) => {
                                const initials = p.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                                const sStyle = STATUS_STYLE[p.status] || STATUS_STYLE.pending_batch;
                                return (
                                    <Box key={p.name} onClick={() => {
                                        const rows = advFiltered.filter(r => r.provider === selectedProvider && r.patientName === p.name);
                                        openPatientDrawer(p.name, p.patientId, selectedProvider!, rows[0]?.providerSlug, rows);
                                    }} sx={{
                                        px: 2.5, py: 1.5, display: 'flex', alignItems: 'center',
                                        borderBottom: idx < patientSummary.length - 1 ? '1px solid #F8FAFC' : 'none',
                                        cursor: 'pointer', bgcolor: 'white',
                                        borderLeft: '3px solid transparent',
                                        transition: 'all 0.12s',
                                        '&:hover': { bgcolor: '#F8FAFC', borderLeft: `3px solid ${sStyle.dot}` }
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
                                            <Box sx={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                bgcolor: '#F1F5F9', border: '1.5px solid #E2E8F0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Typography fontSize="0.65rem" fontWeight={700} color="#64748B">{initials}</Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography fontWeight={600} fontSize="0.85rem" color="#1E293B" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
                                                {p.phone && <Typography fontSize="0.7rem" color="#94A3B8">{p.phone}</Typography>}
                                            </Box>
                                        </Box>
                                        <Typography fontSize="0.83rem" color="#64748B" sx={{ width: 60, textAlign: 'center' }}>{p.sessions}</Typography>
                                        <Typography fontWeight={700} fontSize="0.87rem" color="#0F172A" sx={{ width: 110, textAlign: 'right' }}>{fmtBRL(p.value)}</Typography>
                                        <Box sx={{ width: 130, display: 'flex', justifyContent: 'center' }}>
                                            <StatusBadge status={p.status} />
                                        </Box>
                                        <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: '#CBD5E1' }}>
                                            <ChevronRight size={16} />
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}

                    {/* Drawer de especialidades do paciente */}
                    {drawerPatient && (
                        <InsurancePatientDrawer
                            open={!!drawerPatient}
                            onClose={() => setDrawerPatient(null)}
                            patientName={drawerPatient.name}
                            provider={drawerPatient.provider}
                            headerColor="#EFF6FF"
                            stats={[
                                {
                                    label: 'Sessões',
                                    value: String(drawerPatient.rows.reduce((s, r) => s + (r.sessions || 0), 0)),
                                    color: '#6B7280'
                                },
                                {
                                    label: 'Especialidades',
                                    value: String(new Set(drawerPatient.rows.map(r => r.specialty).filter(Boolean)).size),
                                    color: '#8B5CF6'
                                },
                                {
                                    label: 'Total',
                                    value: fmtBRL(drawerPatient.rows.reduce((s, r) => s + r.value, 0)),
                                    color: '#2563EB'
                                }
                            ]}
                        >
                            <PatientSessionDetails
                                rows={drawerPatient.rows}
                                patientId={drawerPatient.patientId}
                                provider={drawerPatient.providerSlug || drawerPatient.provider}
                            />
                        </InsurancePatientDrawer>
                    )}

                    {/* Modal reutilizável de detalhamento — aberto pelos cards do Resumo */}
                    <BreakdownDetailsModal
                        open={detailsModal.open}
                        onClose={() => setDetailsModal(prev => ({ ...prev, open: false }))}
                        title={detailsModal.title}
                        accentColor={detailsModal.accentColor}
                        rows={detailsModal.rows}
                    />
                </>
            )}
        </Box>
    );
}
