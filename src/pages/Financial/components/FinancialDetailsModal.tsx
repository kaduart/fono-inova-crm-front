// src/pages/Financial/components/FinancialDetailsModal.tsx
// Modal de detalhes para drill-down nos cards financeiros

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Divider,
    Button
} from '@mui/material';
import {
    Close,
    MedicalServices,
    Receipt,
    Wallet,
    AccountBalance,
    TrendingDown,
    CheckCircle,
    Warning
} from '@mui/icons-material';
import api from '../../../services/api';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const formatCurrency = (value: number) =>
    `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date: string) =>
    moment(date).tz(TIMEZONE).format('DD/MM/YYYY');

interface FinancialDetailsModalProps {
    open: boolean;
    onClose: () => void;
    type: 'producao' | 'faturado' | 'caixa' | 'receber' | 'despesas' | 'resultado' | 'devedores' | 'conv_receber' | null;
    period: { month: number; year: number };
    summaryData?: any;
}

export const FinancialDetailsModal = ({ open, onClose, type, period, summaryData }: FinancialDetailsModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [details, setDetails] = useState<any>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    useEffect(() => {
        if (open && type) {
            setPage(0);
            fetchDetails();
        }
    }, [open, type, period]);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            const startDate = moment.tz({ year: period.year, month: period.month, day: 1 }, TIMEZONE).toISOString();
            const endDate = moment.tz({ year: period.year, month: period.month, day: 1 }, TIMEZONE).endOf('month').toISOString();

            let response;
            switch (type) {
                case 'producao':
                    response = await api.get('/financial/convenio/metrics', {
                        params: { month: period.month + 1, year: period.year }
                    });
                    setDetails({ producao: response.data.data });
                    break;

                case 'faturado':
                    response = await api.get('/financial/convenio/faturamentos', {
                        params: { month: period.month + 1, year: period.year }
                    });
                    setDetails({ faturamentos: response.data.data });
                    break;

                case 'caixa':
                    response = await api.get('/payments/totals', {
                        params: { startDate, endDate, period: 'custom' }
                    });
                    setDetails({ caixa: response.data.data });
                    break;

                case 'despesas':
                    response = await api.get('/expenses', {
                        params: {
                            startDate: moment(startDate).format('YYYY-MM-DD'),
                            endDate: moment(endDate).format('YYYY-MM-DD'),
                            limit: 1000
                        }
                    });
                    setDetails({ expenses: response.data.data || [] });
                    break;

                case 'resultado':
                    const [paymentsRes, expensesRes] = await Promise.all([
                        api.get('/payments/totals', { params: { startDate, endDate, period: 'custom' } }),
                        api.get('/expenses', {
                            params: {
                                startDate: moment(startDate).format('YYYY-MM-DD'),
                                endDate: moment(endDate).format('YYYY-MM-DD'),
                                limit: 1000
                            }
                        })
                    ]);
                    setDetails({
                        payments: paymentsRes.data.data,
                        expenses: expensesRes.data.data || []
                    });
                    break;

                case 'devedores':
                    response = await api.get('/payments/balance/debtors');
                    setDetails({ devedores: response.data.data });
                    break;

                case 'conv_receber':
                    response = await api.get('/financial/v2/receivable-detail');
                    setDetails({ conv_receber: response.data.data });
                    break;

                default:
                    setDetails(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar detalhes');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        const baseTitle = {
            producao: 'Detalhamento da Produção',
            faturado: 'Detalhamento do Faturamento',
            caixa: 'Detalhamento do Caixa',
            receber: 'Contas a Receber',
            despesas: 'Detalhamento de Despesas',
            resultado: 'Composição do Resultado',
            devedores: 'Pacientes Devedores',
            conv_receber: 'Convênios a Receber (Guias em Aberto)'
        }[type || 'producao'];
        return `${baseTitle} - ${monthNames[period.month]} ${period.year}`;
    };

    const getIcon = () => {
        switch (type) {
            case 'producao': return <MedicalServices color="primary" />;
            case 'faturado': return <Receipt sx={{ color: '#8B5CF6' }} />;
            case 'caixa': return <Wallet color="success" />;
            case 'receber': return <AccountBalance color="warning" />;
            case 'despesas': return <TrendingDown color="error" />;
            case 'resultado': return <TrendingDown color="error" />;
            case 'devedores': return <Warning color="error" />;
            case 'conv_receber': return <AccountBalance color="warning" />;
            default: return null;
        }
    };

    const renderProducaoContent = () => {
        if (!details?.producao?.receitaRealizada) return <Alert severity="info">Nenhuma produção encontrada</Alert>;

        const receita = details.producao.receitaRealizada;

        return (
            <>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#E3F2FD', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                        Produção Total: {formatCurrency(receita.total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {receita.quantidadeSessoes} sessões realizadas
                    </Typography>
                </Box>
                
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Por Convênio
                </Typography>
                <TableContainer sx={{ mb: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#E3F2FD' }}>
                                <TableCell>Convênio</TableCell>
                                <TableCell align="right">Qtd</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(receita.porConvenio || {}).map(([convenio, data]: [string, any]) => (
                                <TableRow key={convenio}>
                                    <TableCell>{convenio}</TableCell>
                                    <TableCell align="right">{data.quantidade}</TableCell>
                                    <TableCell align="right">{formatCurrency(data.valor)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Por Especialidade
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#E3F2FD' }}>
                                <TableCell>Especialidade</TableCell>
                                <TableCell align="right">Qtd</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(receita.porEspecialidade || {}).map(([esp, data]: [string, any]) => (
                                <TableRow key={esp}>
                                    <TableCell>{esp}</TableCell>
                                    <TableCell align="right">{data.quantidade}</TableCell>
                                    <TableCell align="right">{formatCurrency(data.valor)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderFaturadoContent = () => {
        if (!details?.faturamentos) return <Alert severity="info">Nenhum faturamento encontrado</Alert>;

        const fat = details.faturamentos;

        return (
            <>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#F3E5F5', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#8B5CF6' }}>
                        Total Faturado: {formatCurrency(fat.total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {fat.quantidade} guias enviadas
                    </Typography>
                </Box>
                
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Por Status
                </Typography>
                <TableContainer sx={{ mb: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F3E5F5' }}>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Qtd</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(fat.porStatus || {}).map(([status, data]: [string, any]) => (
                                data.quantidade > 0 && (
                                    <TableRow key={status}>
                                        <TableCell>{data.descricao || status}</TableCell>
                                        <TableCell align="right">{data.quantidade}</TableCell>
                                        <TableCell align="right">{formatCurrency(data.valor)}</TableCell>
                                    </TableRow>
                                )
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Detalhamento
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F3E5F5' }}>
                                <TableCell>Paciente</TableCell>
                                <TableCell>Convênio</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(fat.faturamentos || []).slice(0, 50).map((f: any) => (
                                <TableRow key={f._id}>
                                    <TableCell>{f.patient}</TableCell>
                                    <TableCell>{f.convenio}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={f.status}
                                            size="small"
                                            color={f.status === 'received' ? 'success' : 'warning'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(f.valor)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderCaixaContent = () => {
        if (!details?.caixa?.totals) return <Alert severity="info">Nenhum pagamento encontrado</Alert>;

        const totals = details.caixa.totals;
        const byMethod = details.caixa.byMethod || [];

        return (
            <>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#E8F5E9', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                        Total Recebido: {formatCurrency(totals.totalReceived)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {totals.countReceived} pagamentos
                    </Typography>
                </Box>
                
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Por Método de Pagamento
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#E8F5E9' }}>
                                <TableCell>Método</TableCell>
                                <TableCell align="right">Qtd</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {byMethod.map((m: any) => (
                                <TableRow key={m._id}>
                                    <TableCell>
                                        <Chip
                                            label={m._id}
                                            size="small"
                                            color={m._id === 'pix' ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">{m.count}</TableCell>
                                    <TableCell align="right">{formatCurrency(m.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderDespesasContent = () => {
        if (!details?.expenses?.length) return <Alert severity="info">Nenhuma despesa encontrada</Alert>;

        const totalExpenses = details.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        const paginatedExpenses = details.expenses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        const totalPages = Math.ceil(details.expenses.length / PAGE_SIZE);

        return (
            <>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#FFEBEE', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                        Total Despesas: {formatCurrency(totalExpenses)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {details.expenses.length} registros
                    </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#FFEBEE' }}>
                                <TableCell>Data</TableCell>
                                <TableCell>Descrição</TableCell>
                                <TableCell>Categoria</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedExpenses.map((expense: any) => (
                                <TableRow key={expense._id}>
                                    <TableCell>{formatDate(expense.date)}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={expense.category}
                                            size="small"
                                            color={expense.category === 'commission' ? 'primary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(expense.amount || 0)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                        <Button 
                            size="small" 
                            disabled={page === 0} 
                            onClick={() => setPage(p => p - 1)}
                        >
                            Anterior
                        </Button>
                        <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                            Página {page + 1} de {totalPages}
                        </Typography>
                        <Button 
                            size="small" 
                            disabled={page >= totalPages - 1} 
                            onClick={() => setPage(p => p + 1)}
                        >
                            Próxima
                        </Button>
                    </Box>
                )}
            </>
        );
    };

    const renderResultadoContent = () => {
        if (!details) return <Alert severity="info">Dados não disponíveis</Alert>;

        const caixa = details.payments?.totals?.totalReceived || 0;
        const despesas = details.expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
        const resultado = caixa - despesas;

        return (
            <Box>
                <Alert severity={resultado >= 0 ? 'success' : 'error'} sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Resultado: {formatCurrency(resultado)}
                    </Typography>
                </Alert>

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                    <Wallet color="success" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Entradas (Caixa)
                </Typography>
                <TableContainer sx={{ mb: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#E8F5E9' }}>
                                <TableCell>Origem</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>Particular Recebido</TableCell>
                                <TableCell align="right">{formatCurrency(details.payments?.totals?.particularReceived || 0)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Convênio Recebido</TableCell>
                                <TableCell align="right">{formatCurrency(details.payments?.totals?.totalInsuranceReceived || 0)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ fontWeight: 'bold', bgcolor: '#E8F5E9' }}>
                                <TableCell><strong>Total Caixa</strong></TableCell>
                                <TableCell align="right"><strong>{formatCurrency(caixa)}</strong></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    <TrendingDown color="error" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Saídas (Despesas)
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#FFEBEE' }}>
                                <TableCell>Categoria</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Array.from(new Set(details.expenses?.map((e: any) => e.category))).map((cat: any) => {
                                const total = details.expenses
                                    .filter((e: any) => e.category === cat)
                                    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
                                return (
                                    <TableRow key={cat}>
                                        <TableCell>{cat}</TableCell>
                                        <TableCell align="right">{formatCurrency(total)}</TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow sx={{ fontWeight: 'bold', bgcolor: '#FFEBEE' }}>
                                <TableCell><strong>Total Despesas</strong></TableCell>
                                <TableCell align="right"><strong>{formatCurrency(despesas)}</strong></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    const renderDevedoresContent = () => {
        const devedores = details?.devedores || [];
        if (!devedores.length) return <Alert severity="success">Nenhum paciente com saldo devedor</Alert>;

        const total = devedores.reduce((s: number, d: any) => s + (d.currentBalance || 0), 0);
        return (
            <>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#FFEBEE', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                        Total Devedor: {formatCurrency(total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{devedores.length} paciente(s)</Typography>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#FFEBEE' }}>
                                <TableCell>Paciente</TableCell>
                                <TableCell align="right">Saldo Devedor</TableCell>
                                <TableCell align="right">Sessões Pendentes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {devedores.map((d: any) => {
                                const pendentes = (d.transactions || []).filter((t: any) => t.type === 'debit' && !t.isPaid).length;
                                return (
                                    <TableRow key={d._id}>
                                        <TableCell>{d.patient?.fullName || '—'}</TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight="bold" color="error.main">{formatCurrency(d.currentBalance)}</Typography>
                                        </TableCell>
                                        <TableCell align="right">{pendentes}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderConvReceberContent = () => {
        const data = details?.conv_receber;
        if (!data?.items?.length) return <Alert severity="success">Nenhuma guia convênio pendente de recebimento</Alert>;

        return (
            <>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#FFF8E1', borderRadius: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                        Total a Receber: {formatCurrency(data.total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{data.count} guia(s) faturada(s) aguardando repasse</Typography>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#FFF8E1' }}>
                                <TableCell>Paciente</TableCell>
                                <TableCell>Convênio</TableCell>
                                <TableCell align="right">Valor</TableCell>
                                <TableCell align="right">Faturado em</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.items.map((item: any) => (
                                <TableRow key={item._id}>
                                    <TableCell>{item.patientName}</TableCell>
                                    <TableCell>{item.convenio}</TableCell>
                                    <TableCell align="right">{formatCurrency(item.grossAmount)}</TableCell>
                                    <TableCell align="right">{item.billedAt ? formatDate(item.billedAt) : '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderContent = () => {
        if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
        if (error) return <Alert severity="error">{error}</Alert>;

        switch (type) {
            case 'producao': return renderProducaoContent();
            case 'faturado': return renderFaturadoContent();
            case 'caixa': return renderCaixaContent();
            case 'despesas': return renderDespesasContent();
            case 'resultado': return renderResultadoContent();
            case 'devedores': return renderDevedoresContent();
            case 'conv_receber': return renderConvReceberContent();
            default: return <Alert severity="info">Detalhes não disponíveis para este tipo</Alert>;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        {getIcon()}
                        <Typography variant="h6" fontWeight="bold">
                            {getTitle()}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export default FinancialDetailsModal;
