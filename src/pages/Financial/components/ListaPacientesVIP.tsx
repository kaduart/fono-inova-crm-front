import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
// frontend/src/pages/Financial/components/ListaPacientesVIP.tsx
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    IconButton, Chip, Avatar
} from '@mui/material';
import { FinancialLoadingCompact } from './FinancialLoading';
import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { Crown, Eye, Phone } from 'lucide-react';
import { Patient360Modal } from './Patient360Modal';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const ListaPacientesVIP: React.FC = () => {
    const { patientsList, loadingPatients, fetchPatientsList } = useFinancialAnalytics();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchPatientsList({ page: 1, limit: 10, sortBy: 'totalSpent', order: 'desc' });
    }, [fetchPatientsList]);

    const handleOpen360 = (id: string) => {
        setSelectedPatientId(id);
        setIsModalOpen(true);
    };

    if (loadingPatients && patientsList.data.length === 0) {
        return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
    }

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Crown color="#FFD700" size={28} />
                <Typography variant="h5" fontWeight="bold" color="grey.800">
                    Pacientes VIP (Top 10 LTV)
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell>Paciente</TableCell>
                            <TableCell align="right">Investimento Total (LTV)</TableCell>
                            <TableCell align="right">Nº de Pagamentos</TableCell>
                            <TableCell align="right">Ticket Médio</TableCell>
                            <TableCell align="right">Último Pagamento</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {patientsList.data.map((patient: any) => (
                            <TableRow key={patient.patientId} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: 'secondary.light' }}>{patient.name?.[0] || '?'}</Avatar>
                                        <Box>
                                            <Typography fontWeight="bold">{patient.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">{patient.phone}</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Chip
                                        label={formatCurrency(patient.totalSpent)}
                                        color="secondary"
                                        variant="filled"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </TableCell>
                                <TableCell align="right">{patient.paymentsCount}</TableCell>
                                <TableCell align="right">{formatCurrency(patient.averageTicket)}</TableCell>
                                <TableCell align="right">
                                    {new Date(patient.lastPayment).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleOpen360(patient.patientId)}
                                            title="Ver Visão 360°"
                                        >
                                            <Eye size={18} />
                                        </IconButton>
                                        {patient.phone && (
                                            <IconButton size="small" component="a" href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank">
                                                <Phone size={18} color="#25D366" />
                                            </IconButton>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedPatientId && (
                <Patient360Modal
                    patientId={selectedPatientId}
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </Box>
    );
};
