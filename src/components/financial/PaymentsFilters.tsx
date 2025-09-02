import { useEffect, useMemo, useState } from "react";
import { IDoctor } from "../../utils/types/types";

interface Filters {
    doctorId?: string;
    patientId?: string;
    paymentId?: string;
    status?: string;
    paymentMethod?: string;
    serviceType?: string;
    from?: string;
    to?: string;
}

interface PaymentsFiltersProps {
    doctors?: IDoctor[];
    payments: any[];
    onFilter: (filteredPayments: any[]) => void;
    onSort?: (field: string, direction: 'asc' | 'desc') => void;
    initialFilters?: Filters;
}

type SortField = 'date' | 'amount' | 'patient' | 'doctor' | 'status' | 'method';
type SortDirection = 'asc' | 'desc';

export function PaymentsFilters({ doctors, payments, onFilter, onSort, initialFilters = {} }: PaymentsFiltersProps) {
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Aplica os filtros sempre que eles ou a lista de pagamentos mudar
    const filteredPayments = useMemo(() => {
        let result = payments.filter(payment => {
            // Filtro por ID do pagamento
            if (filters.paymentId && payment._id !== filters.paymentId) {
                return false;
            }

            // Filtro por profissional
            if (filters.doctorId && payment.doctor?._id !== filters.doctorId) {
                return false;
            }

            // Filtro por paciente
            if (filters.patientId) {
                const searchTerm = filters.patientId.toLowerCase();
                const patientMatch =
                    payment.patient?._id?.toLowerCase().includes(searchTerm) ||
                    payment.patient?.fullName?.toLowerCase().includes(searchTerm);

                if (!patientMatch) return false;
            }

            // Filtro por status
            if (filters.status && payment.status !== filters.status) {
                return false;
            }

            // Filtro por método de pagamento
            if (filters.paymentMethod && payment.paymentMethod !== filters.paymentMethod) {
                return false;
            }

            // Filtro por tipo de serviço
            if (filters.serviceType && payment.serviceType !== filters.serviceType) {
                return false;
            }

            // Filtro por data do agendamento (appointment.date)
            if (filters.from || filters.to) {
                const appointmentDateStr = payment.appointment?.date;
                const paymentDateStr = payment.createdAt;

                // Usa a data do agendamento ou a data de criação do pagamento
                const dateStr = appointmentDateStr || paymentDateStr;

                if (!dateStr) return false;

                try {
                    const date = new Date(dateStr);
                    date.setHours(0, 0, 0, 0);

                    if (filters.from) {
                        const fromDate = new Date(filters.from);
                        fromDate.setHours(0, 0, 0, 0);
                        if (date < fromDate) return false;
                    }

                    if (filters.to) {
                        const toDate = new Date(filters.to);
                        toDate.setHours(23, 59, 59, 999);
                        if (date > toDate) return false;
                    }
                } catch (e) {
                    console.error("Erro ao processar data:", e);
                    return false;
                }
            }

            return true;
        });

        // Ordenação
        result.sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'date':
                    aValue = new Date(a.appointment?.date || a.createdAt).getTime();
                    bValue = new Date(b.appointment?.date || b.createdAt).getTime();
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                case 'patient':
                    aValue = a.patient?.fullName?.toLowerCase();
                    bValue = b.patient?.fullName?.toLowerCase();
                    break;
                case 'doctor':
                    aValue = a.doctor?.fullName?.toLowerCase();
                    bValue = b.doctor?.fullName?.toLowerCase();
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'method':
                    aValue = a.method;
                    bValue = b.method;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return result;
    }, [payments, filters, sortField, sortDirection]);

    // Notifica o componente pai quando os filtros mudam
    useEffect(() => {
        onFilter(filteredPayments);
    }, [filteredPayments]);

    const handleFilterChange = (key: keyof Filters, value: string | undefined) => {
        console.log('Alterando filtro', key, 'para', value);
        setFilters(prev => ({
            ...prev,
            [key]: value === "" ? undefined : value
        }));
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }

        if (onSort) {
            onSort(field, sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
        }
    };

    const clearFilters = () => {
        setFilters({});
        setSortField('date');
        setSortDirection('desc');
    };

    // Verifica se há filtros ativos
    const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

    return (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-medium text-gray-800">Filtrar Pagamentos</h3>

                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Filtros ativos
                        </span>
                    )}
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                        {filteredPayments.length} de {payments.length} resultados
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Filtro por ID do Pagamento */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        ID do Pagamento
                    </label>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Buscar por ID"
                            value={filters.paymentId || ""}
                            onChange={(e) => handleFilterChange('paymentId', e.target.value)}
                        />
                        <svg className="h-5 w-5 text-gray-400 absolute right-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                {/* Filtro por Profissional */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        Profissional
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={filters.doctorId || ""}
                            onChange={(e) => handleFilterChange('doctorId', e.target.value)}
                        >
                            <option value="">Todos Profissionais</option>
                            {doctors?.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>
                                    {doctor.fullName}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Filtro por Paciente */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        Paciente
                    </label>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome ou ID"
                            value={filters.patientId || ""}
                            onChange={(e) => handleFilterChange('patientId', e.target.value)}
                        />
                        <svg className="h-5 w-5 text-gray-400 absolute right-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                {/* Filtro por Status */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        Status
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={filters.status || ""}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">Todos Status</option>
                            <option value="paid">Pago</option>
                            <option value="pending">Pendente</option>
                            <option value="canceled">Cancelado</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Filtro por Método de Pagamento */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        Método
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={filters.paymentMethod || ""}
                            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                        >
                            <option value="">Todos Métodos</option>
                            <option value="pix">PIX</option>
                            <option value="cartão">Cartão</option>
                            <option value="dinheiro">Dinheiro</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Filtro por Tipo de Serviço */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        Tipo de Serviço
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={filters.serviceType || ""}
                            onChange={(e) => handleFilterChange('serviceType', e.target.value)}
                        >
                            <option value="">Todos Tipos</option>
                            <option value="evaluation">Avaliação</option>
                            <option value="individual_session">Sessão Individual</option>
                            <option value="package_session">Sessão de Pacote</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Filtro por Data */}
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        Período
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={filters.from || ""}
                                onChange={(e) => handleFilterChange('from', e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={filters.to || ""}
                                onChange={(e) => handleFilterChange('to', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Botão Limpar Filtros */}
                <div className="flex flex-col justify-end h-full">
                    <button
                        onClick={clearFilters}
                        className="w-full p-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        disabled={!hasActiveFilters && sortField === 'date' && sortDirection === 'desc'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Limpar Tudo
                    </button>
                </div>
            </div>

            {/* Controles de Ordenação */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
                        <div className="flex flex-wrap gap-2">
                            {(['date', 'amount', 'patient', 'doctor', 'status', 'method'] as SortField[]).map(field => (
                                <button
                                    key={field}
                                    onClick={() => handleSort(field)}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1 ${sortField === field
                                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    <span>{{
                                        date: 'Data',
                                        amount: 'Valor',
                                        patient: 'Paciente',
                                        doctor: 'Profissional',
                                        status: 'Status',
                                        method: 'Método'
                                    }[field]}</span>
                                    {sortField === field && (
                                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}