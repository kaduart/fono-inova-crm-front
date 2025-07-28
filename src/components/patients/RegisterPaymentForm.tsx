import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { createPayment } from '../../services/paymentService';

interface RegisterPaymentFormProps {
    packageId: string;
    onSuccess: () => void;
}

const RegisterPaymentForm: React.FC<RegisterPaymentFormProps> = ({ packageId, onSuccess }) => {
    const [value, setValue] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            await createPayment({
                packageId,
                value: parseFloat(value),
                paymentMethod,
                notes,
            });
            toast.success('Pagamento registrado com sucesso!');
            onSuccess();
        } catch (err) {
            toast.error('Erro ao registrar pagamento.');
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Valor:</label>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="border p-2 rounded w-full"
                />
            </div>
            <div>
                <label>Método de Pagamento:</label>
                <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border p-2 rounded w-full"
                >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão">Cartão</option>
                    <option value="PIX">PIX</option>
                </select>
            </div>
            <div>
                <label>Notas:</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border p-2 rounded w-full"
                />
            </div>
            <button
                type="submit"
                className="bg-blue-500 text-white p-2 mt-4 rounded w-full"
            >
                Registrar Pagamento
            </button>
        </form>
    );
};

export default RegisterPaymentForm;
