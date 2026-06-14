import { useState } from "react";
import { Plus, Trash2, Pencil, Percent, DollarSign, Calculator } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../ui/Button";
import Input from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { ICommissionRule, BillingType, CommissionType, CommissionServiceType } from "../../utils/types/types";
import { professionalCommissionService, CommissionSimulation } from "../../services/professionalCommissionService";

interface DoctorCommissionRulesTabProps {
    doctorId: string;
    rules: ICommissionRule[];
    onChange: (rules: ICommissionRule[]) => void;
    readOnly?: boolean;
}

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
    particular: "Particular",
    convenio: "Convênio",
    liminar: "Liminar",
    package: "Pacote"
};

const SERVICE_TYPE_LABELS: Record<CommissionServiceType, string> = {
    session: "Sessão",
    evaluation: "Avaliação",
    neuropsychological: "Avaliação Neuropsicológica",
    aba: "ABA",
    psychology: "Psicologia",
    speech: "Fonoaudiologia"
};

const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
    fixed: "Fixo",
    percentage: "Percentual"
};

const emptyRule: Omit<ICommissionRule, "_id"> = {
    serviceType: "session",
    billingType: "particular",
    insurance: "",
    commissionType: "fixed",
    value: 0,
    minValue: null,
    maxValue: null,
    priority: 0,
    startDate: null,
    endDate: null,
    effectiveDate: null,
    active: true,
    notes: ""
};

