import { Calendar, ChevronDown, ChevronUp, Edit, Eye, FileHeart, List, Package, Phone, User } from "lucide-react";
import React, { useMemo, useState } from 'react';
import { BsHourglass } from "react-icons/bs";
import { Link } from "react-router-dom";

// Mock components para demonstração
const Card = ({ children, className, sx }) => (
    <div className={className} style={sx}>{children}</div>
);

const CardHeader = ({ children }) => (
    <div className="px-6 py-5 border-b border-gray-100">{children}</div>
);

const Input = ({ className, ...props }) => (
    <input className={`${className} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`} {...props} />
);

const WhatsAppActionButtons = (props) => (
    <div className="flex gap-2">
        <button className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors">
            📱 Lembrete
        </button>
        <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
            💬 Mensagem
        </button>
    </div>
);

const PackageAccordion = ({ packages }) => (
    <div className="flex flex-col gap-1">
        {packages.slice(0, 2).map((pkg, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium">
                <Package className="w-3 h-3" />
                {pkg.sessionType} ({pkg.sessionsDone}/{pkg.totalSessions})
            </span>
        ))}
        {packages.length > 2 && (
            <span className="text-xs text-gray-500 mt-0.5">+{packages.length - 2} mais</span>
        )}
    </div>
);

const formatDateBrazilian = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
};

// Mock data
const mockPatients = [
    {
        _id: "1",
        fullName: "José Miguel Xavier Ribeiro",
        phone: "(62) 98600-8879",
        dateOfBirth: "2023-07-18",
        healthPlan: { name: "Particular" },
        nextAppointment: {
            date: "2025-11-21",
            doctor: { fullName: "Lorrany Siqueira Marques" }
        },
        packages: [
            {
                sessionType: "fonoaudiologia",
                sessionsDone: 1,
                totalSessions: 4,
                status: "active"
            }
        ]
    }
];

const PatientTable = ({ patients = mockPatients, onEditPatient, onPaymentAdvancedSuccess, onRegisterPayment }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [expandedRows, setExpandedRows] = useState({});
    const [loading, setLoading] = useState(false);

    const [sortConfig, setSortConfig] = useState({
        key: "nextAppointment",
        direction: "ascending",
    });

    const sortedPatients = useMemo(() => {
        const sortablePatients = [...patients];

        sortablePatients.sort((a, b) => {
            const dateA = a.nextAppointment?.date
                ? new Date(a.nextAppointment.date).getTime()
                : Number.MAX_SAFE_INTEGER;

            const dateB = b.nextAppointment?.date
                ? new Date(b.nextAppointment.date).getTime()
                : Number.MAX_SAFE_INTEGER;

            if (sortConfig.direction === "ascending") {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });

        return sortablePatients;
    }, [patients, sortConfig]);

    const filteredPatients = sortedPatients.filter((patient) => {
        const term = searchTerm.toLowerCase();
        return (
            (patient.fullName && patient.fullName.toLowerCase().includes(term)) ||
            (patient.phone && patient.phone.toLowerCase().includes(term)) ||
            (patient.cpf && patient.cpf.toLowerCase().includes(term))
        );
    });

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (direction) => {
        if (direction === 'prev' && currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
        if (direction === 'next' && currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const sortData = (key) => {
        let direction = "ascending";
        if (sortConfig.key === key && sortConfig.direction === "ascending") {
            direction = "descending";
        }
        setSortConfig({ key, direction });
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const toggleRow = (patientId) => {
        setExpandedRows(prev => ({
            ...prev,
            [patientId]: !prev[patientId]
        }));
    };

    return (
        <Card
            className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)',
                background: 'linear-gradient(145deg, #ffffff, #f8f9fa)',
                border: '1px solid rgba(0,0,0,0.03)',
                overflow: 'hidden',
                height: '100%'
            }}
        >
            <CardHeader>
                <h3 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <List className="w-6 h-6 text-blue-600" />
                    </div>
                    Pacientes Cadastrados
                    <span className="ml-auto text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
                    </span>
                </h3>
            </CardHeader>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : (
                <div className="p-6">
                    <div className="mb-6">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por nome, telefone ou CPF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-md">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Paciente
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Atendimento
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                                        onClick={() => sortData("nextAppointment")}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Próxima Consulta
                                            {sortConfig.key === "nextAppointment" && (
                                                <span className="text-blue-600 font-bold">
                                                    {sortConfig.direction === "ascending" ? "↑" : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Pacotes
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Ações
                                    </th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-100">
                                {paginatedPatients.map((patient) => (
                                    <React.Fragment key={patient._id}>
                                        <tr
                                            className="hover:bg-blue-50 transition-all duration-150 cursor-pointer group"
                                            onClick={() => toggleRow(patient._id)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                                                        {patient.fullName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800 text-base">
                                                            {patient.fullName || '-'}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                            {patient.phone || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5">
                                                {patient.dateOfBirth ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                                                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                                        {patient.healthPlan.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-5">
                                                {patient.nextAppointment?.date ? (
                                                    <div className="space-y-1">
                                                        <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-100 to-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {formatDateBrazilian(patient.nextAppointment.date)}
                                                        </span>
                                                        <div className="text-xs text-gray-600 font-medium">
                                                            {patient.nextAppointment?.doctor?.fullName || '-'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">Sem agendamento</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-5">
                                                {patient.packages && patient.packages.length > 0 ? (
                                                    <PackageAccordion packages={patient.packages} />
                                                ) : (
                                                    <span className="text-gray-400 text-sm">Nenhum pacote</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-5">
                                                <div className="flex gap-2 justify-center">
                                                    <Link to={`/patient-dashboard/${patient._id}`} title="Ver detalhes">
                                                        <Eye className="w-5 h-5 text-orange-600 hover:text-orange-800" />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPaymentAdvancedSuccess?.(patient);
                                                        }}
                                                        title="Registrar Pagamento"
                                                        className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                    >
                                                        <BsHourglass className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditPatient?.(patient);
                                                        }}
                                                        title="Editar"
                                                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Ver evoluções"
                                                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                    >
                                                        <FileHeart className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5 text-right">
                                                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                    {expandedRows[patient._id] ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {
                                            expandedRows[patient._id] && (
                                                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                                    <td colSpan={6} className="px-6 py-6">
                                                        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                                                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                                <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                                                                Enviar mensagem via WhatsApp:
                                                            </h4>
                                                            {patient.phone && (
                                                                <WhatsAppActionButtons
                                                                    phone={patient.phone.startsWith('+')
                                                                        ? patient.phone.slice(1)
                                                                        : patient.phone}
                                                                    nome={patient.fullName}
                                                                    profissional={patient?.nextAppointment?.doctor?.fullName}
                                                                    data={new Date(patient.nextAppointment?.date)}
                                                                    hora={new Date(patient.nextAppointment?.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    servico={patient?.lastAppointment?.doctor?.specialty}
                                                                    restantes="2"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    </React.Fragment>
                                ))}

                                <tr className="bg-gray-50">
                                    <td colSpan={6} className="px-6 py-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-sm font-medium text-gray-600">Exibir:</span>
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={handleItemsPerPageChange}
                                                    className="border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                >
                                                    <option value={5}>5</option>
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                </select>
                                                <span className="text-sm text-gray-500">
                                                    Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredPatients.length)} de {filteredPatients.length}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handlePageChange('prev')}
                                                    disabled={currentPage === 1}
                                                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                                                                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${isActive
                                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105'
                                                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
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
                                                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Próxima
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }
        </Card >
    );
};

export default PatientTable;