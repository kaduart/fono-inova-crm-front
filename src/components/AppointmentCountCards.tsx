// components/AppointmentStatusCards.jsx
import {
    CalendarCheck,
    CalendarDays,
    CalendarX,
    ChartLine,
    CheckCircle,
    RefreshCw,
    XCircle,
    CreditCard,
    UserX
} from 'lucide-react';
import { useEffect, useState } from 'react';
import appointmentService, { IAppointmentStatusCount } from '../services/appointmentService';
import { Card, CardContent, CardHeader } from './ui/Card';

// Atualize a interface para incluir todos os status
interface IAppointmentStatusCountExtended extends IAppointmentStatusCount {
    pago?: number;
    faltou?: number;
}

const AppointmentStatusCards = () => {
    const [counts, setCounts] = useState<IAppointmentStatusCountExtended>({
        agendado: 0,
        confirmado: 0,
        cancelado: 0,
        pago: 0,
        faltou: 0
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        doctorId: ''
    });

    const fetchStatusCount = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await appointmentService.getStatusCount(filters);
            
            if (response.data.success) {
                // Garante que todos os campos estejam presentes
                setCounts({
                    agendado: response.data.data.agendado || 0,
                    confirmado: response.data.data.confirmado || 0,
                    cancelado: response.data.data.cancelado || 0,
                    pago: response.data.data.pago || 0,
                    faltou: response.data.data.faltou || 0
                });
            } else {
                setError('Não foi possível obter os dados de status');
            }
        } catch (err) {
            console.error('Erro ao buscar contagens de status:', err);
            setError('Erro ao conectar com o servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatusCount();
    }, [filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            doctorId: ''
        });
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('pt-BR').format(num);
    };

    // Componente para exibir cada card de status
    const StatusCard = ({
        title,
        value,
        color,
        icon
    }: {
        title: string;
        value: number;
        color: string;
        icon: React.ReactNode;
    }) => (
        <div className={`bg-${color}-50 border border-${color}-200 rounded-xl p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-lg font-medium text-${color}-800`}>{title}</h3>
                    <p className={`text-3xl font-bold text-${color}-900 mt-1`}>
                        {formatNumber(value)}
                    </p>
                </div>
                <div className={`bg-${color}-100 p-3 rounded-lg`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    return (
        <div className="mb-8">
            <Card className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <ChartLine className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-semibold text-gray-800">
                            Dashboard de Agendamentos
                        </h3>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Filtros */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4 text-gray-700">
                            <h4 className="font-medium">Filtros</h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex flex-col min-w-[200px]">
                                <label className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                    <CalendarDays className="w-4 h-4" />
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    name="dateFrom"
                                    value={filters.dateFrom}
                                    onChange={handleFilterChange}
                                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex flex-col min-w-[200px]">
                                <label className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                    <CalendarDays className="w-4 h-4" />
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    name="dateTo"
                                    value={filters.dateTo}
                                    onChange={handleFilterChange}
                                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-end mt-6">
                                <button
                                    onClick={resetFilters}
                                    className="h-10 px-4 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                                >
                                    <CalendarX className="w-4 h-4" />
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Separador visual */}
                    <div className="border-t border-gray-200 my-6"></div>

                    {/* Resultados */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <h4 className="font-medium">Resultados</h4>
                        </div>
                    </div>

                    {error ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-center">
                            <p>{error}</p>
                            <button
                                onClick={fetchStatusCount}
                                className="mt-2 px-4 py-2 bg-red-100 rounded hover:bg-red-200 text-red-700 flex items-center gap-1 mx-auto"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tentar novamente
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <StatusCard
                                title="Agendados"
                                value={counts.agendado}
                                color="blue"
                                icon={<CalendarCheck className="w-8 h-8 text-blue-600" />}
                            />

                            <StatusCard
                                title="Confirmados"
                                value={counts.confirmado}
                                color="green"
                                icon={<CheckCircle className="w-8 h-8 text-green-600" />}
                            />

                            <StatusCard
                                title="Cancelados"
                                value={counts.cancelado}
                                color="red"
                                icon={<XCircle className="w-8 h-8 text-red-600" />}
                            />
                            
                            <StatusCard
                                title="Pagamentos"
                                value={counts.pago}
                                color="purple"
                                icon={<CreditCard className="w-8 h-8 text-purple-600" />}
                            />
                            
                            <StatusCard
                                title="Faltas"
                                value={counts.faltou}
                                color="orange"
                                icon={<UserX className="w-8 h-8 text-orange-600" />}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AppointmentStatusCards;