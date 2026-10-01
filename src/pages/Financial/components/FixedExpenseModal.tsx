import { useEffect, useState } from 'react';
import { Dialog } from '@mui/material';
import { Repeat, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { fixedExpenseService, FixedExpense, EXPENSE_SUBCATEGORIES } from '../../../services/expenseService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { Field, ModalHeader, ModalFooter, Switch, MoneyInput, inputClass } from './formKit';

type Props = {
    open: boolean;
    onClose: () => void;
    model: FixedExpense | null;
    /** Competência selecionada na tela — usada no "aplicar à ocorrência pendente deste mês". */
    month: number;
    year: number;
    onSaved: () => void;
};

type FormState = {
    description: string;
    category: string;
    subcategory: string;
    amount: string;
    dueDay: string;
    paymentMethod: string;
    startDate: string;
    endDate: string;
    notes: string;
    active: boolean;
};

// Início padrão = dia 1º do mês corrente: assim o mês atual já é elegível mesmo que o
// vencimento seja anterior a "hoje" (com início = hoje, vencimento dia 5 cadastrado dia 20 só
// geraria a partir do mês seguinte).
const firstOfCurrentMonthISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const emptyForm = (): FormState => ({
    description: '',
    category: 'operational',
    subcategory: '',
    amount: '',
    dueDay: '10',
    paymentMethod: 'pix',
    startDate: firstOfCurrentMonthISO(),
    endDate: '',
    notes: '',
    active: true,
});

const FixedExpenseModal = ({ open, onClose, model, month, year, onSaved }: Props) => {
    const [form, setForm] = useState<FormState>(emptyForm());
    const [applyToOccurrence, setApplyToOccurrence] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const isEditing = !!model;
    const accent = 'indigo' as const;

    useEffect(() => {
        if (!open) return;
        setApplyToOccurrence(false);
        if (model) {
            setForm({
                description: model.description,
                category: model.category,
                subcategory: model.subcategory || '',
                amount: String(model.amount),
                dueDay: String(model.dueDay),
                paymentMethod: model.paymentMethod,
                startDate: model.startDate,
                endDate: model.endDate || '',
                notes: model.notes || '',
                active: model.active,
            });
        } else {
            setForm(emptyForm());
        }
    }, [model, open]);

    const set = (field: keyof FormState, value: string | boolean) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        if (submitting) return;

        const amount = parseFloat(form.amount);
        const dueDay = Number(form.dueDay);
        if (!form.description.trim()) return void toast.error('Informe a descrição');
        if (isNaN(amount) || amount <= 0) return void toast.error('Informe um valor válido');
        if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return void toast.error('Dia de vencimento deve ser de 1 a 31');
        if (!form.startDate) return void toast.error('Informe a data de início');
        if (form.endDate && form.endDate < form.startDate) return void toast.error('A data fim não pode ser anterior ao início');

        setSubmitting(true);
        try {
            const payload = {
                description: form.description.trim(),
                category: form.category as FixedExpense['category'],
                subcategory: form.subcategory || null,
                amount,
                dueDay,
                paymentMethod: form.paymentMethod,
                startDate: form.startDate,
                endDate: form.endDate || null,
                notes: form.notes,
                active: form.active,
            };

            if (isEditing && model) {
                const res = await fixedExpenseService.update(
                    model._id,
                    payload,
                    applyToOccurrence ? { year, month } : undefined
                );
                toast.success(
                    applyToOccurrence && res.occurrenceUpdated
                        ? 'Modelo e despesa pendente do mês atualizados'
                        : applyToOccurrence
                            ? 'Modelo atualizado (não havia despesa pendente neste mês)'
                            : 'Modelo atualizado — vale para as próximas gerações'
                );
            } else {
                await fixedExpenseService.create(payload);
                toast.success('Despesa fixa criada');
            }
            onSaved();
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao salvar despesa fixa'));
        } finally {
            setSubmitting(false);
        }
    };

    const monthLabel = `${String(month).padStart(2, '0')}/${year}`;
    const day = Number(form.dueDay);
    const dueHint = !Number.isInteger(day) || day < 1 || day > 31
        ? 'Informe um dia de 1 a 31'
        : day > 28
            ? `Vence todo dia ${day} — em meses mais curtos vence no último dia`
            : `Vence todo dia ${day}`;

    return (
        <Dialog
            open={open}
            onClose={() => !submitting && onClose()}
            fullWidth
            maxWidth="sm"
            aria-labelledby="fixed-expense-modal-title"
            PaperProps={{ sx: { borderRadius: '20px' } }}
        >
            <ModalHeader
                icon={<Repeat className="w-6 h-6" />}
                color="#6366F1"
                title={isEditing ? 'Editar despesa fixa' : 'Nova despesa fixa'}
                subtitle="Gera uma despesa pendente por mês, no dia do vencimento"
                onClose={onClose}
                titleId="fixed-expense-modal-title"
            />

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <Field label="Descrição" required>
                    <input
                        type="text"
                        autoFocus={!isEditing}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        placeholder="Ex.: Água, Luz, Aluguel da clínica"
                        className={inputClass(accent)}
                    />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Categoria">
                        <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass(accent)}>
                            <option value="operational">Operacional</option>
                            <option value="payroll">Folha</option>
                            <option value="benefit">Benefício</option>
                            <option value="equipment">Equipamento</option>
                            <option value="marketing">Marketing</option>
                            <option value="other">Outro</option>
                        </select>
                    </Field>
                    <Field label="Subcategoria">
                        <select value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} className={inputClass(accent)}>
                            <option value="">Nenhuma</option>
                            {EXPENSE_SUBCATEGORIES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Valor" required hint="Estimativa — dá para ajustar a cada mês">
                        <MoneyInput value={form.amount} onChange={(v) => set('amount', v)} accent={accent} />
                    </Field>
                    <Field label="Dia do vencimento" hint={dueHint}>
                        <input
                            type="number"
                            min={1}
                            max={31}
                            step={1}
                            value={form.dueDay}
                            onChange={(e) => set('dueDay', e.target.value)}
                            className={inputClass(accent)}
                        />
                    </Field>
                    <Field label="Forma de pagamento">
                        <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={inputClass(accent)}>
                            <option value="pix">Pix</option>
                            <option value="boleto">Boleto</option>
                            <option value="transferencia_bancaria">Transferência</option>
                            <option value="cartao_credito">Cartão crédito</option>
                            <option value="cartao_debito">Cartão débito</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="outro">Outro</option>
                        </select>
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Vigente a partir de" required hint="O mês só é gerado se o vencimento cair dentro da vigência">
                        <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputClass(accent)} />
                    </Field>
                    <Field label="Até (opcional)" hint="Deixe vazio para não ter fim">
                        <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputClass(accent)} />
                    </Field>
                </div>

                <Field label="Observações">
                    <textarea
                        rows={2}
                        value={form.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        placeholder="Ex.: conta no nome do sócio, vencimento ajustado pela concessionária"
                        className={`${inputClass(accent)} resize-none`}
                    />
                </Field>

                {isEditing && (
                    <div className="space-y-3 pt-1">
                        <Switch
                            checked={form.active}
                            onChange={(v) => set('active', v)}
                            label="Ativa"
                            description={form.active ? 'Gera uma despesa todo mês' : 'Pausada — não gera novas despesas'}
                        />
                        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyToOccurrence}
                                onChange={(e) => setApplyToOccurrence(e.target.checked)}
                                className="mt-0.5 h-4 w-4 accent-amber-600"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-amber-900">
                                    Aplicar também à despesa pendente de {monthLabel}
                                </span>
                                <span className="flex items-start gap-1 text-xs text-amber-800 mt-0.5">
                                    <Info size={13} className="mt-px shrink-0" />
                                    Sem marcar, a alteração vale só para as próximas gerações. Despesas pagas ou canceladas nunca mudam.
                                </span>
                            </span>
                        </label>
                    </div>
                )}
            </div>

            <ModalFooter
                accent={accent}
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitLabel={isEditing ? 'Salvar alterações' : 'Criar despesa fixa'}
                submittingLabel="Salvando..."
            />
        </Dialog>
    );
};

export default FixedExpenseModal;
