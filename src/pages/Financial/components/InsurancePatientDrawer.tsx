// Drawer lateral padronizado para detalhes de paciente nas abas de convênio

import { Box, Drawer, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface DrawerStat {
    label: string;
    value: string;
    color?: string;
}

interface InsurancePatientDrawerProps {
    open: boolean;
    onClose: () => void;
    patientName: string;
    provider: string;
    subtitle?: ReactNode;
    /** Métricas destacadas no header (substituem o subtitle quando informadas) */
    stats?: DrawerStat[];
    children: ReactNode;
    headerColor?: string;
}

const getInitials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

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
    stats,
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
                py: 2.5,
                bgcolor: headerColor,
                borderBottom: '1px solid',
                borderColor: 'divider'
            }}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white/80 border border-white flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-sm font-black text-gray-600 tracking-tight">{getInitials(patientName)}</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">{patientName}</h2>
                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-white/70 border border-white text-[11px] font-semibold text-gray-600">
                                {formatProviderName(provider)}
                            </span>
                        </div>
                    </div>
                    <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
                        <X size={18} />
                    </IconButton>
                </div>

                {stats && stats.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                        {stats.map((stat) => (
                            <div key={stat.label} className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                                <div style={{ height: 3, backgroundColor: stat.color || '#6B7280' }} />
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                                    <p className="text-lg font-black leading-tight" style={{ color: stat.color || '#374151' }}>{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : subtitle ? (
                    <Box sx={{ mt: 1.5 }}>{subtitle}</Box>
                ) : null}
            </Box>

            {/* Conteúdo */}
            <Box sx={{ overflowY: 'auto', flex: 1, p: 0 }}>
                {children}
            </Box>
        </Drawer>
    );
}
