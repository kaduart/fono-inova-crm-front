import {
    CheckCircle,
    Clock,
    DollarSign,
    Edit3,
    Leaf,
    Plus,
    X
} from 'lucide-react';
import { useState } from 'react';
import { IDoctors, IPatient } from '../../utils/types/types';
import { AddSessionForm } from './AddSessionForm'; // Import do componente separado

type Props = {
    pack: any;
    onClose: () => void;
    onEdit: () => void;
    onAddSession: (session: any) => void;
    patient: IPatient;
    doctors: IDoctors[];
};

export default function TherapyPackageDetails({ pack, onClose, onEdit, onAddSession, patient, doctors }: Props) {
    const [showAddSessionForm, setShowAddSessionForm] = useState(false);

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

    const statusConfig = getStatusConfig(pack.payments || []);
    const completedSessions = pack.sessionsDone;
    const progressPercentage = Math.round((completedSessions / pack.totalSessions) * 100);

    // Se estiver mostrando o formulário, renderiza o AddSessionForm
    if (showAddSessionForm) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <AddSessionForm
                    patient={patient}
                    doctors={doctors}
                    onSubmit={(sessionData) => {
                        onAddSession(sessionData);
                        setShowAddSessionForm(false);
                    }}
                    onClose={() => setShowAddSessionForm(false)}
                />
            </div>
        );
    }

    // Renderiza os detalhes do pacote
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                                <Leaf className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Detalhes do Pacote</h2>
                                <p className="text-emerald-100 text-sm opacity-90">
                                    {pack.sessionType} • {pack.totalSessions} sessões
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Status Card */}
                    <div className={`flex items-center justify-between p-4 rounded-lg border ${statusConfig.bg} ${statusConfig.border}`}>
                        <div className="flex items-center gap-3">
                            <statusConfig.icon className={`w-5 h-5 ${statusConfig.color}`} />
                            <span className="font-medium text-gray-700">Status do Pagamento</span>
                        </div>
                        <span className={`font-semibold ${statusConfig.color}`}>
                            {statusConfig.text}
                        </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center transition-colors hover:bg-gray-100">
                            <div className="text-2xl font-bold text-gray-900 mb-1">
                                {pack.totalSessions}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                Total de Sessões
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center transition-colors hover:bg-gray-100">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                                {completedSessions}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Sessões Realizadas
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">Progresso</span>
                            <span className="font-semibold text-gray-700">
                                {completedSessions}/{pack.totalSessions} ({progressPercentage}%)
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Payment Information */}
                    {pack.payments && pack.payments.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-700 text-sm">
                                    Pagamentos Realizados
                                </span>
                            </div>
                            <div className="space-y-2">
                                {pack.payments.map((payment: any, index: number) => (
                                    <div key={payment._id || index} className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-600">
                                            {new Date(payment.paymentDate || payment.date).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="font-semibold text-emerald-700">
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

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm order-2 sm:order-1"
                        >
                            Fechar
                        </button>

                        <div className="flex gap-3 order-1 sm:order-2">
                            <button
                                onClick={() => setShowAddSessionForm(true)}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nova Sessão
                            </button>

                            <button
                                onClick={onEdit}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                                <Edit3 className="w-4 h-4" />
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}