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
    Card,
    Chip,
} from '@mui/material';
import { TrendingUp, Download, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal, X, ArrowLeft, Search } from 'lucide-react';
import InsurancePatientDrawer from '../components/InsurancePatientDrawer';
import BreakdownDetailsModal, { BreakdownRow } from '../components/BreakdownDetailsModal';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getInsuranceHistory, InsuranceHistoryMonth, getPatientInsuranceSessions, InsurancePatientSession } from '../../../services/paymentService';
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
    pending_batch: { label: 'Aguardando Lote', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
    billed:        { label: 'Faturado',        color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
    received:      { label: 'Recebido',        color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
};

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

function PatientSessionDetails({ rows, patientId, provider }: PatientSessionDetailsProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [sessionsByKey, setSessionsByKey] = useState<Record<string, InsurancePatientSession[]>>({});
    const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({});
    const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});

    const toggle = async (row: FlatRow) => {
        // patientId entra na chave de propósito: o drawer não desmonta ao trocar
        // de paciente (só atualiza props), então sem isso o cache de sessões de
        // um paciente vazava pro card de outro paciente com mesmo mês+especialidade.
        const key = `${patientId}__${row.monthKey}__${row.specialty}`;
        if (expanded.has(key)) {
            setExpanded(prev => { const next = new Set(prev); next.delete(key); return next; });
            return;
        }
        setExpanded(prev => { const next = new Set(prev); next.add(key); return next; });

        if (sessionsByKey[key] || loadingByKey[key] || !patientId) return;

        setLoadingByKey(prev => ({ ...prev, [key]: true }));
        setErrorByKey(prev => ({ ...prev, [key]: '' }));
        try {
            const res = await getPatientInsuranceSessions({
                patientId,
                month: row.monthKey,
                specialty: row.specialty,
                provider,
                status: row.status
            });
            setSessionsByKey(prev => ({ ...prev, [key]: res.data.data || [] }));
        } catch (err: any) {
            console.error('[PatientSessionDetails] Erro ao carregar sessões:', err);
            setErrorByKey(prev => ({ ...prev, [key]: err?.response?.data?.error || 'Erro ao carregar sessões' }));
        } finally {
            setLoadingByKey(prev => ({ ...prev, [key]: false }));
        }
    };

    function fmtDateTime(iso: string, time?: string | null) {
        if (!iso) return '-';
        const d = new Date(iso);
        const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return time ? `${date} ${time}` : date;
    }

    const total = rows.reduce((s, r) => s + r.value, 0);
    const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);

    return (
        <Box sx={{ p: 2 }}>
            {rows.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Nenhum registro encontrado.</Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {rows.map((r, idx) => {
                        const key = `${patientId}__${r.monthKey}__${r.specialty}`;
                        const isOpen = expanded.has(key);
                        const sessions = sessionsByKey[key] || [];
                        const isLoading = loadingByKey[key];
                        const error = errorByKey[key];
                        const canExpand = !!patientId;
                        const style = STATUS_STYLE[r.status] || STATUS_STYLE.pending_batch;
                        const mostRecentSessionId = sessions.length
                            ? sessions.reduce((latest, s) =>
                                !latest || new Date(s.date).getTime() > new Date(latest.date).getTime() ? s : latest
                            , sessions[0]).sessionId
                            : null;

                        return (
                            <Card key={key || idx} elevation={0} sx={{
                                border: '1.5px solid #E2E8F0', borderRadius: 3, overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                            }}>
                                <Box sx={{ height: 4, bgcolor: style.dot }} />
                                <Box sx={{ p: 1.75 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box>
                                            <Typography fontWeight={700} fontSize="0.9rem" color="#0F172A">
                                                {getSpecialtyLabel(r.specialty)}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={fmtMonthShort(r.monthKey)}
                                                sx={{ fontSize: '0.63rem', height: 17, bgcolor: '#F3F0FF', color: '#6D28D9', fontWeight: 600, mt: 0.5 }}
                                            />
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography fontWeight={800} fontSize="1rem" color="#0F172A">{fmtBRL(r.value)}</Typography>
                                            <Typography fontSize="0.72rem" color="#64748B" fontWeight={600} mt={0.25}>
                                                {r.sessions} sessõe{r.sessions !== 1 ? 's' : ''}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <StatusBadge status={r.status} />
                                        {canExpand && (
                                            <Box
                                                onClick={() => toggle(r)}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                                    cursor: 'pointer', color: '#3B82F6', fontSize: '0.73rem', fontWeight: 600,
                                                    '&:hover': { color: '#1D4ED8' }
                                                }}
                                            >
                                                {isOpen ? 'Ocultar sessões' : `Ver ${r.sessions} sessões`}
                                                {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            </Box>
                                        )}
                                    </Box>

                                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                        <Box sx={{ mt: 1.25, borderTop: '1px solid #F1F5F9', pt: 1.25 }}>
                                            {isLoading && (
                                                <Box className="flex items-center gap-2 py-2 text-gray-500 text-xs">
                                                    <CircularProgress size={14} />
                                                    Carregando sessões...
                                                </Box>
                                            )}
                                            {error && <Box className="text-red-600 text-xs py-2">{error}</Box>}
                                            {!isLoading && !error && sessions.length === 0 && (
                                                <Box className="text-gray-400 text-xs py-2">Nenhuma sessão encontrada.</Box>
                                            )}
                                            {!isLoading && !error && (() => {
                                                // Um card é especialidade+mês, que pode abranger MAIS DE UMA guia (ex:
                                                // guia renovada no meio do mês) — sem agrupar, sessões de guias
                                                // diferentes ficavam intercaladas por data e pareciam bagunçadas.
                                                const sorted = [...sessions].sort((a, b) =>
                                                    (a.guideNumber || '').localeCompare(b.guideNumber || '') ||
                                                    new Date(a.date).getTime() - new Date(b.date).getTime()
                                                );
                                                const distinctGuides = new Set(sorted.map(s => s.guideNumber || '')).size;
                                                let lastGuide: string | null = null;
                                                return sorted.map((s, sidx) => {
                                                    const isMostRecent = s.sessionId === mostRecentSessionId;
                                                    const showGuideHeader = distinctGuides > 1 && s.guideNumber !== lastGuide;
                                                    lastGuide = s.guideNumber || null;
                                                    return (
                                                        <Box key={s.sessionId || s.paymentId || sidx}>
                                                            {showGuideHeader && (
                                                                <Typography
                                                                    fontSize="0.65rem" fontWeight={700} color="#94A3B8"
                                                                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mt: sidx > 0 ? 1 : 0, mb: 0.5 }}
                                                                >
                                                                    Guia {s.guideNumber || 'sem número'}
                                                                </Typography>
                                                            )}
                                                            <Box sx={{
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                py: 0.5, px: isMostRecent ? 0.75 : 0, borderRadius: 1.5,
                                                                bgcolor: isMostRecent ? '#F0FDF4' : 'transparent',
                                                                borderBottom: !isMostRecent && sidx < sorted.length - 1 ? '1px dashed #F1F5F9' : 'none',
                                                            }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                                                    <Box sx={{
                                                                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        bgcolor: isMostRecent ? '#059669' : '#E2E8F0',
                                                                        color: isMostRecent ? '#fff' : '#64748B',
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
                                                                    {!distinctGuides || distinctGuides <= 1 ? (
                                                                        s.guideNumber && (
                                                                            <Chip size="small" label={`guia ${s.guideNumber}`} sx={{ fontSize: '0.6rem', height: 16, bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600, flexShrink: 0 }} />
                                                                        )
                                                                    ) : null}
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                                                    <Typography fontSize="0.78rem" fontWeight={700} color="#1E293B">{fmtBRL(s.value)}</Typography>
                                                                    <StatusBadge status={s.billingStatus} />
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    );
                                                });
                                            })()}
                                        </Box>
                                    </Collapse>
                                </Box>
                            </Card>
                        );
                    })}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 1 }}>
                        <Typography fontSize="0.72rem" fontWeight={700} color="#94A3B8" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Total · {totalSessions} sessõe{totalSessions !== 1 ? 's' : ''}
                        </Typography>
                        <Typography fontWeight={800} fontSize="0.95rem" color="#0F172A">{fmtBRL(total)}</Typography>
                    </Box>
                </Box>
            )}
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
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
                                                    💜 {fmtBRL(production)} produção
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                                                    🔵 {fmtBRL(billed)} faturado
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                                    🟢 {fmtBRL(received)} recebido
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
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
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/25 text-[10px] font-bold">
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
                            subtitle={
                                <span className="text-xs text-gray-500">
                                    {drawerPatient.rows.length} registro(s) · {fmtBRL(drawerPatient.rows.reduce((s, r) => s + r.value, 0))}
                                </span>
                            }
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
