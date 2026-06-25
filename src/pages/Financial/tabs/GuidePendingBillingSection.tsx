// src/pages/Financial/tabs/GuidePendingBillingSection.tsx

import {
    Box,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Drawer,
    Divider,
    IconButton,
    LinearProgress,
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
import { Calendar, ChevronDown, ChevronUp, Send, X, Link2, Plus, Wand2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { getSpecialtyLabel } from '../../../constants/specialties';
import { autoLinkOrphanSessions, createGuideFromOrphan, linkOrphanSessionsToGuide, previewAutoLinkOrphanSessions } from '../../../services/paymentService';
import { toast } from 'react-toastify';

export interface PendingGuideSession {
    sessionId: string;
    date?: string | Date | null;
    specialty?: string | null;
    value?: number;
    doctorName?: string | null;
}

export interface PendingGuide {
    guideId: string;
    number: string;
    insurance: string;
    specialty?: string;
    patient?: { fullName?: string } | null;
    billingMode?: 'per_month' | 'per_guide';
    totalSessions?: number;
    usedSessions?: number;
    totalAuthorizedValue?: number | null;
    sessionsThisMonth?: number;
    pendingSessions: number;
    pendingValue: number;
    firstSessionDate?: string | Date | null;
    lastSessionDate?: string | Date | null;
    sessions?: PendingGuideSession[];
}

interface OrphanSession {
    paymentId?: string;
    sessionId?: string;
    date?: string | Date | null;
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
    loading: boolean;
    onToggleGuide: (guideId: string) => void;
    onRefresh?: () => void;
    month?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number | undefined) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

// ── Drawer de detalhes do paciente ───────────────────────────────────────────

interface PatientDrawerProps {
    open: boolean;
    patientName: string;
    provider: string;
    guides: PendingGuide[];
    selectedGuides: Set<string>;
    onToggleGuide: (guideId: string) => void;
    onClose: () => void;
}

function PatientDrawer({ open, patientName, provider, guides, selectedGuides, onToggleGuide, onClose }: PatientDrawerProps) {
    const total    = guides.reduce((s, g) => s + (g.pendingValue || 0), 0);
    const sessions = guides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
    const allSelected  = guides.every(g => selectedGuides.has(g.guideId));
    const someSelected = guides.some(g => selectedGuides.has(g.guideId)) && !allSelected;

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

    const isPerGuide = guides[0]?.billingMode === 'per_guide';
    const accentColor = isPerGuide ? '#059669' : '#D97706';
    const accentBg    = isPerGuide ? '#ECFDF5' : '#FFFBEB';
    const accentBorder = isPerGuide ? '#6EE7B7' : '#FDE68A';

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{
            sx: { width: { xs: '100vw', sm: 580 }, display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }
        }}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <Box sx={{
                px: 3, pt: 3, pb: 2.5,
                background: `linear-gradient(135deg, ${accentBg} 0%, #fff 100%)`,
                borderBottom: `2px solid ${accentBorder}`,
                position: 'relative'
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
                </Box>

                {/* Stats chips */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {[
                        { label: 'guias', value: guides.length },
                        { label: 'sessões no mês', value: sessions, blue: true },
                        { label: 'a faturar', value: formatCurrency(total), green: true },
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

            {/* ── Selecionar todas ───────────────────────────────────── */}
            <Box sx={{
                px: 3, py: 1.25,
                bgcolor: 'white',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', gap: 1
            }}>
                <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => guides.forEach(g => onToggleGuide(g.guideId))}
                    size="small"
                    sx={{ p: 0.5 }}
                />
                <Typography fontSize="0.8rem" color="#475569" fontWeight={500}>
                    {allSelected ? 'Desmarcar todas as guias' : `Selecionar todas as guias (${guides.length})`}
                </Typography>
            </Box>

            {/* ── Lista de guias ─────────────────────────────────────── */}
            <Box sx={{ overflowY: 'auto', flex: 1, px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {guides.map((guide) => {
                    const isSelected  = selectedGuides.has(guide.guideId);
                    const isExpanded  = expandedGuides.has(guide.guideId);
                    const hasSessions = (guide.sessions || []).length > 0;
                    const pct = guide.totalSessions ? Math.min(100, Math.round(((guide.usedSessions ?? 0) / guide.totalSessions) * 100)) : 0;
                    const isComplete  = (guide.usedSessions ?? 0) >= (guide.totalSessions ?? 1);

                    return (
                        <Card key={guide.guideId} elevation={0} sx={{
                            border: isSelected ? '2px solid #3B82F6' : '1.5px solid #E2E8F0',
                            borderRadius: 3,
                            bgcolor: isSelected ? '#F0F9FF' : 'white',
                            overflow: 'hidden',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                            boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                            '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
                        }}>
                            {/* Linha de cor lateral */}
                            <Box sx={{ height: 4, bgcolor: isComplete ? '#059669' : guide.billingMode === 'per_guide' ? '#10B981' : '#F59E0B' }} />

                            <Box sx={{ p: 2 }}>
                                {/* Row 1: checkbox + número + badge + valor */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleGuide(guide.guideId)}
                                            size="small"
                                            sx={{ p: 0.25, mt: 0.1 }}
                                        />
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                <Typography fontWeight="700" fontSize="0.9rem" color="#0F172A">
                                                    Guia {guide.number}
                                                </Typography>
                                                <BillingModeBadge mode={guide.billingMode} />
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={getSpecialtyLabel(guide.specialty || '')}
                                                sx={{ fontSize: '0.63rem', height: 17, bgcolor: '#F3F0FF', color: '#6D28D9', fontWeight: 600, mt: 0.5, letterSpacing: '0.01em' }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Valor + sessões */}
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography fontWeight="800" fontSize="1.0rem" color="#0F172A">
                                            {formatCurrency(guide.pendingValue)}
                                        </Typography>
                                        {guide.billingMode === 'per_guide' ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25, mt: 0.25 }}>
                                                <Typography fontSize="0.7rem" color="#065F46" fontWeight={600}>
                                                    {guide.sessionsThisMonth ?? guide.pendingSessions} sess. no mês
                                                </Typography>
                                                <Typography fontSize="0.7rem" color="#64748B">
                                                    {guide.totalSessions} autorizadas
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography fontSize="0.72rem" color="#92400E" fontWeight={600} mt={0.25}>
                                                {guide.pendingSessions} sess. no mês
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* Row 2: progresso pill */}
                                {guide.totalSessions != null && guide.usedSessions != null && (
                                    <Box sx={{
                                        display: 'inline-flex', alignItems: 'center', gap: 1,
                                        px: 1.5, py: 0.6, mb: 1.5,
                                        bgcolor: isComplete ? '#F0FDF4' : '#F0F9FF',
                                        border: `1px solid ${isComplete ? '#BBF7D0' : '#BAE6FD'}`,
                                        borderRadius: 20,
                                    }}>
                                        <Box sx={{ width: 56, height: 5, borderRadius: 3, bgcolor: isComplete ? '#BBF7D0' : '#BAE6FD', overflow: 'hidden', flexShrink: 0 }}>
                                            <Box sx={{
                                                width: `${pct}%`, height: '100%', borderRadius: 3,
                                                bgcolor: isComplete ? '#16A34A' : '#0EA5E9',
                                                transition: 'width 0.4s ease'
                                            }} />
                                        </Box>
                                        <Typography fontSize="0.72rem" fontWeight={600} color={isComplete ? '#15803D' : '#0369A1'}>
                                            {guide.usedSessions}/{guide.totalSessions}{isComplete ? ' ✓' : ''}
                                        </Typography>
                                    </Box>
                                )}

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

                                {/* Sessões individuais */}
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ mt: 1.5, borderTop: '1px solid #F1F5F9', pt: 1.5 }}>
                                        {guide.sessions!.map((s, sidx) => (
                                            <Box key={s.sessionId || sidx} sx={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                py: 0.6,
                                                borderBottom: sidx < guide.sessions!.length - 1 ? '1px dashed #F1F5F9' : 'none'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#CBD5E1', flexShrink: 0 }} />
                                                    <Typography fontSize="0.78rem" color="#475569" fontWeight={500}>{formatDate(s.date)}</Typography>
                                                    {s.doctorName && (
                                                        <Typography fontSize="0.71rem" color="#94A3B8">· {s.doctorName}</Typography>
                                                    )}
                                                </Box>
                                                <Typography fontSize="0.78rem" fontWeight={700} color="#1E293B">
                                                    {formatCurrency(s.value)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Collapse>
                            </Box>
                        </Card>
                    );
                })}
            </Box>
        </Drawer>
    );
}

// ── Componente principal ─────────────────────────────────────────────────────

const GuidePendingBillingSection = ({
    guides,
    selectedGuides,
    orphanSessions,
    loading,
    onToggleGuide,
    onRefresh,
    month,
}: GuidePendingBillingSectionProps) => {
    const [expandedProviders, setExpandedProviders]             = useState<Record<string, boolean>>({});
    const [expandedOrphanProviders, setExpandedOrphanProviders] = useState<Record<string, boolean>>({});
    const [drawerPatient, setDrawerPatient]                     = useState<{ name: string; provider: string; guides: PendingGuide[] } | null>(null);
    const [linking, setLinking]                                 = useState(false);
    const [createModal, setCreateModal]                         = useState<OrphanSession | null>(null);
    const [linkModal, setLinkModal]                             = useState<OrphanSession | null>(null);
    const [guideNumber, setGuideNumber]                         = useState('');
    const [previewModal, setPreviewModal]                       = useState<{ open: boolean; linked: any[]; skipped: any[] } | null>(null);

    const toggleProvider      = (p: string) => setExpandedProviders(prev => ({ ...prev, [p]: !prev[p] }));
    const toggleOrphanProvider = (p: string) => setExpandedOrphanProviders(prev => ({ ...prev, [p]: !prev[p] }));

    const openDrawer = (name: string, provider: string, patientGuides: PendingGuide[]) =>
        setDrawerPatient({ name, provider, guides: patientGuides });

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

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (guides.length === 0 && orphanSessions.length === 0) {
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
        const aT = Object.values(a).flat().reduce((s, g) => s + (g.pendingValue || 0), 0);
        const bT = Object.values(b).flat().reduce((s, g) => s + (g.pendingValue || 0), 0);
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
                    const grandTotal = allFlat.reduce((s, g) => s + (g.pendingValue || 0), 0);
                    const grandSess  = allFlat.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                    const grandPats  = new Set(guides.map(g => g.patient?.fullName)).size;
                    return (
                        <Card elevation={0} sx={{ border: '1.5px solid #E2E8F0', borderRadius: 3, overflow: 'hidden', mb: 0.5 }}>
                            {/* Header */}
                            <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Convênio</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 72, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pacientes</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 56, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guias</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 72, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessões</Typography>
                                <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 110, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</Typography>
                            </Box>

                            {/* Linhas */}
                            {sortedProviders.map(([provider, providerPatients], idx) => {
                                const allGuides    = Object.values(providerPatients).flat();
                                const total        = allGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                                const sessions     = allGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                                const patients     = Object.keys(providerPatients).length;
                                const isExpanded   = !!expandedProviders[provider];
                                const providerMode = allGuides[0]?.billingMode;
                                const isPerGuide   = providerMode === 'per_guide';
                                const rowAccent    = isPerGuide ? '#10B981' : '#3B82F6';
                                return (
                                    <Box
                                        key={provider}
                                        onClick={() => toggleProvider(provider)}
                                        sx={{
                                            px: 2.5, py: 1.4,
                                            display: 'flex', alignItems: 'center',
                                            borderBottom: idx < sortedProviders.length - 1 ? '1px solid #F8FAFC' : 'none',
                                            borderLeft: `3px solid ${isExpanded ? rowAccent : 'transparent'}`,
                                            bgcolor: isExpanded ? (isPerGuide ? '#F0FDF4' : '#EFF6FF') : 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            '&:hover': { bgcolor: isPerGuide ? '#F0FDF4' : '#EFF6FF', borderLeft: `3px solid ${rowAccent}` }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                            <Typography fontWeight="700" fontSize="0.87rem" color="#0F172A">{formatProviderName(provider)}</Typography>
                                            <BillingModeBadge mode={providerMode} />
                                        </Box>
                                        <Typography fontSize="0.83rem" color="#64748B" sx={{ width: 72, textAlign: 'center' }}>{patients}</Typography>
                                        <Typography fontSize="0.83rem" color="#64748B" sx={{ width: 56, textAlign: 'center' }}>{allGuides.length}</Typography>
                                        <Box sx={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                                            <Typography fontSize="0.83rem" fontWeight={700} color="#1D4ED8">{sessions}</Typography>
                                        </Box>
                                        <Typography fontWeight="800" fontSize="0.87rem" color="#0F172A" sx={{ width: 110, textAlign: 'right' }}>
                                            {formatCurrency(total)}
                                        </Typography>
                                    </Box>
                                );
                            })}

                            {/* Rodapé total */}
                            {sortedProviders.length > 1 && (
                                <Box sx={{ px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', bgcolor: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                                    <Typography fontSize="0.8rem" fontWeight={700} color="#475569" sx={{ flex: 1 }}>Total</Typography>
                                    <Typography fontSize="0.83rem" fontWeight={600} color="#475569" sx={{ width: 72, textAlign: 'center' }}>{grandPats}</Typography>
                                    <Typography fontSize="0.83rem" fontWeight={600} color="#475569" sx={{ width: 56, textAlign: 'center' }}>{allFlat.length}</Typography>
                                    <Box sx={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                                        <Typography fontSize="0.83rem" fontWeight={700} color="#1D4ED8">{grandSess}</Typography>
                                    </Box>
                                    <Typography fontWeight="800" fontSize="0.92rem" color="#0F172A" sx={{ width: 110, textAlign: 'right' }}>
                                        {formatCurrency(grandTotal)}
                                    </Typography>
                                </Box>
                            )}
                        </Card>
                    );
                })()}

                {/* ── Cards por convênio ──────────────────────────────────── */}
                {sortedProviders.map(([provider, providerPatients]) => {
                    const allGuides     = Object.values(providerPatients).flat();
                    const providerTotal = allGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                    const providerSess  = allGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                    const patientCount  = Object.keys(providerPatients).length;
                    const allSelected   = allGuides.every(g => selectedGuides.has(g.guideId));
                    const someSelected  = allGuides.some(g => selectedGuides.has(g.guideId)) && !allSelected;
                    const isExpanded    = !!expandedProviders[provider];
                    const providerMode  = allGuides[0]?.billingMode;
                    const isPerGuide    = providerMode === 'per_guide';
                    const accentColor   = isPerGuide ? '#059669' : '#2563EB';
                    const accentBar     = isPerGuide ? '#10B981' : '#3B82F6';

                    const sortedPatients = Object.entries(providerPatients).sort(([, ag], [, bg]) => {
                        const aOld = ag.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                        const bOld = bg.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                        if (!aOld) return 1;
                        if (!bOld) return -1;
                        return String(aOld).localeCompare(String(bOld));
                    });

                    return (
                        <Card key={provider} elevation={0} sx={{
                            borderRadius: 3,
                            border: '1.5px solid #E2E8F0',
                            overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                            transition: 'box-shadow 0.15s',
                            '&:hover': { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }
                        }}>
                            {/* Barra de cor no topo */}
                            <Box sx={{ height: 3, bgcolor: accentBar }} />

                            {/* Header do convênio */}
                            <Box
                                onClick={() => toggleProvider(provider)}
                                sx={{
                                    px: 2.5, py: 2,
                                    bgcolor: isExpanded ? '#FAFAFA' : 'white',
                                    borderBottom: isExpanded ? '1px solid #F1F5F9' : 'none',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#F8FAFC' },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={() => allGuides.forEach(g => onToggleGuide(g.guideId))}
                                        onClick={e => e.stopPropagation()}
                                        size="small" sx={{ p: 0.5 }}
                                    />
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                            <Typography fontWeight="800" fontSize="0.95rem" color="#0F172A">
                                                {formatProviderName(provider)}
                                            </Typography>
                                            <BillingModeBadge mode={providerMode} />
                                        </Box>
                                        <Typography fontSize="0.76rem" color="#94A3B8">
                                            {patientCount} paciente{patientCount !== 1 ? 's' : ''} · {allGuides.length} guia{allGuides.length !== 1 ? 's' : ''} · {providerSess} sessõ{providerSess !== 1 ? 'es' : 'ão'}{isPerGuide ? ' no mês' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        px: 1.75, py: 0.6,
                                        bgcolor: accentBar, borderRadius: 2,
                                        display: 'flex', alignItems: 'center'
                                    }}>
                                        <Typography fontWeight="800" fontSize="0.85rem" color="white">
                                            {formatCurrency(providerTotal)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ color: '#CBD5E1', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <ChevronDown size={18} />
                                    </Box>
                                </Box>
                            </Box>

                            {/* Lista de pacientes */}
                            <Collapse in={isExpanded}>
                                {/* Cabeçalho da lista */}
                                <Box sx={{ px: 2.5, py: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: 32, flexShrink: 0 }} />
                                    <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paciente</Typography>
                                    <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 56, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guias</Typography>
                                    <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 64, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessões</Typography>
                                    <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 100, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor</Typography>
                                    <Typography fontSize="0.68rem" fontWeight={700} color="#94A3B8" sx={{ width: 72, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Há</Typography>
                                    <Box sx={{ width: 24 }} />
                                </Box>

                                {sortedPatients.map(([patientName, patientGuides], pidx) => {
                                    const total   = patientGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                                    const sessions = patientGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                                    const allPat  = patientGuides.every(g => selectedGuides.has(g.guideId));
                                    const somePat = patientGuides.some(g => selectedGuides.has(g.guideId)) && !allPat;
                                    const oldest  = patientGuides.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                                    const dias    = daysSince(oldest);
                                    const initials = patientName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

                                    return (
                                        <Box
                                            key={`${provider}__${patientName}`}
                                            onClick={() => openDrawer(patientName, provider, patientGuides)}
                                            sx={{
                                                px: 2.5, py: 1.5,
                                                display: 'flex', alignItems: 'center',
                                                borderBottom: pidx < sortedPatients.length - 1 ? '1px solid #F8FAFC' : 'none',
                                                cursor: 'pointer',
                                                bgcolor: (allPat || somePat) ? '#F0F9FF' : 'white',
                                                '&:hover': { bgcolor: (allPat || somePat) ? '#E0F2FE' : '#F8FAFC' },
                                                transition: 'background 0.1s',
                                            }}
                                        >
                                            <Checkbox
                                                checked={allPat}
                                                indeterminate={somePat}
                                                onChange={() => patientGuides.forEach(g => onToggleGuide(g.guideId))}
                                                onClick={e => e.stopPropagation()}
                                                size="small" sx={{ p: 0.5, mr: 0.5, flexShrink: 0 }}
                                            />

                                            {/* Avatar + nome */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
                                                <Box sx={{
                                                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                    bgcolor: isPerGuide ? '#ECFDF5' : '#FFF7ED',
                                                    border: `1.5px solid ${isPerGuide ? '#6EE7B7' : '#FED7AA'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Typography fontSize="0.65rem" fontWeight={700} color={accentColor}>{initials}</Typography>
                                                </Box>
                                                <Typography fontWeight="600" fontSize="0.85rem" color="#1E293B" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {patientName}
                                                </Typography>
                                            </Box>

                                            <Typography fontSize="0.82rem" color="#64748B" sx={{ width: 56, textAlign: 'center' }}>
                                                {patientGuides.length}
                                            </Typography>
                                            <Box sx={{ width: 64, display: 'flex', justifyContent: 'center' }}>
                                                <Box sx={{ px: 1, py: 0.25, bgcolor: '#EFF6FF', borderRadius: 1 }}>
                                                    <Typography fontSize="0.8rem" fontWeight={700} color="#1D4ED8">{sessions}</Typography>
                                                </Box>
                                            </Box>
                                            <Typography fontWeight="700" fontSize="0.85rem" color="#0F172A" sx={{ width: 100, textAlign: 'right' }}>
                                                {formatCurrency(total)}
                                            </Typography>
                                            <Box sx={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                                                <UrgencyChip days={dias} />
                                            </Box>
                                            <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: '#CBD5E1' }}>
                                                <ChevronDown size={14} />
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Collapse>
                        </Card>
                    );
                })}

                {/* ── Sessões órfãs ───────────────────────────────────────── */}
                {orphanSessions.length > 0 && (
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
                                    {orphanSessions.length} sessão{orphanSessions.length !== 1 ? 's' : ''} · sem seleção em lote disponível
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Wand2 size={14} />}
                                    onClick={handleAutoLinkPreview}
                                    disabled={linking}
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
                                                                    {formatDate(s.date)}
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
                    onToggleGuide={onToggleGuide}
                    onClose={() => setDrawerPatient(null)}
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
        </>
    );
};

export default GuidePendingBillingSection;
