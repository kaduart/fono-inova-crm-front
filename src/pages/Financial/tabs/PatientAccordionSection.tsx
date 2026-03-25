// Seção de Paciente com Accordion e Tabs por Especialidade
// Substitui a renderização atual de pacientes no InsuranceTab

import { useState } from 'react';
import {
    Box,
    Chip,
    Typography,
    Avatar,
    Collapse,
    Tabs,
    Tab,
    Button,
    Checkbox
} from '@mui/material';
import { User, Calendar, ChevronDown, ChevronUp, Send, Check } from 'lucide-react';

interface Payment {
    paymentId: string;
    grossAmount: number;
    status: string;
    paymentDate: string;
    authorizationCode?: string;
    specialty?: string;
    guideNumber?: string;
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
    onOpen360: (patientId: string) => void;
    onMarkAsBilled: (paymentId: string) => void;
    onReceive: (payment: Payment) => void;
    getStatusChip: (status: string) => React.ReactNode;
    // Props para seleção em lote
    selectedPayments?: Set<string>;
    onTogglePayment?: (paymentId: string) => void;
    onSelectAllFromPatient?: (patient: Patient) => void;
    onDeselectAllFromPatient?: (patient: Patient) => void;
    subTab?: number;
}

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
const formatDateBR = (dateString: string): string => {
    if (!dateString || dateString === 'N/A') return '-';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const SPECIALTY_LABELS: Record<string, string> = {
    fonoaudiologia: 'Fonoaudiologia',
    psicologia: 'Psicologia',
    terapia_ocupacional: 'Terapia Ocupacional',
    fisioterapia: 'Fisioterapia',
    psicomotricidade: 'Psicomotricidade',
    musicoterapia: 'Musicoterapia',
    psicopedagogia: 'Psicopedagogia',
    neuropsicologia: 'Neuropsicologia',
    'N/A': 'Outros'
};

export const PatientAccordionSection: React.FC<PatientAccordionSectionProps> = ({
    patient,
    onOpen360,
    onMarkAsBilled,
    onReceive,
    getStatusChip,
    selectedPayments = new Set(),
    onTogglePayment,
    onSelectAllFromPatient,
    onDeselectAllFromPatient,
    subTab = 0
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
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

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className="bg-gray-50 border-b border-gray-200">
            {/* Header do Paciente - Accordion */}
            <Box 
                sx={{ 
                    p: 2, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#F3F4F6' }
                }}
                onClick={toggleExpand}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Checkbox de seleção do paciente */}
                    {onTogglePayment && (
                        <Checkbox
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                    onSelectAllFromPatient?.(patient);
                                } else {
                                    onDeselectAllFromPatient?.(patient);
                                }
                            }}
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
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                        size="small"
                        label={`R$ ${(patient.total || 0).toLocaleString('pt-BR')}`}
                        sx={{ bgcolor: '#10B98120', color: '#10B981', fontWeight: 'bold' }}
                    />
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Box>
            </Box>

            {/* Conteúdo do Accordion - Tabs por Especialidade */}
            <Collapse in={isExpanded}>
                <Box sx={{ bgcolor: 'white' }}>
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
                                        <span>{SPECIALTY_LABELS[specialty] || specialty}</span>
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

                    {/* Lista de Pagamentos da Especialidade Selecionada */}
                    <Box sx={{ p: 2 }}>
                        {(groupedBySpecialty[activeTab] || []).map((payment) => (
                            <Box 
                                key={payment.paymentId}
                                sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    p: 1.5,
                                    mb: 1,
                                    bgcolor: selectedPayments.has(payment.paymentId) ? '#F0F9FF' : '#F9FAFB',
                                    borderRadius: 1,
                                    border: selectedPayments.has(payment.paymentId) ? '2px solid #3B82F6' : '1px solid #E5E7EB'
                                }}
                            >
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    {/* Checkbox individual */}
                                    {onTogglePayment && (
                                        <Checkbox
                                            checked={selectedPayments.has(payment.paymentId)}
                                            onChange={() => onTogglePayment(payment.paymentId)}
                                            size="small"
                                        />
                                    )}
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <Box>
                                        <Typography variant="body2" fontWeight={500}>
                                            {formatDateBR(payment.paymentDate)}
                                        </Typography>
                                        {payment.guideNumber && payment.guideNumber !== 'N/A' && (
                                            <Typography variant="caption" color="text.secondary">
                                                Guia: {payment.guideNumber}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                        R$ {(payment.grossAmount || 0).toLocaleString('pt-BR')}
                                    </Typography>
                                    {getStatusChip(payment.status)}
                                    {payment.status === 'pending_billing' && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<Send size={14} />}
                                            onClick={() => onMarkAsBilled(payment.paymentId)}
                                            sx={{ borderColor: '#3B82F6', color: '#3B82F6', fontSize: '11px' }}
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
                                            sx={{ bgcolor: '#10B981', fontSize: '11px' }}
                                        >
                                            Receber
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Collapse>
        </div>
    );
};
