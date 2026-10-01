// Aba "Fixas": CRUD dos modelos de despesa fixa (a geração mensal fica na aba "Do mês").
import { useCallback, useEffect, useState } from 'react';
import { Tooltip, Skeleton } from '@mui/material';
import { Plus, Edit2, Trash2, Pause, Play, Repeat } from 'lucide-react';
import { toast } from 'react-toastify';
import { fixedExpenseService, FixedExpense } from '../../../services/expenseService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import FixedExpenseModal from './FixedExpenseModal';

const CATEGORY_LABEL: Record<string, string> = {
    payroll: 'Folha', benefit: 'Benefício', operational: 'Operacional',
    equipment: 'Equipamento', marketing: 'Marketing', other: 'Outro',
};

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtDate = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

interface Props {
    month: number;
    year: number;
    /** Chamado quando algo muda, para a aba "Do mês" rechecar o aviso de não geradas. */
    onChanged?: () => void;
}

const FixedExpensesPanel = ({ month, year, onChanged }: Props) => {
    const [models, setModels] = useState<FixedExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<FixedExpense | null>(null);
    const [deleting, setDeleting] = useState<FixedExpense | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setModels(await fixedExpenseService.list());
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar despesas fixas'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const changed = async () => {
        await load();
        onChanged?.();
    };

    const toggleActive = async (m: FixedExpense) => {
        try {
            await fixedExpenseService.update(m._id, { active: !m.active });
            toast.success(m.active ? 'Despesa fixa pausada' : 'Despesa fixa reativada');
            await changed();
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao alterar despesa fixa'));
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        setBusy(true);
        try {
            const res = await fixedExpenseService.remove(deleting._id);
            toast.success(res.softDeleted ? 'Despesa fixa desativada (já tinha ocorrências)' : 'Despesa fixa excluída');
            setDeleting(null);
            await changed();
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao excluir despesa fixa'));
        } finally {
            setBusy(false);
        }
    };

    const activeModels = models.filter((m) => m.active);
    const monthlyTotal = activeModels.reduce((s, m) => s + m.amount, 0);

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#6366F1' }}>
                        <Repeat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Despesas fixas</h3>
                        <p className="text-sm text-gray-500">
                            Modelos que se repetem todo mês. {activeModels.length} ativa{activeModels.length !== 1 ? 's' : ''} · {brl(monthlyTotal)}/mês
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true); }}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Nova despesa fixa
                </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Categoria</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">Vence dia</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Valor</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Vigência</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Situação</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}><td colSpan={7} className="px-3 py-3"><Skeleton variant="text" height={24} /></td></tr>
                                ))
                            ) : models.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <Repeat className="w-12 h-12 text-gray-300 mb-2 mx-auto" />
                                        <p className="text-gray-500">Nenhuma despesa fixa cadastrada</p>
                                        <p className="text-xs text-gray-400">Cadastre aluguel, internet, folha fixa... e gere o mês na aba "Do mês"</p>
                                    </td>
                                </tr>
                            ) : (
                                models.map((m) => (
                                    <tr key={m._id} className={m.active ? 'hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}>
                                        <td className="px-3 py-2 font-medium">{m.description}</td>
                                        <td className="px-3 py-2">{CATEGORY_LABEL[m.category] || m.category}</td>
                                        <td className="px-3 py-2 text-center">{m.dueDay}</td>
                                        <td className="px-3 py-2 text-right font-semibold">{brl(m.amount)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {fmtDate(m.startDate)} → {m.endDate ? fmtDate(m.endDate) : 'sem fim'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                                                m.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}>
                                                {m.active ? 'Ativa' : 'Pausada'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center justify-center gap-1">
                                                <Tooltip title="Editar">
                                                    <button onClick={() => { setEditing(m); setModalOpen(true); }} className="p-2 rounded hover:bg-gray-100 text-blue-600">
                                                        <Edit2 size={16} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title={m.active ? 'Pausar (para de gerar)' : 'Reativar'}>
                                                    <button onClick={() => toggleActive(m)} className="p-2 rounded hover:bg-gray-100 text-amber-600">
                                                        {m.active ? <Pause size={16} /> : <Play size={16} />}
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title="Excluir">
                                                    <button onClick={() => setDeleting(m)} className="p-2 rounded hover:bg-gray-100 text-red-600">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <FixedExpenseModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditing(null); }}
                model={editing}
                month={month}
                year={year}
                onSaved={() => { setModalOpen(false); setEditing(null); changed(); }}
            />

            {deleting && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && setDeleting(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Excluir "{deleting.description}"?</h3>
                        {(deleting.occurrences || 0) > 0 ? (
                            <p className="text-sm text-gray-600 mb-6">
                                Este modelo já gerou <strong>{deleting.occurrences}</strong> despesa{deleting.occurrences! > 1 ? 's' : ''}.
                                Ele será <strong>apenas desativado</strong> — para de gerar nos próximos meses, e as despesas já geradas continuam como estão.
                            </p>
                        ) : (
                            <p className="text-sm text-gray-600 mb-6">
                                Este modelo nunca gerou despesas e será <strong>excluído definitivamente</strong>.
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setDeleting(null)} disabled={busy}
                                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
                                Voltar
                            </button>
                            <button onClick={confirmDelete} disabled={busy}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                                {busy ? 'Processando...' : (deleting.occurrences || 0) > 0 ? 'Desativar' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FixedExpensesPanel;