export function DoctorCommissionRulesTab({
    doctorId,
    rules = [],
    onChange,
    readOnly = false
}: DoctorCommissionRulesTabProps) {
    const [editingRule, setEditingRule] = useState<ICommissionRule | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState<Omit<ICommissionRule, "_id">>({ ...emptyRule });
    const [simulation, setSimulation] = useState<CommissionSimulation | null>(null);
    const [simulating, setSimulating] = useState(false);

    const resetForm = () => {
        setForm({ ...emptyRule });
        setEditingRule(null);
        setIsAdding(false);
    };

    const handleEdit = (rule: ICommissionRule) => {
        setEditingRule(rule);
        setForm({
            serviceType: rule.serviceType,
            billingType: rule.billingType,
            insurance: rule.insurance || "",
            commissionType: rule.commissionType,
            value: rule.value,
            minValue: rule.minValue ?? null,
            maxValue: rule.maxValue ?? null,
            priority: rule.priority ?? 0,
            startDate: rule.startDate || null,
            endDate: rule.endDate || null,
            effectiveDate: rule.effectiveDate || null,
            active: rule.active !== false,
            notes: rule.notes || ""
        });
        setIsAdding(true);
    };

    const handleRemove = (ruleId?: string) => {
        if (!ruleId) return;
        const updated = rules.filter(r => r._id !== ruleId);
        onChange(updated);
        toast.success("Regra removida. Salve o profissional para persistir.");
    };

    const handleSimulate = async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        setSimulating(true);
        try {
            const result = await professionalCommissionService.simulate(doctorId, start, end);
            setSimulation(result);
            toast.success("Simulação concluída para o mês atual.");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao simular comissão.");
        } finally {
            setSimulating(false);
        }
    };

    const handleSaveLocal = () => {
        if (form.value < 0) {
            toast.error("Valor não pode ser negativo");
            return;
        }

        const ruleData: ICommissionRule = {
            ...form,
            insurance: form.billingType === "convenio" ? (form.insurance || null) : null,
            _id: editingRule?._id
        };

        if (editingRule?._id) {
            const updated = rules.map(r => (r._id === editingRule._id ? ruleData : r));
            onChange(updated);
        } else {
            onChange([...rules, ruleData]);
        }

        resetForm();
        toast.success("Regra salva. Clique em 'Salvar Alterações' para persistir.");
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">💰 Regras de Comissão</h3>
                    <p className="text-xs text-gray-500">
                        Configure quanto cada profissional recebe por tipo de atendimento.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!readOnly && !isAdding && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSimulate}
                            disabled={simulating}
                            className="text-blue-700 border-blue-200 hover:bg-blue-50"
                        >
                            <Calculator className="w-4 h-4 mr-1.5" />
                            {simulating ? "Simulando..." : "Simular Comissão"}
                        </Button>
                    )}
                    {!readOnly && !isAdding && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAdding(true)}
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Nova Regra
                        </Button>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="billingType">Tipo de atendimento</Label>
                            <Select
                                id="billingType"
                                value={form.billingType}
                                onChange={e => setForm(prev => ({ ...prev, billingType: e.target.value as BillingType }))}
                                className="mt-1"
                            >
                                {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="serviceType">Tipo de serviço</Label>
                            <Select
                                id="serviceType"
                                value={form.serviceType}
                                onChange={e => setForm(prev => ({ ...prev, serviceType: e.target.value as CommissionServiceType }))}
                                className="mt-1"
                            >
                                {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Select>
                        </div>

                        {form.billingType === "convenio" && (
                            <div className="col-span-12 md:col-span-4">
                                <Label htmlFor="insurance">Convênio</Label>
                                <Input
                                    id="insurance"
                                    value={form.insurance || ""}
                                    onChange={e => setForm(prev => ({ ...prev, insurance: e.target.value }))}
                                    placeholder="ex: unimed"
                                    className="mt-1"
                                />
                            </div>
                        )}

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="commissionType">Regra</Label>
                            <Select
                                id="commissionType"
                                value={form.commissionType}
                                onChange={e => setForm(prev => ({ ...prev, commissionType: e.target.value as CommissionType }))}
                                className="mt-1"
                            >
                                <option value="fixed">Fixo (R$)</option>
                                <option value="percentage">Percentual (%)</option>
                            </Select>
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="value">Valor</Label>
                            <Input
                                id="value"
                                type="number"
                                min={0}
                                step={form.commissionType === "percentage" ? 1 : 0.01}
                                value={form.value}
                                onChange={e => setForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                className="mt-1"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="minValue">Valor mínimo da sessão (R$)</Label>
                            <Input
                                id="minValue"
                                type="number"
                                min={0}
                                step={0.01}
                                value={form.minValue ?? ""}
                                onChange={e => setForm(prev => ({ ...prev, minValue: e.target.value ? parseFloat(e.target.value) : null }))}
                                placeholder="opcional"
                                className="mt-1"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="maxValue">Valor máximo da sessão (R$)</Label>
                            <Input
                                id="maxValue"
                                type="number"
                                min={0}
                                step={0.01}
                                value={form.maxValue ?? ""}
                                onChange={e => setForm(prev => ({ ...prev, maxValue: e.target.value ? parseFloat(e.target.value) : null }))}
                                placeholder="opcional"
                                className="mt-1"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="effectiveDate">Data de vigência</Label>
                            <Input
                                id="effectiveDate"
                                type="date"
                                value={form.effectiveDate || ""}
                                onChange={e => setForm(prev => ({ ...prev, effectiveDate: e.target.value || null }))}
                                className="mt-1"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="priority">Prioridade</Label>
                            <Input
                                id="priority"
                                type="number"
                                min={0}
                                step={1}
                                value={form.priority}
                                onChange={e => setForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                                className="mt-1"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-4">
                            <Label htmlFor="active">Ativa</Label>
                            <div className="mt-2">
                                <input
                                    id="active"
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetForm}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveLocal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {editingRule ? "Atualizar Regra" : "Adicionar Regra"}
                        </Button>
                    </div>
                </div>
            )}

            {simulation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-blue-800">🔮 Simulação — {simulation.period.start} a {simulation.period.end}</h4>
                        <button
                            type="button"
                            onClick={() => setSimulation(null)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Fechar
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-blue-600">Produção</p>
                            <p className="font-semibold text-blue-900">R$ {simulation.production.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-blue-600">Comissão</p>
                            <p className="font-semibold text-blue-900">R$ {simulation.commission.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-blue-600">Sessões</p>
                            <p className="font-semibold text-blue-900">{simulation.sessions}</p>
                        </div>
                        <div>
                            <p className="text-blue-600">Versão das regras</p>
                            <p className="font-semibold text-blue-900">{simulation.version}</p>
                        </div>
                    </div>
                    {simulation.rulesApplied.length > 0 && (
                        <div>
                            <p className="text-xs text-blue-700 mb-1">Regras utilizadas na simulação:</p>
                            <div className="flex flex-wrap gap-2">
                                {simulation.rulesApplied.map((rule, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                        {BILLING_TYPE_LABELS[rule.billingType]} · {SERVICE_TYPE_LABELS[rule.serviceType]}
                                        {rule.insurance ? ` · ${rule.insurance}` : ""}
                                        {" "}({rule.commissionType === "fixed" ? `R$ ${rule.value}` : `${rule.value}%`})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {rules.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl">
                    Nenhuma regra configurada. O sistema usará os valores padrão (R$ 60/sessão).
                </div>
            ) : (
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Atendimento</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Serviço</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Convênio</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Regra</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Valor</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Faixa sessão</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Vigência</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Prioridade</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                                {!readOnly && <th className="px-4 py-2 text-right font-medium text-gray-700">Ações</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rules.slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).map(rule => (
                                <tr key={rule._id || `${rule.billingType}-${rule.serviceType}-${rule.value}`} className="bg-white">
                                    <td className="px-4 py-3 text-gray-800">{BILLING_TYPE_LABELS[rule.billingType]}</td>
                                    <td className="px-4 py-3 text-gray-600">{SERVICE_TYPE_LABELS[rule.serviceType]}</td>
                                    <td className="px-4 py-3 text-gray-600">{rule.insurance || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-gray-700">
                                            {rule.commissionType === "fixed" ? (
                                                <DollarSign className="w-3.5 h-3.5" />
                                            ) : (
                                                <Percent className="w-3.5 h-3.5" />
                                            )}
                                            {COMMISSION_TYPE_LABELS[rule.commissionType]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {rule.commissionType === "fixed"
                                            ? `R$ ${rule.value.toFixed(2)}`
                                            : `${rule.value}%`}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                        {rule.minValue || rule.maxValue ? (
                                            <span>
                                                {rule.minValue ? `min R$ ${rule.minValue.toFixed(2)}` : "—"}
                                                {" → "}
                                                {rule.maxValue ? `max R$ ${rule.maxValue.toFixed(2)}` : "—"}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                        {rule.effectiveDate || rule.startDate || rule.endDate ? (
                                            <span>
                                                {rule.effectiveDate || rule.startDate || "—"}
                                                {" → "}
                                                {rule.endDate || "—"}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{rule.priority ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${rule.active !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                            {rule.active !== false ? "Ativa" : "Inativa"}
                                        </span>
                                    </td>
                                    {!readOnly && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(rule)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(rule._id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Remover"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {doctorId && (
                <p className="text-xs text-gray-400">
                    ID do profissional: {doctorId}
                </p>
            )}
        </div>
    );
}
