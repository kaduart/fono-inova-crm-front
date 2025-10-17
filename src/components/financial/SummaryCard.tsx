import { BarChart, PieChart } from "lucide-react";
import { BsCashCoin } from "react-icons/bs";
import { Bar, CartesianGrid, Cell, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 🎨 SUMMARY CARD (componente de resumo)
const SummaryCard = ({ title, value, subtitle, icon, trend }: any) => {
    const trendColor = trend === 'positive' ? 'text-green-600' :
        trend === 'negative' ? 'text-red-600' : 'text-gray-600';

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                        <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
                        {subtitle && (
                            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 PAYMENT ITEM (item de pagamento)
const PaymentItem = ({ payment, formatCurrency }: any) => {
    const getMethodColor = (method: string) => {
        const colors: any = {
            pix: 'bg-green-100 text-green-700 border-green-200',
            cartão: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            dinheiro: 'bg-blue-100 text-blue-700 border-blue-200'
        };
        return colors[method] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                        {payment.patient}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getMethodColor(payment.method)}`}>
                        {payment.method}
                    </span>
                </div>
                <div className="text-sm text-gray-600 capitalize">
                    {payment.type.replace('_', ' ')} • {payment.doctor}
                </div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-emerald-700">
                    {formatCurrency(payment.value)}
                </div>
                <div className="text-xs text-gray-500">
                    {payment.time || ''}
                </div>
            </div>
        </div>
    );
};

// 🎨 BADGE (já existente, mas vou melhorar)
const Badge = ({ status }: any) => {
    const colorMap: any = {
        "Pago no dia": "bg-emerald-100 text-emerald-800 border-emerald-200",
        "Pago antes": "bg-cyan-100 text-cyan-800 border-cyan-200",
        "Pendente": "bg-amber-100 text-amber-800 border-amber-200",
        "confirmado": "bg-green-100 text-green-800 border-green-200",
        "cancelado": "bg-red-100 text-red-800 border-red-200",
        "agendado": "bg-yellow-100 text-yellow-800 border-yellow-200"
    };

    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-medium border ${colorMap[status] || "bg-gray-100 text-gray-600 border-gray-200"
                }`}
        >
            {status}
        </span>
    );
};

// 🎨 FINANCIAL VIEW (aba financeira)
const FinancialView = ({ financial, payments, formatCurrency, paymentData }: any) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* MÉTODOS DE PAGAMENTO */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow border border-gray-200">
                    <div className="bg-emerald-50 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                            <BsCashCoin className="text-emerald-600" />
                            Métodos de Pagamento
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {paymentData.map((method: any, index: number) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(method.value)}
                                    </div>
                                    <div className="text-sm text-gray-600 capitalize">{method.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {method.count} transação{method.count !== 1 ? 'es' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* LISTA DE PAGAMENTOS */}
                        <div className="space-y-3">
                            <h3 className="font-medium text-gray-900 mb-4">Todos os Pagamentos</h3>
                            {payments.map((payment: any) => (
                                <PaymentItem key={payment.id} payment={payment} formatCurrency={formatCurrency} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RESUMO FINANCEIRO */}
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Recebido</span>
                            <span className="font-semibold text-emerald-600">
                                {formatCurrency(financial?.totalReceived || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Esperado</span>
                            <span className="font-semibold text-amber-600">
                                {formatCurrency(financial?.totalExpected || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <span className="text-gray-800 font-medium">Saldo do Dia</span>
                            <span className="font-bold text-lg text-gray-900">
                                {formatCurrency(financial?.totalReceived || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 ANALYTICS VIEW (aba de analytics)
const AnalyticsView = ({ chartData, paymentData, summary, formatCurrency }: any) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* GRÁFICO DE STATUS DAS SESSÕES */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Distribuição de Sessões</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [value, 'Sessões']} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    {chartData.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* GRÁFICO DE MÉTODOS DE PAGAMENTO */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Métodos de Pagamento</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {paymentData.map((entry: any, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.name === 'Pix' ? '#10B981' :
                                                entry.name === 'Cartão' ? '#6366F1' :
                                                    '#3B82F6'
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MÉTRICAS DE DESEMPENHO */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Métricas de Desempenho</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {Math.round(
                                    ((summary.attended?.count || 0) /
                                        (summary.scheduled?.count || 1)) * 100
                                )}%
                            </div>
                            <div className="text-sm text-gray-600">Taxa de Comparecimento</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {Math.round(
                                    ((summary.canceled?.count || 0) /
                                        (summary.scheduled?.count || 1)) * 100
                                )}%
                            </div>
                            <div className="text-sm text-gray-600">Taxa de Cancelamento</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {formatCurrency(
                                    (summary.attended?.count || 0) > 0 ?
                                        (summary.payments?.totalReceived || 0) / (summary.attended?.count || 1) : 0
                                )}
                            </div>
                            <div className="text-sm text-gray-600">Ticket Médio</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {summary.patientsCount || 0}
                            </div>
                            <div className="text-sm text-gray-600">Pacientes Atendidos</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;