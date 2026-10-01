import { useEffect, useState } from 'react';
import { Dialog } from '@mui/material';
import { TrendingDown } from 'lucide-react';
import { Expense, EXPENSE_SUBCATEGORIES } from '../../../services/expenseService';
import { useExpenses } from '../../../hooks/useExpenses';
import { toast } from 'react-toastify';
import { Field, ModalHeader, ModalFooter, MoneyInput, inputClass } from './formKit';

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
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'pix',
    status: 'pending',
    notes: '',
};

const ExpenseModal = ({ open, onClose, expense, onSaved }: ExpenseModalProps) => {
    const { createExpense, updateExpense } = useExpenses();
    const [form, setForm] = useState<FormState>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!expense;
    const accent = 'red' as const;

    useEffect(() => {
        if (expense) {
            setForm({
                description: expense.description,
                category: expense.category,
                subcategory: expense.subcategory || '',
                amount: expense.amount.toString(),
                date: expense.date || new Date().toISOString().slice(0, 10),
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

            onSaved(savedExpense);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => !isSubmitting && onClose()}
            fullWidth
            maxWidth="sm"
            aria-labelledby="expense-modal-title"
            PaperProps={{ sx: { borderRadius: '20px' } }}
        >
            <ModalHeader
                icon={<TrendingDown className="w-6 h-6" />}
                color="#EF4444"
                title={isEditing ? 'Editar despesa' : 'Nova despesa'}
                subtitle="Lançamento avulso, fora das despesas fixas"
                onClose={onClose}
                titleId="expense-modal-title"
            />

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Categoria">
                        <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className={inputClass(accent)}>
                            <option value="payroll">Folha</option>
                            <option value="commission">Comissão</option>
                            <option value="benefit">Benefício</option>
                            <option value="operational">Operacional</option>
                            <option value="equipment">Equipamento</option>
                            <option value="marketing">Marketing</option>
                            <option value="other">Outro</option>
                        </select>
                    </Field>
                    <Field label="Subcategoria">
                        <select value={form.subcategory} onChange={(e) => handleChange('subcategory', e.target.value)} className={inputClass(accent)}>
                            <option value="">Nenhuma</option>
                            {EXPENSE_SUBCATEGORIES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Valor" required>
                        <MoneyInput value={form.amount} onChange={(v) => handleChange('amount', v)} accent={accent} />
                    </Field>
                    <Field label="Data">
                        <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} className={inputClass(accent)} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Forma de pagamento">
                        <select value={form.paymentMethod} onChange={(e) => handleChange('paymentMethod', e.target.value)} className={inputClass(accent)}>
                            <option value="pix">Pix</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao_credito">Cartão crédito</option>
                            <option value="cartao_debito">Cartão débito</option>
                            <option value="transferencia_bancaria">Transferência</option>
                            <option value="boleto">Boleto</option>
                            <option value="outro">Outro</option>
                        </select>
                    </Field>
                    <Field label="Status">
                        <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass(accent)}>
                            <option value="pending">Pendente</option>
                            <option value="paid">Pago</option>
                            <option value="scheduled">Agendado</option>
                            <option value="canceled">Cancelado</option>
                        </select>
                    </Field>
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
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitting={isSubmitting}
                submitLabel={isEditing ? 'Salvar alterações' : 'Salvar despesa'}
                submittingLabel="Salvando..."
            />
        </Dialog>
    );
};

export default ExpenseModal;
