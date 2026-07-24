// src/pages/Financial/tabs/InsuranceTab.tsx

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
    Avatar,
    Card,
    CardContent,
    Grid,
    Collapse,
    CircularProgress,
    Skeleton,
} from '@mui/material';
import { Patient360Modal } from '../components/Patient360Modal';
import {
    AlertCircle,
    Building2,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Mail,
    Plus,
    Send,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    History
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import { PatientAccordionSection } from './PatientAccordionSection';
import GuidePendingBillingSection, { PendingGuide } from './GuidePendingBillingSection';
import InsuranceHistorySection from './InsuranceHistorySection';
import ConvenioManagerModal from '../components/ConvenioManagerModal';
import doctorService from '../../../services/doctorService';
import { usePatients } from '../../../hooks/usePatients';
import {
    createInsurancePayment,
    getInsuranceReceivables,
    InsuranceReceivableGroup,
    billInsuranceSession,
    receiveInsuranceSession,
    faturarConvenioLote,
    receberConvenioLote,
    getPendingBillingGuides,
    encerrarGuia
} from '../../../services/paymentService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { Shield } from 'lucide-react';
import { AutorizacoesTab } from './AutorizacoesTab';
import { useConvenios } from '../../../hooks/useConvenios';
import BillingCommunicationWizard from '../components/BillingCommunicationWizard';

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
    pending_billing: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Aguardando Faturamento' },
    billed: { color: '#3B82F6', bgColor: '#3B82F610', label: 'Faturado' },
    received: { color: '#10B981', bgColor: '#10B98110', label: 'Recebido' },
    partial: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Recebido Parcial' },
    glosa: { color: '#EF4444', bgColor: '#EF444410', label: 'Glosado' }
};

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

interface InsuranceTabProps {
    month: number;
    year: number;
}

