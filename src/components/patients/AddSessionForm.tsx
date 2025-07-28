import { useState } from 'react';
import { dateFormat } from '../../utils/dateFormat';
import { IDoctors, IPatient, THERAPY_TYPES } from '../../utils/types/types';
import InputCurrency from '../ui/InputCurrency';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';

interface AddSessionFormProps {
    patient: IPatient;
    doctors: IDoctors[];
    onSubmit: (session: {
        date: string;
        professional: string;
        sessionType: string;
        notes?: string;
        value: string;
        paymentMethod: string;
    }) => void;
    onClose: () => void;
}

export function AddSessionForm({ onSubmit, onClose, patient, doctors }: AddSessionFormProps) {
    const [session, setSession] = useState({
        date: new Date().toISOString().slice(0, 10),
        professional: '',
        sessionType: 'fonoaudiologia',
        notes: '',
        value: '',
        paymentMethod: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Se for o campo de valor, manter o valor como string
        if (name === 'value') {
            setSession((prev) => ({ ...prev, [name]: value }));
        } else {
            setSession((prev) => ({ ...prev, [name]: value }));
        }
    };


    const handleSubmit = () => {
        // Validação dos campos obrigatórios
        if (!session.date || !session.professional || !session.sessionType || !session.value || !session.paymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const formattedValue = removeCurrencyMask(session.value);

        if (isNaN(formattedValue)) {
            alert('O valor da sessão é inválido.');
            return;
        }

        const sessionData = {
            ...session,
            value: formattedValue,
            date: dateFormat(new Date(session.date))
        };


        // Chama a função onSubmit com os dados da sessão e o ID
        onSubmit(sessionData);
    };

    const removeCurrencyMask = (value: string): number => {
        // Remove "R$", espaços e formata para ponto decimal
        const numericValue = value.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(numericValue);
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto z-50">
            <h2 className="text-xl font-semibold mb-2">Adicionar Sessão - {patient.fullName}</h2>
            <div className="space-y-2">
                <Label>Data</Label>
                <input
                    type="date"
                    name="date"
                    value={session.date}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                />

                <Label>Selecione o profissional</Label>
                <Select
                    className="w-full h-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="professional"
                    name="professional"
                    value={session.professional}
                    onChange={handleChange}
                >
                    <option value="">Escolha o profissional</option>
                    {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                            Dr. {doctor.fullName} - {doctor.specialty}
                        </option>
                    ))}
                </Select>

                <Label >Tipo de Sessão</Label>
                <Select
                    className="w-full h-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="sessionType"
                    value={session.sessionType}
                    onChange={handleChange}
                >
                    <option value="">Selecione o tipo de pacote</option>
                    {THERAPY_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>

                <Label >Notas</Label>
                <textarea
                    name="notes"
                    value={session.notes}
                    onChange={handleChange}
                    placeholder="Observações"
                    className="w-full p-2 border rounded"
                />
                <label className="block text-gray-600">Valor da Sessão</label>
                <InputCurrency
                    name="value"
                    value={session.value}
                    onChange={(e) => handleChange(e)}
                    placeholder="R$ 0,00"
                    className="w-full p-2 border rounded"
                />
                <Label>Método de Pagamento</Label>
                <select
                    name="paymentMethod"
                    value={session.paymentMethod}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                >
                    <option value="" disabled>Escolha o método de pagamento</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="transferencia">Transferência</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Adicionar</button>
            </div>
        </div>
    );
}
