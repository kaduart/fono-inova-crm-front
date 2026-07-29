// Seção de Paciente com Drawer lateral de detalhes
// Substitui o accordion inline por drawer padronizado

import { useState, useMemo } from 'react';
import {
    Box,
    Chip,
    Typography,
    Avatar,
    Tabs,
    Tab,
    Button,
    Checkbox,
    Collapse,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import { User, Calendar, ChevronRight, ChevronDown, ChevronUp, Send, Check, Lock } from 'lucide-react';
import InsurancePatientDrawer from '../components/InsurancePatientDrawer';

// 🆕 UX helpers (também definidos em InsuranceTab.tsx)
function daysSince(dateStr: string): number {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
    if (days > 60) return '#EF4444';
    if (days > 30) return '#F59E0B';
    return '#6B7280';
}

function urgencyLabel(days: number, status: string): string {
    if (status === 'pending_billing') {
        if (days > 60) return `🔴 A faturar há ${days}d`;
        if (days > 30) return `🟡 A faturar há ${days}d`;
        return `A faturar há ${days}d`;
    }
    if (status === 'billed') {
        if (days > 60) return `🔴 Aguardando há ${days}d`;
        if (days > 30) return `🟡 Aguardando há ${days}d`;
        return `Aguardando há ${days}d`;
    }
    return '';
}

interface Payment {
    paymentId: string;
    sessionId?: string;
    grossAmount: number;
    status: string;
    paymentDate: string;
    paidAt?: string | null;
    billedAt?: string | null;
    authorizationCode?: string;
    specialty?: string;
    guideNumber?: string | null;
    guideId?: string | null;
    billingMode?: 'per_month' | 'per_guide' | null;
    guideStatus?: string | null;
    guideClosedAt?: string | Date | null;
}

interface Patient {
    patientId: string;
    patientName: string;
    total: number;
    count: number;
    payments: Payment[];
}

interface PatientAccordionSectionProps {
    patient: Patient;
    provider?: string;
    onOpen360: (patientId: string) => void;
    onMarkAsBilled: (payment: Payment) => void;
    onReceive: (payment: Payment) => void;
    getStatusChip: (status: string) => React.ReactNode;
    // Props para seleção em lote
    selectedPayments?: Set<string>;
    onTogglePayment?: (paymentId: string) => void;
    onSelectAllFromPatient?: (patient: Patient) => void;
    onDeselectAllFromPatient?: (patient: Patient) => void;
    subTab?: number;
    onCloseGuide?: (guides: Array<{ guideId: string; guideNumber?: string | null }>) => void;
}

// Função para formatar data (YYYY-MM-DD ou ISO) para DD/MM/YYYY
const formatDateBR = (dateString: string): string => {
    if (!dateString || dateString === 'N/A') return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

import { getSpecialtyLabel } from '../../../constants/specialties';

// ── Tabela expansível por mês ───────────────────────────────────────────────

interface MonthlyPaymentTableProps {
    monthlyGroups: [string, Payment[]][];
    selectedPayments: Set<string>;
    onTogglePayment?: (paymentId: string) => void;
    onMarkAsBilled: (payment: Payment) => void;
    onReceive: (payment: Payment) => void;
    getStatusChip: (status: string) => React.ReactNode;
    subTab?: number;
}

function fmtMonthShort(monthKey: string) {
    if (!monthKey || monthKey === 'sem-data') return 'Sem data';
    const [y, m] = monthKey.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
}

function MonthlyPaymentTable({ monthlyGroups, selectedPayments, onTogglePayment, onMarkAsBilled, onReceive, getStatusChip, subTab }: MonthlyPaymentTableProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(monthlyGroups.map(([key]) => key)));

    const toggle = (key: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <TableContainer component={Paper} variant="outlined" className="rounded-xl overflow-hidden">
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                        <TableCell sx={{ width: 40 }} />
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280' }}>Mês</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', width: 90 }}>Atend.</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6B7280', width: 130 }}>Valor</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {monthlyGroups.map(([monthKey, payments]) => {
                        const isOpen = expanded.has(monthKey);
                        const total = payments.reduce((s, p) => s + (p.grossAmount || 0), 0);
                        return (
                            <>
                                <TableRow key={monthKey} hover sx={{ cursor: 'pointer' }} onClick={() => toggle(monthKey)}>
                                    <TableCell sx={{ p: 0.5 }}>
                                        <IconButton size="small" sx={{ p: 0.5 }} onClick={(e) => { e.stopPropagation(); toggle(monthKey); }}>
                                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell className="capitalize whitespace-nowrap" sx={{ fontSize: '0.85rem', color: '#374151' }}>
                                        {fmtMonthShort(monthKey)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: '0.85rem', color: '#6B7280' }}>{payments.length}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                                        R$ {total.toLocaleString('pt-BR')}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                            <Box sx={{ bgcolor: '#F8FAFC', px: 2, py: 1 }}>
                                                {payments.map((payment) => (
                                                    <Box
                                                        key={payment.paymentId}
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            p: 1.25,
                                                            mb: 0.75,
                                                            bgcolor: selectedPayments.has(payment.paymentId) ? '#F0F9FF' : 'white',
                                                            borderRadius: 1,
                                                            border: selectedPayments.has(payment.paymentId) ? '2px solid #3B82F6' : '1px solid #E5E7EB'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                            {onTogglePayment && (
                                                                <Checkbox
                                                                    checked={selectedPayments.has(payment.paymentId)}
                                                                    onChange={() => onTogglePayment(payment.paymentId)}
                                                                    size="small"
                                                                />
                                                            )}
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                                                                    {formatDateBR(payment.paymentDate)}
                                                                </Typography>
                                                                {payment.guideNumber && payment.guideNumber !== 'N/A' && (
                                                                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                                                        Guia: {payment.guideNumber}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>

                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Box sx={{ textAlign: 'right' }}>
                                                                <Typography variant="body2" fontWeight="bold" fontSize="0.82rem">
                                                                    R$ {(payment.grossAmount || 0).toLocaleString('pt-BR')}
                                                                </Typography>
                                                                {(payment.status === 'pending_billing' || payment.status === 'billed') && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            color: urgencyColor(daysSince(payment.paymentDate)),
                                                                            fontWeight: daysSince(payment.paymentDate) > 30 ? 700 : 400,
                                                                            fontSize: '0.65rem'
                                                                        }}
                                                                    >
                                                                        {urgencyLabel(daysSince(payment.paymentDate), payment.status)}
                                                                    </Typography>
                                                                )}
                                                                {payment.status === 'received' && payment.paidAt && (
                                                                    <Box sx={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                                        px: 0.75, py: 0.25, mt: 0.25,
                                                                        bgcolor: '#F0FDF4', border: '1px solid #BBF7D0',
                                                                        borderRadius: 1
                                                                    }}>
                                                                        <Typography fontSize="0.63rem" fontWeight={700} color="#15803D">
                                                                            ✓ caixa {formatDateBR(payment.paidAt)}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                            {getStatusChip(payment.status)}
                                                            {payment.status === 'pending_billing' && (
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<Send size={14} />}
                                                                    onClick={() => onMarkAsBilled(payment)}
                                                                    sx={{ borderColor: '#3B82F6', color: '#3B82F6', fontSize: '10px', py: 0.5 }}
                                                                >
                                                                    Faturar
                                                                </Button>
                                                            )}
                                                            {payment.status === 'billed' && (
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    startIcon={<Check size={14} />}
                                                                    onClick={() => onReceive(payment)}
                                                                    sx={{ bgcolor: '#10B981', fontSize: '10px', py: 0.5 }}
                                                                >
                                                                    Receber
                                                                </Button>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export const PatientAccordionSection: React.FC<PatientAccordionSectionProps> = ({
    patient,
    provider = '',
    onOpen360,
    onMarkAsBilled,
    onReceive,
    getStatusChip,
    selectedPayments = new Set(),
    onTogglePayment,
    onSelectAllFromPatient,
    onDeselectAllFromPatient,
    subTab = 0,
    onCloseGuide
}) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('');

    // Verificar estado de seleção do paciente
    const patientPaymentIds = patient.payments.map(p => p.paymentId);
    const selectedCount = patientPaymentIds.filter(id => selectedPayments.has(id)).length;
    const isAllSelected = selectedCount === patient.payments.length && patient.payments.length > 0;
    const isIndeterminate = selectedCount > 0 && selectedCount < patient.payments.length;

    // Agrupar pagamentos por especialidade
    const groupedBySpecialty: Record<string, Payment[]> = {};
    patient.payments.forEach(payment => {
        const specialty = payment.specialty || 'N/A';
        if (!groupedBySpecialty[specialty]) groupedBySpecialty[specialty] = [];
        groupedBySpecialty[specialty].push(payment);
    });

    const specialties = Object.keys(groupedBySpecialty);

    // Definir tab inicial se ainda não definida
    if (activeTab === '' && specialties.length > 0) {
        setActiveTab(specialties[0]);
    }

    // Agrupar por mês dentro da especialidade ativa (consistente com Histórico)
    const monthlyGroups = useMemo(() => {
        const payments = groupedBySpecialty[activeTab] || [];
        const groups: Record<string, Payment[]> = {};
        payments.forEach(p => {
            const key = p.paymentDate ? p.paymentDate.slice(0, 7) : 'sem-data';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [groupedBySpecialty, activeTab]);

    // Guias encerráveis deste paciente (para ação de fechar guia na aba Faturados)
    // ⚠️ Só guias per_month têm período de faturamento a encerrar. Guias per_guide
    // são encerradas automaticamente ao esgotar as sessões (status exhausted).
    const closeableGuides = useMemo(() => {
        const seen = new Set<string>();
        const guides: Array<{ guideId: string; guideNumber?: string | null }> = [];
        patient.payments.forEach(p => {
            if (!p.guideId || seen.has(p.guideId)) return;
            if (p.billingMode !== 'per_month') return;
            if (p.guideStatus === 'cancelled') return;
            if (p.guideClosedAt) return;
            seen.add(p.guideId);
            guides.push({ guideId: p.guideId, guideNumber: p.guideNumber });
        });
        return guides;
    }, [patient.payments]);

    // Guias já encerradas/esgotadas (indicador visual para o comercial)
    const closedGuides = useMemo(() => {
        const seen = new Set<string>();
        const guides: Array<{ guideId: string; guideNumber?: string | null }> = [];
        patient.payments.forEach(p => {
            if (!p.guideId || seen.has(p.guideId)) return;
            if (p.guideStatus === 'cancelled') return;
            const isClosed = p.guideClosedAt || p.guideStatus === 'exhausted' || p.guideStatus === 'closed';
            if (!isClosed) return;
            seen.add(p.guideId);
            guides.push({ guideId: p.guideId, guideNumber: p.guideNumber });
        });
        return guides;
    }, [patient.payments]);

    const openDrawer = () => setDrawerOpen(true);
    const closeDrawer = () => setDrawerOpen(false);

    // 🆕 Guias únicas deste paciente para exibir no cabeçalho
    const patientGuides = useMemo(() => {
        const seen = new Set<string>();
        const guides: string[] = [];
        patient.payments.forEach(p => {
            const gn = p.guideNumber;
            if (gn && gn !== 'N/A' && !seen.has(gn)) {
                seen.add(gn);
                guides.push(gn);
            }
        });
        return guides;
    }, [patient.payments]);

    const guidesLabel = patientGuides.length === 0
        ? null
        : patientGuides.length === 1
            ? `Guia: ${patientGuides[0]}`
            : `Guias: ${patientGuides.slice(0, 2).join(', ')}${patientGuides.length > 2 ? ` +${patientGuides.length - 2}` : ''}`;

    const subtitle = (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <span className="text-xs text-gray-500">{patient.payments?.length || 0} atendimento(s)</span>
            <span className="text-xs text-blue-600 font-semibold">{specialties.length} especialidade(s)</span>
            {guidesLabel && (
                <span className="text-xs text-amber-700 font-medium" title={patientGuides.join(', ')}>
                    {guidesLabel}
                </span>
            )}
            <span className="text-xs font-bold text-gray-800">
                R$ {(patient.total || 0).toLocaleString('pt-BR')}
            </span>
        </Box>
    );

    return (
        <>
            {/* Header do Paciente — clique abre drawer */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    bgcolor: (isAllSelected || isIndeterminate) ? '#F0F9FF' : 'inherit',
                    '&:hover': { bgcolor: '#F3F4F6' }
                }}
                onClick={openDrawer}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Checkbox de seleção do paciente */}
                    {onTogglePayment && (
                        <Checkbox
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onSelectAllFromPatient?.(patient);
                                } else {
                                    onDeselectAllFromPatient?.(patient);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                            sx={{ mr: 1 }}
                        />
                    )}
                    <Avatar
                        sx={{ bgcolor: '#E5E7EB', width: 40, height: 40 }}
                        onClick={(e) => { e.stopPropagation(); onOpen360(patient.patientId); }}
                    >
                        <User className="w-5 h-5 text-gray-600" />
                    </Avatar>
                    <Box>
                        <Typography
                            fontWeight="600"
                            onClick={(e) => { e.stopPropagation(); onOpen360(patient.patientId); }}
                            sx={{ cursor: 'pointer', '&:hover': { color: '#3B82F6' } }}
                        >
                            {patient.patientName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {patient.payments?.length || 0} atendimento(s) • {specialties.length} especialidade(s)
                            {guidesLabel && ` • ${guidesLabel}`}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                        size="small"
                        label={`R$ ${(patient.total || 0).toLocaleString('pt-BR')}`}
                        sx={{ bgcolor: '#10B98120', color: '#10B981', fontWeight: 'bold' }}
                    />
                    {subTab === 2 && closeableGuides.length > 0 && onCloseGuide && (
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onCloseGuide(closeableGuides); }}
                            sx={{ color: '#94A3B8', '&:hover': { color: '#B45309', bgcolor: '#FEF3C7' } }}
                            title={closeableGuides.length === 1
                                ? `Finalizar guia ${closeableGuides[0].guideNumber || closeableGuides[0].guideId} (cancela agendamentos pendentes)`
                                : `Finalizar ${closeableGuides.length} guias (cancela agendamentos pendentes)`}
                        >
                            <Lock size={16} />
                        </IconButton>
                    )}
                    {subTab === 2 && closeableGuides.length === 0 && closedGuides.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: '#9CA3AF',
                                cursor: 'default'
                            }}
                            title={closedGuides.length === 1
                                ? `Guia ${closedGuides[0].guideNumber || closedGuides[0].guideId} esgotada/encerrada`
                                : `${closedGuides.length} guias esgotadas/encerradas`}
                        >
                            <Lock size={16} />
                        </Box>
                    )}
                    <ChevronRight size={20} className="text-gray-400" />
                </Box>
            </Box>

            {/* Drawer de detalhes do paciente */}
            <InsurancePatientDrawer
                open={drawerOpen}
                onClose={closeDrawer}
                patientName={patient.patientName}
                provider={provider}
                subtitle={subtitle}
                headerColor="#F0FDF4"
            >
                <Box sx={{ bgcolor: 'white', minHeight: '100%' }}>
                    {/* Tabs */}
                    <Tabs
                        value={activeTab}
                        onChange={(_, value) => setActiveTab(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            minHeight: '40px',
                            '& .MuiTabs-flexContainer': { gap: 1, px: 1 }
                        }}
                    >
                        {specialties.map(specialty => (
                            <Tab
                                key={specialty}
                                value={specialty}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span>{getSpecialtyLabel(specialty)}</span>
                                        <Chip
                                            size="small"
                                            label={groupedBySpecialty[specialty].length}
                                            sx={{ height: 16, fontSize: '10px', bgcolor: '#E5E7EB' }}
                                        />
                                    </Box>
                                }
                                sx={{
                                    textTransform: 'none',
                                    minHeight: '36px',
                                    fontSize: '13px',
                                    fontWeight: 500
                                }}
                            />
                        ))}
                    </Tabs>

                    {/* Lista de Pagamentos agrupada por mês — expansível */}
                    <Box sx={{ p: 2 }}>
                        {monthlyGroups.length === 0 ? (
                            <Typography color="textSecondary" align="center" py={4}>
                                Nenhum atendimento nesta especialidade.
                            </Typography>
                        ) : (
                            <MonthlyPaymentTable
                                monthlyGroups={monthlyGroups}
                                selectedPayments={selectedPayments}
                                onTogglePayment={onTogglePayment}
                                onMarkAsBilled={onMarkAsBilled}
                                onReceive={onReceive}
                                getStatusChip={getStatusChip}
                                subTab={subTab}
                            />
                        )}
                    </Box>
                </Box>
            </InsurancePatientDrawer>
        </>
    );
};
