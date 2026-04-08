/**
 * 💰 DailyCashModal - Modal de Fechamento de Caixa Diário
 * Mostra detalhes completos do caixa do dia para conferência
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
    Divider,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Grid,
    IconButton,
    Alert,
    TextField,
    Tooltip,
} from '@mui/material';
import {
    Close,
    CheckCircle,
    Print,
    Refresh
} from '@mui/icons-material';

interface Payment {
    _id: string;
    id?: string;
    patientName?: string;
    patient?: string;
    patientId?: string;
    amount: number;
    method?: string;
    paymentMethod?: string;
    billingType?: string;
    paymentDate: string;
    status: string;
    notes?: string;
}

interface DailyCashModalProps {
    open: boolean;
    onClose: () => void;
    date: string;
    data: {
        total: number;
        count: number;
        porMetodo: {
            pix: number;
            cartao: number;
            dinheiro: number;
            convenio: number;
            outros: number;
        };
        porTipo: {
            particular: number;
            convenio: number;
            pacote: number;
        };
        lista: Payment[];
    };
    loading?: boolean;
    onRefresh?: () => void;
}

const formatCurrency = (value: number) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getMethodLabel = (method: string, billingType?: string) => {
    const m = (method || '').toLowerCase();
    const b = (billingType || '').toLowerCase();
    
    if (b === 'convenio' || m.includes('convenio')) return 'Convênio';
    if (m.includes('pix')) return 'PIX';
    if (m.includes('card') || m.includes('cartão') || m.includes('credito') || m.includes('debito')) return 'Cartão';
    if (m.includes('cash') || m.includes('dinheiro')) return 'Dinheiro';
    if (m.includes('transfer')) return 'Transferência';
    return 'Outros';
};

const DailyCashModal: React.FC<DailyCashModalProps> = ({
    open,
    onClose,
    date,
    data,
    loading,
    onRefresh
}) => {
    const [observacao, setObservacao] = useState('');
    const [fechando, setFechando] = useState(false);
    const [fechado, setFechado] = useState(false);

    const handleFecharCaixa = async () => {
        setFechando(true);
        setTimeout(() => {
            console.log('✅ CAIXA FECHADO', {
                date,
                total: data.total,
                porMetodo: data.porMetodo,
                count: data.count,
                observacao,
                fechadoEm: new Date().toISOString()
            });
            setFechado(true);
            setFechando(false);
        }, 1000);
    };

    const handlePrint = () => {
        window.print();
    };

    if (!open) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1.5
            }}>
                <Box>
                    <Typography variant="h6" fontWeight="600">
                        Fechamento de Caixa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatDate(date)} • {data.count} pagamento{data.count !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <Box display="flex" gap={0.5}>
                    {onRefresh && (
                        <IconButton onClick={onRefresh} size="small" disabled={loading}>
                            <Refresh fontSize="small" />
                        </IconButton>
                    )}
                    <IconButton onClick={handlePrint} size="small">
                        <Print fontSize="small" />
                    </IconButton>
                    <IconButton onClick={onClose} size="small">
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {fechado ? (
                    <Box p={4} textAlign="center">
                        <CheckCircle sx={{ fontSize: 56, color: '#10B981', mb: 2 }} />
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Caixa Fechado com Sucesso!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total: {formatCurrency(data.total)}
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={onClose}
                            sx={{ mt: 3, textTransform: 'none' }}
                        >
                            OK
                        </Button>
                    </Box>
                ) : (
                    <>
                        {/* RESUMO GERAL */}
                        <Box p={3} bgcolor="#F9FAFB">
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                        <Typography variant="caption" color="text.secondary">
                                            TOTAL DO DIA
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold" color="#059669">
                                            {formatCurrency(data.total)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                        <Typography variant="caption" color="text.secondary">
                                            QUANTIDADE
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            {data.count}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            pagamento{data.count !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                        <Typography variant="caption" color="text.secondary">
                                            TICKET MÉDIO
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            {formatCurrency(data.count > 0 ? data.total / data.count : 0)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* FORMAS DE PAGAMENTO */}
                        <Box p={3}>
                            <Typography variant="subtitle2" fontWeight="600" mb={2}>
                                Formas de Pagamento
                            </Typography>
                            <Grid container spacing={1.5}>
                                {[
                                    { key: 'pix', label: 'PIX', value: data.porMetodo.pix, color: '#0891B2', bg: '#E0F2FE' },
                                    { key: 'cartao', label: 'Cartão', value: data.porMetodo.cartao, color: '#7C3AED', bg: '#EDE9FE' },
                                    { key: 'dinheiro', label: 'Dinheiro', value: data.porMetodo.dinheiro, color: '#059669', bg: '#D1FAE5' },
                                    { key: 'convenio', label: 'Convênio', value: data.porMetodo.convenio, color: '#D97706', bg: '#FEF3C7' },
                                    { key: 'outros', label: 'Outros', value: data.porMetodo.outros, color: '#6B7280', bg: '#F3F4F6' },
                                ].filter(item => item.value > 0).map(item => (
                                    <Grid item xs={6} sm={4} key={item.key}>
                                        <Box p={1.5} borderRadius={1.5} border="1px solid #E5E7EB" bgcolor={item.bg}>
                                            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                            <Typography variant="h6" fontWeight="bold" sx={{ color: item.color }}>
                                                {formatCurrency(item.value)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                                {Object.values(data.porMetodo).every(v => v === 0) && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary" textAlign="center">
                                            Nenhum pagamento registrado
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>

                        <Divider />

                        {/* LISTA DE PAGAMENTOS */}
                        <Box p={3}>
                            <Typography variant="subtitle2" fontWeight="600" mb={2}>
                                Lista de Pagamentos
                            </Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                                            <TableCell sx={{ py: 1 }}>Paciente</TableCell>
                                            <TableCell sx={{ py: 1 }}>Forma</TableCell>
                                            <TableCell align="right" sx={{ py: 1 }}>Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.lista.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Nenhum pagamento encontrado
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.lista.map((payment) => {
                                                const patientName = payment.patientName || payment.patient || 'Paciente';
                                                const method = payment.method || payment.paymentMethod || '';
                                                const billingType = (payment.billingType || '').toLowerCase();
                                                const isConvenio = billingType === 'convenio' || method.toLowerCase().includes('convenio');
                                                const isPacote = billingType === 'pacote' || billingType === 'package';
                                                
                                                return (
                                                    <TableRow key={payment._id || payment.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="500">
                                                                {patientName}
                                                            </Typography>
                                                            {payment.notes && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {payment.notes}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box display="flex" gap={0.5} flexWrap="wrap">
                                                                <Chip 
                                                                    label={getMethodLabel(method, billingType)}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ fontSize: '0.7rem', height: 24 }}
                                                                />
                                                                {isConvenio && (
                                                                    <Chip 
                                                                        label="Convênio"
                                                                        size="small"
                                                                        sx={{ fontSize: '0.7rem', height: 24, bgcolor: '#FEF3C7', color: '#D97706' }}
                                                                    />
                                                                )}
                                                                {isPacote && (
                                                                    <Chip 
                                                                        label="Pacote"
                                                                        size="small"
                                                                        sx={{ fontSize: '0.7rem', height: 24, bgcolor: '#EDE9FE', color: '#7C3AED' }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                                {formatCurrency(payment.amount)}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        <Divider />

                        {/* OBSERVAÇÃO */}
                        <Box p={3} bgcolor="#F9FAFB">
                            <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, '& .MuiAlert-icon': { alignItems: 'center' } }}>
                                Verifique todos os valores antes de fechar o caixa.
                            </Alert>
                            <TextField
                                fullWidth
                                label="Observação (opcional)"
                                placeholder="Ex: Falta lançar pagamento do paciente X..."
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                multiline
                                rows={2}
                                size="small"
                            />
                        </Box>
                    </>
                )}
            </DialogContent>

            {!fechado && (
                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={onClose} variant="outlined" size="small">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleFecharCaixa}
                        variant="contained"
                        color="success"
                        disabled={fechando || data.count === 0}
                        startIcon={<CheckCircle />}
                        size="small"
                    >
                        {fechando ? 'Fechando...' : 'Fechar Caixa'}
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
};

export default DailyCashModal;