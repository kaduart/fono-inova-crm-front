/**
 * 📊 ProductionModal - Modal de Detalhes da Produção
 * Mostra detalhes da produção do dia: particular + convênio
 */

import React from 'react';
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
} from '@mui/material';
import {
    Close,
    TrendingUp,
    LocalAtm,
    CreditCard
} from '@mui/icons-material';

interface ProductionItem {
    id: string;
    patient: string;
    doctor: string;
    service: string;
    value: number;
    type: 'particular' | 'convenio' | 'pacote';
    time: string;
    status: string;
}

interface ProductionModalProps {
    open: boolean;
    onClose: () => void;
    date: string;
    data: {
        total: number;
        particular: number;
        convenio: number;
        pacote: number;
        count: number;
        items: ProductionItem[];
    };
    loading?: boolean;
}

const formatCurrency = (value: number) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

const ProductionModal: React.FC<ProductionModalProps> = ({
    open,
    onClose,
    date,
    data,
    loading
}) => {
    if (!open) return null;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'particular': return { color: '#059669', bg: '#D1FAE5', label: 'Particular' };
            case 'convenio': return { color: '#2563EB', bg: '#DBEAFE', label: 'Convênio' };
            case 'pacote': return { color: '#7C3AED', bg: '#EDE9FE', label: 'Pacote' };
            default: return { color: '#6B7280', bg: '#F3F4F6', label: 'Outro' };
        }
    };

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
                pb: 1.5,
                bgcolor: '#EFF6FF'
            }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUp sx={{ color: '#2563EB' }} />
                    <Box>
                        <Typography variant="h6" fontWeight="600">
                            Detalhes da Produção
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(date)} • {data.count} atendimento{data.count !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {/* RESUMO GERAL */}
                <Box p={3} bgcolor="#F8FAFC">
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                <Typography variant="caption" color="text.secondary">
                                    PRODUÇÃO TOTAL
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#2563EB">
                                    {formatCurrency(data.total)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                <Typography variant="caption" color="text.secondary">
                                    PARTICULAR
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#059669">
                                    {formatCurrency(data.particular)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                <Typography variant="caption" color="text.secondary">
                                    CONVÊNIO
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#2563EB">
                                    {formatCurrency(data.convenio)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="white" borderRadius={1.5} border="1px solid #E5E7EB">
                                <Typography variant="caption" color="text.secondary">
                                    PACOTE
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#7C3AED">
                                    {formatCurrency(data.pacote)}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                {/* LISTA DE ATENDIMENTOS */}
                <Box p={3}>
                    <Typography variant="subtitle2" fontWeight="600" mb={2}>
                        Atendimentos do Dia
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                    <TableCell sx={{ py: 1 }}>Horário</TableCell>
                                    <TableCell sx={{ py: 1 }}>Paciente</TableCell>
                                    <TableCell sx={{ py: 1 }}>Profissional</TableCell>
                                    <TableCell sx={{ py: 1 }}>Serviço</TableCell>
                                    <TableCell sx={{ py: 1 }}>Tipo</TableCell>
                                    <TableCell align="right" sx={{ py: 1 }}>Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Nenhum atendimento encontrado
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.items.map((item) => {
                                        const typeStyle = getTypeColor(item.type);
                                        return (
                                            <TableRow key={item.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="500">
                                                        {item.time}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="500">
                                                        {item.patient}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {item.doctor}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {item.service}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={typeStyle.label}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                            height: 24,
                                                            bgcolor: typeStyle.bg,
                                                            color: typeStyle.color,
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight="bold" color="text.primary">
                                                        {formatCurrency(item.value)}
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
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={onClose} variant="contained" size="small">
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProductionModal;
