// frontend/src/pages/Financial/components/RankingProfissionais.tsx
import React, { useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography,
    Box, Avatar
} from '@mui/material';
import { FinancialLoadingCompact } from './FinancialLoading';
import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { Trophy, Users, TrendingUp } from 'lucide-react';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const RankingProfissionais: React.FC = () => {
    const { doctors, loadingDoctors, fetchDoctors } = useFinancialAnalytics();

    useEffect(() => {
        // Busca dados do mês atual por padrão
        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        fetchDoctors({ from, to });
    }, [fetchDoctors]);

    if (loadingDoctors && doctors.length === 0) {
        return <FinancialLoadingCompact />;
    }

    const maxRevenue = doctors.length > 0 ? doctors[0].totalRevenue : 0;

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Trophy color="#FFD700" size={28} />
                <Typography variant="h5" fontWeight="bold" color="grey.800">
                    Ranking de Profissionais
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell width={60}>Pos.</TableCell>
                            <TableCell>Profissional</TableCell>
                            <TableCell>Especialidade</TableCell>
                            <TableCell align="right">Faturamento</TableCell>
                            <TableCell align="center">Desempenho</TableCell>
                            <TableCell align="right">Ticket Médio</TableCell>
                            <TableCell align="right">Pacientes</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {doctors.map((doc, index) => (
                            <TableRow key={doc.doctorId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>
                                    <Typography fontWeight="bold" color={index < 3 ? 'primary.main' : 'textSecondary'}>
                                        #{index + 1}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                                            {doc.doctorName.split(' ')[0][0]}
                                        </Avatar>
                                        <Typography fontWeight="medium">{doc.doctorName}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>
                                        {doc.specialty}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography fontWeight="bold" color="success.main">
                                        {formatCurrency(doc.totalRevenue)}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(doc.totalRevenue / maxRevenue) * 100}
                                                sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100' }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="textSecondary">
                                            {Math.round((doc.totalRevenue / maxRevenue) * 100)}%
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                        <TrendingUp size={14} color="#37ab87" />
                                        <Typography variant="body2">{formatCurrency(doc.averageTicket)}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                        <Users size={14} color="#666" />
                                        <Typography variant="body2">{doc.uniquePatients}</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
