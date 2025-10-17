import { TherapyPackage } from "./TherapyPackageCard";
import {
    Calendar,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    Edit3,
    X,
    Leaf,
    TrendingUp
} from 'lucide-react';

type Props = {
    pack: TherapyPackage;
    onClose: () => void;
    onEdit: () => void;
};

export default function TherapyPackageDetails({ pack, onClose, onEdit }: Props) {
    const getStatusConfig = (payments: any[]) => {
        const hasPayments = payments.length > 0;
        return {
            text: hasPayments ? 'Pago' : 'Pendente',
            color: hasPayments ? 'text-emerald-600' : 'text-amber-600',
            bg: hasPayments ? 'bg-emerald-50' : 'bg-amber-50',
            border: hasPayments ? 'border-emerald-200' : 'border-amber-200',
            icon: hasPayments ? CheckCircle : Clock
        };
    };

    const statusConfig = getStatusConfig(pack.payments);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 hover:scale-[1.02]">
                {/* Header com gradiente VERDE */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Detalhes do Pacote</h2>
                            <p className="text-emerald-100 text-sm mt-1">
                                {pack.type} • {pack.total} sessões
                            </p>
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6">
                    {/* Status Card */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${statusConfig.bg} ${statusConfig.border}`}>
                        <div className="flex items-center gap-3">
                            <statusConfig.icon className={`w-5 h-5 ${statusConfig.color}`} />
                            <span className="font-semibold text-gray-700">Status do Pagamento</span>
                        </div>
                        <span className={`font-bold ${statusConfig.color}`}>
                            {statusConfig.text}
                        </span>
                    </div>

                    {/* Grid de Métricas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg text-center group hover:bg-emerald-50 transition-colors">
                            <div className="text-2xl font-bold text-gray-900 mb-1">
                                {pack.total}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                                <Clock className="w-4 h-4" />
                                Total
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg text-center group hover:bg-green-50 transition-colors">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                                {pack.sessions.length}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Realizadas
                            </div>
                        </div>
                    </div>

                    {/* Progresso VERDE */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progresso das Sessões</span>
                            <span className="font-semibold">
                                {pack.sessions.length}/{pack.total} ({Math.round((pack.sessions.length / pack.total) * 100)}%)
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(pack.sessions.length / pack.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Informações de Pagamento */}
                    {pack.payments.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-700">Pagamentos Realizados</span>
                            </div>
                            <div className="space-y-2">
                                {pack.payments.map((payment, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                        <span className="text-emerald-600">Pagamento {index + 1}</span>
                                        <span className="font-medium">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            }).format(payment.amount || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer com Botões VERDE */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={onEdit}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        <Edit3 className="w-4 h-4" />
                        Editar Pacote
                    </button>
                </div>
            </div>
        </div>
    );
}