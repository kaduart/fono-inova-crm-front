import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    MenuItem,
} from '@mui/material';
import { Expense } from '../../../services/expenseService';
import { useExpenses } from '../../../hooks/useExpenses';

type ExpenseModalProps = {
    open: boolean;
    onClose: () => void;
    expense: Expense | null;
    onSaved: () => void;
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
    const isEditing = !!expense;

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
        const payload: Partial<Expense> = {
            description: form.description,
            category: form.category as Expense['category'],
            subcategory: form.subcategory || undefined,
            amount: Number(form.amount),
            date: form.date,
            paymentMethod: form.paymentMethod,
            status: form.status as Expense['status'],
            notes: form.notes,
            // 🔹 se quiser atrelar a um profissional aqui depois é só adicionar relatedDoctor
        };

        if (isEditing && expense) {
            await updateExpense(expense._id, payload);
        } else {
            await createExpense(payload);
        }

        onSaved();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEditing ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Descrição"
                            fullWidth
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="Categoria"
                            fullWidth
                            value={form.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            size="small"
                        >
                            <MenuItem value="payroll">Folha</MenuItem>
                            <MenuItem value="commission">Comissão</MenuItem>
                            <MenuItem value="benefit">Benefício</MenuItem>
                            <MenuItem value="operational">Operacional</MenuItem>
                            <MenuItem value="equipment">Equipamento</MenuItem>
                            <MenuItem value="marketing">Marketing</MenuItem>
                            <MenuItem value="other">Outro</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Subcategoria (opcional)"
                            fullWidth
                            value={form.subcategory}
                            onChange={(e) => handleChange('subcategory', e.target.value)}
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Valor"
                            fullWidth
                            type="number"
                            value={form.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            size="small"
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Data"
                            fullWidth
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="Método de pagamento"
                            fullWidth
                            value={form.paymentMethod}
                            onChange={(e) => handleChange('paymentMethod', e.target.value)}
                            size="small"
                        >
                            <MenuItem value="pix">Pix</MenuItem>
                            <MenuItem value="dinheiro">Dinheiro</MenuItem>
                            <MenuItem value="cartao_credito">Cartão crédito</MenuItem>
                            <MenuItem value="cartao_debito">Cartão débito</MenuItem>
                            <MenuItem value="transferencia_bancaria">Transferência</MenuItem>
                            <MenuItem value="boleto">Boleto</MenuItem>
                            <MenuItem value="outro">Outro</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="Status"
                            fullWidth
                            value={form.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            size="small"
                        >
                            <MenuItem value="pending">Pendente</MenuItem>
                            <MenuItem value="paid">Pago</MenuItem>
                            <MenuItem value="scheduled">Agendado</MenuItem>
                            <MenuItem value="canceled">Cancelado</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Observações"
                            fullWidth
                            multiline
                            minRows={2}
                            value={form.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit}>
                    {isEditing ? 'Salvar alterações' : 'Salvar despesa'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ExpenseModal;
