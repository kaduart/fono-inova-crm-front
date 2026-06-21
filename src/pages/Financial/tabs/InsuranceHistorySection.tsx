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
} from '@mui/material';
import { TrendingUp, Download, ChevronRight, ChevronDown, SlidersHorizontal, X, ArrowLeft } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getInsuranceHistory, InsuranceHistoryMonth } from '../../../services/paymentService';
import { getSpecialtyLabel } from '../../../constants/specialties';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

// Barra de progresso simples estilo funil financeiro
function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-24 text-right">{fmtBRL(value)}</span>
        </div>
    );
}

// ── Tipos internos ─────────────────────────────────────────────────────────

interface FlatRow {
    monthKey: string;
    month: string;
    provider: string;
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

// ── Componente principal ───────────────────────────────────────────────────

interface InsuranceHistorySectionProps {
    activeYear?: number;
}

export default function InsuranceHistorySection({ activeYear }: InsuranceHistorySectionProps) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(activeYear ?? currentYear);
    const [data, setData] = useState<InsuranceHistoryMonth[]>([]);
    const [loading, setLoading] = useState(false);

    // Navegação drill-down
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

    // Filtros primários
    const [searchText, setSearchText] = useState('');

    // Filtros avançados
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSpecialty, setFilterSpecialty] = useState('all');

    const level = selectedPatient ? 3 : selectedProvider ? 2 : 1;

    useEffect(() => { load(); }, [year]);

    // Reset drill ao mudar ano
    useEffect(() => {
        setSelectedProvider(null);
        setSelectedPatient(null);
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
                    {/* FUNIL FINANCEIRO (nível 1 e 2) */}
                    {level < 3 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                            <Typography variant="caption" className="text-gray-500 uppercase tracking-wide font-semibold block mb-3">
                                {level === 1 ? 'Visão Geral' : selectedProvider}
                            </Typography>
                            <div className="space-y-2">
                                <FunnelBar label="Produção" value={level === 1 ? globalTotals.producao : providerTotals.value} max={level === 1 ? globalTotals.producao : providerTotals.value} color="#6366F1" />
                                <FunnelBar label="Faturado" value={level === 1 ? globalTotals.faturado : patientSummary.filter(p => p.status === 'billed').reduce((s, p) => s + p.value, 0)} max={level === 1 ? globalTotals.producao : providerTotals.value} color="#3B82F6" />
                                <FunnelBar label="Recebido"  value={level === 1 ? globalTotals.recebido  : patientSummary.filter(p => p.status === 'received').reduce((s, p) => s + p.value, 0)} max={level === 1 ? globalTotals.producao : providerTotals.value} color="#10B981" />
                                <FunnelBar label="Pendente"  value={level === 1 ? globalTotals.pendente  : patientSummary.filter(p => p.status === 'pending_batch').reduce((s, p) => s + p.value, 0)} max={level === 1 ? globalTotals.producao : providerTotals.value} color="#F59E0B" />
                            </div>
                        </div>
                    )}

                    {/* FILTROS */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <TextField
                            size="small"
                            placeholder={level === 1 ? 'Buscar convênio...' : 'Buscar paciente...'}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            sx={{ minWidth: 200 }}
                            InputProps={{
                                endAdornment: searchText ? (
                                    <button onClick={() => setSearchText('')}><X size={14} className="text-gray-400" /></button>
                                ) : undefined,
                            }}
                        />

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

                    {/* ── NÍVEL 1: Tabela de convênios ─────────────────────────────── */}
                    {level === 1 && (
                        <TableContainer component={Paper} variant="outlined" className="rounded-xl overflow-hidden">
                            <Table size="small">
                                <TableHead className="bg-gray-50">
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Convênio</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Sessões</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Produção</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Faturado</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Recebido</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Pendente</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {providerSummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" className="py-8 text-gray-400 text-sm">
                                                Nenhum convênio encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : providerSummary.map(p => (
                                        <TableRow key={p.provider} hover
                                            onClick={() => drillToProvider(p.provider)}
                                            className="cursor-pointer border-t border-gray-50 hover:bg-indigo-50/40 transition-colors">
                                            <TableCell>
                                                <span className="font-semibold text-gray-800">{p.provider}</span>
                                            </TableCell>
                                            <TableCell align="center" className="text-gray-600">{p.sessions}</TableCell>
                                            <TableCell align="right" className="font-semibold text-gray-800">{fmtBRL(p.producao)}</TableCell>
                                            <TableCell align="right" className="text-blue-600">{fmtBRL(p.faturado)}</TableCell>
                                            <TableCell align="right" className="text-emerald-600">{fmtBRL(p.recebido)}</TableCell>
                                            <TableCell align="right" className="text-amber-600">{fmtBRL(p.pendente)}</TableCell>
                                            <TableCell align="right">
                                                <ChevronRight size={16} className="text-gray-400" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* ── NÍVEL 2: Pacientes do convênio ───────────────────────────── */}
                    {level === 2 && (
                        <TableContainer component={Paper} variant="outlined" className="rounded-xl overflow-hidden">
                            <Table size="small">
                                <TableHead className="bg-gray-50">
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Sessões</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Valor</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {patientSummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" className="py-8 text-gray-400 text-sm">
                                                Nenhum paciente encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : patientSummary.map(p => (
                                        <TableRow key={p.name} hover
                                            onClick={() => drillToPatient(p.name)}
                                            className="cursor-pointer border-t border-gray-50 hover:bg-indigo-50/40 transition-colors">
                                            <TableCell>
                                                <div className="font-medium text-gray-800">{p.name}</div>
                                                {p.phone && <div className="text-xs text-gray-400">{p.phone}</div>}
                                            </TableCell>
                                            <TableCell align="center" className="text-gray-600">{p.sessions}</TableCell>
                                            <TableCell align="right" className="font-semibold text-gray-800">{fmtBRL(p.value)}</TableCell>
                                            <TableCell><StatusBadge status={p.status} /></TableCell>
                                            <TableCell align="right">
                                                <ChevronRight size={16} className="text-gray-400" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* ── NÍVEL 3: Especialidades do paciente ──────────────────────── */}
                    {level === 3 && (
                        <TableContainer component={Paper} variant="outlined" className="rounded-xl overflow-hidden">
                            <Table size="small">
                                <TableHead className="bg-gray-50">
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Mês</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Especialidade</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Sessões</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Valor</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {specialtyRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" className="py-8 text-gray-400 text-sm">
                                                Nenhum registro encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : specialtyRows.map((r, idx) => (
                                        <TableRow key={idx} className="border-t border-gray-50">
                                            <TableCell className="text-gray-600 capitalize">{r.month}</TableCell>
                                            <TableCell className="text-gray-700">{getSpecialtyLabel(r.specialty)}</TableCell>
                                            <TableCell align="center" className="text-gray-600">{r.sessions}</TableCell>
                                            <TableCell align="right" className="font-semibold text-gray-800">{fmtBRL(r.value)}</TableCell>
                                            <TableCell><StatusBadge status={r.status} /></TableCell>
                                        </TableRow>
                                    ))}
                                    {specialtyRows.length > 0 && (
                                        <TableRow className="bg-gray-50">
                                            <TableCell colSpan={2} className="font-semibold text-gray-700">Total</TableCell>
                                            <TableCell align="center" className="font-semibold">{specialtyRows.reduce((s, r) => s + r.sessions, 0)}</TableCell>
                                            <TableCell align="right" className="font-bold text-gray-900">{fmtBRL(specialtyRows.reduce((s, r) => s + r.value, 0))}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )}
        </Box>
    );
}
