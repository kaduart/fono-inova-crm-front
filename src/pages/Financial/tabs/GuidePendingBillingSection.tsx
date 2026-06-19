// src/pages/Financial/tabs/GuidePendingBillingSection.tsx
// Visualização por guia para a aba "A Faturar" do InsuranceTab

import {
    Box,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Tabs,
    Tab,
    Typography
} from '@mui/material';
import { Calendar, ChevronDown, ChevronUp, Send, User } from 'lucide-react';
import { useState } from 'react';
import { getSpecialtyLabel } from '../../../constants/specialties';

export interface PendingGuideSession {
    sessionId: string;
    date?: string | Date | null;
    specialty?: string | null;
    value?: number;
    doctorName?: string | null;
}

export interface PendingGuide {
    guideId: string;
    number: string;
    insurance: string;
    specialty?: string;
    patient?: { fullName?: string } | null;
    pendingSessions: number;
    pendingValue: number;
    firstSessionDate?: string | Date | null;
    lastSessionDate?: string | Date | null;
    sessions?: PendingGuideSession[];
}

interface OrphanSession {
    paymentId?: string;
    sessionId?: string;
    date?: string | Date | null;
    patient?: { fullName?: string } | null;
    specialty?: string;
    sessionValue?: number;
    authorizationCode?: string | null;
    insuranceProvider?: string;
}

interface GuidePendingBillingSectionProps {
    guides: PendingGuide[];
    selectedGuides: Set<string>;
    orphanSessions: OrphanSession[];
    loading: boolean;
    onToggleGuide: (guideId: string) => void;
}

const formatCurrency = (value: number | undefined) =>
    (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
};

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

