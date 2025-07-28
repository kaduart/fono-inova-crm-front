import { ChevronDown, ChevronUp, DollarSign, Edit, Eye, FileHeart, Hourglass, HourglassIcon, List, Phone } from "lucide-react";
import React, { useMemo, useState } from 'react'; // Adicionei useMemo
import { Link, useNavigate } from 'react-router-dom';
import { formatDateBrazilian } from "../../utils/dateFormat";
import { IPatient } from "../../utils/types/types";
import { WhatsAppActionButtons } from "../mkt/whatsapp/buttons/WhatsAppActionButtons";
import { Card, CardHeader } from "../ui/Card";
import Input from "../ui/Input";
import PackageAccordion from "./PackageAccordion";
import { BsHourglass } from "react-icons/bs";

interface PatientTableProps {
    patients: IPatient[];
    onPatientUpdated?: () => void;
    onEditPatient?: (patient: IPatient) => void;
    onRegisterPayment?: (patient: IPatient) => void;
    onPaymentAdvancedSuccess?: (patient: IPatient) => void;
}
const PatientTable = ({ patients, onEditPatient, onPaymentAdvancedSuccess, onRegisterPayment }: PatientTableProps) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'ascending' | 'descending';
    }>({
        key: "nextAppointment",
        direction: "ascending", // 'ascending' = mais próximas primeiro
    });
    // Função para ordenar os pacientes
    const sortedPatients = useMemo(() => {
        const sortablePatients = [...patients];

        if (patients.length > 0) {
            setLoading(false)
        }
        
        sortablePatients.sort((a, b) => {
            // Trata pacientes sem data
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

    const handlePageChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
        if (direction === 'next' && currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const sortData = (key: string) => {
        let direction: 'ascending' | 'descending' = "ascending";
        if (sortConfig.key === key && sortConfig.direction === "ascending") {
            direction = "descending";
        }
        setSortConfig({ key, direction });
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1); // reset to first page
    };

    const toggleRow = (patientId: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [patientId]: !prev[patientId]
        }));
    };

    return (

        <>
            <Card className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow" sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)',
                background: 'linear-gradient(145deg, #ffffff, #f8f9fa)',
                border: '1px solid rgba(0,0,0,0.03)',
                overflow: 'hidden',
                height: '100%'
            }}>
                <CardHeader>

                    <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                        <List /> Pacientes Cadastrados
                    </h3>
                </CardHeader>
                {
                    loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div >
                    ) : (
                        <div>
                            <div className="w-1/2 ml-4 mt-4">

                                <Input
                                    type="text"
                                    placeholder="Buscar por nome, telefone ou CPF"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="mb-4 p-2 border border-gray-300 rounded w-full text-gray-500"
                                />
                            </div>

                            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 shadow">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                                            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Atendimento</th>
                                            <th
                                                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                                onClick={() => sortData("nextAppointment")}
                                            >
                                                <div className="flex items-center">
                                                    Próxima Consulta
                                                    {sortConfig.key === "nextAppointment" && (
                                                        <span className="ml-1">
                                                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Pacote</th>
                                            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedPatients.map((patient) => (
                                            <React.Fragment key={patient._id}>

                                                <tr
                                                    key={patient._id}
                                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => toggleRow(patient._id)}
                                                >
                                                    {/* Coluna Paciente */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-semibold text-gray-700 flex items-center gap-2">
                                                            <span className="text-sm">{patient.fullName || '-'}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <Phone className="w-4 h-4 text-gray-400" />
                                                            {patient.phone || '-'}
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {patient.dateOfBirth ? (
                                                            <>
                                                                <span className="inline-block bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs">
                                                                    {patient.healthPlan.name}
                                                                </span>
                                                            </>
                                                        ) : '-'}
                                                    </td>

                                                    {/* Coluna Próxima Consulta - MANTIDA COMO SOLICITADO */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {patient.nextAppointment?.date ? (
                                                            <>
                                                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                                                                    {formatDateBrazilian(patient.nextAppointment.date)}
                                                                </span>
                                                                <div className="text-xs text-gray-500">
                                                                    {patient.nextAppointment?.doctor?.fullName || '-'}
                                                                </div>
                                                            </>
                                                        ) : '-'}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {patient.packages && patient.packages.length > 0 ? (
                                                            <PackageAccordion packages={patient.packages} />
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">Nenhum pacote</span>
                                                        )}
                                                    </td>



                                                    {/* Coluna Ações */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        <div className="flex gap-3">
                                                            <Link to={`/patient-dashboard/${patient._id}`} title="Ver detalhes">
                                                                <Eye className="w-5 h-5 text-orange-600 hover:text-orange-800" />
                                                            </Link>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onPaymentAdvancedSuccess?.(patient);
                                                                }}
                                                                title="Registrar Pagamento Sessão Futura"
                                                                className="text-yellow-500 hover:text-green-800"
                                                            >
                                                                <BsHourglass className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditPatient?.(patient);
                                                                }}
                                                                title="Editar"
                                                                className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <Link to={`/evolutions/${patient._id}`} title="Ver evoluções">
                                                                <FileHeart className="w-5 h-5 text-green-600 hover:text-green-800" />
                                                            </Link>
                                                        </div>
                                                    </td>

                                                    {/* Coluna Expandir */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {expandedRows[patient._id] ? (
                                                            <ChevronUp className="w-5 h-5 text-gray-500" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Linha expandida com mensagens */}
                                                {expandedRows[patient._id] && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={6} className="px-6 py-4">
                                                            <div className="flex flex-col space-y-2">
                                                                <h4 className="text-sm font-medium text-gray-500 mb-2">Enviar mensagem:</h4>
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
                                                )}
                                            </React.Fragment>

                                        ))}

                                        {/* Paginação como linha extra */}
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-500">Exibir:</span>
                                                        <select
                                                            value={itemsPerPage}
                                                            onChange={handleItemsPerPageChange}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700"
                                                        >
                                                            <option value={5}>5</option>
                                                            <option value={10}>10</option>
                                                            <option value={20}>20</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            onClick={() => handlePageChange('prev')}
                                                            disabled={currentPage === 1}
                                                            className="px-2 py-1 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                        >
                                                            Anterior
                                                        </button>
                                                        {Array.from({ length: totalPages }, (_, index) => {
                                                            const page = index + 1;
                                                            const isActive = currentPage === page;
                                                            return (
                                                                <button
                                                                    key={page}
                                                                    onClick={() => setCurrentPage(page)}
                                                                    className={`px-3 py-1 rounded border text-sm transition-all duration-150 ${isActive
                                                                        ? 'border-blue-500 text-blue-600 font-semibold bg-blue-50'
                                                                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => handlePageChange('next')}
                                                            disabled={currentPage === totalPages}
                                                            className="px-2 py-1 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
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
            </Card>
        </>
    );
};

export default PatientTable;