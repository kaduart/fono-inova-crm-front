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
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
                Receita por Especialidade - {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
            </Typography>

            <Grid container spacing={3}>
                {specialties.map((spec) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={spec.specialty}>
                        <Card sx={{
                            borderTop: 6,
                            borderColor: getSpecialtyColor(spec.specialty),
                            height: '100%',
                            boxShadow: 2,
                            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                            transition: 'all 0.2s ease-in-out'
                        }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom variant="overline" sx={{ letterSpacing: 1.2 }}>
                                    {spec.specialty.replace('_', ' ')}
                                </Typography>

                                <Typography variant="h4" component="div" sx={{ fontWeight: '700', my: 1, color: '#2c3e50' }}>
                                    {formatCurrency(spec.totalRevenue)}
                                </Typography>

                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={`${spec.totalSessions} sessões`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontWeight: '500' }}
                                    />
                                    <Chip
                                        label={`Ticket: ${formatCurrency(spec.averageTicket)}`}
                                        size="small"
                                        color="primary"
                                        sx={{ fontWeight: '500' }}
                                    />
                                </Box>

                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <Box>
                                        <Typography variant="caption" display="block" color="textSecondary" sx={{ fontWeight: '500' }}>
                                            {spec.uniquePatientCount} pacientes únicos
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" color="textSecondary" sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        {totalGeral > 0 ? ((spec.totalRevenue / totalGeral) * 100).toFixed(1) : 0}%
                                    </Typography>
                                </Box>

                                {spec.specialty.toUpperCase() === 'OUTROS' && spec.totalSessions > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <button
                                            onClick={() => setDetailSpecialty(spec.specialty)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                        >
                                            Ver o que compõe "Outros"
                                        </button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {detailSpecialty && (
                <SpecialtyDetailModal
                    open={!!detailSpecialty}
                    onClose={() => setDetailSpecialty(null)}
                    specialty={detailSpecialty}
                    dateRange={dateRange}
                />
            )}
        </Box>
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
