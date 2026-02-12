// frontend/src/pages/Financial/tabs/AnalyticsTab.tsx
import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';

export const AnalyticsTab: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 2 }}>
                Business Intelligence Clínica
            </Typography>

            <DashboardEspecialidades />

            <Divider sx={{ my: 6, borderStyle: 'dashed' }} />

            <RankingProfissionais />

            <Divider sx={{ my: 6, borderStyle: 'dashed' }} />

            <ListaPacientesVIP />
        </Box>
    );
};
