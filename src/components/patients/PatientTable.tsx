import { Calendar, ChevronDown, ChevronUp, DollarSign, Edit, Eye, FileHeart, List, Package, Phone, Search, Trash2, User, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from "react-router-dom";
import patientService from '../../services/patientService';
import { PatientDTO, mapPatientListResponseDTO } from '../../dtos/patient.response.dto';

// ============================================================================
// Tipos e interfaces
// ============================================================================

interface PatientTableProps {
    patients?: PatientDTO[];
    onEditPatient?: (patient: PatientDTO) => void;
    onDeletePatient?: (patient: PatientDTO) => void;
    onPaymentAdvancedSuccess?: (patient: PatientDTO) => void;
    onRegisterPayment?: (patient: PatientDTO) => void;
    isRefreshing?: boolean;
}

interface WhatsAppActionButtonsProps {
    phone: string;
    nome?: string;
    profissional?: string;
    data?: Date;
    hora?: string;
    servico?: string;
    restantes?: string;
}

// ============================================================================
// Componentes auxiliares (tipados)
// ============================================================================

const WhatsAppActionButtons: React.FC<WhatsAppActionButtonsProps> = ({
    phone,
    nome,
    profissional,
    data,
    hora,
    servico,
    restantes,
}) => (
    <div className="flex gap-2">
        <button className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors">
            📱 Lembrete
        </button>
        <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
            💬 Mensagem
        </button>
    </div>
);

// ============================================================================
// Utilitários
// ============================================================================

const formatDateBrazilian = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('pt-BR');
};

/** Normaliza string removendo acentos para busca */
const normalizeString = (str?: string | null): string => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

// ============================================================================
// Componente principal
// ============================================================================

