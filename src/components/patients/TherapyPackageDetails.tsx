import {
    CheckCircle,
    Clock,
    DollarSign,
    Edit3,
    Leaf,
    Plus,
    Users,
    X
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { IDoctors, IPatient } from '../../utils/types/types';
import { AddSessionForm } from './AddSessionForm';
import packageService from '../../services/packageService';

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

    // Bulk change
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkDoctorId, setBulkDoctorId] = useState('');
    const [bulkTime, setBulkTime] = useState('');
    const [bulkDayOfWeek, setBulkDayOfWeek] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    const openBulk = async () => {
        // Tenta pré-preencher com o primeiro agendamento pendente
        try {
            const pkgId = pack.packageId || pack._id;
            // Usa sessões já carregadas no pack, senão busca
            let sessions: any[] = pack.sessions || [];
            if (sessions.length === 0) {
                sessions = await packageService.getPackageSessions(pkgId);
            }
            const first = sessions.find((s: any) =>
                ['pre_agendado', 'scheduled'].includes(s.operationalStatus || s.status)
            );
            if (first) {
                setBulkDoctorId(first.doctor?._id || first.doctorId || '');
                setBulkTime(first.time || '');
            }
        } catch {
            // silencioso — abre sem pré-preenchimento
        }
        setBulkOpen(true);
    };

    const saveBulk = async () => {
        if (!bulkDoctorId && !bulkTime && !bulkDayOfWeek) return;
        setBulkSaving(true);
        try {
            const pkgId = pack.packageId || pack._id;
            const patch: { doctorId?: string; time?: string; dayOfWeek?: number } = {};
            if (bulkDoctorId) patch.doctorId = bulkDoctorId;
            if (bulkTime) patch.time = bulkTime;
            if (bulkDayOfWeek !== '') patch.dayOfWeek = parseInt(bulkDayOfWeek);
            const result = await packageService.bulkUpdateAppointments(pkgId, patch);
            const parts: string[] = [];
            if (bulkDoctorId) parts.push('terapeuta');
            if (bulkTime) parts.push('horário');
            if (bulkDayOfWeek !== '') parts.push('dia da semana');
            toast.success(`${parts.join(', ')} atualizado(s) em ${result.updated} sessão(ões) pendente(s)`);
            setBulkOpen(false);
            setBulkDoctorId('');
            setBulkTime('');
            setBulkDayOfWeek('');
        } catch {
            toast.error('Erro ao atualizar sessões pendentes');
        } finally {
            setBulkSaving(false);
        }
    };

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
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                                <Leaf className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Detalhes do Pacote</h2>
                                <p className="text-emerald-100 text-base opacity-90 mt-0.5">
                                    {pack.sessionType} • {pack.totalSessions} sessões
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {/* Status Card */}
                    <div className={`flex items-center justify-between p-5 rounded-xl border ${statusConfig.bg} ${statusConfig.border}`}>
                        <div className="flex items-center gap-3">
                            <statusConfig.icon className={`w-6 h-6 ${statusConfig.color}`} />
                            <span className="font-medium text-gray-700 text-base">Status do Pagamento</span>
                        </div>
                        <span className={`font-semibold text-base ${statusConfig.color}`}>
                            {statusConfig.text}
                        </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center transition-colors hover:bg-gray-100">
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {pack.totalSessions}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center justify-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                Total de Sessões
                            </div>
                        </div>

                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center transition-colors hover:bg-gray-100">
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {completedSessions}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                Sessões Realizadas
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-base">
                            <span className="text-gray-600 font-medium">Progresso</span>
                            <span className="font-semibold text-gray-700">
                                {completedSessions}/{pack.totalSessions} ({progressPercentage}%)
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Payment Information */}
                    {pack.payments && pack.payments.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                                <span className="font-semibold text-emerald-700 text-base">
                                    Pagamentos Realizados
                                </span>
                            </div>
                            <div className="space-y-3">
                                {pack.payments.map((payment: any, index: number) => (
                                    <div key={payment._id || index} className="flex justify-between items-center text-base">
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
                <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button
                            onClick={openBulk}
                            className="px-4 py-3 text-emerald-700 bg-white border border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors font-medium text-base flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <Users className="w-5 h-5 shrink-0" />
                            Alterar sessões pendentes
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-base flex items-center justify-center whitespace-nowrap"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={() => setShowAddSessionForm(true)}
                            className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-base flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5 shrink-0" />
                            Nova Sessão
                        </button>
                        <button
                            onClick={onEdit}
                            className="px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-base flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <Edit3 className="w-5 h-5 shrink-0" />
                            Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Dialog: Alterar sessões pendentes */}
        {bulkOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-4 text-white flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-sm">Alterar sessões pendentes</p>
                            <p className="text-xs opacity-75 mt-0.5">Aplica para todos os pré-agendados e agendados</p>
                        </div>
                        <button onClick={() => setBulkOpen(false)} disabled={bulkSaving}
                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        {/* Profissional */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Profissional <span className="text-gray-400">(opcional)</span>
                            </label>
                            <select
                                value={bulkDoctorId}
                                onChange={e => setBulkDoctorId(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Manter atual</option>
                                {doctors
                                    .filter(d => !pack.sessionType || (d.specialty || '').toLowerCase() === (pack.sessionType || '').toLowerCase())
                                    .map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)
                                }
                            </select>
                        </div>

                        {/* Dia da semana */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Dia da semana <span className="text-gray-400">(opcional)</span>
                            </label>
                            <select
                                value={bulkDayOfWeek}
                                onChange={e => setBulkDayOfWeek(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Manter dia atual</option>
                                <option value="1">Segunda-feira</option>
                                <option value="2">Terça-feira</option>
                                <option value="3">Quarta-feira</option>
                                <option value="4">Quinta-feira</option>
                                <option value="5">Sexta-feira</option>
                                <option value="6">Sábado</option>
                                <option value="0">Domingo</option>
                            </select>
                        </div>

                        {/* Horário */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Horário <span className="text-gray-400">(opcional)</span>
                            </label>
                            <input
                                type="time"
                                value={bulkTime}
                                onChange={e => setBulkTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <p className="text-xs text-gray-400">
                            Sessões confirmadas/realizadas não serão alteradas. Preencha pelo menos um campo.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                        <button
                            onClick={() => { setBulkOpen(false); setBulkDoctorId(''); setBulkTime(''); setBulkDayOfWeek(''); }}
                            disabled={bulkSaving}
                            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={saveBulk}
                            disabled={(!bulkDoctorId && !bulkTime && !bulkDayOfWeek) || bulkSaving}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            {bulkSaving ? 'Salvando...' : 'Aplicar a todas'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </>
    );
}