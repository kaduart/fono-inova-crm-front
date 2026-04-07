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
    TextField
} from '@mui/material';
import {
    Close,
    CheckCircle,
    Print,
    Refresh
} from '@mui/icons-material';

interface Payment {
    _id: string;
    patientName?: string;
    patientId?: string;
    amount: number;
    method: string;
    billingType?: string;
    paymentDate: string;
    status: string;
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
    
    if (b === 'convenio' || m.includes('convenio')) return '🏥 Convênio';
    if (m.includes('pix')) return '⚡ PIX';
    if (m.includes('card') || m.includes('cartão') || m.includes('credito') || m.includes('debito')) return '💳 Cartão';
    if (m.includes('cash') || m.includes('dinheiro')) return '💵 Dinheiro';
    if (m.includes('transfer')) return '🔄 Transferência';
    return '💰 Outros';
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
        
        // Simula chamada API para fechar caixa
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
            PaperProps={{ sx: { minHeight: '70vh' } }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: '#F0FDF4',
                borderBottom: '1px solid #86EFAC'
            }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="#166534">
                        💰 Fechamento de Caixa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatDate(date)} • {data.count} pagamentos
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    {onRefresh && (
                        <IconButton onClick={onRefresh} size="small" disabled={loading}>
                            <Refresh />
                        </IconButton>
                    )}
                    <IconButton onClick={handlePrint} size="small">
                        <Print />
                    </IconButton>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {fechado ? (
                    <Box p={4} textAlign="center">
                        <CheckCircle sx={{ fontSize: 64, color: '#22C55E', mb: 2 }} />
                        <Typography variant="h5" fontWeight="bold" color="#166534" gutterBottom>
                            Caixa Fechado com Sucesso!
                        </Typography>
                        <Typography color="text.secondary">
                            Total: {formatCurrency(data.total)}
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={onClose}
                            sx={{ mt: 3 }}
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
                                    <Box p={2} bgcolor="white" borderRadius={2} boxShadow="0 1px 3px rgba(0,0,0,0.1)">
                                        <Typography variant="caption" color="text.secondary">
                                            TOTAL DO DIA
                                        </Typography>
                                        <Typography variant="h4" fontWeight="bold" color="#059669">
                                            {formatCurrency(data.total)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <Box p={2} bgcolor="white" borderRadius={2}>
                                        <Typography variant="caption" color="text.secondary">
                                            QUANTIDADE
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            {data.count}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            pagamentos
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <Box p={2} bgcolor="white" borderRadius={2}>
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
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                                💳 Formas de Pagamento
                            </Typography>
                            <Grid container spacing={2}>
                                {data.porMetodo.pix > 0 && (
                                    <Grid item xs={6} sm={4}>
                                        <Box p={2} border="1px solid #E5E7EB" borderRadius={2}>
                                            <Typography variant="caption" color="text.secondary">PIX</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#0891B2">
                                                {formatCurrency(data.porMetodo.pix)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                                {data.porMetodo.cartao > 0 && (
                                    <Grid item xs={6} sm={4}>
                                        <Box p={2} border="1px solid #E5E7EB" borderRadius={2}>
                                            <Typography variant="caption" color="text.secondary">Cartão</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#7C3AED">
                                                {formatCurrency(data.porMetodo.cartao)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                                {data.porMetodo.dinheiro > 0 && (
                                    <Grid item xs={6} sm={4}>
                                        <Box p={2} border="1px solid #E5E7EB" borderRadius={2}>
                                            <Typography variant="caption" color="text.secondary">Dinheiro</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#059669">
                                                {formatCurrency(data.porMetodo.dinheiro)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                                {data.porMetodo.convenio > 0 && (
                                    <Grid item xs={6} sm={4}>
                                        <Box p={2} border="1px solid #E5E7EB" borderRadius={2}>
                                            <Typography variant="caption" color="text.secondary">Convênio</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#7C2D12">
                                                {formatCurrency(data.porMetodo.convenio)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                                {data.porMetodo.outros > 0 && (
                                    <Grid item xs={6} sm={4}>
                                        <Box p={2} border="1px solid #E5E7EB" borderRadius={2}>
                                            <Typography variant="caption" color="text.secondary">Outros</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#6B7280">
                                                {formatCurrency(data.porMetodo.outros)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>

                        <Divider />

                        {/* LISTA DE PAGAMENTOS */}
                        <Box p={3}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                                📋 Lista de Pagamentos
                            </Typography>
                            
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F3F4F6' }}>
                                            <TableCell>Paciente</TableCell>
                                            <TableCell>Forma</TableCell>
                                            <TableCell align="right">Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.lista.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        Nenhum pagamento encontrado
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.lista.map((payment) => (
                                                <TableRow key={payment._id} hover>
                                                    <TableCell>
                                                        {payment.patientName || 'Paciente'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={getMethodLabel(payment.method, payment.billingType)}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight="medium">
                                                            {formatCurrency(payment.amount)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        <Divider />

                        {/* OBSERVAÇÃO */}
                        <Box p={3} bgcolor="#FEF3C7">
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                ⚠️ Verifique se todos os valores estão corretos antes de fechar o caixa.
                            </Alert>
                            <TextField
                                fullWidth
                                label="Observação (opcional)"
                                placeholder="Ex: Falta lançar pagamento do João..."
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                multiline
                                rows={2}
                            />
                        </Box>
                    </>
                )}
            </DialogContent>

            {!fechado && (
                <DialogActions sx={{ p: 3, bgcolor: '#F9FAFB' }}>
                    <Button onClick={onClose} variant="outlined">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleFecharCaixa}
                        variant="contained"
                        color="success"
                        disabled={fechando || data.count === 0}
                        startIcon={<CheckCircle />}
                    >
                        {fechando ? 'Fechando...' : '✅ Fechar Caixa do Dia'}
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
};

export default DailyCashModal;
