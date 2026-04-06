import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { 
    Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Chip,
    Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, LinearProgress,
    Grid, Divider, Paper, Tooltip
} from '@mui/material';
import { 
    Close, Person, LocalHospital, AccountBalanceWallet, Receipt, 
    Mic, Psychology, Accessibility, FitnessCenter, MusicNote, DirectionsRun, School,
    PsychologyAlt, Medication
} from '@mui/icons-material';
import { formatCurrency } from '../../../utils/format';

interface Transaction {
    id: string;
    date: string;
    time: string;
    amount: number;
    method: string;
    type: string;
    especificacao: string;
    description: string;
    patient: string;
    doctor: string;
    specialty: string | null;
    serviceType: string | null;
}

interface Specialty {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface ExtratoSummary {
    total: number;
    count: number;
    byType: {
        package: { count: number; total: number };
        appointment: { count: number; total: number };
        insurance: { count: number; total: number };
    };
    byMethod: {
        pix: number;
        cartao: number;
        dinheiro: number;
    };
}

interface ExtratoData {
    transactions: Transaction[];
    summary: ExtratoSummary;
}

interface ExtratoModalProps {
    open: boolean;
    onClose: () => void;
    startDate: string;
    endDate: string;
    periodLabel: string;
}

// Mapeamento de especialidades para tradução e ícones
const SPECIALTY_MAP: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
    fonoaudiologia: { name: 'Fonoaudiologia', icon: <Mic sx={{ fontSize: 16 }} />, color: '#4CAF50' },
    neuroped: { name: 'Neuropediatria', icon: <Medication sx={{ fontSize: 16 }} />, color: '#2196F3' },
    psicologia: { name: 'Psicologia', icon: <Psychology sx={{ fontSize: 16 }} />, color: '#FF9800' },
    terapia_ocupacional: { name: 'Terapia Ocupacional', icon: <Accessibility sx={{ fontSize: 16 }} />, color: '#9C27B0' },
    fisioterapia: { name: 'Fisioterapia', icon: <FitnessCenter sx={{ fontSize: 16 }} />, color: '#F44336' },
    musicoterapia: { name: 'Musicoterapia', icon: <MusicNote sx={{ fontSize: 16 }} />, color: '#17c041' },
    psicomotricidade: { name: 'Psicomotricidade', icon: <DirectionsRun sx={{ fontSize: 16 }} />, color: '#FF5722' },
    psicopedagogia: { name: 'Psicopedagogia', icon: <School sx={{ fontSize: 16 }} />, color: '#9C27B0' },
    neuropsicologia: { name: 'Neuropsicologia', icon: <PsychologyAlt sx={{ fontSize: 16 }} />, color: '#673AB7' },
    tongue_tie_test: { name: 'Teste da Linguinha', icon: <Mic sx={{ fontSize: 16 }} />, color: '#E91E63' },
    neuropsych_evaluation: { name: 'Avaliação Neuropsicológica', icon: <PsychologyAlt sx={{ fontSize: 16 }} />, color: '#673AB7' },
};

// Mapeamento de tipos de serviço
const SERVICE_TYPE_MAP: Record<string, string> = {
    evaluation: 'Avaliação',
    session: 'Sessão',
    package_session: 'Sessão de Pacote',
    tongue_tie_test: 'Teste da Linguinha',
    neuropsych_evaluation: 'Avaliação Neuropsicológica',
    individual_session: 'Sessão Individual',
    meet: 'Meet',
    alignment: 'Alinhamento'
};

const fetchExtrato = async (startDate: string, endDate: string): Promise<ExtratoData> => {
    const response = await API.get('/v2/cashflow/transactions', { 
        params: { startDate, endDate, limit: 200 } 
    });
    return {
        transactions: response.data.data.transactions,
        summary: response.data.data.summary
    };
};

const fetchSpecialties = async (): Promise<Specialty[]> => {
    const response = await API.get('/specialties');
    return response.data;
};

