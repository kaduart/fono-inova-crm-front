/**
 * 🧾 ReceivablesModal - Modal de Detalhes do "A Receber"
 * Mostra detalhes dos convênios pendentes de recebimento
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
    Alert,
} from '@mui/material';
import {
    Close,
    CreditCard,
    AccessTime,
    LocalHospital
} from '@mui/icons-material';

interface ReceivableItem {
    id: string;
    patient: string;
    doctor: string;
    service: string;
    value: number;
    insuranceProvider: string;
    date: string;
    time: string;
    status: 'pending' | 'billed' | 'received';
}

interface ReceivablesModalProps {
    open: boolean;
    onClose: () => void;
    date: string;
    data: {
        total: number;
        pending: number;
        billed: number;
        received: number;
        count: number;
        items: ReceivableItem[];
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

const ReceivablesModal: React.FC<ReceivablesModalProps> = ({
    open,
    onClose,
    date,
    data,
    loading
}) => {
    if (!open) return null;

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending':
                return { color: '#D97706', bg: '#FEF3C7', label: 'Pendente', icon: <AccessTime fontSize="small" /> };
            case 'billed':
                return { color: '#2563EB', bg: '#DBEAFE', label: 'Faturado', icon: <CreditCard fontSize="small" /> };
            case 'received':
                return { color: '#059669', bg: '#D1FAE5', label: 'Recebido', icon: <LocalHospital fontSize="small" /> };
            default:
                return { color: '#6B7280', bg: '#F3F4F6', label: 'Desconhecido', icon: null };
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
                bgcolor: '#FFFBEB'
            }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <CreditCard sx={{ color: '#D97706' }} />
                    <Box>
                        <Typography variant="h6" fontWeight="600">
                            A Receber - Convênios
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(date)} • {data.count} sessão{data.count !== 1 ? 's' : ''} pendente{data.count !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {/* ALERTA INFORMATIVO */}
                <Box px={3} pt={3}>
                    <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                        Valores de convênios ainda não recebidos. O recebimento depende do faturamento e pagamento pelo plano de saúde.
                    </Alert>
                </Box>

                {/* RESUMO GERAL */}
                <Box p={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="#FFFBEB" borderRadius={1.5} border="1px solid #FDE68A">
                                <Typography variant="caption" color="text.secondary">
                                    TOTAL A RECEBER
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#D97706">
                                    {formatCurrency(data.total)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="#FEF3C7" borderRadius={1.5} border="1px solid #FDE68A">
                                <Typography variant="caption" color="text.secondary">
                                    PENDENTE
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#D97706">
                                    {formatCurrency(data.pending)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="#DBEAFE" borderRadius={1.5} border="1px solid #93C5FD">
                                <Typography variant="caption" color="text.secondary">
                                    FATURADO
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#2563EB">
                                    {formatCurrency(data.billed)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box p={2} bgcolor="#D1FAE5" borderRadius={1.5} border="1px solid #6EE7B7">
                                <Typography variant="caption" color="text.secondary">
                                    RECEBIDO
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#059669">
                                    {formatCurrency(data.received)}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                {/* LISTA DE CONVÊNIOS PENDENTES */}
                <Box p={3}>
                    <Typography variant="subtitle2" fontWeight="600" mb={2}>
                        Sessões de Convênio
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#FFFBEB' }}>
                                    <TableCell sx={{ py: 1 }}>Data</TableCell>
                                    <TableCell sx={{ py: 1 }}>Horário</TableCell>
                                    <TableCell sx={{ py: 1 }}>Paciente</TableCell>
                                    <TableCell sx={{ py: 1 }}>Profissional</TableCell>
                                    <TableCell sx={{ py: 1 }}>Convênio</TableCell>
                                    <TableCell sx={{ py: 1 }}>Status</TableCell>
                                    <TableCell align="right" sx={{ py: 1 }}>Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Nenhuma sessão de convênio pendente
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.items.map((item) => {
                                        const statusConfig = getStatusConfig(item.status);
                                        return (
                                            <TableRow key={item.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatDate(item.date)}
                                                    </Typography>
                                                </TableCell>
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
                                                        {item.insuranceProvider || 'Convênio'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={statusConfig.icon}
                                                        label={statusConfig.label}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                            height: 24,
                                                            bgcolor: statusConfig.bg,
                                                            color: statusConfig.color,
                                                            fontWeight: 500,
                                                            '& .MuiChip-icon': {
                                                                color: statusConfig.color
                                                            }
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

export default ReceivablesModal;
