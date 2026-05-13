import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
// frontend/src/pages/Financial/components/DashboardEspecialidades.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import { FinancialLoadingCompact } from './FinancialLoading';
import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getSpecialtyColor = (specialty: string) => {
    const s = specialty?.toUpperCase();
    const map: Record<string, string> = {
        'FONOAUDIOLOGIA': '#4CAF50',
        'PSICOLOGIA': '#2196F3',
        'FISIOTERAPIA': '#FF9800',
        'FONO': '#4CAF50',
        'PSICO': '#2196F3',
        'FISIO': '#FF9800',
        'TERAPIA_OCUPACIONAL': '#E91E63',
        'TO': '#E91E63'
    };
    return map[s] || '#757575';
};

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const DashboardEspecialidades: React.FC = () => {
    const { specialties, loadingSpecialties, fetchSpecialties } = useFinancialAnalytics();

    const [dateRange] = useState(() => {
        const now = new Date();
        return {
            from: format(startOfMonth(now), 'yyyy-MM-dd'),
            to: format(endOfMonth(now), 'yyyy-MM-dd')
        };
    });

    useEffect(() => {
        fetchSpecialties(dateRange);
    }, [fetchSpecialties, dateRange]);

    const totalGeral = specialties.reduce((acc, s) => acc + s.totalRevenue, 0);

    if (loadingSpecialties) {
        return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
    }

    if (specialties.length === 0) {
        return (
            <Box p={3} textAlign="center">
                <Typography color="textSecondary">Nenhum dado financeiro encontrado para este período.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
                Receita por Especialidade - {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
            </Typography>

            <Grid container spacing={3}>
                {specialties.map((spec) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={spec.specialty}>
                        <Card sx={{
                            borderTop: 6,
                            borderColor: getSpecialtyColor(spec.specialty),
                            height: '100%',
                            boxShadow: 2,
                            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                            transition: 'all 0.2s ease-in-out'
                        }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom variant="overline" sx={{ letterSpacing: 1.2 }}>
                                    {spec.specialty.replace('_', ' ')}
                                </Typography>

                                <Typography variant="h4" component="div" sx={{ fontWeight: '700', my: 1, color: '#2c3e50' }}>
                                    {formatCurrency(spec.totalRevenue)}
                                </Typography>

                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={`${spec.totalSessions} sessões`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontWeight: '500' }}
                                    />
                                    <Chip
                                        label={`Ticket: ${formatCurrency(spec.averageTicket)}`}
                                        size="small"
                                        color="primary"
                                        sx={{ fontWeight: '500' }}
                                    />
                                </Box>

                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <Box>
                                        <Typography variant="caption" display="block" color="textSecondary" sx={{ fontWeight: '500' }}>
                                            {spec.uniquePatientCount} pacientes únicos
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" color="textSecondary" sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        {totalGeral > 0 ? ((spec.totalRevenue / totalGeral) * 100).toFixed(1) : 0}%
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};
