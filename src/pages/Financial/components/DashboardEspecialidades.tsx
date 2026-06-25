import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
// frontend/src/pages/Financial/components/DashboardEspecialidades.tsx
import React, { useState, useMemo } from 'react';
import {
    Card, CardContent, Typography, Box, Chip, Grid,
    Dialog, DialogTitle, DialogContent, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab
} from '@mui/material';
import { X } from 'lucide-react';
import { useSpecialtiesAnalytics, useSpecialtyDetails } from '../../../hooks/useSpecialtiesAnalytics';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getSpecialtyColor = (specialty: string) => {
    const s = specialty?.toUpperCase();
    const map: Record<string, string> = {
        'FONOAUDIOLOGIA': '#4CAF50',
        'PSICOLOGIA': '#2196F3',
        'FISIOTERAPIA': '#FF9800',
        'FONO': '#4CAF50',
        'PSICO': '#2196F3',
        'FISIO': '#FF9800',
        'TERAPIA_OCUPACIONAL': '#E91E63',
        'TO': '#E91E63'
    };
    return map[s] || '#757575';
};

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateShort = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const DashboardEspecialidades: React.FC = () => {
    const [dateRange] = useState(() => {
        const now = new Date();
        return {
            from: format(startOfMonth(now), 'yyyy-MM-dd'),
            to: format(endOfMonth(now), 'yyyy-MM-dd')
        };
    });

    const { data: specialties = [], isLoading: loadingSpecialties } = useSpecialtiesAnalytics(dateRange);
    const [detailSpecialty, setDetailSpecialty] = useState<string | null>(null);

    const totalGeral = specialties.reduce((acc, s) => acc + s.totalRevenue, 0);

    if (loadingSpecialties) {
        return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
    }

    if (specialties.length === 0) {
        return (
            <Box p={3} textAlign="center">
                <Typography color="textSecondary">Nenhum dado financeiro encontrado para este período.</Typography>
            </Box>
        );
    }

    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Receita por Especialidade · {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialties.map((spec) => {
                    const color = getSpecialtyColor(spec.specialty);
                    const pct = totalGeral > 0 ? (spec.totalRevenue / totalGeral) * 100 : 0;
                    const label = spec.specialty.replace(/_/g, ' ');
                    return (
                        <div key={spec.specialty} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <div style={{ height: 3, backgroundColor: color }} />
                            <div className="p-4 bg-white">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</p>
                                <p className="text-2xl font-black text-gray-900 mb-3">{formatCurrency(spec.totalRevenue)}</p>
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className="inline-flex items-center text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {spec.totalSessions} sessões
                                    </span>
                                    <span className="inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                        Ticket {formatCurrency(spec.averageTicket)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>{spec.uniquePatientCount} pacientes únicos</span>
                                    <span className="font-black text-gray-700">{pct.toFixed(1)}%</span>
                                </div>
                                <div className="h-[4px] w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
                                </div>
                                {spec.specialty.toUpperCase() === 'OUTROS' && spec.totalSessions > 0 && (
                                    <button
                                        onClick={() => setDetailSpecialty(spec.specialty)}
                                        className="mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                        Ver composição ↗
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {detailSpecialty && (
                <SpecialtyDetailModal
                    open={!!detailSpecialty}
                    onClose={() => setDetailSpecialty(null)}
                    specialty={detailSpecialty}
                    dateRange={dateRange}
                />
            )}
        </div>
    );
};

// ── Modal de detalhamento da especialidade ─────────────────────────────────

interface SpecialtyDetailModalProps {
    open: boolean;
    onClose: () => void;
    specialty: string;
    dateRange: { from: string; to: string };
}

function SpecialtyDetailModal({ open, onClose, specialty, dateRange }: SpecialtyDetailModalProps) {
    const { data: details, isLoading } = useSpecialtyDetails(dateRange, specialty);
    const [activeTab, setActiveTab] = useState(0);

    const hasData = details && details.items && details.items.length > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 6 }}>
                <span>Detalhamento: {specialty.replace('_', ' ')}</span>
                <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
                    <X size={18} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {isLoading ? (
                    <Box className="flex justify-center py-8">
                        <LoadingSpinner centered size="small" color="border-blue-600" />
                    </Box>
                ) : !hasData ? (
                    <Typography color="textSecondary" align="center" py={4}>
                        Nenhum detalhe encontrado para este grupo.
                    </Typography>
                ) : (
                    <Box>
                        <Box sx={{ mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Receita: <strong>{formatCurrency(details.totalRevenue)}</strong>
                            </Typography>
                            <Typography variant="subtitle2" color="textSecondary">
                                Sessões: <strong>{details.totalSessions}</strong>
                            </Typography>
                            <Typography variant="subtitle2" color="textSecondary">
                                Itens: <strong>{details.items.length}</strong>
                            </Typography>
                        </Box>

                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                            <Tab label="Itens" />
                            <Tab label="Por Método" />
                            <Tab label="Por Profissional" />
                            <Tab label="Por Tipo" />
                        </Tabs>

                        {activeTab === 0 && (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Data</TableCell>
                                            <TableCell>Paciente</TableCell>
                                            <TableCell>Profissional</TableCell>
                                            <TableCell>Especialidade bruta</TableCell>
                                            <TableCell>Origem</TableCell>
                                            <TableCell align="right">Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {details.items.map((item) => (
                                            <TableRow key={item._id}>
                                                <TableCell>{formatDateShort(item.date)}</TableCell>
                                                <TableCell>{item.patient?.fullName || '-'}</TableCell>
                                                <TableCell>{item.doctor?.fullName || '-'}</TableCell>
                                                <TableCell>{item.rawSpecialty || item.specialty || '-'}</TableCell>
                                                <TableCell>{item.source === 'payment' ? 'Particular' : 'Convênio/Pacote'}</TableCell>
                                                <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {activeTab === 1 && <BreakdownTable data={details.byPaymentMethod} />}
                        {activeTab === 2 && <DoctorBreakdownTable data={details.byDoctor} />}
                        {activeTab === 3 && <BreakdownTable data={details.bySessionType} />}
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function BreakdownTable({ data }: { data: Record<string, number> }) {
    const rows = useMemo(() => Object.entries(data || {}).sort((a, b) => b[1] - a[1]), [data]);
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Categoria</TableCell>
                        <TableCell align="right">Valor</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(([key, value]) => (
                        <TableRow key={key}>
                            <TableCell>{key || 'Não informado'}</TableCell>
                            <TableCell align="right">{formatCurrency(value)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function DoctorBreakdownTable({ data }: { data: Array<{ doctorId: string; doctorName: string; value: number; sessions: number }> }) {
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Profissional</TableCell>
                        <TableCell align="right">Sessões</TableCell>
                        <TableCell align="right">Valor</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(data || []).map((doc) => (
                        <TableRow key={doc.doctorId}>
                            <TableCell>{doc.doctorName}</TableCell>
                            <TableCell align="right">{doc.sessions}</TableCell>
                            <TableCell align="right">{formatCurrency(doc.value)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
