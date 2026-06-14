import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
// frontend/src/pages/Financial/components/ListaPacientesVIP.tsx
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    IconButton, Chip, Avatar
} from '@mui/material';

import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { Crown, Eye, Phone } from 'lucide-react';
import { Patient360Modal } from './Patient360Modal';

interface PatientBreakdownItem {
    patientId?: string;
    patientName?: string;
    name?: string;
    phone?: string;
    sessionsCompleted?: number;
    paymentsCount?: number;
    totalSpent?: number;
    production?: number;
    received?: number;
    pending?: number;
    averageTicket?: number;
    lastPayment?: string;
    lastSession?: string | null;
    nextSession?: string | null;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('pt-BR') : '-';

interface ListaPacientesVIPProps {
    data?: PatientBreakdownItem[];
    loading?: boolean;
    title?: string;
}

export const ListaPacientesVIP: React.FC<ListaPacientesVIPProps> = ({
    data,
    loading,
    title = 'Pacientes VIP (Top 10 LTV)'
}) => {
    const { patientsList, loadingPatients, fetchPatientsList } = useFinancialAnalytics();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (data) return;
        fetchPatientsList({ page: 1, limit: 10, sortBy: 'totalSpent', order: 'desc' });
    }, [fetchPatientsList, data]);

    const handleOpen360 = (id: string) => {
        setSelectedPatientId(id);
        setIsModalOpen(true);
    };

    const isLoading = loading ?? (loadingPatients && patientsList.data.length === 0);
    const rows = data ?? patientsList.data;

    if (isLoading) {
        return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
    }

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Crown color="#FFD700" size={28} />
                <Typography variant="h5" fontWeight="bold" color="grey.800">
                    {title}
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell>Paciente</TableCell>
                            <TableCell align="right">Sessões</TableCell>
                            <TableCell align="right">Produção</TableCell>
                            <TableCell align="right">Recebido</TableCell>
                            <TableCell align="right">Pendente</TableCell>
                            <TableCell align="right">Última Sessão</TableCell>
                            <TableCell align="right">Próxima Sessão</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((patient: PatientBreakdownItem) => {
                            const id = patient.patientId || '';
                            const name = patient.patientName || patient.name || 'Sem nome';
                            const phone = patient.phone;
                            const sessions = patient.sessionsCompleted ?? patient.paymentsCount ?? 0;
                            const production = patient.production ?? patient.totalSpent ?? 0;
                            const received = patient.received ?? 0;
                            const pending = patient.pending ?? 0;
                            const lastSession = patient.lastSession || patient.lastPayment;
                            const nextSession = patient.nextSession;

                            return (
                                <TableRow key={id || name} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ bgcolor: 'secondary.light' }}>{name?.[0] || '?'}</Avatar>
                                            <Box>
                                                <Typography fontWeight="bold">{name}</Typography>
                                                <Typography variant="caption" color="textSecondary">{phone}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">{sessions}</TableCell>
                                    <TableCell align="right">
                                        <Chip label={formatCurrency(production)} color="primary" variant="filled" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="success.main">{formatCurrency(received)}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="warning.main">{formatCurrency(pending)}</Typography>
                                    </TableCell>
                                    <TableCell align="right">{formatDate(lastSession)}</TableCell>
                                    <TableCell align="right">{formatDate(nextSession)}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                            {id && (
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpen360(id)}
                                                    title="Ver Visão 360°"
                                                >
                                                    <Eye size={18} />
                                                </IconButton>
                                            )}
                                            {phone && (
                                                <IconButton size="small" component="a" href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank">
                                                    <Phone size={18} color="#25D366" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
