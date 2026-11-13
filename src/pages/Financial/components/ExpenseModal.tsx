import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { TrendingDown } from 'lucide-react';
import { Expense, EXPENSE_SUBCATEGORIES } from '../../../services/expenseService';
import { useExpenses } from '../../../hooks/useExpenses';
import { toast } from '../../../utils/toast';
import { ChoiceChips, Field, ModalHeader, ModalFooter, MoneyInput, inputClass, useSubmitStatus } from './formKit';

type ExpenseModalProps = {
    open: boolean;
    onClose: () => void;
    expense: Expense | null;
    onSaved: (savedExpense?: Expense) => void;
};

type FormState = {
    description: string;
    category: string;
    subcategory: string;
    amount: string;
    date: string;
    paymentMethod: string;
    status: string;
    notes: string;
};

const defaultForm: FormState = {
    description: '',
    category: 'operational',
    subcategory: '',
    amount: '',
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    paymentMethod: 'pix',
    status: 'pending',
    notes: '',
};

const PAY_LABEL: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_credito: 'Crédito', cartao_debito: 'Débito', transferencia_bancaria: 'Transferência', boleto: 'Boleto', outro: 'Outro' };
const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', paid: 'Pago', scheduled: 'Agendado', canceled: 'Cancelado' };

const ExpenseModal = ({ open, onClose, expense, onSaved }: ExpenseModalProps) => {
    const { createExpense, updateExpense } = useExpenses();
    const [form, setForm] = useState<FormState>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { status, succeed, fail } = useSubmitStatus();
    const isEditing = !!expense;
    const accent = 'emerald' as const;

    useEffect(() => {
        if (expense) {
            setForm({
                description: expense.description,
                category: expense.category,
                subcategory: expense.subcategory || '',
                amount: expense.amount.toString(),
                date: expense.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
                paymentMethod: expense.paymentMethod,
                status: expense.status,
                notes: expense.notes || '',
            });
        } else {
            setForm(defaultForm);
        }
    }, [expense, open]);

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        const amountValue = parseFloat(form.amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            toast.error('Informe um valor válido para a despesa');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload: Partial<Expense> = {
                description: form.description,
                category: form.category as Expense['category'],
                subcategory: form.subcategory || undefined,
                amount: amountValue,
                date: form.date,
                paymentMethod: form.paymentMethod,
                status: form.status as Expense['status'],
                notes: form.notes,
            };

            let savedExpense: Expense | undefined;
            if (isEditing && expense) {
                savedExpense = await updateExpense(expense._id, payload);
            } else {
                savedExpense = await createExpense(payload);
            }

            succeed(() => onSaved(savedExpense));
        } catch {
            fail();
        } finally {
            setIsSubmitting(false);
        }
    };

    const money = parseFloat(form.amount);
    const summary = Number.isFinite(money) && money > 0
        ? `${money.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${PAY_LABEL[form.paymentMethod] || form.paymentMethod} · ${STATUS_LABEL[form.status] || form.status}`
        : null;

    return (
        <Modal
            open={open}
            onClose={() => !isSubmitting && onClose()}
            labelledBy="expense-modal-title"
            zIndexClass="z-[1300]"
            panelClassName="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px] dark:bg-[#161d1b]"
        >
            <ModalHeader
                icon={<TrendingDown className="w-6 h-6" />}
                color="#EF4444"
                title={isEditing ? 'Editar despesa' : 'Nova despesa'}
                subtitle="Lançamento avulso, fora das despesas fixas"
                onClose={onClose}
                titleId="expense-modal-title"
            />

            <div className="max-h-[68dvh] flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_11rem]">
                    <Field label="Valor" required>
                        <MoneyInput large value={form.amount} onChange={(v) => handleChange('amount', v)} accent={accent} />
                    </Field>
                    <Field label="Data">
                        <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} className={inputClass(accent)} />
                    </Field>
                </div>

                <Field label="Descrição">
                    <input
                        type="text"
                        autoFocus={!isEditing}
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Ex.: Material de escritório"
                        className={inputClass(accent)}
                    />
                </Field>

                <div>
                    <span className="mb-2 block text-xs font-semibold text-gray-600">Categoria</span>
                    <ChoiceChips
                        label="Categoria"
                        value={form.category}
                        onChange={(v) => handleChange('category', v)}
                        options={[
                            { value: 'operational', label: 'Operacional' },
                            { value: 'payroll', label: 'Folha' },
                            { value: 'benefit', label: 'Benefício' },
                            { value: 'equipment', label: 'Equipamento' },
                            { value: 'marketing', label: 'Marketing' },
                            { value: 'other', label: 'Outro' },
                            // Comissão nasce do fechamento; lançar à mão escondia o "Gerar comissões" do mês.
                            ...(isEditing && form.category === 'commission' ? [{ value: 'commission', label: 'Comissão' }] : []),
                        ]}
                    />
                    <div className="mt-3 max-w-xs">
                        <Field label="Subcategoria">
                            <select value={form.subcategory} onChange={(e) => handleChange('subcategory', e.target.value)} className={inputClass(accent)}>
                                <option value="">Nenhuma</option>
                                {EXPENSE_SUBCATEGORIES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                </div>

                <div>
                    <span className="mb-2 block text-xs font-semibold text-gray-600">Forma de pagamento</span>
                    <ChoiceChips
                        label="Forma de pagamento"
                        value={form.paymentMethod}
                        onChange={(v) => handleChange('paymentMethod', v)}
                        options={[
                            { value: 'pix', label: 'Pix' },
                            { value: 'dinheiro', label: 'Dinheiro' },
                            { value: 'cartao_credito', label: 'Crédito' },
                            { value: 'cartao_debito', label: 'Débito' },
                            { value: 'transferencia_bancaria', label: 'Transferência' },
                            { value: 'boleto', label: 'Boleto' },
                            { value: 'outro', label: 'Outro' },
                        ]}
                    />
                </div>

                <div>
                    <span className="mb-2 block text-xs font-semibold text-gray-600">Situação</span>
                    <ChoiceChips
                        label="Situação"
                        value={form.status}
                        onChange={(v) => handleChange('status', v)}
                        options={[
                            { value: 'pending', label: 'Pendente' },
                            { value: 'paid', label: 'Pago' },
                            { value: 'scheduled', label: 'Agendado' },
                            { value: 'canceled', label: 'Cancelado' },
                        ]}
                    />
                </div>

                <Field label="Observações">
                    <textarea
                        rows={2}
                        value={form.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className={`${inputClass(accent)} resize-none`}
                    />
                </Field>
            </div>

            <ModalFooter
                accent={accent}
                status={status}
                successLabel={isEditing ? 'Alterações salvas' : 'Despesa salva'}
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitting={isSubmitting}
                submitLabel={isEditing ? 'Salvar alterações' : 'Salvar despesa'}
                submittingLabel="Salvando..."
                summary={summary}
            />
        </Modal>
    );
};

export default ExpenseModal;
