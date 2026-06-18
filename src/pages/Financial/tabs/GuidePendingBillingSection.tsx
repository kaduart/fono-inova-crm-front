// src/pages/Financial/tabs/GuidePendingBillingSection.tsx

import {
    Box,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Typography
} from '@mui/material';
import { Calendar, Send, User } from 'lucide-react';

const formatProviderName = (slug: string) => {
    if (!slug) return 'Outros';
    return slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace('Anapolis', 'Anápolis')
        .replace('Goiania', 'Goiânia')
        .replace('Sao ', 'São ')
        .replace('Saude', 'Saúde')
        .replace('Brasilia', 'Brasília');
};

interface GuidePendingBillingSectionProps {
    guides: any[];
    selectedGuides: Set<string>;
    loading: boolean;
    onToggleGuide: (guideId: string) => void;
}

const formatCurrency = (value: number) =>
    (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
};

const GuidePendingBillingSection = ({
    guides,
    selectedGuides,
    loading,
    onToggleGuide
}: GuidePendingBillingSectionProps) => {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (guides.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Send className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma guia pendente de faturamento
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Todas as guias com sessões realizadas já foram faturadas.
                </Typography>
            </div>
        );
    }

    // Agrupar por convênio
    const grouped: Record<string, any[]> = {};
    guides.forEach(guide => {
        const provider = guide.insurance || 'Outros';
        if (!grouped[provider]) grouped[provider] = [];
        grouped[provider].push(guide);
    });

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([provider, providerGuides]) => {
                const providerTotal = providerGuides.reduce((sum, g) => sum + (g.pendingValue || 0), 0);
                const providerSessions = providerGuides.reduce((sum, g) => sum + (g.pendingSessions || 0), 0);
                const allSelected = providerGuides.every(g => selectedGuides.has(g.guideId));
                const someSelected = providerGuides.some(g => selectedGuides.has(g.guideId)) && !allSelected;

                return (
                    <Card key={provider} variant="outlined" sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                        {/* Header do Convênio */}
                        <Box
                            sx={{
                                px: 2.5,
                                py: 1.75,
                                background: 'linear-gradient(90deg, #FEF3C7 0%, #F9FAFB 100%)',
                                borderBottom: '1px solid #E5E7EB',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={() => {
                                        providerGuides.forEach(g => onToggleGuide(g.guideId));
                                    }}
                                />
                                <Box>
                                    <Typography fontWeight="700" fontSize="0.95rem" color="#B45309">
                                        {formatProviderName(provider)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {providerGuides.length} guia{providerGuides.length !== 1 ? 's' : ''} • {providerSessions} sessão{providerSessions !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                            </Box>
                            <Chip
                                size="small"
                                label={formatCurrency(providerTotal)}
                                sx={{ bgcolor: '#F59E0B', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}
                            />
                        </Box>

                        {/* Lista de Guias */}
                        <div className="divide-y">
                            {providerGuides.map((guide) => (
                                <Box
                                    key={guide.guideId}
                                    sx={{
                                        px: 2.5,
                                        py: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                        bgcolor: selectedGuides.has(guide.guideId) ? '#F0F9FF' : 'white',
                                        '&:hover': { bgcolor: '#F9FAFB' }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                        <Checkbox
                                            checked={selectedGuides.has(guide.guideId)}
                                            onChange={() => onToggleGuide(guide.guideId)}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography fontWeight="600" fontSize="0.9rem" color="#111827">
                                                    Guia {guide.number}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={guide.specialty}
                                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                                />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                    <User size={13} />
                                                    {guide.patient?.fullName || 'N/A'}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                    <Calendar size={13} />
                                                    {formatDate(guide.firstSessionDate)} {guide.lastSessionDate && guide.firstSessionDate !== guide.lastSessionDate && `→ ${formatDate(guide.lastSessionDate)}`}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography fontWeight="700" fontSize="0.95rem" color="#111827">
                                            {formatCurrency(guide.pendingValue)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {guide.pendingSessions} sessão{guide.pendingSessions !== 1 ? 's' : ''} pendente{guide.pendingSessions !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default GuidePendingBillingSection;