export const ExtratoModal = ({ open, onClose, startDate, endDate, periodLabel }: ExtratoModalProps) => {
    const [activeTab, setActiveTab] = useState(0);
    
      const { data, isLoading } = useQuery({
        queryKey: ['extrato', startDate, endDate],
        queryFn: () => fetchExtrato(startDate, endDate),
        enabled: open && !!startDate && !!endDate
    });

    const { data: specialties } = useQuery({
        queryKey: ['specialties'],
        queryFn: fetchSpecialties,
        enabled: open
    });

    const transactions = data?.transactions || [];
    const summary = data?.summary;

    // Cria mapa de especialidades do backend
    const specialtyMap = useMemo(() => {
        const map: Record<string, Specialty> = {};
        specialties?.forEach((s: Specialty) => {
            map[s.id] = s;
        });
        return map;
    }, [specialties]);

    // Filtra por tipo
    const filteredTransactions = useMemo(() => {
        if (activeTab === 0) return transactions;
        if (activeTab === 1) return transactions.filter(t => t.type === 'appointment' || !t.type || t.type === 'particular');
        if (activeTab === 2) return transactions.filter(t => t.type === 'package' || t.type === 'pacote');
        return transactions.filter(t => t.type === 'insurance' || t.type === 'convenio');
    }, [transactions, activeTab]);

    const totalFiltered = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Cores
    const getMethodColor = (method: string) => {
        const m = method?.toLowerCase() || '';
        if (m.includes('pix')) return '#00b4d8';
        if (m.includes('card') || m.includes('cartao') || m.includes('cartão')) return '#7c3aed';
        if (m.includes('cash') || m.includes('dinheiro')) return '#059669';
        return '#6b7280';
    };

    const getMethodLabel = (method: string) => {
        const m = method?.toLowerCase() || '';
        if (m.includes('pix')) return 'PIX';
        if (m.includes('card') || m.includes('cartao') || m.includes('cartão')) return 'CARTÃO';
        if (m.includes('cash') || m.includes('dinheiro')) return 'DINHEIRO';
        return method?.toUpperCase() || '—';
    };

    const getTypeIcon = (type: string) => {
        if (type === 'package' || type === 'pacote') 
            return <AccountBalanceWallet sx={{ fontSize: 18, color: '#ec4899' }} />;
        if (type === 'insurance' || type === 'convenio') 
            return <LocalHospital sx={{ fontSize: 18, color: '#f59e0b' }} />;
        return <Person sx={{ fontSize: 18, color: '#3b82f6' }} />;
    };

    // Função para obter nome da especialidade traduzida
    const getSpecialtyDisplay = (specialty: string | null, serviceType: string | null) => {
        if (!specialty) {
            // Se não tem specialty, tenta inferir do serviceType
            if (serviceType && SERVICE_TYPE_MAP[serviceType]) {
                return { name: SERVICE_TYPE_MAP[serviceType], icon: null, color: '#6b7280' };
            }
            return null;
        }

        // Primeiro tenta o mapeamento local
        const mapped = SPECIALTY_MAP[specialty];
        if (mapped) return mapped;

        // Se não achou, tenta do backend
        const fromBackend = specialtyMap[specialty];
        if (fromBackend) {
            return {
                name: fromBackend.name,
                icon: <Person sx={{ fontSize: 16 }} />,
                color: fromBackend.color
            };
        }

        // Fallback: mostra o ID formatado
        return {
            name: specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            icon: <Person sx={{ fontSize: 16 }} />,
            color: '#6b7280'
        };
    };

   if (isLoading) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Carregando extrato...
                    </Typography>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            Extrato do Caixa
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {periodLabel} • {transactions.length} transações
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent dividers sx={{ p: 0, '& .MuiDialogContent-dividers': { borderTop: 'none' } }}>
                {/* ======================================================
                    BLOCO 1: RESUMO (cards minimalistas)
                    ====================================================== */}
                {summary && (
                    <Box sx={{ p: 2.5, bgcolor: '#F9FAFB', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1.5 }}>
                            {formatCurrency(summary.total)}
                        </Typography>
                        
                        <Grid container spacing={2}>
                            {/* Por Tipo */}
                            <Grid item xs={12} md={6}>
                                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                        Por Tipo
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {/* Pacotes */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AccountBalanceWallet sx={{ fontSize: 18, color: '#ec4899' }} />
                                                <Typography variant="body2">Pacotes</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="body2" fontWeight="bold" color="#ec4899">
                                                    {formatCurrency(summary.byType.package.total)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {summary.byType.package.count} venda{summary.byType.package.count !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: 0.5 }} />
                                        {/* Sessões avulsas */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Person sx={{ fontSize: 18, color: '#3b82f6' }} />
                                                <Typography variant="body2">Sessões avulsas</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="body2" fontWeight="bold" color="#3b82f6">
                                                    {formatCurrency(summary.byType.appointment.total)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {summary.byType.appointment.count} atendimento{summary.byType.appointment.count !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {summary.byType.insurance.total > 0 && (
                                            <>
                                                <Divider sx={{ my: 0.5 }} />
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <LocalHospital sx={{ fontSize: 18, color: '#f59e0b' }} />
                                                        <Typography variant="body2">Convênio</Typography>
                                                    </Box>
                                                    <Typography variant="body2" fontWeight="bold" color="#f59e0b">
                                                        {formatCurrency(summary.byType.insurance.total)}
                                                    </Typography>
                                                </Box>
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                            
                            {/* Por Método */}
                            <Grid item xs={12} md={6}>
                                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                        Por Forma de Pagamento
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {['pix', 'cartao', 'dinheiro'].map(method => {
                                            const value = summary.byMethod[method as keyof typeof summary.byMethod] || 0;
                                            const percent = summary.total > 0 ? (value / summary.total) * 100 : 0;
                                            const colors = {
                                                pix: { bg: '#e0f7fa', bar: '#00b4d8', text: '#00b4d8' },
                                                cartao: { bg: '#ede9fe', bar: '#7c3aed', text: '#7c3aed' },
                                                dinheiro: { bg: '#d1fae5', bar: '#059669', text: '#059669' }
                                            };
                                            const c = colors[method as keyof typeof colors];
                                            return (
                                                <Box key={method}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="body2">{method === 'pix' ? 'PIX' : method === 'cartao' ? 'Cartão' : 'Dinheiro'}</Typography>
                                                        <Typography variant="body2" fontWeight="bold" sx={{ color: c.text }}>
                                                            {formatCurrency(value)}
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress 
                                                        variant="determinate" 
                                                        value={percent}
                                                        sx={{ height: 4, borderRadius: 2, bgcolor: c.bg, '& .MuiLinearProgress-bar': { bgcolor: c.bar, borderRadius: 2 } }}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                <Divider />

                {/* ======================================================
                    BLOCO 2: FILTROS + LISTA DETALHADA
                    ====================================================== */}
                <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                        Lista Detalhada
                    </Typography>
                    
                    <Tabs 
                        value={activeTab} 
                        onChange={(_, v) => setActiveTab(v)} 
                        sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { py: 0.5, minHeight: 36, textTransform: 'none', fontSize: '0.75rem' } }}
                    >
                        <Tab label={`Todas (${transactions.length})`} />
                        <Tab label={`Particular (${transactions.filter(t => t.type === 'appointment' || !t.type).length})`} />
                        <Tab label={`Pacotes (${transactions.filter(t => t.type === 'package' || t.type === 'pacote').length})`} />
                        <Tab label={`Convênio (${transactions.filter(t => t.type === 'insurance' || t.type === 'convenio').length})`} />
                    </Tabs>

                    {/* Tabela compacta */}
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1, px: 1.5, fontSize: '0.75rem', borderBottom: '1px solid', borderColor: 'divider' } }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                                <TableCell width="60"><strong>Hora</strong></TableCell>
                                <TableCell><strong>Especificação</strong></TableCell>
                                <TableCell><strong>Paciente</strong></TableCell>
                                <TableCell width="80"><strong>Forma</strong></TableCell>
                                <TableCell align="right" width="100"><strong>Valor</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Receipt sx={{ fontSize: 32, color: 'grey.300', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Nenhuma transação nesta categoria
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.map((t) => {
                                    const specialty = getSpecialtyDisplay(t.specialty, t.serviceType);
                                    return (
                                        <TableRow key={t.id} hover>
                                            <TableCell sx={{ color: 'text.secondary' }}>
                                                {t.time || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {getTypeIcon(t.type)}
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {t.especificacao || 'Atendimento'}
                                                    </Typography>
                                                </Box>
                                                {specialty && (
                                                    <Chip
                                                        size="small"
                                                        icon={specialty.icon || undefined}
                                                        label={specialty.name}
                                                        sx={{
                                                            ml: 3,
                                                            mt: 0.5,
                                                            fontSize: '0.65rem',
                                                            height: 20,
                                                            bgcolor: `${specialty.color}15`,
                                                            color: specialty.color,
                                                            border: `1px solid ${specialty.color}30`,
                                                            '& .MuiChip-icon': { color: specialty.color, ml: '4px' }
                                                        }}
                                                    />
                                                )}
                                                {t.description && t.description !== t.especificacao && !t.specialty && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                                                        {t.description.length > 40 ? t.description.substring(0, 40) + '…' : t.description}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {t.patient || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={getMethodLabel(t.method)} 
                                                    size="small"
                                                    sx={{ 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: 500,
                                                        bgcolor: `${getMethodColor(t.method)}15`,
                                                        color: getMethodColor(t.method),
                                                        border: `1px solid ${getMethodColor(t.method)}30`,
                                                        height: 22
                                                    }} 
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="bold" color="success.main" variant="body2">
                                                    {formatCurrency(t.amount)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Box>

                {/* Rodapé */}
                <Box sx={{ p: 1.5, bgcolor: '#F9FAFB', borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Total {activeTab === 0 ? 'todas' : activeTab === 1 ? 'particular' : activeTab === 2 ? 'pacotes' : 'convênio'}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                            {formatCurrency(totalFiltered)}
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );

};

export default ExtratoModal;
