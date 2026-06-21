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

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', sm: 420 } } }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 2, bgcolor: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography fontWeight="700" fontSize="1rem" color="#111827">{patientName}</Typography>
                    <Typography variant="caption" color="#B45309" fontWeight={600}>{formatProviderName(provider)}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                        <span className="text-xs text-gray-500">{guides.length} guia{guides.length !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-blue-600 font-semibold">{sessions} sessões</span>
                        <span className="text-xs font-bold text-gray-800">{formatCurrency(total)}</span>
                    </Box>
                </Box>
                <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
            </Box>

            {/* Seleção em lote — todas as guias deste paciente */}
            <Box sx={{ px: 3, py: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => guides.forEach(g => onToggleGuide(g.guideId))}
                    size="small"
                />
                <Typography variant="caption" color="text.secondary">
                    {allSelected ? 'Desmarcar todas as guias' : 'Selecionar todas as guias'}
                </Typography>
            </Box>

            {/* Lista de guias */}
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {guides.map((guide, idx) => {
                    const isSelected = selectedGuides.has(guide.guideId);
                    const isExpanded = expandedGuides.has(guide.guideId);
                    const hasSessions = (guide.sessions || []).length > 0;
                    return (
                        <Box key={guide.guideId}>
                            {idx > 0 && <Divider />}
                            <Box sx={{ px: 3, py: 2, bgcolor: isSelected ? '#F0F9FF' : 'white' }}>
                                {/* Header da guia — clicável para expandir */}
                                <Box
                                    onClick={() => hasSessions && toggleGuideExpand(guide.guideId)}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        mb: 1.5,
                                        cursor: hasSessions ? 'pointer' : 'default'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleGuide(guide.guideId)}
                                            onClick={(e) => e.stopPropagation()}
                                            size="small"
                                        />
                                        <Box>
                                            <Typography fontWeight="700" fontSize="0.88rem" color="#111827">
                                                Guia {guide.number}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={getSpecialtyLabel(guide.specialty || '')}
                                                sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#EDE9FE', color: '#5B21B6', fontWeight: 600, mt: 0.5 }}
                                            />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography fontWeight="700" fontSize="0.9rem" color="#111827">
                                                {formatCurrency(guide.pendingValue)}
                                            </Typography>
                                            <Typography variant="caption" color="#92400E">
                                                {guide.pendingSessions} sessão{guide.pendingSessions !== 1 ? 's' : ''}
                                            </Typography>
                                        </Box>
                                        {hasSessions && (
                                            <IconButton size="small" onClick={(e) => toggleGuideExpand(guide.guideId, e)} sx={{ p: 0.5 }}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </IconButton>
                                        )}
                                    </Box>
                                </Box>

                                {/* Período */}
                                {guide.firstSessionDate && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6B7280', fontSize: '0.78rem', mb: 1.5, pl: 4.5 }}>
                                        <Calendar size={12} />
                                        {formatDate(guide.firstSessionDate)}
                                        {guide.lastSessionDate && guide.firstSessionDate !== guide.lastSessionDate &&
                                            <> → {formatDate(guide.lastSessionDate)}</>}
                                    </Box>
                                )}

                                {/* Sessões individuais — expansível */}
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    {hasSessions && (
                                        <Box sx={{ ml: 4.5, borderLeft: '2px solid #E5E7EB', pl: 1.5 }}>
                                            {guide.sessions!.map((s, sidx) => (
                                                <Box key={s.sessionId || sidx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Calendar size={11} color="#9CA3AF" />
                                                        <Typography fontSize="0.78rem" color="#6B7280">{formatDate(s.date)}</Typography>
                                                        {s.doctorName && (
                                                            <Typography fontSize="0.72rem" color="#9CA3AF">· {s.doctorName}</Typography>
                                                        )}
                                                    </Box>
                                                    <Typography fontSize="0.78rem" fontWeight={600} color="#374151">
                                                        {formatCurrency(s.value)}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </Collapse>
                            </Box>
                        </Box>
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
                {/* ── Mini-resumo por convênio ─────────────────────────────── */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                                <TableCell sx={TH}>Convênio</TableCell>
                                <TableCell align="center" sx={TH}>Pacientes</TableCell>
                                <TableCell align="center" sx={TH}>Guias</TableCell>
                                <TableCell align="center" sx={TH}>Sessões</TableCell>
                                <TableCell align="right" sx={TH}>Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedProviders.map(([provider, providerPatients]) => {
                                const allGuides   = Object.values(providerPatients).flat();
                                const total       = allGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                                const sessions    = allGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                                const patients    = Object.keys(providerPatients).length;
                                const isExpanded  = !!expandedProviders[provider];
                                return (
                                    <TableRow
                                        key={provider}
                                        hover
                                        onClick={() => toggleProvider(provider)}
                                        sx={{ cursor: 'pointer', bgcolor: isExpanded ? '#FFFBEB' : undefined }}
                                    >
                                        <TableCell>
                                            <Typography fontWeight="600" fontSize="0.85rem" color="#B45309">
                                                {formatProviderName(provider)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography fontSize="0.82rem" color="#6B7280">{patients}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography fontSize="0.82rem" color="#6B7280">{allGuides.length}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography fontSize="0.82rem" fontWeight={600} color="#1D4ED8">{sessions}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight="700" fontSize="0.85rem" color="#111827">
                                                {formatCurrency(total)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {/* Linha total geral */}
                            {sortedProviders.length > 1 && (() => {
                                const all = Object.values(groupedGuides).flatMap(p => Object.values(p).flat());
                                return (
                                    <TableRow sx={{ bgcolor: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#374151' }}>Total</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                                            {new Set(guides.map(g => g.patient?.fullName)).size}
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{all.length}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#1D4ED8' }}>
                                            {all.reduce((s, g) => s + (g.pendingSessions || 0), 0)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827' }}>
                                            {formatCurrency(all.reduce((s, g) => s + (g.pendingValue || 0), 0))}
                                        </TableCell>
                                    </TableRow>
                                );
                            })()}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ── Cards por convênio ──────────────────────────────────── */}
                {sortedProviders.map(([provider, providerPatients]) => {
                    const allGuides     = Object.values(providerPatients).flat();
                    const providerTotal = allGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                    const providerSess  = allGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                    const patientCount  = Object.keys(providerPatients).length;
                    const allSelected   = allGuides.every(g => selectedGuides.has(g.guideId));
                    const someSelected  = allGuides.some(g => selectedGuides.has(g.guideId)) && !allSelected;
                    const isExpanded    = !!expandedProviders[provider];

                    // Pacientes ordenados pelo mais urgente (firstSessionDate mais antiga)
                    const sortedPatients = Object.entries(providerPatients).sort(([, ag], [, bg]) => {
                        const aOld = ag.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                        const bOld = bg.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                        if (!aOld) return 1;
                        if (!bOld) return -1;
                        return String(aOld).localeCompare(String(bOld));
                    });

                    return (
                        <Card key={provider} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                            {/* Header do convênio */}
                            <Box
                                onClick={() => toggleProvider(provider)}
                                sx={{
                                    px: 2.5, py: 1.75,
                                    background: isExpanded
                                        ? 'linear-gradient(90deg, #FEF3C7 0%, #FFFBEB 100%)'
                                        : 'linear-gradient(90deg, #F9FAFB 0%, #FFFFFF 100%)',
                                    borderBottom: isExpanded ? '1px solid #FDE68A' : 'none',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    cursor: 'pointer',
                                    '&:hover': { background: 'linear-gradient(90deg, #FEF3C7 0%, #FFFBEB 100%)' },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={() => allGuides.forEach(g => onToggleGuide(g.guideId))}
                                        onClick={e => e.stopPropagation()}
                                        size="small"
                                    />
                                    <Box>
                                        <Typography fontWeight="700" fontSize="0.95rem" color="#B45309">
                                            {formatProviderName(provider)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {patientCount} paciente{patientCount !== 1 ? 's' : ''} · {allGuides.length} guia{allGuides.length !== 1 ? 's' : ''} · {providerSess} sessão{providerSess !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Chip
                                        size="small"
                                        label={formatCurrency(providerTotal)}
                                        sx={{ bgcolor: '#F59E0B', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}
                                    />
                                    {isExpanded ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                                </Box>
                            </Box>

                            {/* Tabela de pacientes */}
                            <Collapse in={isExpanded}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                                                <TableCell padding="checkbox" />
                                                <TableCell sx={TH}>Paciente</TableCell>
                                                <TableCell align="center" sx={TH}>Guias</TableCell>
                                                <TableCell align="center" sx={TH}>Sessões</TableCell>
                                                <TableCell align="right" sx={TH}>Valor</TableCell>
                                                <TableCell align="center" sx={TH}>Aguardando</TableCell>
                                                <TableCell padding="checkbox" />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortedPatients.map(([patientName, patientGuides]) => {
                                                const total    = patientGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                                                const sessions = patientGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                                                const allPat   = patientGuides.every(g => selectedGuides.has(g.guideId));
                                                const somePat  = patientGuides.some(g => selectedGuides.has(g.guideId)) && !allPat;
                                                const oldest   = patientGuides.map(g => g.firstSessionDate).filter(Boolean).sort()[0];
                                                const dias     = daysSince(oldest);

                                                return (
                                                    <Fragment key={`${provider}__${patientName}`}>
                                                        <TableRow
                                                            hover
                                                            onClick={() => openDrawer(patientName, provider, patientGuides)}
                                                            sx={{ cursor: 'pointer', bgcolor: (allPat || somePat) ? '#F0F9FF' : undefined }}
                                                        >
                                                            <TableCell padding="checkbox">
                                                                <Checkbox
                                                                    checked={allPat}
                                                                    indeterminate={somePat}
                                                                    onChange={() => patientGuides.forEach(g => onToggleGuide(g.guideId))}
                                                                    onClick={e => e.stopPropagation()}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography fontWeight="600" fontSize="0.85rem" color="#374151">
                                                                    {patientName}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography fontSize="0.82rem" color="#6B7280">{patientGuides.length}</Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography fontSize="0.82rem" fontWeight={600} color="#1D4ED8">{sessions}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography fontWeight="700" fontSize="0.85rem" color="#111827">
                                                                    {formatCurrency(total)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <UrgencyChip days={dias} />
                                                            </TableCell>
                                                            <TableCell padding="checkbox">
                                                                <ChevronDown size={14} color="#9CA3AF" />
                                                            </TableCell>
                                                        </TableRow>
                                                    </Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
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
