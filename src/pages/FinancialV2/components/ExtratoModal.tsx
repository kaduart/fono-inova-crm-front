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
            <DialogTitle sx={{ pb: 1, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            📋 Extrato do Caixa
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {periodLabel} • {transactions.length} transações
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent dividers sx={{ p: 0 }}>
                {/* ======================================================
                    BLOCO 1: RESUMO INTELIGENTE
                    ====================================================== */}
                {summary && (
                    <Box sx={{ p: 3, bgcolor: '#f0fdf4' }}>
                        <Typography variant="h5" fontWeight="bold" color="success.main" gutterBottom>
                            💰 Total: {formatCurrency(summary.total)}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {/* Por Tipo */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2, bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                        📦 Por Tipo
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {/* Pacotes */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AccountBalanceWallet sx={{ color: '#ec4899', fontSize: 20 }} />
                                                <Typography variant="body2">
                                                    Pacotes vendidos
                                                </Typography>
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
                                        
                                        <Divider />
                                        
                                        {/* Sessões */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Person sx={{ color: '#3b82f6', fontSize: 20 }} />
                                                <Typography variant="body2">
                                                    Sessões avulsas
                                                </Typography>
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
                                        
                                        {/* Convênio (só mostra se > 0) */}
                                        {summary.byType.insurance.total > 0 && (
                                            <>
                                                <Divider />
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <LocalHospital sx={{ color: '#f59e0b', fontSize: 20 }} />
                                                        <Typography variant="body2">
                                                            Convênio
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" fontWeight="bold" color="#f59e0b">
                                                        {formatCurrency(summary.byType.insurance.total)}
                                                    </Typography>
                                                </Box>
                                            </>
                                        )}
                                    </Box>
                                </Paper>
                            </Grid>
                            
                            {/* Por Método */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2, bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                        💳 Por Forma de Pagamento
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {/* PIX */}
                                        <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">PIX</Typography>
                                                <Typography variant="body2" fontWeight="bold" color="#00b4d8">
                                                    {formatCurrency(summary.byMethod.pix)}
                                                </Typography>
                                            </Box>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={summary.total > 0 ? (summary.byMethod.pix / summary.total) * 100 : 0}
                                                sx={{ height: 8, borderRadius: 4, bgcolor: '#e0f7fa' }}
                                            />
                                        </Box>
                                        
                                        {/* Cartão */}
                                        <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">Cartão</Typography>
                                                <Typography variant="body2" fontWeight="bold" color="#7c3aed">
                                                    {formatCurrency(summary.byMethod.cartao)}
                                                </Typography>
                                            </Box>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={summary.total > 0 ? (summary.byMethod.cartao / summary.total) * 100 : 0}
                                                sx={{ height: 8, borderRadius: 4, bgcolor: '#ede9fe', '& .MuiLinearProgress-bar': { bgcolor: '#7c3aed' } }}
                                            />
                                        </Box>
                                        
                                        {/* Dinheiro */}
                                        <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">Dinheiro</Typography>
                                                <Typography variant="body2" fontWeight="bold" color="#059669">
                                                    {formatCurrency(summary.byMethod.dinheiro)}
                                                </Typography>
                                            </Box>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={summary.total > 0 ? (summary.byMethod.dinheiro / summary.total) * 100 : 0}
                                                sx={{ height: 8, borderRadius: 4, bgcolor: '#d1fae5', '& .MuiLinearProgress-bar': { bgcolor: '#059669' } }}
                                            />
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                <Divider />

                {/* ======================================================
                    BLOCO 2: FILTROS + LISTA DETALHADA
                    ====================================================== */}
                <Box sx={{ px: 2, pt: 2 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        📄 Lista Detalhada
                    </Typography>
                    
                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                        <Tab label={`Todas (${transactions.length})`} />
                        <Tab label={`Particular (${transactions.filter(t => t.type === 'appointment' || !t.type).length})`} />
                        <Tab label={`Pacotes (${transactions.filter(t => t.type === 'package' || t.type === 'pacote').length})`} />
                        <Tab label={`Convênio (${transactions.filter(t => t.type === 'insurance' || t.type === 'convenio').length})`} />
                    </Tabs>

                    {/* Tabela */}
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell width="50"><strong>Hora</strong></TableCell>
                                <TableCell><strong>Especificação</strong></TableCell>
                                <TableCell><strong>Paciente</strong></TableCell>
                                <TableCell width="90"><strong>Forma</strong></TableCell>
                                <TableCell align="right" width="110"><strong>Valor</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Receipt sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                                        <Typography color="text.secondary">
                                            Nenhuma transação nesta categoria
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.map((t) => {
                                    const specialty = getSpecialtyDisplay(t.specialty, t.serviceType);
                                    return (
                                        <TableRow key={t.id} hover>
                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                {t.time || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {getTypeIcon(t.type)}
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {t.especificacao || 'Atendimento'}
                                                    </Typography>
                                                </Box>
                                                {/* Mostra especialidade se existir */}
                                                {specialty && (
                                                    <Tooltip title={specialty.name} arrow>
                                                        <Chip
                                                            size="small"
                                                            icon={specialty.icon || undefined}
                                                            label={specialty.name}
                                                            sx={{
                                                                ml: 3,
                                                                mt: 0.5,
                                                                fontSize: '0.7rem',
                                                                height: 20,
                                                                bgcolor: `${specialty.color}15`,
                                                                color: specialty.color,
                                                                border: `1px solid ${specialty.color}30`,
                                                                '& .MuiChip-icon': {
                                                                    color: specialty.color,
                                                                    ml: '4px'
                                                                }
                                                            }}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {t.description && t.description !== t.especificacao && !t.specialty && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                                                        {t.description.substring(0, 30)}{t.description.length > 30 ? '...' : ''}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.875rem' }}>
                                                {t.patient || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={getMethodLabel(t.method)} 
                                                    size="small"
                                                    sx={{ 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: 'bold',
                                                        bgcolor: `${getMethodColor(t.method)}15`,
                                                        color: getMethodColor(t.method),
                                                        border: `1px solid ${getMethodColor(t.method)}30`
                                                    }} 
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="bold" color="success.main">
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
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                            Total em {activeTab === 0 ? 'Todas' : activeTab === 1 ? 'Particular' : activeTab === 2 ? 'Pacotes' : 'Convênio'}:
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                            {formatCurrency(totalFiltered)}
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ExtratoModal;