const PatientTable: React.FC<PatientTableProps> = ({
    patients: initialPatients = [],
    onEditPatient,
    onDeletePatient,
    onPaymentAdvancedSuccess,
    onRegisterPayment,
    isRefreshing = false,
}) => {
    // ------------------------------------------------------------
    // Hooks (sempre no topo)
    // ------------------------------------------------------------
    const [patients, setPatients] = useState<PatientDTO[]>(initialPatients);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [onlyWithDebt, setOnlyWithDebt] = useState(false);
    const [debtTotal, setDebtTotal] = useState<number | null>(null);
    const [debtTotalAmount, setDebtTotalAmount] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'ascending' | 'descending';
    }>({
        key: 'nextAppointment',
        direction: 'ascending',
    });

    // Sincroniza com props apenas quando não há busca/filtro ativo (evita sobrescrever)
    useEffect(() => {
        if (searchTerm === '' && !onlyWithDebt && initialPatients) {
            setPatients(initialPatients);
        }
    }, [initialPatients, searchTerm, onlyWithDebt]);

    // ------------------------------------------------------------
    // 🚀 V2: Busca na API quando o usuário digita algo OU ativa "Saldo devedor".
    // Os 5 pacientes vindos via prop (initialPatients) são só "os últimos mexidos" —
    // pra filtrar por débito (ou por nome) em TODA a base, precisa bater no backend,
    // igual a busca por nome já fazia. PatientsView já tem stats.totalPendingParticular
    // pré-calculado, então o filtro é feito no banco (query param hasDebt), não em memória.
    // ------------------------------------------------------------
    useEffect(() => {
        if (!searchTerm.trim() && !onlyWithDebt) return;

        const fetchPatients = async () => {
            setIsSearching(true);
            try {
                const result = await patientService.list({
                    search: searchTerm.trim() || undefined,
                    hasDebt: onlyWithDebt,
                    limit: 100
                });
                const mapped = mapPatientListResponseDTO(result.patients);
                setPatients(mapped);
                setCurrentPage(1);
                if (onlyWithDebt) {
                    setDebtTotal(result.pagination.total);
                    setDebtTotalAmount(mapped.reduce((sum, p) => sum + (p.debt ?? 0), 0));
                }
            } catch (error) {
                console.error('❌ Erro ao buscar pacientes:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchPatients, searchTerm.trim() ? 500 : 0);
        return () => clearTimeout(timer);
    }, [searchTerm, onlyWithDebt]);

    // ------------------------------------------------------------
    // Memo
    // ------------------------------------------------------------
    const sortedPatients = useMemo(() => {
        if (!patients || patients.length === 0) return [];

        const sortablePatients = [...patients];

        sortablePatients.sort((a, b) => {
            const dateA = a.nextAppointment?.date
                ? new Date(a.nextAppointment.date).getTime()
                : Number.MAX_SAFE_INTEGER;

            const dateB = b.nextAppointment?.date
                ? new Date(b.nextAppointment.date).getTime()
                : Number.MAX_SAFE_INTEGER;

            if (sortConfig.direction === 'ascending') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });

        return sortablePatients;
    }, [patients, sortConfig]);

    // ------------------------------------------------------------
    // Paginação — `patients` já vem filtrado do backend (busca por nome e/ou
    // hasDebt), não há filtro local aqui.
    // ------------------------------------------------------------
    const filteredPatients = sortedPatients;

    // ------------------------------------------------------------
    // Flag para estado vazio (mas sem early return para manter a busca visível)
    // ------------------------------------------------------------
    const isEmpty = filteredPatients.length === 0;

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPatients = filteredPatients.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    const handlePageChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
        if (direction === 'next' && currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const sortData = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const toggleRow = (patientId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [patientId]: !prev[patientId],
        }));
    };

    // ------------------------------------------------------------
    // Renderização
    // ------------------------------------------------------------
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
            {/* 🔄 Overlay suave de refresh — NÃO desmonta a tabela, preserva filtro */}
            {isRefreshing && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
                </div>
            )}
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                        <List className="w-5 h-5 text-gray-600" />
                    </div>
                    Pacientes
                    <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {isSearching ? '...' : filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
                    </span>
                </h3>
            </div>

            <div className="p-4">
                    {/* Busca + filtro de saldo devedor */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="relative w-full flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                            />
                            {isSearching ? (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
                                </div>
                            ) : searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setOnlyWithDebt(prev => !prev);
                                if (onlyWithDebt) { setDebtTotal(null); setDebtTotalAmount(null); } // desligando: descarta resultado da última consulta
                                setCurrentPage(1);
                            }}
                            title="Buscar no servidor somente pacientes com saldo devedor"
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                onlyWithDebt
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <DollarSign className="w-4 h-4" />
                            Saldo devedor
                            {onlyWithDebt && debtTotal !== null && (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-3xs font-bold bg-red-600 text-white">
                                    {debtTotal}
                                </span>
                            )}
                            {onlyWithDebt && debtTotalAmount !== null && debtTotalAmount > 0 && (
                                <span className="text-3xs font-bold text-red-700">
                                    R$ {debtTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            )}
                        </button>
                    </div>

                    {isEmpty ? (
                        <div className="py-12 text-center">
                            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-base font-semibold text-gray-600 mb-1">Nenhum paciente encontrado</h3>
                            <p className="text-sm text-gray-400">
                                {onlyWithDebt
                                    ? 'Nenhum paciente com saldo devedor no momento'
                                    : searchTerm ? 'Tente buscar com outros termos' : 'Os dados dos pacientes estão sendo carregados...'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Header row */}
                            <div className="flex items-center gap-3 px-3 py-2 mb-1 border-b border-gray-200">
                                <div className="flex-1 min-w-0">
                                    <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Paciente
                                    </span>
                                </div>
                                <div className="w-44 shrink-0 hidden md:block">
                                    <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Package className="w-3 h-3" /> Terapia
                                    </span>
                                </div>
                                <div className="w-40 shrink-0 hidden lg:block cursor-pointer" onClick={() => sortData('nextAppointment')}>
                                    <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" /> Próxima consulta
                                        {sortConfig.key === 'nextAppointment' && (
                                            <span className="text-gray-600">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-28 shrink-0 hidden sm:block">
                                    <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <DollarSign className="w-3 h-3" /> Saldo
                                    </span>
                                </div>
                                <div className="w-36 shrink-0 text-center">
                                    <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Ações</span>
                                </div>
                                <div className="w-6 shrink-0" />
                            </div>

                            {/* Rows */}
                            <div className="space-y-1.5">
                                {paginatedPatients.map((patient) => {
                                    const isExpanded = expandedRows[patient.id];
                                    const hasDebt = (patient.debt ?? 0) > 0;
                                    const rowAccent = hasDebt
                                        ? 'border-l-[4px] border-l-red-400 bg-red-50 hover:bg-red-100'
                                        : 'border-l-[4px] border-l-gray-200 bg-white hover:bg-gray-50';

                                    return (
                                        <div key={patient.id}>
                                            <div
                                                className={`flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 transition-all shadow-sm cursor-pointer ${rowAccent}`}
                                                onClick={() => toggleRow(patient.id)}
                                            >
                                                {/* Paciente */}
                                                <div className="flex-1 min-w-0 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
                                                        {patient.fullName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-semibold text-gray-800 text-sm truncate">{patient.fullName || '-'}</span>
                                                            {patient.tags?.includes('vip') && (
                                                                <span className="px-1.5 py-0 rounded text-3xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">VIP</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {patient.phone || '-'}
                                                            </span>
                                                            {(() => {
                                                                const planName = patient.healthPlan?.name;
                                                                const isConvenio = (planName && planName.toLowerCase() !== 'particular') || patient.tags?.includes('convenio');
                                                                return isConvenio ? (
                                                                    <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 px-1.5 py-0 rounded text-3xs font-medium">
                                                                        <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                                                        {planName && planName.toLowerCase() !== 'particular' ? planName : 'Convênio'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-600 px-1.5 py-0 rounded text-3xs font-medium">
                                                                        <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                                                        Particular
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Terapia — pacote ativo ou resumo de sessões */}
                                                <div className="w-44 shrink-0 hidden md:block">
                                                    {(() => {
                                                        const activePackages = patient.packages?.filter(p => p.status === 'active') || [];
                                                        const totalCompleted = patient.totalCompleted ?? 0;
                                                        const nextSpecialty = patient.nextAppointment?.specialty || patient.nextAppointment?.sessionType;
                                                        const lastSpecialty = patient.lastAppointment?.specialty || patient.lastAppointment?.sessionType;
                                                        if (activePackages.length > 0) {
                                                            const pkg = activePackages[0];
                                                            const pct = pkg.totalSessions > 0 ? (pkg.sessionsDone / pkg.totalSessions) * 100 : 0;
                                                            return (
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="text-xs font-medium text-gray-700 truncate">{pkg.sessionType || 'Pacote'}</span>
                                                                        <span className="text-3xs text-purple-600 font-semibold shrink-0">{pkg.sessionsDone}/{pkg.totalSessions}</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <span className="text-3xs text-gray-400">{pkg.sessionsRemaining} restante{pkg.sessionsRemaining !== 1 ? 's' : ''}{activePackages.length > 1 ? ` · +${activePackages.length - 1}` : ''}</span>
                                                                    {(patient.doctorName || patient.nextAppointment?.doctor?.name || patient.lastAppointment?.doctor?.name) && (
                                                                        <span className="text-3xs text-gray-400 truncate">
                                                                            {patient.doctorName || patient.nextAppointment?.doctor?.name || patient.lastAppointment?.doctor?.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        if (totalCompleted > 0) {
                                                            return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-xs text-gray-500">{totalCompleted} sessão{totalCompleted !== 1 ? 'ões' : ''} total</span>
                                                                    {nextSpecialty ? (
                                                                        <span className="text-3xs text-gray-400 truncate">Próxima: {nextSpecialty}</span>
                                                                    ) : lastSpecialty ? (
                                                                        <span className="text-3xs text-gray-400 truncate">Última: {lastSpecialty}</span>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        }
                                                        if (nextSpecialty) {
                                                            return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-xs text-gray-500 truncate">{nextSpecialty}</span>
                                                                    <span className="text-3xs text-gray-400">Próxima consulta</span>
                                                                </div>
                                                            );
                                                        }
                                                        if (lastSpecialty) {
                                                            return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-xs text-gray-500 truncate">{lastSpecialty}</span>
                                                                    <span className="text-3xs text-gray-400">Última consulta</span>
                                                                </div>
                                                            );
                                                        }
                                                        return <span className="text-gray-300 text-xs">—</span>;
                                                    })()}
                                                </div>

                                                {/* Próxima consulta + última */}
                                                <div className="w-40 shrink-0 hidden lg:block">
                                                    {patient.nextAppointment?.date ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-xs font-medium">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDateBrazilian(patient.nextAppointment.date)}
                                                            </span>
                                                            {patient.lastAppointment?.date && (
                                                                <span className="text-3xs text-gray-400 pl-0.5">
                                                                    Última: {formatDateBrazilian(patient.lastAppointment.date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-gray-400 text-xs">Sem agendamento</span>
                                                            {patient.lastAppointment?.date && (
                                                                <span className="text-3xs text-gray-400">
                                                                    Última: {formatDateBrazilian(patient.lastAppointment.date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Saldo */}
                                                <div className="w-28 shrink-0 hidden sm:block">
                                                    {(() => {
                                                        const saldo = patient.debt ?? 0;
                                                        const totalPending = patient.totalPending ?? 0;
                                                        const convenioPending = totalPending - (patient.totalPendingParticular ?? 0);
                                                        if (saldo > 0) return (
                                                            <div>
                                                                <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold text-xs bg-red-100 px-2 py-0.5 rounded animate-pulse">
                                                                    <DollarSign className="w-3 h-3" /> R$ {saldo.toFixed(2)}
                                                                </span>
                                                                {convenioPending > 0.01 && (
                                                                    <div className="text-3xs text-blue-600 mt-0.5">+R$ {convenioPending.toFixed(2)} conv.</div>
                                                                )}
                                                            </div>
                                                        );
                                                        if (saldo < 0) return (
                                                            <span className="inline-flex items-center gap-0.5 text-green-700 text-xs font-medium">
                                                                <DollarSign className="w-3 h-3" /> -R$ {Math.abs(saldo).toFixed(2)}
                                                            </span>
                                                        );
                                                        return (
                                                            <div>
                                                                <span className="text-gray-400 text-xs">R$ 0,00</span>
                                                                {convenioPending > 0.01 && (
                                                                    <div className="text-3xs text-blue-600 mt-0.5">+R$ {convenioPending.toFixed(2)} conv.</div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Ações */}
                                                <div className="w-36 shrink-0">
                                                    <div className="flex gap-0.5 items-center justify-center">
                                                        <Link
                                                            to={`/patient-dashboard/${patient.patientId || patient.id}`}
                                                            title="Ver detalhes"
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEditPatient?.(patient); }}
                                                            title="Editar"
                                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <Link
                                                            to={`/patient-dashboard/${patient.patientId || patient.id}?tab=evolucoes`}
                                                            title="Ver evoluções"
                                                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <FileHeart className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDeletePatient?.(patient); }}
                                                            title="Deletar paciente"
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Chevron */}
                                                <div className="w-6 shrink-0 flex justify-center">
                                                    {isExpanded
                                                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                                                    }
                                                </div>
                                            </div>

                                            {/* Expanded stats + WhatsApp */}
                                            {isExpanded && (
                                                <div className="mx-1 mb-1 bg-gray-50 rounded-b-lg border border-t-0 border-gray-200 px-4 py-3 space-y-3">
                                                    {/* Stats grid */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {[
                                                            { label: 'Atendidos', value: patient.totalCompleted, color: 'text-green-700', bg: 'bg-green-50' },
                                                            { label: 'Cancelamentos', value: patient.totalCanceled, color: 'text-red-600', bg: 'bg-red-50' },
                                                            { label: 'Receita total', value: `R$ ${(patient.totalRevenue ?? 0).toLocaleString('pt-BR')}`, color: 'text-gray-700', bg: 'bg-white' },
                                                            { label: 'Pendente', value: patient.totalPending > 0 ? `R$ ${patient.totalPending.toLocaleString('pt-BR')}` : '—', color: patient.totalPending > 0 ? 'text-amber-700' : 'text-gray-400', bg: patient.totalPending > 0 ? 'bg-amber-50' : 'bg-white' },
                                                        ].map(s => (
                                                            <div key={s.label} className={`${s.bg} border border-gray-100 rounded-lg px-3 py-2`}>
                                                                <div className="text-3xs text-gray-400 mb-0.5">{s.label}</div>
                                                                <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* WhatsApp */}
                                                    {patient.phone && (
                                                        <div>
                                                            <h4 className="text-3xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Contato rápido</h4>
                                                            <WhatsAppActionButtons
                                                                phone={patient.phone.startsWith('+') ? patient.phone.slice(1) : patient.phone}
                                                                nome={patient.name}
                                                                profissional={patient.nextAppointment?.doctor?.name}
                                                                data={patient.nextAppointment?.date ? new Date(patient.nextAppointment.date) : undefined}
                                                                hora={patient.nextAppointment?.date
                                                                    ? new Date(patient.nextAppointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                                                    : undefined
                                                                }
                                                                servico={patient.lastAppointment?.doctor?.specialty}
                                                                restantes="2"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Paginação */}
                            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredPatients.length)} de {filteredPatients.length}</span>
                                    <div className="flex items-center gap-2">
                                        <span>Exibir:</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={handleItemsPerPageChange}
                                            className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handlePageChange('prev')}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 border border-gray-200 rounded-md text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                currentPage === page
                                                    ? 'bg-gray-800 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange('next')}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 border border-gray-200 rounded-md text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
        </div>
    );
};

export default PatientTable;
