// Drawer lateral padronizado para detalhes de paciente nas abas de convênio

import { Box, Drawer, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface InsurancePatientDrawerProps {
    open: boolean;
    onClose: () => void;
    patientName: string;
    provider: string;
    subtitle?: ReactNode;
    children: ReactNode;
    headerColor?: string;
}

const formatProviderName = (slug: string) => {
    if (!slug || slug === 'nao_identificado' || slug === 'convenio') return 'Convênio s/ identificação';
    return slug
        .replace(/_/g, '-')
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace('Anapolis', 'Anápolis')
        .replace('Goiania', 'Goiânia')
        .replace('Sao ', 'São ')
        .replace('Saude', 'Saúde')
        .replace('Brasilia', 'Brasília');
};

export default function InsurancePatientDrawer({
    open,
    onClose,
    patientName,
    provider,
    subtitle,
    children,
    headerColor = '#FFFBEB'
}: InsurancePatientDrawerProps) {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100vw', sm: 720, md: 900 } } }}
        >
            {/* Header */}
            <Box sx={{
                px: 3,
                py: 2,
                bgcolor: headerColor,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <Box>
                    <Typography fontWeight="700" fontSize="1rem" color="#111827">
                        {patientName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {formatProviderName(provider)}
                    </Typography>
                    {subtitle && (
                        <Box sx={{ mt: 1 }}>
                            {subtitle}
                        </Box>
                    )}
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <X size={18} />
                </IconButton>
            </Box>

            {/* Conteúdo */}
            <Box sx={{ overflowY: 'auto', flex: 1, p: 0 }}>
                {children}
            </Box>
        </Drawer>
    );
}
