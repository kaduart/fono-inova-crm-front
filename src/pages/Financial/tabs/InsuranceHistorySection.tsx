// src/pages/Financial/tabs/InsuranceHistorySection.tsx
// Histórico acumulado mês a mês — Convênios (versão table-first)

import {
    Box,
    CircularProgress,
    MenuItem,
    Select,
    Typography,
    TextField,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Grid,
    Card,
    CardContent,
    Button,
} from '@mui/material';
import { TrendingUp, Download, Filter, X } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getInsuranceHistory, InsuranceHistoryMonth, InsuranceHistoryPatient } from '../../../services/paymentService';
import { getSpecialtyLabel } from '../../../constants/specialties';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending_batch: { label: 'Aguardando Lote', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
    billed:        { label: 'Faturado',        color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
    received:      { label: 'Recebido',        color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
};

function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.pending_batch;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: s.bg, color: s.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
}

interface InsuranceHistorySectionProps {
    activeYear?: number;
}

// ─── Componente de card de resumo ──────────────────────────────────────────
function SummaryCard({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color: string }) {
    return (
        <Card variant="outlined" className="border-l-4" style={{ borderLeftColor: color }}>
            <CardContent className="py-3 px-4">
                <Typography variant="caption" className="text-gray-500 font-medium uppercase tracking-wide">
                    {label}
                </Typography>
                <Typography variant="h6" fontWeight="bold" className="text-gray-800">
                    {value}
                </Typography>
                {subtitle && <Typography variant="caption" className="text-gray-400">{subtitle}</Typography>}
            </CardContent>
        </Card>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function InsuranceHistorySection({ activeYear }: InsuranceHistorySectionProps) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(activeYear ?? currentYear);
    const [data, setData] = useState<InsuranceHistoryMonth[]>([]);
    const [loading, setLoading] = useState(false);

    // 🔹 Filtros
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [searchPatient, setSearchPatient] = useState<string>('');

    useEffect(() => {
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

    // ── Extrair dados planos para tabela ──────────────────────────────────
    const flatRows = useMemo(() => {
        const rows: {
            month: string;
            monthKey: string;
            provider: string;
            specialty: string;
            sessions: number;
            value: number;
            status: string;
            patientName: string;
            patientPhone?: string;
        }[] = [];

        data.forEach(month => {
            month.providers.forEach(prov => {
                prov.patients.forEach(pat => {
                    pat.specialties.forEach(sp => {
                        rows.push({
                            month: month.monthLabel,
                            monthKey: month.monthKey,
                            provider: prov.providerLabel,
                            specialty: sp.specialty,
                            sessions: sp.sessions,
                            value: sp.value,
                            status: sp.batchStatus,
                            patientName: pat.name,
                            patientPhone: pat.phone,
                        });
                    });
                });
            });
        });
        return rows;
    }, [data]);

    // ── Filtros aplicados ──────────────────────────────────────────────────
    const filteredRows = useMemo(() => {
        return flatRows.filter(row => {
            const matchProvider = filterProvider === 'all' || row.provider === filterProvider;
            const matchStatus = filterStatus === 'all' || row.status === filterStatus;
            const matchSpecialty = filterSpecialty === 'all' || row.specialty === filterSpecialty;
            const matchPatient = row.patientName.toLowerCase().includes(searchPatient.toLowerCase());
            return matchProvider && matchStatus && matchSpecialty && matchPatient;
        });
    }, [flatRows, filterProvider, filterStatus, filterSpecialty, searchPatient]);

    // ── Resumo para cards ──────────────────────────────────────────────────
    const totals = useMemo(() => {
        const total = flatRows.reduce((s, r) => s + r.value, 0);
        const faturado = flatRows.filter(r => r.status === 'billed').reduce((s, r) => s + r.value, 0);
        const recebido = flatRows.filter(r => r.status === 'received').reduce((s, r) => s + r.value, 0);
        const pendente = flatRows.filter(r => r.status === 'pending_batch').reduce((s, r) => s + r.value, 0);
        return { total, faturado, recebido, pendente };
    }, [flatRows]);

    // ── Lista única de provedores para filtro ──────────────────────────────
    const providers = useMemo(() => {
        const p = new Set(flatRows.map(r => r.provider));
        return ['all', ...Array.from(p)];
    }, [flatRows]);

    const specialties = useMemo(() => {
        const s = new Set(flatRows.map(r => r.specialty));
        return ['all', ...Array.from(s)];
    }, [flatRows]);

    // ── Reset filters ──────────────────────────────────────────────────────
    function clearFilters() {
        setFilterProvider('all');
        setFilterStatus('all');
        setFilterSpecialty('all');
        setSearchPatient('');
    }

    const hasActiveFilters = filterProvider !== 'all' || filterStatus !== 'all' || filterSpecialty !== 'all' || searchPatient !== '';

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <Box>
            {/* 🔹 HEADER */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                        Histórico de Convênios
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {flatRows.length} registros · {fmtBRL(totals.total)} no período
                    </Typography>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        size="small"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        sx={{ minWidth: 100, fontSize: '0.875rem' }}
                    >
                        {[currentYear, currentYear - 1].map(y => (
                            <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                    </Select>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Download size={16} />}
                        className="text-xs"
                    >
                        Exportar
                    </Button>
                </div>
            </div>

            {/* 🔹 CARDS DE RESUMO */}
            {!loading && data.length > 0 && (
                <Grid container spacing={2} className="mb-5">
                    <Grid item xs={6} sm={3}>
                        <SummaryCard label="Produção Total" value={fmtBRL(totals.total)} color="#6366F1" />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <SummaryCard label="Faturado" value={fmtBRL(totals.faturado)} color="#3B82F6" />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <SummaryCard label="Recebido" value={fmtBRL(totals.recebido)} color="#10B981" />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <SummaryCard label="Pendente" value={fmtBRL(totals.pendente)} color="#F59E0B" />
                    </Grid>
                </Grid>
            )}

            {loading && (
                <Box className="flex justify-center py-10">
                    <CircularProgress size={28} />
                </Box>
            )}

            {!loading && data.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    <TrendingUp size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum dado encontrado para {year}</p>
                </div>
            )}

            {!loading && data.length > 0 && (
                <>
                    {/* 🔹 FILTROS */}
                    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Convênio</InputLabel>
                            <Select value={filterProvider} label="Convênio" onChange={e => setFilterProvider(e.target.value)}>
                                <MenuItem value="all">Todos</MenuItem>
                                {providers.filter(p => p !== 'all').map(p => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                                <MenuItem value="all">Todos</MenuItem>
                                {Object.keys(STATUS_STYLE).map(s => (
                                    <MenuItem key={s} value={s}>{STATUS_STYLE[s].label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Especialidade</InputLabel>
                            <Select value={filterSpecialty} label="Especialidade" onChange={e => setFilterSpecialty(e.target.value)}>
                                <MenuItem value="all">Todas</MenuItem>
                                {specialties.filter(s => s !== 'all').map(s => (
                                    <MenuItem key={s} value={s}>{getSpecialtyLabel(s)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            placeholder="Buscar paciente..."
                            value={searchPatient}
                            onChange={e => setSearchPatient(e.target.value)}
                            className="flex-1 min-w-[160px]"
                            InputProps={{
                                startAdornment: <Filter size={14} className="text-gray-400 mr-1" />,
                            }}
                        />

                        {hasActiveFilters && (
                            <Button
                                size="small"
                                variant="text"
                                onClick={clearFilters}
                                startIcon={<X size={14} />}
                                className="text-gray-500"
                            >
                                Limpar
                            </Button>
                        )}

                        <div className="ml-auto text-xs text-gray-400">
                            {filteredRows.length} registros
                        </div>
                    </div>

                    {/* 🔹 TABELA PRINCIPAL */}
                    <TableContainer component={Paper} variant="outlined" className="rounded-xl overflow-hidden">
                        <Table size="small">
                            <TableHead className="bg-gray-50">
                                <TableRow>
                                    <TableCell className="font-semibold text-gray-600">Mês</TableCell>
                                    <TableCell className="font-semibold text-gray-600">Convênio</TableCell>
                                    <TableCell className="font-semibold text-gray-600">Paciente</TableCell>
                                    <TableCell className="font-semibold text-gray-600">Especialidade</TableCell>
                                    <TableCell align="center" className="font-semibold text-gray-600">Sessões</TableCell>
                                    <TableCell align="right" className="font-semibold text-gray-600">Valor</TableCell>
                                    <TableCell className="font-semibold text-gray-600">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                            Nenhum registro encontrado com os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRows.map((row, idx) => (
                                        <TableRow key={idx} hover className="border-t border-gray-50">
                                            <TableCell className="text-sm font-medium text-gray-700">{row.month}</TableCell>
                                            <TableCell className="text-sm text-gray-700">{row.provider}</TableCell>
                                            <TableCell className="text-sm text-gray-800">
                                                {row.patientName}
                                                {row.patientPhone && <span className="ml-1 text-xs text-gray-400">({row.patientPhone})</span>}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">{getSpecialtyLabel(row.specialty)}</TableCell>
                                            <TableCell align="center">{row.sessions}</TableCell>
                                            <TableCell align="right" className="font-semibold text-gray-800">{fmtBRL(row.value)}</TableCell>
                                            <TableCell><StatusBadge status={row.status} /></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* 🔹 VISÃO POR CONVÊNIO (resumo adicional) */}
                    <div className="mt-6">
                        <Typography variant="subtitle2" fontWeight={600} className="mb-2 text-gray-700">
                            Resumo por Convênio
                        </Typography>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {Array.from(new Set(flatRows.map(r => r.provider))).map(prov => {
                                const items = flatRows.filter(r => r.provider === prov);
                                const total = items.reduce((s, r) => s + r.value, 0);
                                const faturado = items.filter(r => r.status === 'billed').reduce((s, r) => s + r.value, 0);
                                const recebido = items.filter(r => r.status === 'received').reduce((s, r) => s + r.value, 0);
                                const pendente = items.filter(r => r.status === 'pending_batch').reduce((s, r) => s + r.value, 0);
                                return (
                                    <div key={prov} className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold text-gray-800">{prov}</span>
                                            <span className="text-xs text-gray-400">{items.length} registros</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                                            <div><span className="text-gray-500">Total:</span> <span className="font-semibold">{fmtBRL(total)}</span></div>
                                            <div><span className="text-blue-600">Faturado:</span> {fmtBRL(faturado)}</div>
                                            <div><span className="text-emerald-600">Recebido:</span> {fmtBRL(recebido)}</div>
                                            <div><span className="text-amber-600">Pendente:</span> {fmtBRL(pendente)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </Box>
    );
}