const InsuranceTab = ({ month, year }: InsuranceTabProps) => {
    const [subTab, setSubTab] = useState(0);
    const [receivables, setReceivables] = useState<InsuranceReceivableGroup[]>([]);
    const [allReceivables, setAllReceivables] = useState<InsuranceReceivableGroup[]>([]); // Todos os status para os cards
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalProviders: 0, grandTotal: 0, pendingCount: 0, prevMonthTotal: null as number | null, change: null as number | null, changePercent: null as number | null });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Estados para seleção em lote
    const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
    const [selectedGuides, setSelectedGuides] = useState<Set<string>>(new Set());
    const [pendingGuides, setPendingGuides] = useState<PendingGuide[]>([]);
    const [orphanSessions, setOrphanSessions] = useState<Array<{ sessionId: string; date?: string | Date | null; patient?: { fullName?: string } | null; specialty?: string; sessionValue?: number; insuranceProvider?: string }>>([]);
    const [loadingGuides, setLoadingGuides] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const [doctors, setDoctors] = useState<any[]>([]);
    const { convenios, isLoading: loadingConvenios } = useConvenios({ includeInactive: false });
    const [formData, setFormData] = useState({
        patientId: '',
        doctorId: '',
        insuranceProvider: '',
        grossAmount: 0,
        authorizationCode: '',
        serviceType: 'session',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [receiveData, setReceiveData] = useState({
        receivedAmount: 0,
        receivedDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
    const [is360ModalOpen, setIs360ModalOpen] = useState(false);
    const [selectedMonthYear, setSelectedMonthYear] = useState(`${year}-${String(month).padStart(2, '0')}`);
    const [cardsOpen, setCardsOpen] = useState(false);

    useEffect(() => {
        setSelectedMonthYear(`${year}-${String(month).padStart(2, '0')}`);
    }, [month, year]);

    // Estados para modal de faturamento em lote
    const [faturarLoteModalOpen, setFaturarLoteModalOpen] = useState(false);
    const [faturarLoteLoading, setFaturarLoteLoading] = useState(false);
    const [faturarLoteData, setFaturarLoteData] = useState({
        dataFaturamento: new Date().toISOString().split('T')[0],
        notaFiscal: ''
    });
    // true quando este modal abriu logo após o wizard de documentação (não como ação avulsa) —
    // muda o texto pra deixar claro que "documentos enviados" ainda não é "faturado"
    const [faturarLoteFromWizard, setFaturarLoteFromWizard] = useState(false);

    // Estado para modal de finalização de guias após faturamento
    const [postFaturamentoCloseModal, setPostFaturamentoCloseModal] = useState<{ open: boolean; guides: Array<{ guideId: string; number: string; sessionsCount: number }> }>({ open: false, guides: [] });
    const [postFaturamentoCloseLoading, setPostFaturamentoCloseLoading] = useState(false);
    const [selectedCloseGuides, setSelectedCloseGuides] = useState<Set<string>>(new Set());

    // Estados para modal de recebimento em lote
    const [receberLoteModalOpen, setReceberLoteModalOpen] = useState(false);
    const [receberLoteLoading, setReceberLoteLoading] = useState(false);
    const [receberLoteData, setReceberLoteData] = useState({
        dataRecebimento: new Date().toISOString().split('T')[0]
    });
    
    // Estado para modal de gerenciamento de convênios
    const [convenioManagerOpen, setConvenioManagerOpen] = useState(false);

    // Estado para wizard de envio de documentos de faturamento em massa
    const [billingWizardOpen, setBillingWizardOpen] = useState(false);
    const [billingWizardLoading, setBillingWizardLoading] = useState(false);
    const [wizardSelectedGuides, setWizardSelectedGuides] = useState<PendingGuide[]>([]);

    const getMonthLabel = () => {
        if (!selectedMonthYear) return '';
        const [year, month] = selectedMonthYear.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    };

    // Backend já filtra pelo campo correto de cada status (paymentDate/billedAt/receivedAt)
    // Frontend não deve refiltrar por paymentDate
    const paymentMatchesMonth = () => true;

    const { pendingStateGuides, waitingBillingGuides } = useMemo(() => {
        const pending = pendingGuides.filter(g => g.billingState === 'pending' || !g.billingState);
        const waiting = pendingGuides.filter(g => g.billingState === 'documentation_sent');
        return { pendingStateGuides: pending, waitingBillingGuides: waiting };
    }, [pendingGuides]);

    const getMonthSummary = () => {
        // Aba "A Faturar" usa modelo guide-based (guias + sessões sem guia)
        const guidePendingTotal = pendingStateGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingValue || 0), 0);
        const waitingTotal = waitingBillingGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingValue || 0), 0);
        const orphanTotal = orphanSessions.reduce((s: number, os) => s + (os.sessionValue || 0), 0);
        const totalAFaturar = guidePendingTotal + orphanTotal;
        const pendingCount = pendingStateGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingSessions || 0), 0) + orphanSessions.length;
        const waitingCount = waitingBillingGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingSessions || 0), 0);
        const closedCount = pendingGuides.filter(g => g.billingState === 'closed').length;

        // Outros status vêm do legado (será substituído por endpoint guide-based futuramente)
        const allPayments = allReceivables.flatMap(g =>
            (g.patients || []).flatMap((p: any) =>
                (p.payments || []).filter(paymentMatchesMonth)
            )
        );
        const billedPayments = allPayments.filter((p: any) => p.status === 'billed');
        const receivedPayments = allPayments.filter((p: any) => p.status === 'received');

        const activeProviders = new Set([
            ...pendingGuides.map(g => g.insurance),
            ...allReceivables.map(g => g._id)
        ]).size;

        return {
            totalAFaturar,
            totalWaiting: waitingTotal,
            totalFaturado: billedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            totalRecebido: receivedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            pendingCount,
            waitingCount,
            billedCount: billedPayments.length,
            receivedCount: receivedPayments.length,
            closedCount,
            totalProviders: activeProviders
        };
    };

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };



    useEffect(() => {
        loadDoctors();
    }, []);

    // 🚨 FIX (2026-07-20): eram 2 efeitos separados (um por [selectedMonthYear], outro
    // por [subTab]) — ambos disparam no mount, então toda montagem/troca de mês fazia
    // pending-billing ser chamado 2x (loadAllCounts sempre busca; loadReceivables busca
    // de novo se subTab===0). loadAllCounts já popula pendingGuides/orphanSessions —
    // loadReceivables só precisa rodar por conta própria para as abas Faturados/Recebidos.
    useEffect(() => {
        loadAllCounts(selectedMonthYear);
        if (subTab !== 0 && subTab !== 1) {
            loadReceivables(selectedMonthYear);
        }
    }, [selectedMonthYear, subTab]);

    useEffect(() => {
        const handleRefresh = () => {
            loadAllCounts(selectedMonthYear);
            if (subTab !== 0 && subTab !== 1) {
                loadReceivables(selectedMonthYear);
            }
        };
        window.addEventListener('cash:refresh', handleRefresh);
        return () => window.removeEventListener('cash:refresh', handleRefresh);
    }, [selectedMonthYear, subTab]);

    // Carrega counts de todas as abas (A Faturar, Faturados, Recebidos) antecipadamente
    const loadAllCounts = async (month?: string) => {
        try {
            const [pendingResponse, allResponse] = await Promise.all([
                // A Faturar não é escopado por mês: pendência de convênio não tem "mês", só data de quando foi feita.
                // Sem o param `month`, o backend não filtra por período e traz TODAS as sessões pendentes de cada guia.
                getPendingBillingGuides({ limit: 100 }),
                getInsuranceReceivables({ month })
            ]);
            setPendingGuides(pendingResponse.data.data || []);
            setOrphanSessions(pendingResponse.data.orphanSessions || []);
            setAllReceivables(allResponse.data.data || []);
        } catch (error) {
            console.error('Erro ao carregar counts de convênios:', error);
        }
    };

    const loadReceivables = async (month?: string) => {
        // Abas guide-based (A Faturar e Aguardando Faturamento) usam pendingGuides,
        // já carregadas por loadAllCounts. Apenas garantimos o loading state.
        if (subTab === 0 || subTab === 1) {
            setLoadingGuides(true);
            try {
                const response = await getPendingBillingGuides({ limit: 100 });
                setPendingGuides(response.data.data || []);
                setOrphanSessions(response.data.orphanSessions || []);
            } catch (error) {
                console.error('Erro ao carregar guias pendentes:', error);
                toast.error('Erro ao carregar guias pendentes');
            } finally {
                setLoadingGuides(false);
            }
            return;
        }

        setLoading(true);
        try {
            // Garante allReceivables para contagens/cards caso ainda não tenha carregado
            let allData = allReceivables;
            if (allData.length === 0) {
                const allResponse = await getInsuranceReceivables({ month });
                allData = allResponse.data.data || [];
                setAllReceivables(allData);
            }

            // Buscar dados filtrados pela aba ativa para a lista
            const statusFilter = subTab === 2 ? 'billed' : 'received';
            const response = await getInsuranceReceivables({ month, status: statusFilter });
            const data = response.data.data || [];

            // 🆕 CORREÇÃO: Não filtrar novamente - backend já retorna dados corretos
            // Apenas garante estrutura válida
            const validData = (data || []).map((group: any) => ({
                ...group,
                patients: (group.patients || []).map((p: any) => ({
                    ...p,
                    payments: p.payments || []
                })).filter((p: any) => (p.payments || []).length > 0)
            })).filter((group: any) => (group.patients || []).length > 0);

            setReceivables(validData);

            const totalPending = validData.reduce((acc: number, g: any) =>
                acc + (g.patients || []).reduce((pAcc: number, p: any) =>
                    pAcc + (p.payments || []).filter((pay: any) => pay.status !== 'received').length, 0
                ), 0
            );

            const apiSummary = response.data.summary || {};
            setSummary({
                totalProviders: validData.length,
                grandTotal: validData.reduce((acc: number, g: any) => acc + (g.totalPending || 0), 0),
                pendingCount: totalPending,
                prevMonthTotal: apiSummary.prevMonthTotal ?? null,
                change: apiSummary.change ?? null,
                changePercent: apiSummary.changePercent ?? null
            });

            const expanded: Record<string, boolean> = {};
            validData.forEach((g: any) => { expanded[g._id] = true; });
            setExpandedGroups(expanded);
        } catch (error) {
            console.error('Erro ao carregar recebíveis:', error);
            toast.error('Erro ao carregar dados de convênios');
        } finally {
            setLoading(false);
        }
    };

    // 🆕 Guide-based: carregar guias pendentes de faturamento (aba A Faturar)
    const loadPendingGuides = async (month?: string) => {
        setLoadingGuides(true);
        try {
            const response = await getPendingBillingGuides({ month, limit: 100 });
            setPendingGuides(response.data.data || []);
            setOrphanSessions(response.data.orphanSessions || []);
        } catch (error) {
            console.error('Erro ao carregar guias pendentes:', error);
            toast.error('Erro ao carregar guias pendentes');
        } finally {
            setLoadingGuides(false);
        }
    };

    const toggleGuideSelection = (guideId: string) => {
        const newSelected = new Set(selectedGuides);
        if (newSelected.has(guideId)) {
            newSelected.delete(guideId);
        } else {
            newSelected.add(guideId);
        }
        setSelectedGuides(newSelected);
    };

    const clearGuideSelection = () => setSelectedGuides(new Set());

    const selectAllGuides = () => {
        const source = subTab === 0 ? pendingStateGuides : waitingBillingGuides;
        setSelectedGuides(new Set(source.map(g => g.guideId)));
    };

    // Hook para pacientes
    const { patients } = usePatients();

    const loadDoctors = async () => {
        try {
            const doctorsRes = await doctorService.getAllDoctors();
            setDoctors(doctorsRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar doutores:', error);
        }
    };

    const handleCreateInsurance = async () => {
        if (!formData.patientId || !formData.doctorId || !formData.insuranceProvider || !formData.grossAmount || !formData.paymentDate) {
            toast.warn('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);
            await createInsurancePayment(formData);
            toast.success('Atendimento de convênio registrado! 💚');
            setIsNewModalOpen(false);
            setFormData({
                patientId: '',
                doctorId: '',
                insuranceProvider: '',
                grossAmount: 0,
                authorizationCode: '',
                serviceType: 'session',
                notes: '',
                paymentDate: new Date().toISOString().split('T')[0]
            });
            loadReceivables(selectedMonthYear);
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao registrar'));
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsBilled = async (payment: any) => {
        if (!payment.sessionId) {
            toast.error('Sessão não encontrada para este pagamento');
            return;
        }
        try {
            await billInsuranceSession(payment.sessionId);
            toast.success('Marcado como faturado!');
            loadReceivables(selectedMonthYear);
        } catch {
            toast.error('Erro ao faturar');
        }
    };

    const handleReceive = async () => {
        if (!selectedPayment) return;
        if (!selectedPayment.sessionId) {
            toast.error('Sessão não encontrada para este pagamento');
            return;
        }

        try {
            await receiveInsuranceSession(selectedPayment.sessionId, {
                receivedAmount: receiveData.receivedAmount || selectedPayment.grossAmount,
                receivedDate: receiveData.receivedDate
            });
            toast.success('Recebimento registrado! 💚');
            setReceiveModalOpen(false);
            setSelectedPayment(null);
            loadReceivables(selectedMonthYear);
        } catch {
            toast.error('Erro ao registrar recebimento');
        }
    };

    const getStatusChip = (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_billing;
        return (
            <Chip
                size="small"
                label={config.label}
                sx={{
                    bgcolor: config.bgColor,
                    color: config.color,
                    borderColor: config.color,
                    fontWeight: 500
                }}
                variant="outlined"
            />
        );
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const countByStatus = (status: string) => {
        // Usar allReceivables para as contagens das abas
        return allReceivables.reduce((sum, group) =>
            sum + (group.patients || []).reduce((pSum, patient) =>
                pSum + (patient.payments || []).filter((p: any) => p.status === status && paymentMatchesMonth()).length, 0
            ), 0
        );
    };

    // Funções para seleção em lote
    const togglePaymentSelection = (paymentId: string) => {
        const newSelected = new Set(selectedPayments);
        if (newSelected.has(paymentId)) {
            newSelected.delete(paymentId);
        } else {
            newSelected.add(paymentId);
        }
        setSelectedPayments(newSelected);
    };

    const selectAllFromPatient = (patient: any) => {
        const newSelected = new Set(selectedPayments);
        patient.payments.forEach((p: any) => {
            if (subTab === 2 && p.status === 'pending_billing') {
                newSelected.add(p.paymentId);
            } else if (subTab === 3 && p.status === 'billed') {
                newSelected.add(p.paymentId);
            } else if (subTab === 4 && ['received', 'partial', 'glosa'].includes(p.status)) {
                newSelected.add(p.paymentId);
            }
        });
        setSelectedPayments(newSelected);
    };

    const deselectAllFromPatient = (patient: any) => {
        const newSelected = new Set(selectedPayments);
        patient.payments.forEach((p: any) => {
            newSelected.delete(p.paymentId);
        });
        setSelectedPayments(newSelected);
    };

    const clearAllSelection = () => {
        setSelectedPayments(new Set());
    };

    const selectAll = () => {
        const newSelected = new Set<string>();
        receivables.forEach(group => {
            (group.patients || []).forEach((patient: any) => {
                (patient.payments || []).forEach((p: any) => {
                    if (subTab === 2 && p.status === 'pending_billing') newSelected.add(p.paymentId);
                    else if (subTab === 3 && p.status === 'billed') newSelected.add(p.paymentId);
                    else if (subTab === 4 && ['received', 'partial', 'glosa'].includes(p.status)) newSelected.add(p.paymentId);
                });
            });
        });
        setSelectedPayments(newSelected);
    };

    const totalSelectable = subTab === 5 || subTab === 6
        ? 0 // Histórico, Autorizações e Convênios Cadastrados: sem seleção em lote
        : subTab === 0
        ? pendingStateGuides.length
        : subTab === 1
        ? waitingBillingGuides.length
        : receivables.reduce((sum, group) =>
            sum + (group.patients || []).reduce((pSum: number, patient: any) =>
                pSum + (patient.payments || []).filter((p: any) =>
                    subTab === 2 ? p.status === 'billed'
                    : ['received', 'partial', 'glosa'].includes(p.status)
                ).length, 0
            ), 0
        );

    const isGuideMode = subTab === 0 || subTab === 1;

    const handleOpenFaturarLoteModal = () => {
        const hasSelection = isGuideMode ? selectedGuides.size > 0 : selectedPayments.size > 0;
        if (!hasSelection) {
            toast.warn(isGuideMode ? 'Selecione pelo menos uma guia' : 'Selecione pelo menos um atendimento');
            return;
        }
        setFaturarLoteData({
            dataFaturamento: new Date().toISOString().split('T')[0],
            notaFiscal: ''
        });
        setFaturarLoteFromWizard(false);
        setFaturarLoteModalOpen(true);
    };

    const handleOpenBillingWizard = () => {
        if (selectedGuides.size === 0) {
            toast.warn('Selecione pelo menos uma guia');
            return;
        }

        setBillingWizardLoading(true);
        try {
            const selected = pendingGuides.filter(g => selectedGuides.has(g.guideId));
            if (selected.length === 0) {
                toast.error('Guias selecionadas não encontradas');
                return;
            }

            const uniqueInsurances = new Set(selected.map(g => g.insurance));
            if (uniqueInsurances.size > 1) {
                toast.error('Selecione apenas guias do mesmo convênio para enviar documentos em lote');
                return;
            }

            setWizardSelectedGuides(selected);
            setBillingWizardOpen(true);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao preparar envio de documentos'));
        } finally {
            setBillingWizardLoading(false);
        }
    };

    const handleBillingWizardClose = () => {
        setBillingWizardOpen(false);
        setWizardSelectedGuides([]);
    };

    const handleBillingWizardAllSent = () => {
        setBillingWizardOpen(false);
        setWizardSelectedGuides([]);
        // Após envio dos documentos, a guia fica marcada como "Documentação enviada"
        // e a secretária pode faturar quando quiser pela aba "Aguardando faturamento".
        // Não abrimos mais o modal de faturamento automaticamente para evitar popup
        // persistente a cada reload e para respeitar o fluxo por estados visíveis.
        loadPendingGuides();
        toast.success('Documentação enviada. As guias aparecem em "Aguardando faturamento".');
    };

    const handleOpenBillingDrawer = async () => {
        // LEGADO: agora usamos o wizard em massa
        handleOpenBillingWizard();
    };

    const handleFaturarLote = async () => {
        setFaturarLoteLoading(true);
        try {
            const result = await faturarConvenioLote({
                ...(isGuideMode
                    ? { guideIds: Array.from(selectedGuides) }
                    : { paymentIds: Array.from(selectedPayments) }),
                dataFaturamento: faturarLoteData.dataFaturamento,
                notaFiscal: faturarLoteData.notaFiscal || undefined
            });

            if (result.data.success) {
                const data = result.data.data;
                if (isGuideMode) {
                    toast.success(`${data.sessionsFaturadas} atendimentos faturados a partir de ${data.guidesFaturadas} guia(s)!`);
                    const totalCanceled = data.totalAppointmentsCanceledOnClosure || 0;
                    if (totalCanceled > 0) {
                        const closedGuidesCount = (data.guideClosures || []).filter((c: any) => !c.skipped && c.canceled > 0).length;
                        toast.info(`${totalCanceled} agendamento(s) pendente(s) foram cancelados automaticamente em ${closedGuidesCount} guia(s) mensal(is) encerrada(s) pelo faturamento.`);
                    }
                    const failedClosures = (data.guideClosures || []).filter((c: any) => c.error);
                    if (failedClosures.length > 0) {
                        toast.warn(`${failedClosures.length} guia(s) tiveram falha ao tentar encerrar agendamentos pendentes — verifique manualmente.`);
                    }

                    // Oferece finalização manual explícita das guias faturadas (nunca automático)
                    const guides = (data.guides || []).filter((g: any) => g.guideId);
                    if (guides.length > 0) {
                        setFaturarLoteModalOpen(false);
                        setPostFaturamentoCloseModal({ open: true, guides });
                        setSelectedCloseGuides(new Set(guides.map((g: any) => g.guideId)));
                        clearAllSelection();
                        clearGuideSelection();
                        loadReceivables(selectedMonthYear);
                        return;
                    }
                } else {
                    const { faturados, ignorados } = data;
                    toast.success(`${faturados} atendimentos faturados!`);
                    if (ignorados > 0) {
                        toast.warn(`${ignorados} atendimento(s) sem sessão vinculada foram ignorados — verifique o cadastro.`);
                    }
                }
                setFaturarLoteModalOpen(false);
                clearAllSelection();
                clearGuideSelection();
                loadReceivables(selectedMonthYear);
            } else {
                toast.error(result.data.error || 'Erro ao faturar');
            }
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao faturar em lote'));
        } finally {
            setFaturarLoteLoading(false);
        }
    };

    const handleFinalizarGuiasAposFaturamento = async () => {
        if (selectedCloseGuides.size === 0) return;
        setPostFaturamentoCloseLoading(true);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        for (const guideId of Array.from(selectedCloseGuides)) {
            try {
                const result = await encerrarGuia({ guideId });
                if (result.data.success) {
                    successCount++;
                } else {
                    errorCount++;
                    errors.push(result.data.error || `Erro na guia ${guideId}`);
                }
            } catch (error: any) {
                errorCount++;
                errors.push(extractErrorMessage(error, `Erro ao finalizar guia ${guideId}`));
            }
        }
        if (successCount > 0) {
            toast.success(`${successCount} guia(s) finalizada(s) com sucesso.`);
        }
        if (errorCount > 0) {
            toast.error(`Falha ao finalizar ${errorCount} guia(s): ${errors.slice(0, 3).join('; ')}`);
        }
        setPostFaturamentoCloseModal({ open: false, guides: [] });
        setSelectedCloseGuides(new Set());
        loadReceivables(selectedMonthYear);
        setPostFaturamentoCloseLoading(false);
    };

    const handleOpenReceberLoteModal = () => {
        if (selectedPayments.size === 0) {
            toast.warn('Selecione pelo menos um atendimento');
            return;
        }
        setReceberLoteData({ dataRecebimento: new Date().toISOString().split('T')[0] });
        setReceberLoteModalOpen(true);
    };

    const handleReceberLote = async () => {
        setReceberLoteLoading(true);
        try {
            const result = await receberConvenioLote({
                paymentIds: Array.from(selectedPayments),
                dataRecebimento: receberLoteData.dataRecebimento
            });

            if (result.data.success) {
                toast.success(`${result.data.data.recebidos} recebimento(s) registrado(s) com sucesso!`);
                setReceberLoteModalOpen(false);
                clearAllSelection();
                loadReceivables(selectedMonthYear);
            } else {
                toast.error(result.data.error || 'Erro ao receber');
            }
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao receber em lote'));
        } finally {
            setReceberLoteLoading(false);
        }
    };

    if (loading && receivables.length === 0) {
        return (
            <Box>
                <Grid container spacing={2} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                    {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                        <Grid size={{ xs: 12, md: 4 }} key={i}>
                            <Card elevation={0} sx={{ border: `1px solid ${c.color}20`, borderRadius: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width="55%" height={20} />
                                            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                                            <Skeleton variant="text" width="45%" height={16} />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                            <Skeleton key={i} variant="rounded" width={145} height={36} sx={{ bgcolor: `${c.color}15` }} />
                        ))}
                    </Box>
                    <Box sx={{ p: 3 }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                        <Box>
                                            <Skeleton variant="text" width={150} height={20} />
                                            <Skeleton variant="text" width={100} height={16} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#3B82F6' }}>
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Gestão de Convênios</h2>
                        <p className="text-sm text-gray-500">Controle de faturamento e recebimentos · {getMonthLabel()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setConvenioManagerOpen(true)}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <Building2 size={16} />
                        Gerenciar Convênios
                    </button>
                    <button
                        onClick={() => setIsNewModalOpen(true)}
                        className="px-3 py-2 text-white text-sm font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
                    >
                        <Plus size={16} />
                        Novo Atendimento
                    </button>
                </div>
            </div>

            {/* Filtro de Mês — oculto no Histórico, Autorizações e Convênios Cadastrados (não são escopados por mês) */}
            {subTab !== 4 && subTab !== 5 && subTab !== 6 && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1 text-gray-500">
                        <Calendar size={16} />
                        <span className="text-sm font-medium">Período:</span>
                    </div>
                    <TextField
                        type="month"
                        label="Mês de referência"
                        value={selectedMonthYear}
                        onChange={(e) => setSelectedMonthYear(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 200 }}
                    />
                    <span className="text-sm text-gray-500 capitalize">{getMonthLabel()}</span>
                </div>
            )}

            {/* Cards de Resumo — accordion default fechado */}
            {(() => {
                const ms = getMonthSummary();
                const prodTotal = ms.totalAFaturar + ms.totalFaturado + ms.totalRecebido;
                return (
                    <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                        {/* Header clicável */}
                        <button
                            onClick={() => setCardsOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-sm font-semibold text-gray-700">Resumo do mês</span>
                                <span className="text-sm text-purple-700 font-bold">
                                    {prodTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} produção
                                </span>
                                <span className="text-sm text-amber-600">
                                    {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a faturar
                                </span>
                                {ms.totalWaiting > 0 && (
                                    <span className="text-sm text-blue-600">
                                        {ms.totalWaiting.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} aguardando faturamento
                                    </span>
                                )}
                                {ms.totalRecebido > 0 && (
                                    <span className="text-sm text-emerald-600 font-semibold">
                                        {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido
                                    </span>
                                )}
                                {ms.closedCount > 0 && (
                                    <span className="text-sm text-gray-600">
                                        {ms.closedCount} guia{ms.closedCount !== 1 ? 's' : ''} finalizada{ms.closedCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${cardsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <Collapse in={cardsOpen}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3">
                                {/* Produção Total */}
                                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <div style={{ height: 3, backgroundColor: '#8B5CF6' }} />
                                    <div className="p-4 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Produção</span>
                                            {summary.changePercent !== null && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${(summary.change ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {(summary.change ?? 0) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                    {(summary.change ?? 0) >= 0 ? '+' : ''}{summary.changePercent}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                                            {prodTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.pendingCount + ms.receivedCount} sessões realizadas</p>
                                        <p className="text-xs text-gray-400 mt-1">valor gerado · não é caixa ainda</p>
                                        {summary.prevMonthTotal !== null && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Mês anterior: <span className="font-semibold text-gray-600">{summary.prevMonthTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* A Faturar */}
                                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
                                    <div className="p-4 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">A Faturar</span>
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.pendingCount} sessões · {pendingStateGuides.length} guia{pendingStateGuides.length !== 1 ? 's' : ''}</p>
                                        <p className="text-xs text-gray-400 mt-1">não enviado ao convênio</p>
                                    </div>
                                </div>

                                {/* Aguardando Faturamento */}
                                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <div style={{ height: 3, backgroundColor: '#1D4ED8' }} />
                                    <div className="p-4 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Aguardando Faturamento</span>
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalWaiting.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.waitingCount} sessões · {waitingBillingGuides.length} guia{waitingBillingGuides.length !== 1 ? 's' : ''}</p>
                                        <p className="text-xs text-gray-400 mt-1">documentação já enviada</p>
                                    </div>
                                </div>

                                {/* Faturado */}
                                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
                                    <div className="p-4 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Faturado</span>
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.billedCount} sessões enviadas</p>
                                        <p className="text-xs text-gray-400 mt-1">aguardando repasse</p>
                                    </div>
                                </div>

                                {/* Recebido */}
                                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <div style={{ height: 3, backgroundColor: '#10B981' }} />
                                    <div className="p-4 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Recebido</span>
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.receivedCount} sessões pagas</p>
                                        <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Entrou no caixa</p>
                                    </div>
                                </div>
                            </div>
                        </Collapse>
                    </div>
                );
            })()}

            {/* Sub-tabs */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 pt-3 pb-3 border-b border-gray-100">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {[
                            { label: 'A Faturar', count: pendingStateGuides.length,        icon: <Clock size={15} />, amber: true },
                            { label: 'Aguardando Faturamento', count: waitingBillingGuides.length, icon: <Mail size={15} />, amber: true },
                            { label: 'Faturados', count: countByStatus('billed'),     icon: <Send size={15} />, amber: false },
                            { label: 'Recebidos', count: countByStatus('received'),   icon: <CheckCircle size={15} />, amber: false },
                            { label: 'Histórico', count: 0,                           icon: <History size={15} />, amber: false },
                            { label: 'Autorizações', count: 0,                       icon: <Shield size={15} />, amber: false },
                            { label: 'Convênios Cadastrados', count: 0,               icon: <Building2 size={15} />, amber: false },
                        ].map((tab, i) => (
                            <button key={i} onClick={() => setSubTab(i)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all shrink-0 ${
                                    subTab === i
                                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                                {i < 4 && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        tab.amber
                                            ? (subTab === i ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700')
                                            : (subTab === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500')
                                    }`}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Barra de Ações em Lote — sempre visível quando há itens na aba */}
                {totalSelectable > 0 && (
                    <Paper elevation={(isGuideMode ? selectedGuides.size : selectedPayments.size) > 0 ? 2 : 0} sx={{
                        p: 1.5, mx: 2, mt: 1.5,
                        bgcolor: (isGuideMode ? selectedGuides.size : selectedPayments.size) > 0 ? '#F0F9FF' : '#F9FAFB',
                        border: `1px solid ${(isGuideMode ? selectedGuides.size : selectedPayments.size) > 0 ? '#3B82F6' : '#E5E7EB'}`,
                        borderRadius: 2
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {isGuideMode ? (
                                    <Button
                                        size="small"
                                        variant={selectedGuides.size === totalSelectable ? 'contained' : 'outlined'}
                                        startIcon={<Check size={15} />}
                                        onClick={selectedGuides.size === totalSelectable ? clearGuideSelection : selectAllGuides}
                                        sx={{ borderRadius: 2, fontSize: '0.8rem' }}
                                    >
                                        {selectedGuides.size === totalSelectable
                                            ? 'Desmarcar Todos'
                                            : `Selecionar Todos (${totalSelectable})`}
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        variant={selectedPayments.size === totalSelectable ? 'contained' : 'outlined'}
                                        startIcon={<Check size={15} />}
                                        onClick={selectedPayments.size === totalSelectable ? clearAllSelection : selectAll}
                                        sx={{ borderRadius: 2, fontSize: '0.8rem' }}
                                    >
                                        {selectedPayments.size === totalSelectable
                                            ? 'Desmarcar Todos'
                                            : `Selecionar Todos (${totalSelectable})`}
                                    </Button>
                                )}
                                {(isGuideMode ? selectedGuides.size : selectedPayments.size) > 0 && (
                                    <>
                                        <Typography variant="body2" fontWeight={600} color="#3B82F6">
                                            {isGuideMode ? selectedGuides.size : selectedPayments.size} selecionado(s)
                                        </Typography>
                                        <Button size="small" variant="text" onClick={isGuideMode ? clearGuideSelection : clearAllSelection} sx={{ fontSize: '0.75rem' }}>
                                            Limpar
                                        </Button>
                                    </>
                                )}
                            </Box>
                            {(isGuideMode ? selectedGuides.size : selectedPayments.size) > 0 && (
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    {subTab === 0 && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Send size={16} />}
                                            onClick={handleOpenBillingWizard}
                                            disabled={billingWizardLoading}
                                            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, borderRadius: 2 }}
                                        >
                                            {billingWizardLoading ? 'Abrindo...' : 'Enviar Documentos'}
                                        </Button>
                                    )}
                                    {(subTab === 0 || subTab === 1) && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Send size={16} />}
                                            onClick={handleOpenFaturarLoteModal}
                                            sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' }, borderRadius: 2 }}
                                        >
                                            Faturar Guias Selecionadas
                                        </Button>
                                    )}
                                    {subTab === 3 && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<CheckCircle size={16} />}
                                            onClick={handleOpenReceberLoteModal}
                                            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2 }}
                                        >
                                            Receber Selecionados
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                )}

                <Box sx={{ p: 3 }}>
                    {subTab === 6 ? (
                        <ConvenioManagerModal open onClose={() => {}} embedded />
                    ) : subTab === 5 ? (
                        <AutorizacoesTab month={month} year={year} />
                    ) : subTab === 4 ? (
                        <InsuranceHistorySection activeYear={year} activeMonth={month} />
                    ) : subTab === 0 || subTab === 1 ? (
                        <GuidePendingBillingSection
                            guides={subTab === 0 ? pendingStateGuides : waitingBillingGuides}
                            selectedGuides={selectedGuides}
                            orphanSessions={subTab === 0 ? orphanSessions : []}
                            loading={loadingGuides}
                            onToggleGuide={toggleGuideSelection}
                            onRefresh={() => loadReceivables(selectedMonthYear)}
                            month={selectedMonthYear}
                        />
                    ) : loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                        <Box>
                                            <Skeleton variant="text" width={150} height={20} />
                                            <Skeleton variant="text" width={100} height={16} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))
                    ) : receivables.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhum atendimento de convênio
                            </Typography>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 🆕 UX: Ordena convênios por valor total (maior primeiro) */}
                            {[...receivables]
                                .sort((a, b) => (b.totalPending || 0) - (a.totalPending || 0))
                                .map((group) => {
                                // 🆕 CORREÇÃO: Não filtrar novamente - backend já filtrou por status
                                const patientsToShow = (group.patients || [])
                                    .slice()
                                    .sort((a: any, b: any) => (b.total || 0) - (a.total || 0));
                                if (patientsToShow.length === 0) return null;
                                const groupTotal = group.totalPending || 0;
                                const isExpanded = expandedGroups[group._id] !== false;

                                const tabAccent = subTab === 3 ? '#3B82F6' : '#10B981';
                                // Para aba Recebidos: extrai datas de entrada no caixa
                                const allPaidDates = subTab === 4
                                    ? patientsToShow.flatMap((p: any) =>
                                        (p.payments || []).filter((pay: any) => pay.paidAt).map((pay: any) => pay.paidAt as string)
                                      ).sort()
                                    : [];
                                const formatDateBR = (d: string) => { const dt = new Date(d); return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`; };
                                const cashDateLabel = allPaidDates.length > 0
                                    ? allPaidDates[0] === allPaidDates[allPaidDates.length - 1]
                                        ? `caixa ${formatDateBR(allPaidDates[0])}`
                                        : `caixa ${formatDateBR(allPaidDates[0])} – ${formatDateBR(allPaidDates[allPaidDates.length - 1])}`
                                    : null;
                                return (
                                    <Card key={group._id} elevation={0} sx={{
                                        width: '100%', borderRadius: 3,
                                        border: '1.5px solid #E2E8F0', overflow: 'hidden',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                        transition: 'box-shadow 0.15s',
                                        '&:hover': { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }
                                    }}>
                                        <Box sx={{ height: 3, bgcolor: tabAccent }} />
                                        <Box
                                            onClick={() => toggleGroup(group._id)}
                                            sx={{
                                                px: 2.5, py: 2,
                                                bgcolor: isExpanded ? '#FAFAFA' : 'white',
                                                borderBottom: isExpanded ? '1px solid #F1F5F9' : 'none',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: '#F8FAFC' },
                                            }}
                                        >
                                            <Box>
                                                <Typography fontWeight="800" fontSize="0.95rem" color="#0F172A" sx={{ mb: 0.25 }}>
                                                    {formatProviderName(group._id)}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                    <Typography fontSize="0.76rem" color="#94A3B8">
                                                        {patientsToShow.reduce((sum, p) => sum + (p.payments?.length || 0), 0)} atendimentos · {patientsToShow.length} paciente{patientsToShow.length !== 1 ? 's' : ''}
                                                    </Typography>
                                                    {cashDateLabel && (
                                                        <Box sx={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                            px: 0.75, py: 0.2,
                                                            bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 1
                                                        }}>
                                                            <Typography fontSize="0.68rem" fontWeight={700} color="#15803D">
                                                                ✓ {cashDateLabel}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ px: 1.75, py: 0.6, bgcolor: tabAccent, borderRadius: 2 }}>
                                                    <Typography fontWeight="800" fontSize="0.85rem" color="white">
                                                        {groupTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ color: '#CBD5E1', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                    <ChevronDown size={18} />
                                                </Box>
                                            </Box>
                                        </Box>

                                        <Collapse in={isExpanded}>
                                            <div className="divide-y divide-slate-50">
                                                {patientsToShow.map((patient) => (
                                                    <PatientAccordionSection
                                                        key={patient.patientId}
                                                        patient={patient}
                                                        provider={group._id}
                                                        onOpen360={handleOpen360}
                                                        onMarkAsBilled={handleMarkAsBilled}
                                                        onReceive={(payment) => {
                                                            setSelectedPayment(payment);
                                                            setReceiveData({
                                                                receivedAmount: payment.grossAmount,
                                                                receivedDate: new Date().toISOString().split('T')[0],
                                                                notes: ''
                                                            });
                                                            setReceiveModalOpen(true);
                                                        }}
                                                        getStatusChip={getStatusChip}
                                                        selectedPayments={selectedPayments}
                                                        onTogglePayment={togglePaymentSelection}
                                                        onSelectAllFromPatient={selectAllFromPatient}
                                                        onDeselectAllFromPatient={deselectAllFromPatient}
                                                        subTab={subTab}
                                                    />
                                                ))}
                                            </div>
                                        </Collapse>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Box>
            </div>

            {/* Modal: Faturar em Lote */}
            <Dialog open={faturarLoteModalOpen} onClose={() => !faturarLoteLoading && setFaturarLoteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#F59E0B', width: 32, height: 32 }}>
                            <Send className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">
                            {faturarLoteFromWizard ? 'Documentos enviados com sucesso. Deseja faturar esta(s) guia(s) agora?' : (isGuideMode ? 'Faturar Guias Selecionadas' : 'Faturar Atendimentos Selecionados')}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        {faturarLoteFromWizard && (
                            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.5, borderRadius: 2, bgcolor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                                <Typography variant="body2" sx={{ color: '#1E40AF' }}>
                                    Os documentos já foram enviados por e-mail ao convênio — isso ainda <strong>não</strong> fatura as guias. Elas continuam em "A Faturar" até o lote ser criado. Você pode criar agora ou deixar para depois (a guia ficará marcada como "Documentação enviada").
                                </Typography>
                            </Box>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {isGuideMode
                                ? `${selectedGuides.size} guia(s) serão faturadas. Todas as sessões pendentes de cada guia serão incluídas, independentemente do mês.`
                                : `${selectedPayments.size} atendimento(s) serão faturados`}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.5, borderRadius: 2, bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                            <AlertCircle size={16} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#92400E' }}>
                                Faturar uma guia <strong>não encerra automaticamente a guia</strong>. Ela continua ativa e poderá receber novos faturamentos enquanto houver sessões concluídas pendentes.
                                Para impedir novos agendamentos/faturamentos, use <strong>Finalizar guia</strong> no drawer da guia.
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Faturamento *"
                            value={faturarLoteData.dataFaturamento}
                            onChange={(e) => setFaturarLoteData({ ...faturarLoteData, dataFaturamento: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />

                        {isGuideMode ? (
                            <Box>
                                {(() => {
                                    const selectedGuideList = Array.from(selectedGuides)
                                        .map(id => pendingGuides.find(g => g.guideId === id))
                                        .filter(Boolean);
                                    const firstGuideWithInvoice = selectedGuideList.find(g => g?.invoiceNumber);
                                    if (firstGuideWithInvoice?.invoiceNumber) {
                                        return (
                                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                                <Typography variant="body2" sx={{ color: '#166534' }}>
                                                    <strong>Nota Fiscal:</strong> {firstGuideWithInvoice.invoiceNumber}
                                                </Typography>
                                            </Box>
                                        );
                                    }
                                    return (
                                        <TextField
                                            fullWidth
                                            label="Nota Fiscal *"
                                            placeholder="Informe o número da NF para criar o lote"
                                            value={faturarLoteData.notaFiscal}
                                            onChange={(e) => setFaturarLoteData({ ...faturarLoteData, notaFiscal: e.target.value })}
                                            required
                                        />
                                    );
                                })()}
                            </Box>
                        ) : (
                            <TextField
                                fullWidth
                                label="Nota Fiscal (opcional)"
                                placeholder="Número da NF"
                                value={faturarLoteData.notaFiscal}
                                onChange={(e) => setFaturarLoteData({ ...faturarLoteData, notaFiscal: e.target.value })}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setFaturarLoteModalOpen(false)} disabled={faturarLoteLoading}>
                        {faturarLoteFromWizard ? 'Deixar para depois' : 'Cancelar'}
                    </Button>
                    {(() => {
                        const selectedGuideList = isGuideMode
                            ? Array.from(selectedGuides).map(id => pendingGuides.find(g => g.guideId === id)).filter(Boolean)
                            : [];
                        const hasInvoiceFromCommunication = selectedGuideList.some(g => g?.invoiceNumber);
                        const canSubmit = !isGuideMode || hasInvoiceFromCommunication || faturarLoteData.notaFiscal.trim().length > 0;
                        return (
                            <Button
                                variant="contained"
                                onClick={handleFaturarLote}
                                disabled={faturarLoteLoading || !canSubmit}
                                startIcon={faturarLoteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                                sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                            >
                                {faturarLoteLoading ? 'Faturando...' : (faturarLoteFromWizard ? 'Criar lote agora' : 'Confirmar Faturamento')}
                            </Button>
                        );
                    })()}
                </DialogActions>
            </Dialog>

            {/* Modal: Finalizar guias após faturamento */}
            <Dialog
                open={postFaturamentoCloseModal.open}
                onClose={() => !postFaturamentoCloseLoading && setPostFaturamentoCloseModal({ open: false, guides: [] })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#7C3AED', width: 32, height: 32 }}>
                            <Shield className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Faturamento realizado com sucesso</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            O lote foi criado e as sessões concluídas foram faturadas. Se não houver mais atendimentos previstos nesta guia, você pode finalizá-la agora.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.5, borderRadius: 2, bgcolor: '#FEF3C7', border: '1px solid #F59E0B' }}>
                            <AlertCircle size={16} style={{ color: '#92400E', marginTop: 2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#92400E' }}>
                                Ao finalizar, os agendamentos futuros pendentes serão cancelados e a guia será encerrada. Esta ação não pode ser desfeita.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Guias faturadas ({postFaturamentoCloseModal.guides.length})
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {postFaturamentoCloseModal.guides.map((g) => (
                                    <Box
                                        key={g.guideId}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: selectedCloseGuides.has(g.guideId) ? '#7C3AED' : 'grey.200',
                                            bgcolor: selectedCloseGuides.has(g.guideId) ? '#F5F3FF' : 'background.paper'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`close-guide-${g.guideId}`}
                                            checked={selectedCloseGuides.has(g.guideId)}
                                            onChange={() => {
                                                const next = new Set(selectedCloseGuides);
                                                if (next.has(g.guideId)) {
                                                    next.delete(g.guideId);
                                                } else {
                                                    next.add(g.guideId);
                                                }
                                                setSelectedCloseGuides(next);
                                            }}
                                            style={{ width: 18, height: 18, accentColor: '#7C3AED' }}
                                        />
                                        <label htmlFor={`close-guide-${g.guideId}`} style={{ flex: 1, cursor: 'pointer', margin: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                Guia {g.number}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {g.sessionsCount} sessão(ões) faturada(s)
                                            </Typography>
                                        </label>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPostFaturamentoCloseModal({ open: false, guides: [] })} disabled={postFaturamentoCloseLoading}>
                        Continuar depois
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFinalizarGuiasAposFaturamento}
                        disabled={postFaturamentoCloseLoading || selectedCloseGuides.size === 0}
                        startIcon={postFaturamentoCloseLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
                    >
                        {postFaturamentoCloseLoading ? 'Finalizando...' : `Finalizar ${selectedCloseGuides.size} guia(s)`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Receber em Lote */}
            <Dialog open={receberLoteModalOpen} onClose={() => !receberLoteLoading && setReceberLoteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <CheckCircle className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {selectedPayments.size} atendimento(s) serão marcados como recebidos.
                            O valor entra no caixa na data informada abaixo.
                        </Typography>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Recebimento *"
                            value={receberLoteData.dataRecebimento}
                            onChange={(e) => setReceberLoteData({ dataRecebimento: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceberLoteModalOpen(false)} disabled={receberLoteLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleReceberLote}
                        disabled={receberLoteLoading}
                        startIcon={receberLoteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                    >
                        {receberLoteLoading ? 'Registrando...' : 'Confirmar Recebimento'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Novo Atendimento */}
            <Dialog open={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32 }}>
                            <Building2 className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Novo Atendimento de Convênio</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Atendimento *"
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <FormControl fullWidth>
                            <InputLabel>Paciente *</InputLabel>
                            <Select
                                value={formData.patientId}
                                label="Paciente *"
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                            >
                                {patients.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>{p.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Profissional *</InputLabel>
                            <Select
                                value={formData.doctorId}
                                label="Profissional *"
                                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                            >
                                {doctors.map((d) => (
                                    <MenuItem key={d._id} value={d._id}>{d.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Convênio *</InputLabel>
                            <Select
                                value={formData.insuranceProvider}
                                label="Convênio *"
                                disabled={loadingConvenios}
                                onChange={(e) => {
                                    const selectedCode = e.target.value;
                                    const provider = convenios.find(c => c.code === selectedCode);
                                    setFormData({
                                        ...formData,
                                        insuranceProvider: selectedCode,
                                        grossAmount: provider?.sessionValue || formData.grossAmount
                                    });
                                }}
                            >
                                <MenuItem value="">{loadingConvenios ? 'Carregando...' : 'Selecione'}</MenuItem>
                                {convenios.map((p) => (
                                    <MenuItem key={p._id} value={p.code}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box>
                            <Typography variant="body2" gutterBottom>Valor da Tabela *</Typography>
                            <InputCurrency
                                name=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.grossAmount}
                                onChange={(e) => setFormData({ ...formData, grossAmount: Number(e.target.value) })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            label="Código da Guia/Autorização"
                            value={formData.authorizationCode}
                            onChange={(e) => setFormData({ ...formData, authorizationCode: e.target.value })}
                            placeholder="Opcional"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsNewModalOpen(false)} variant="outlined">Cancelar</Button>
                    <Button variant="contained" onClick={handleCreateInsurance} disabled={loading} startIcon={<Check size={16} />} sx={{ bgcolor: '#3B82F6' }}>
                        Registrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Recebimento */}
            <Dialog open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <CheckCircle className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2">
                            <strong>Paciente:</strong> {selectedPayment?.patientName}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Valor esperado:</strong> R$ {selectedPayment?.grossAmount?.toLocaleString('pt-BR')}
                        </Typography>
                        <Box>
                            <Typography variant="body2" gutterBottom>Valor Recebido *</Typography>
                            <InputCurrency
                                name=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={receiveData.receivedAmount}
                                onChange={(e) => setReceiveData({ ...receiveData, receivedAmount: Number(e.target.value) })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Recebimento"
                            value={receiveData.receivedDate}
                            onChange={(e) => setReceiveData({ ...receiveData, receivedDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceiveModalOpen(false)} variant="outlined">Cancelar</Button>
                    <Button variant="contained" color="success" onClick={handleReceive} startIcon={<CheckCircle size={16} />} sx={{ bgcolor: '#10B981' }}>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>

            {selectedPatient360Id && (
                <Patient360Modal
                    patientId={selectedPatient360Id}
                    open={is360ModalOpen}
                    onClose={() => setIs360ModalOpen(false)}
                />
            )}
            
            <BillingCommunicationWizard
                open={billingWizardOpen}
                selectedGuides={wizardSelectedGuides}
                onClose={handleBillingWizardClose}
                onAllSent={handleBillingWizardAllSent}
            />

            {/* Modal: Gerenciamento de Convênios */}
            <ConvenioManagerModal
                open={convenioManagerOpen}
                onClose={() => setConvenioManagerOpen(false)}
            />
        </Box>
    );
};

export default InsuranceTab;
