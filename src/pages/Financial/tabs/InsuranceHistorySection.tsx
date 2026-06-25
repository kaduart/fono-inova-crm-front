// src/pages/Financial/tabs/InsuranceHistorySection.tsx
// Histórico de convênios — navegação 3 níveis: Convênio → Paciente → Especialidade

import {
    Box,
    CircularProgress,
    MenuItem,
    Select,
    Typography,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Button,
    Collapse,
    Chip,
    IconButton,
} from '@mui/material';
// Note: Table/TableContainer still used in PatientSessionDetails inner component
import { TrendingUp, Download, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal, X, ArrowLeft } from 'lucide-react';
import InsurancePatientDrawer from '../components/InsurancePatientDrawer';
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
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
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
}
function MetricStats({ production, billed, received, pending }: MetricStatsProps) {
    const stats = [
        { label: 'Produção', value: production, color: '#6366F1', bg: '#F5F3FF' },
        { label: 'Faturado', value: billed,     color: '#3B82F6', bg: '#EFF6FF' },
        { label: 'Recebido', value: received,   color: '#10B981', bg: '#F0FDF4' },
        { label: 'Pendente', value: pending,    color: '#F59E0B', bg: '#FFFBEB' },
    ];
    return (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {stats.map(s => (
                <Box key={s.label} sx={{
                    flex: '1 1 120px', px: 2, py: 1.5,
                    bgcolor: s.bg, borderRadius: 2,
                    borderTop: `3px solid ${s.color}`,
                }}>
                    <Typography fontSize="0.67rem" fontWeight={700} color="#94A3B8" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                        {s.label}
                    </Typography>
                    <Typography fontSize="0.92rem" fontWeight={800} color="#0F172A">{fmtBRL(s.value)}</Typography>
                    {production > 0 && (
                        <Typography fontSize="0.65rem" fontWeight={600} color={s.color}>
                            {((s.value / production) * 100).toFixed(0)}%
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
}

interface PatientSummary {
    name: string;
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
        const key = `${row.monthKey}__${row.specialty}`;
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

    function fmtDateShort(iso: string) {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    return (
        <TableContainer component={Paper} variant="outlined" className="rounded-xl overflow-hidden m-3" sx={{ width: 'calc(100% - 24px)' }}>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead className="bg-gray-50">
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600, width: 50 }} />
                        <TableCell sx={{ fontWeight: 600, width: 110 }}>Mês</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Especialidade</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, width: 90 }}>Sessões</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, width: 130 }}>Valor</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, width: 140 }}>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} align="center" className="py-8 text-gray-400 text-sm">
                                Nenhum registro encontrado.
                            </TableCell>
                        </TableRow>
                    ) : rows.map((r, idx) => {
                        const key = `${r.monthKey}__${r.specialty}`;
                        const isOpen = expanded.has(key);
                        const sessions = sessionsByKey[key] || [];
                        const isLoading = loadingByKey[key];
                        const error = errorByKey[key];
                        const canExpand = !!patientId;

                        return (
                            <>
                                <TableRow key={idx} className="border-t border-gray-50" hover={canExpand}>
                                    <TableCell sx={{ width: 50, p: 0 }}>
                                        {canExpand && (
                                            <IconButton size="small" onClick={() => toggle(r)} sx={{ p: 0.5 }}>
                                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-600 capitalize whitespace-nowrap">{fmtMonthShort(r.monthKey)}</TableCell>
                                    <TableCell className="text-gray-700">{getSpecialtyLabel(r.specialty)}</TableCell>
                                    <TableCell align="center" className="text-gray-600">{r.sessions}</TableCell>
                                    <TableCell align="right" className="font-semibold text-gray-800">{fmtBRL(r.value)}</TableCell>
                                    <TableCell align="center"><StatusBadge status={r.status} /></TableCell>
                                </TableRow>
                                {canExpand && (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                <Box sx={{ bgcolor: '#F8FAFC', px: 2, py: 1 }}>
                                                    {isLoading && (
                                                        <Box className="flex items-center gap-2 py-2 text-gray-500 text-xs">
                                                            <CircularProgress size={14} />
                                                            Carregando sessões...
                                                        </Box>
                                                    )}
                                                    {error && (
                                                        <Box className="text-red-600 text-xs py-2">{error}</Box>
                                                    )}
                                                    {!isLoading && !error && sessions.length === 0 && (
                                                        <Box className="text-gray-400 text-xs py-2">Nenhuma sessão encontrada.</Box>
                                                    )}
                                                    {!isLoading && !error && sessions.length > 0 && (
                                                        <Table size="small" sx={{ tableLayout: 'fixed' }}>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell sx={{ fontWeight: 600, width: 90 }}>Data</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600 }}>Profissional</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600, width: 110 }}>Guia</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 600, width: 110 }}>Valor</TableCell>
                                                                    <TableCell align="center" sx={{ fontWeight: 600, width: 120 }}>Status</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {sessions.map((s) => (
                                                                    <TableRow key={s.sessionId || s.paymentId} className="border-t border-gray-100">
                                                                        <TableCell className="text-gray-600 text-xs whitespace-nowrap">{fmtDateShort(s.date)}</TableCell>
                                                                        <TableCell className="text-gray-700 text-xs">{s.doctor?.fullName || '-'}</TableCell>
                                                                        <TableCell className="text-gray-500 text-xs">{s.guideNumber || '-'}</TableCell>
                                                                        <TableCell align="right" className="font-medium text-gray-800 text-xs">{fmtBRL(s.value)}</TableCell>
                                                                        <TableCell align="center"><StatusBadge status={s.billingStatus} /></TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        );
                    })}
                    {rows.length > 0 && (
                        <TableRow className="bg-gray-50">
                            <TableCell />
                            <TableCell colSpan={2} className="font-semibold text-gray-700">Total</TableCell>
                            <TableCell align="center" className="font-semibold">{rows.reduce((s, r) => s + r.sessions, 0)}</TableCell>
                            <TableCell align="right" className="font-bold text-gray-900">{fmtBRL(rows.reduce((s, r) => s + r.value, 0))}</TableCell>
                            <TableCell />
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
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

    // Navegação drill-down
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

    // Drawer de especialidades do paciente
    const [drawerPatient, setDrawerPatient] = useState<{ name: string; patientId?: string; provider: string; providerSlug?: string; rows: FlatRow[] } | null>(null);

    // Filtros primários
    const [searchText, setSearchText] = useState('');

    const _defaultMonth = (y: number, m?: number) =>
        m ? `${y}-${String(m).padStart(2, '0')}` : 'all';

    // Filtros avançados — mês inicia no mês ativo da aba pai
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filterMonth, setFilterMonth] = useState(() => _defaultMonth(activeYear ?? currentYear, activeMonth));
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSpecialty, setFilterSpecialty] = useState('all');

    const level = selectedPatient ? 3 : selectedProvider ? 2 : 1;

    useEffect(() => {
        setSelectedProvider(null);
        setSelectedPatient(null);
        load();
    }, [year]);

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

    // ── Nível 1: resumo por convênio ───────────────────────────────────────
    const providerSummary = useMemo<ProviderSummary[]>(() => {
        const search = searchText.toLowerCase();
        const map = new Map<string, ProviderSummary>();
        advFiltered.forEach(r => {
            if (search && !r.provider.toLowerCase().includes(search)) return;
            if (!map.has(r.provider)) map.set(r.provider, { provider: r.provider, sessions: 0, producao: 0, faturado: 0, recebido: 0, pendente: 0 });
            const e = map.get(r.provider)!;
            e.sessions += r.sessions;
            e.producao += r.value;
            if (r.status === 'received') e.recebido += r.value;
            else if (r.status === 'billed') e.faturado += r.value;
            else e.pendente += r.value;
        });
        return [...map.values()].sort((a, b) => b.producao - a.producao);
    }, [advFiltered, searchText]);

    const globalTotals = useMemo(() => providerSummary.reduce(
        (acc, p) => ({ producao: acc.producao + p.producao, faturado: acc.faturado + p.faturado, recebido: acc.recebido + p.recebido, pendente: acc.pendente + p.pendente }),
        { producao: 0, faturado: 0, recebido: 0, pendente: 0 }
    ), [providerSummary]);

    // ── Nível 2: pacientes do convênio selecionado ─────────────────────────
    const patientSummary = useMemo<PatientSummary[]>(() => {
        if (!selectedProvider) return [];
        const search = searchText.toLowerCase();
        const map = new Map<string, { name: string; phone?: string; sessions: number; value: number; statuses: Set<string> }>();
        advFiltered
            .filter(r => r.provider === selectedProvider)
            .forEach(r => {
                if (search && !r.patientName.toLowerCase().includes(search)) return;
                if (!map.has(r.patientName)) map.set(r.patientName, { name: r.patientName, phone: r.patientPhone, sessions: 0, value: 0, statuses: new Set() });
                const e = map.get(r.patientName)!;
                e.sessions += r.sessions;
                e.value += r.value;
                e.statuses.add(r.status);
            });
        return [...map.values()].map(e => ({
            name: e.name,
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

    // ── Nível 3: especialidades do paciente ────────────────────────────────
    const specialtyRows = useMemo<FlatRow[]>(() => {
        if (!selectedProvider || !selectedPatient) return [];
        return advFiltered
            .filter(r => r.provider === selectedProvider && r.patientName === selectedPatient)
            .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }, [advFiltered, selectedProvider, selectedPatient]);

    // ── Listas para selects avançados ──────────────────────────────────────
    const months = useMemo(() => {
        const seen = new Map<string, string>();
        flatRows.forEach(r => { if (!seen.has(r.monthKey)) seen.set(r.monthKey, r.month); });
        return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [flatRows]);

    const specialties = useMemo(() => [...new Set(flatRows.map(r => r.specialty))], [flatRows]);

    const hasAdvancedFilters = filterMonth !== 'all' || filterStatus !== 'all' || filterSpecialty !== 'all';

    function goBack() {
        if (selectedPatient) { setSelectedPatient(null); setSearchText(''); }
        else if (selectedProvider) { setSelectedProvider(null); setSearchText(''); }
    }

    function drillToProvider(p: string) { setSelectedProvider(p); setSelectedPatient(null); setSearchText(''); }
    function drillToPatient(name: string) { setSelectedPatient(name); setSearchText(''); }
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
                            <button onClick={() => { setSelectedProvider(null); setSelectedPatient(null); setSearchText(''); }}
                                className={`hover:text-indigo-600 ${level === 1 ? 'font-bold text-gray-800' : ''}`}>
                                Histórico
                            </button>
                            {selectedProvider && (
                                <>
                                    <ChevronRight size={14} />
                                    <button onClick={() => { setSelectedPatient(null); setSearchText(''); }}
                                        className={`hover:text-indigo-600 ${level === 2 ? 'font-bold text-gray-800' : ''}`}>
                                        {selectedProvider}
                                    </button>
                                </>
                            )}
                            {selectedPatient && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className="font-bold text-gray-800">{selectedPatient}</span>
                                </>
                            )}
                        </div>
                        <Typography variant="caption" color="text.secondary">
                            {level === 1 && `${providerSummary.length} convênios · ${fmtBRL(globalTotals.producao)} produção`}
                            {level === 2 && `${patientSummary.length} pacientes · ${providerTotals.sessions} sessões · ${fmtBRL(providerTotals.value)}`}
                            {level === 3 && `${specialtyRows.length} registros · ${fmtBRL(specialtyRows.reduce((s, r) => s + r.value, 0))}`}
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
                    {/* MÉTRICAS */}
                    {level < 3 && (
                        <Box sx={{ mb: 3 }}>
                            <MetricStats
                                production={level === 1 ? globalTotals.producao : providerTotals.value}
                                billed={level === 1 ? globalTotals.faturado : patientSummary.filter(p => p.status === 'billed').reduce((s, p) => s + p.value, 0)}
                                received={level === 1 ? globalTotals.recebido : patientSummary.filter(p => p.status === 'received').reduce((s, p) => s + p.value, 0)}
                                pending={level === 1 ? globalTotals.pendente : patientSummary.filter(p => p.status === 'pending_batch').reduce((s, p) => s + p.value, 0)}
                            />
                        </Box>
                    )}

                    {/* FILTROS */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {/* Busca só no nível 2 (pacientes) — no nível 1 você navega clicando */}
                        {level >= 2 && (
                            <TextField
                                size="small"
                                placeholder="Buscar paciente..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                sx={{ minWidth: 200 }}
                                InputProps={{
                                    endAdornment: searchText ? (
                                        <button onClick={() => setSearchText('')}><X size={14} className="text-gray-400" /></button>
                                    ) : undefined,
                                }}
                            />
                        )}

                        <Button
                            size="small"
                            variant={showAdvanced ? 'contained' : 'outlined'}
                            color={hasAdvancedFilters ? 'primary' : 'inherit'}
                            startIcon={<SlidersHorizontal size={14} />}
                            onClick={() => setShowAdvanced(v => !v)}
                            endIcon={<ChevronDown size={12} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                        >
                            Filtros avançados
                            {hasAdvancedFilters && <Chip label={[filterMonth !== 'all', filterStatus !== 'all', filterSpecialty !== 'all'].filter(Boolean).length} size="small" color="primary" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />}
                        </Button>

                        {(searchText || hasAdvancedFilters) && (
                            <Button size="small" variant="text" color="inherit" onClick={() => { setSearchText(''); setFilterMonth('all'); setFilterStatus('all'); setFilterSpecialty('all'); }}
                                startIcon={<X size={14} />} className="text-gray-400">
                                Limpar
                            </Button>
                        )}
                    </div>

                    <Collapse in={showAdvanced}>
                        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Mês</InputLabel>
                                <Select value={filterMonth} label="Mês" onChange={e => setFilterMonth(e.target.value)}>
                                    <MenuItem value="all">Todos os meses</MenuItem>
                                    {months.map(([key, label]) => <MenuItem key={key} value={key} sx={{ textTransform: 'capitalize' }}>{label}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Status</InputLabel>
                                <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                                    <MenuItem value="all">Todos</MenuItem>
                                    {Object.entries(STATUS_STYLE).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Especialidade</InputLabel>
                                <Select value={filterSpecialty} label="Especialidade" onChange={e => setFilterSpecialty(e.target.value)}>
                                    <MenuItem value="all">Todas</MenuItem>
                                    {specialties.map(s => <MenuItem key={s} value={s}>{getSpecialtyLabel(s)}</MenuItem>)}
                                </Select>
                            </FormControl>
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
                </>
            )}
        </Box>
    );
}
