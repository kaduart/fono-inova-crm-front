// frontend/src/pages/Financial/tabs/AnalyticsTab.tsx
import React, { useEffect, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';
import { FinancialLoadingDashboard } from '../components/FinancialLoading';

export const AnalyticsTab: React.FC = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simula carregamento inicial
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: 'primary.main' }}>
                    📈 Business Intelligence
                </Typography>
                <FinancialLoadingDashboard />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 2 }}>
                📈 Business Intelligence
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                Análise de especialidades, ranking de profissionais e pacientes VIP
            </Typography>

            <DashboardEspecialidades />

            <Divider sx={{ my: 6, borderStyle: 'dashed' }} />

            <RankingProfissionais />

            <Divider sx={{ my: 6, borderStyle: 'dashed' }} />

            <ListaPacientesVIP />
        </Box>
    );
};
