import { Calendar, ChevronDown, ChevronUp, DollarSign, Edit, Eye, FileHeart, List, Package, Phone, Search, Trash2, User, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from 'react';
import { BsHourglass } from "react-icons/bs";
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
}

interface CardProps {
    children: React.ReactNode;
    className?: string;
    sx?: React.CSSProperties;
}

interface CardHeaderProps {
    children: React.ReactNode;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
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

interface PackageAccordionProps {
    packages: PatientDTO['packages'];
}

// ============================================================================
// Componentes auxiliares (tipados)
// ============================================================================

const Card: React.FC<CardProps> = ({ children, className, sx }) => (
    <div className={className} style={sx}>{children}</div>
);

const CardHeader: React.FC<CardHeaderProps> = ({ children }) => (
    <div className="px-6 py-5 border-b border-gray-100">{children}</div>
);

const Input: React.FC<InputProps> = ({ className, ...props }) => (
    <input
        className={`${className} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
        {...props}
    />
);

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

const PackageAccordion: React.FC<PackageAccordionProps> = ({ packages }) => (
    <div className="flex flex-col gap-1">
        {packages?.slice(0, 2).map((pkg, idx) => (
            <span
                key={idx}
                className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium"
            >
                <Package className="w-3 h-3" />
                {pkg.sessionType} ({pkg.sessionsDone}/{pkg.totalSessions})
            </span>
        ))}
        {packages && packages.length > 2 && (
            <span className="text-xs text-gray-500 mt-0.5">
                +{packages.length - 2} mais
            </span>
        )}
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
}) => {
    // ------------------------------------------------------------
    // Hooks (sempre no topo)
    // ------------------------------------------------------------
    const [patients, setPatients] = useState<PatientDTO[]>(initialPatients);
    
    // Atualiza quando props mudam
    useEffect(() => {
        if (initialPatients && initialPatients.length > 0) {
            setPatients(initialPatients);
        }
    }, [initialPatients]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'ascending' | 'descending';
    }>({
        key: 'nextAppointment',
        direction: 'ascending',
    });

    // ------------------------------------------------------------
    // 🚀 V2: Busca na API quando digita no filtro (Event-Driven)
    // ------------------------------------------------------------
    useEffect(() => {
        const fetchPatients = async () => {
            setIsSearching(true);
            try {
                // 🚀 V2: Usa patientService para busca
                const result = await patientService.list({
                    search: searchTerm.trim() || undefined,
                    limit: searchTerm.trim() ? 100 : 50
                });

                console.log('✅ Recebido:', result.patients.length, 'pacientes');
                setPatients(mapPatientListResponseDTO(result.patients));
                setCurrentPage(1);
            } catch (error) {
                console.error('❌ Erro ao buscar pacientes:', error);
            } finally {
                setIsSearching(false);
            }
        };

        // Debounce: espera 500ms após parar de digitar
        const timer = setTimeout(fetchPatients, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
    // Flag para estado vazio (mas sem early return para manter a busca visível)
    // ------------------------------------------------------------
    const isEmpty = !patients || patients.length === 0;

    // ------------------------------------------------------------
    // Paginação (sem filtro local - dados já vêm filtrados da API)
    // ------------------------------------------------------------
    const filteredPatients = sortedPatients;

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
        <Card
            className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '12px',       // ajustado para minimalismo
                border: '1px solid #f0f0f0',
                overflow: 'hidden',
                boxShadow: 'none',         // removido gradiente e sombra pesada
            }}
        >
            <CardHeader>
                <h3 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                        <List className="w-5 h-5 text-gray-600" />
                    </div>
                    Pacientes
                    <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {isSearching ? '...' : filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
                    </span>
                </h3>
            </CardHeader>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-600"></div>
                </div>
            ) : (
                <div>
                    {/* Busca */}
                    <div className="mb-6 px-6 pt-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por nome, telefone ou CPF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                            />
                            {isSearching ? (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
                                </div>
                            ) : searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mensagem quando não há pacientes */}
                    {isEmpty ? (
                        <div className="py-12 text-center">
                            <div className="text-gray-400 mb-4">
                                <User className="w-16 h-16 mx-auto" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                Nenhum paciente encontrado
                            </h3>
                            <p className="text-gray-500">
                                {searchTerm ? 'Tente buscar com outros termos' : 'Os dados dos pacientes estão sendo carregados...'}
                            </p>
                        </div>
                    ) : (
                    <>
                    {/* Tabela */}
                    <div className="overflow-x-auto border-t border-gray-100">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            Paciente
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5" />
                                            Atendimento
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => sortData('nextAppointment')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Próxima consulta
                                            {sortConfig.key === 'nextAppointment' && (
                                                <span className="text-gray-700 font-medium">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            Saldo
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5" />
                                            Pacotes
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-50">
                                {paginatedPatients.map((patient) => {
                                    const isExpanded = expandedRows[patient.id];
                                    return (
                                        <React.Fragment key={patient.id}>
                                            <tr
                                                className="hover:bg-gray-100 transition-colors cursor-pointer even:bg-green-50"
                                                onClick={() => toggleRow(patient.id)}
                                            >
                                                {/* Paciente */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-medium text-sm">
                                                            {patient.fullName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-800 text-sm">
                                                                {patient.fullName || '-'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                                <Phone className="w-3 h-3" />
                                                                {patient.phone || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Atendimento (plano) */}
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const planName = patient.healthPlan?.name;
                                                        const isConvenio = (planName && planName.toLowerCase() !== 'particular') || patient.tags?.includes('convenio');
                                                        if (isConvenio) {
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                                    {planName && planName.toLowerCase() !== 'particular' ? planName : 'Convênio'}
                                                                </span>
                                                            );
                                                        }
                                                        // Particular (explícito ou padrão)
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                                                Particular
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Próxima consulta */}
                                                <td className="px-6 py-4">
                                                    {patient.nextAppointment?.date ? (
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDateBrazilian(patient.nextAppointment.date)}
                                                            </span>
                                                            <div className="text-xs text-gray-600">
                                                                {patient.nextAppointment.doctor?.fullName || '-'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Sem agendamento</span>
                                                    )}
                                                </td>

                                                {/* Saldo */}
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const saldo = patient.debt ?? 0;
                                                        const totalPending = patient.totalPending ?? 0;
                                                        const totalPendingParticular = patient.totalPendingParticular ?? 0;
                                                        const convenioPending = totalPending - totalPendingParticular;
                                                        if (saldo > 0) {
                                                            return (
                                                                <div className="flex flex-col gap-1">
                                                                    {/* Débito real do paciente */}
                                                                    <span className="inline-flex items-center gap-1 text-red-600 font-semibold animate-pulse bg-red-100 px-2 py-1 rounded">
                                                                        <DollarSign className="w-4 h-4" />
                                                                        R$ {saldo.toFixed(2)}
                                                                    </span>
                                                                    {/* Hint de convênio pendente */}
                                                                    {convenioPending > 0.01 && (
                                                                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                                            + R$ {convenioPending.toFixed(2)} convênio
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        } else if (saldo < 0) {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                                                    <DollarSign className="w-4 h-4" />
                                                                    -R$ {Math.abs(saldo).toFixed(2)}
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-gray-400 text-xs">R$ 0,00</span>
                                                                    {convenioPending > 0.01 && (
                                                                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                                            + R$ {convenioPending.toFixed(2)} convênio
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    })()}
                                                </td>

                                                {/* Pacotes */}
                                                <td className="px-6 py-4">
                                                    {patient.packages && patient.packages.length > 0 ? (
                                                        <PackageAccordion packages={patient.packages} />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Nenhum pacote</span>
                                                    )}
                                                </td>

                                                {/* Ações */}
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <Link
                                                            to={`/patient-dashboard/${patient.patientId || patient.id}`}
                                                            title="Ver detalhes"
                                                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                       {/*  <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onPaymentAdvancedSuccess?.(patient);
                                                            }}
                                                            title="Registrar Pagamento"
                                                            className="p-1.5 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-md transition-colors"
                                                        >
                                                            <BsHourglass className="w-4 h-4" />
                                                        </button> */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEditPatient?.(patient);
                                                            }}
                                                            title="Editar"
                                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <Link
                                                            to={`/patient-dashboard/${patient.patientId || patient.id}?tab=evolucoes`}
                                                            title="Ver evoluções"
                                                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <FileHeart className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeletePatient?.(patient);
                                                            }}
                                                            title="Deletar paciente"
                                                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Expandir/recolher */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Linha expandida (WhatsApp) */}
                                            {isExpanded && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                                                            <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                                                <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                                                                Enviar mensagem via WhatsApp
                                                            </h4>
                                                            {patient.phone && (
                                                                <WhatsAppActionButtons
                                                                    phone={
                                                                        patient.phone.startsWith('+')
                                                                            ? patient.phone.slice(1)
                                                                            : patient.phone
                                                                    }
                                                                    nome={patient.name}
                                                                    profissional={patient.nextAppointment?.doctor?.name}
                                                                    data={
                                                                        patient.nextAppointment?.date
                                                                            ? new Date(patient.nextAppointment.date)
                                                                            : undefined
                                                                    }
                                                                    hora={
                                                                        patient.nextAppointment?.date
                                                                            ? new Date(
                                                                                patient.nextAppointment.date
                                                                            ).toLocaleTimeString('pt-BR', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                            })
                                                                            : undefined
                                                                    }
                                                                    servico={patient.lastAppointment?.doctor?.specialty}
                                                                    restantes="2"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>

                            {/* Rodapé com paginação */}
                            <tfoot className="bg-white border-t border-gray-100">
                                <tr>
                                    <td colSpan={7} className="px-6 py-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span>
                                                    Mostrando {startIndex + 1} -{' '}
                                                    {Math.min(startIndex + itemsPerPage, filteredPatients.length)} de{' '}
                                                    {filteredPatients.length}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-600">Exibir:</span>
                                                    <select
                                                        value={itemsPerPage}
                                                        onChange={handleItemsPerPageChange}
                                                        className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handlePageChange('prev')}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1.5 border border-gray-200 rounded-md text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Anterior
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, index) => {
                                                        const page = index + 1;
                                                        const isActive = currentPage === page;
                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                                                                        ? 'bg-gray-800 text-white'
                                                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <button
                                                    onClick={() => handlePageChange('next')}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1.5 border border-gray-200 rounded-md text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Próxima
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    </>
                    )}
                </div>
            )}
        </Card>
    );
};

export default PatientTable;