const GuidePendingBillingSection = ({
    guides,
    selectedGuides,
    orphanSessions,
    loading,
    onToggleGuide
}: GuidePendingBillingSectionProps) => {
    const [expandedOrphanPatients, setExpandedOrphanPatients] = useState<Record<string, boolean>>({});
    const [expandedGuidePatients, setExpandedGuidePatients] = useState<Record<string, boolean>>({});
    const [patientSpecialtyTabs, setPatientSpecialtyTabs] = useState<Record<string, number>>({});

    const toggleOrphanPatient = (patientKey: string) => {
        setExpandedOrphanPatients(prev => ({ ...prev, [patientKey]: !prev[patientKey] }));
    };

    const toggleGuidePatient = (key: string) => {
        setExpandedGuidePatients(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [expandedGuideSessions, setExpandedGuideSessions] = useState<Record<string, boolean>>({});
    const toggleGuideSessions = (guideId: string) => {
        setExpandedGuideSessions(prev => ({ ...prev, [guideId]: !prev[guideId] }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (guides.length === 0 && orphanSessions.length === 0) {
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

    // Agrupar guias por convênio → paciente
    const groupedGuides: Record<string, Record<string, PendingGuide[]>> = {};
    guides.forEach(guide => {
        const provider = guide.insurance || 'outros';
        const patientName = guide.patient?.fullName || 'Paciente não identificado';
        if (!groupedGuides[provider]) groupedGuides[provider] = {};
        if (!groupedGuides[provider][patientName]) groupedGuides[provider][patientName] = [];
        groupedGuides[provider][patientName].push(guide);
    });

    // Agrupar órfãos por provider → paciente
    const groupedOrphansByProvider: Record<string, Record<string, OrphanSession[]>> = {};
    orphanSessions.forEach(session => {
        const provider = session.insuranceProvider || 'outros';
        const patientName = session.patient?.fullName || 'Paciente não identificado';
        if (!groupedOrphansByProvider[provider]) groupedOrphansByProvider[provider] = {};
        if (!groupedOrphansByProvider[provider][patientName]) groupedOrphansByProvider[provider][patientName] = [];
        groupedOrphansByProvider[provider][patientName].push(session);
    });
    const totalOrphanPatients = new Set(orphanSessions.map(s => s.patient?.fullName || 'Paciente não identificado')).size;

    return (
        <div className="space-y-4">
            {/* Guias pendentes — agrupadas por convênio → paciente (acordeão) */}
            {Object.entries(groupedGuides).map(([provider, providerPatients]) => {
                const allProviderGuides = Object.values(providerPatients).flat();
                const providerTotal = allProviderGuides.reduce((sum, g) => sum + (g.pendingValue || 0), 0);
                const providerSessions = allProviderGuides.reduce((sum, g) => sum + (g.pendingSessions || 0), 0);
                const allSelected = allProviderGuides.every(g => selectedGuides.has(g.guideId));
                const someSelected = allProviderGuides.some(g => selectedGuides.has(g.guideId)) && !allSelected;

                return (
                    <Card key={provider} variant="outlined" sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                        {/* Header do Convênio */}
                        <Box sx={{ px: 2.5, py: 1.75, background: 'linear-gradient(90deg, #FEF3C7 0%, #F9FAFB 100%)', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={() => allProviderGuides.forEach(g => onToggleGuide(g.guideId))}
                                />
                                <Box>
                                    <Typography fontWeight="700" fontSize="0.95rem" color="#B45309">
                                        {formatProviderName(provider)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {allProviderGuides.length} guia{allProviderGuides.length !== 1 ? 's' : ''} • {providerSessions} sessão{providerSessions !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                            </Box>
                            <Chip size="small" label={formatCurrency(providerTotal)} sx={{ bgcolor: '#F59E0B', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }} />
                        </Box>

                        {/* Pacientes — acordeão */}
                        <div className="divide-y">
                            {Object.entries(providerPatients).map(([patientName, patientGuides]) => {
                                const patientKey = `${provider}__${patientName}`;
                                const isExpanded = !!expandedGuidePatients[patientKey];
                                const patientTotal = patientGuides.reduce((s, g) => s + (g.pendingValue || 0), 0);
                                const patientSessions = patientGuides.reduce((s, g) => s + (g.pendingSessions || 0), 0);
                                const allPatientSelected = patientGuides.every(g => selectedGuides.has(g.guideId));
                                const somePatientSelected = patientGuides.some(g => selectedGuides.has(g.guideId)) && !allPatientSelected;

                                return (
                                    <Box key={patientKey}>
                                        {/* Header do paciente — clicável */}
                                        <Box
                                            onClick={() => toggleGuidePatient(patientKey)}
                                            sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: '#F9FAFB' } }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Checkbox
                                                    checked={allPatientSelected}
                                                    indeterminate={somePatientSelected}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={() => patientGuides.forEach(g => onToggleGuide(g.guideId))}
                                                />
                                                <User size={14} color="#6B7280" />
                                                <Typography fontWeight="600" fontSize="0.88rem" color="#374151">
                                                    {patientName}
                                                </Typography>
                                                <Chip size="small" label={`${patientGuides.length} guia${patientGuides.length !== 1 ? 's' : ''}`} sx={{ bgcolor: '#F1F5F9', color: '#475569', fontSize: '0.68rem', height: 18, fontWeight: 600 }} />
                                                <Chip size="small" label={`${patientSessions} sessão${patientSessions !== 1 ? 's' : ''}`} sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontSize: '0.68rem', height: 18, fontWeight: 600 }} />
                                                <Typography variant="caption" color="text.disabled" fontSize="0.72rem">
                                                    clique para {isExpanded ? 'fechar' : 'expandir'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Chip size="small" label={formatCurrency(patientTotal)} sx={{ bgcolor: '#F59E0B', color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }} />
                                                {isExpanded ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                                            </Box>
                                        </Box>

                                        {/* Guias do paciente — cada guia expande para mostrar sessões */}
                                        <Collapse in={isExpanded}>
                                            <div className="divide-y">
                                                {patientGuides.map(guide => {
                                                    const sessionsOpen = !!expandedGuideSessions[guide.guideId];
                                                    const hasSessions = (guide.sessions?.length || 0) > 0;
                                                    return (
                                                        <Box key={guide.guideId}>
                                                            <Box sx={{ px: 2.5, pl: 6, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, bgcolor: selectedGuides.has(guide.guideId) ? '#F0F9FF' : '#FAFAFA', '&:hover': { bgcolor: '#F3F4F6' } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                                                    <Checkbox checked={selectedGuides.has(guide.guideId)} onChange={() => onToggleGuide(guide.guideId)} />
                                                                    <Box sx={{ flex: 1 }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                            <Typography fontWeight="600" fontSize="0.88rem" color="#111827">
                                                                                Guia {guide.number}
                                                                            </Typography>
                                                                            <Chip size="small" label={getSpecialtyLabel(guide.specialty || '')} sx={{ fontSize: '0.7rem', height: 20, bgcolor: '#EDE9FE', color: '#5B21B6', fontWeight: 600 }} />
                                                                        </Box>
                                                                        {(guide.firstSessionDate || guide.lastSessionDate) && (
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
                                                                                <Calendar size={12} />
                                                                                {formatDate(guide.firstSessionDate)}{guide.lastSessionDate && guide.firstSessionDate !== guide.lastSessionDate && ` → ${formatDate(guide.lastSessionDate)}`}
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                    <Box sx={{ textAlign: 'right' }}>
                                                                        <Typography fontWeight="700" fontSize="0.9rem" color="#111827">
                                                                            {formatCurrency(guide.pendingValue)}
                                                                        </Typography>
                                                                        <Chip size="small" label={`${guide.pendingSessions} sessão${guide.pendingSessions !== 1 ? 's' : ''} pendente${guide.pendingSessions !== 1 ? 's' : ''}`} sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontSize: '0.65rem', height: 18, fontWeight: 600 }} />
                                                                    </Box>
                                                                    {hasSessions && (
                                                                        <Box onClick={() => toggleGuideSessions(guide.guideId)} sx={{ cursor: 'pointer', color: '#9CA3AF', '&:hover': { color: '#374151' } }}>
                                                                            {sessionsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                            {/* Sessões individuais da guia */}
                                                            <Collapse in={sessionsOpen}>
                                                                <div className="divide-y">
                                                                    {(guide.sessions || []).map((s, idx) => (
                                                                        <Box key={s.sessionId || idx} sx={{ pl: 10, pr: 3, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F9FAFB' }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                                                <Calendar size={12} color="#9CA3AF" />
                                                                                <Typography fontSize="0.8rem" color="text.secondary">
                                                                                    {formatDate(s.date)}
                                                                                </Typography>
                                                                                {s.doctorName && (
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                        <User size={11} color="#9CA3AF" />
                                                                                        <Typography fontSize="0.75rem" color="text.secondary">
                                                                                            {s.doctorName}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                )}
                                                                                {s.specialty && s.specialty !== guide.specialty && (
                                                                                    <Chip size="small" label={getSpecialtyLabel(s.specialty)} sx={{ fontSize: '0.65rem', height: 16 }} />
                                                                                )}
                                                                            </Box>
                                                                            <Typography fontSize="0.8rem" fontWeight="600" color="#374151">
                                                                                {formatCurrency(s.value)}
                                                                            </Typography>
                                                                        </Box>
                                                                    ))}
                                                                </div>
                                                            </Collapse>
                                                        </Box>
                                                    );
                                                })}
                                            </div>
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </div>
                    </Card>
                );
            })}

            {/* Sessões órfãs agrupadas por provider → paciente */}
            {orphanSessions.length > 0 && (
                <Card variant="outlined" sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #D97706' }}>
                    {/* Header geral */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.75,
                            background: 'linear-gradient(90deg, #FEF3C7 0%, #F9FAFB 100%)',
                            borderBottom: '1px solid #FDE68A',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <Box>
                            <Typography fontWeight="700" fontSize="0.95rem" color="#92400E">
                                ⚠️ Atendimentos sem guia vinculada
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {orphanSessions.length} sessão{orphanSessions.length !== 1 ? 's' : ''} em {totalOrphanPatients} paciente{totalOrphanPatients !== 1 ? 's' : ''} • {Object.keys(groupedOrphansByProvider).length} convênio{Object.keys(groupedOrphansByProvider).length !== 1 ? 's' : ''}
                            </Typography>
                        </Box>
                        <Chip
                            size="small"
                            label={formatCurrency(orphanSessions.reduce((sum, s) => sum + (s.sessionValue || 0), 0))}
                            sx={{ bgcolor: '#D97706', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}
                        />
                    </Box>

                    {/* Provider → paciente */}
                    {Object.entries(groupedOrphansByProvider).map(([provider, patientMap]) => {
                        const providerTotal = Object.values(patientMap).flat().reduce((sum, s) => sum + (s.sessionValue || 0), 0);
                        const providerSessionCount = Object.values(patientMap).flat().length;
                        return (
                            <Box key={provider}>
                                {/* Sub-header do provider */}
                                <Box sx={{
                                    px: 2.5, py: 1,
                                    background: '#FFFBEB',
                                    borderBottom: '1px solid #FDE68A',
                                    borderTop: '1px solid #FDE68A',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <Typography fontWeight="700" fontSize="0.82rem" color="#B45309">
                                        {formatProviderName(provider)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {providerSessionCount} sessão{providerSessionCount !== 1 ? 's' : ''} • {formatCurrency(providerTotal)}
                                    </Typography>
                                </Box>

                    {/* Lista de pacientes deste provider */}
                    <div className="divide-y">
                        {Object.entries(patientMap).map(([patientName, sessions]) => {
                            const patientTotal = sessions.reduce((sum, s) => sum + (s.sessionValue || 0), 0);
                            const patientKey = `${provider}::${patientName}`;
                            const isExpanded = !!expandedOrphanPatients[patientKey];

                            return (
                                <Box key={patientKey}>
                                    {/* Header do paciente */}
                                    <Box
                                        sx={{
                                            px: 2.5,
                                            py: 1.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 2,
                                            bgcolor: '#FAFAF9',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: '#FEF3C7' }
                                        }}
                                        onClick={() => toggleOrphanPatient(patientKey)}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <User size={16} color="#B45309" />
                                            <Box>
                                                <Typography fontWeight="600" fontSize="0.9rem" color="#78350F">
                                                    {patientName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {sessions.length} sessão{sessions.length !== 1 ? 's' : ''} • clique para {isExpanded ? 'recolher' : 'expandir'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Chip
                                                size="small"
                                                label={formatCurrency(patientTotal)}
                                                sx={{ bgcolor: '#D97706', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}
                                            />
                                            {isExpanded ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
                                        </Box>
                                    </Box>

                                    {/* Sessões do paciente - agrupadas por especialidade */}
                                    <Collapse in={isExpanded}>
                                        {(() => {
                                            const groupedBySpecialty: Record<string, OrphanSession[]> = {};
                                            sessions.forEach(session => {
                                                const spec = session.specialty || 'N/A';
                                                if (!groupedBySpecialty[spec]) groupedBySpecialty[spec] = [];
                                                groupedBySpecialty[spec].push(session);
                                            });
                                            const specialties = Object.keys(groupedBySpecialty);
                                            const activeTab = Math.min(patientSpecialtyTabs[patientKey] ?? 0, specialties.length - 1);
                                            const activeSessions = groupedBySpecialty[specialties[activeTab]] || [];

                                            return (
                                                <>
                                                    {specialties.length > 1 && (
                                                        <Tabs
                                                            value={activeTab}
                                                            onChange={(_, v) => setPatientSpecialtyTabs(prev => ({ ...prev, [patientKey]: v }))}
                                                            variant="scrollable"
                                                            scrollButtons="auto"
                                                            sx={{
                                                                borderBottom: '1px solid #FECACA',
                                                                bgcolor: '#FFF5F5',
                                                                minHeight: 36,
                                                                '& .MuiTab-root': { minHeight: 36, fontSize: '0.78rem', py: 0.5 }
                                                            }}
                                                        >
                                                            {specialties.map((spec) => (
                                                                <Tab
                                                                    key={spec}
                                                                    label={`${getSpecialtyLabel(spec)} (${groupedBySpecialty[spec].length})`}
                                                                />
                                                            ))}
                                                        </Tabs>
                                                    )}
                                                    <div className="divide-y">
                                                        {activeSessions.map((session) => (
                                                            <Box
                                                                key={session.sessionId}
                                                                sx={{
                                                                    px: 2.5,
                                                                    py: 2,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: 2,
                                                                    bgcolor: 'white'
                                                                }}
                                                            >
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                        <Chip
                                                                            size="small"
                                                                            label={getSpecialtyLabel(session.specialty || 'N/A')}
                                                                            sx={{ fontSize: '0.7rem', height: 20 }}
                                                                        />
                                                                        <Chip
                                                                            size="small"
                                                                            label={formatProviderName(session.insuranceProvider || 'convenio')}
                                                                            sx={{ fontSize: '0.7rem', height: 20, bgcolor: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }}
                                                                            variant="outlined"
                                                                        />
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                                            <Calendar size={13} />
                                                                            {formatDate(session.date)}
                                                                        </Box>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#D97706', fontSize: '0.8rem' }}>
                                                                            Sem guia vinculada
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                                <Box sx={{ textAlign: 'right' }}>
                                                                    <Typography fontWeight="700" fontSize="0.95rem" color="#111827">
                                                                        {formatCurrency(session.sessionValue)}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        ))}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </div>
                </Box>
            );
        })}
                </Card>
            )}
        </div>
    );
};

export default GuidePendingBillingSection;
