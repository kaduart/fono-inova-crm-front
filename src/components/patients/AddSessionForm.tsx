import { Clock } from 'lucide-react';
import { useState } from 'react';
import { IDoctors, IPatient, THERAPY_TYPES } from '../../utils/types/types';
import InputCurrency from '../ui/InputCurrency';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';

interface AddSessionFormProps {
    patient: IPatient;
    doctors: IDoctors[];
    onSubmit: (session: {
        date: string;
        time: string;
        notes?: string;
        patientId: string;
        doctorId: string;
        sessionType: string;
        specialty: string;
        sessionValue?: number;
        status?: string;
        isPaid?: boolean;
        paymentStatus?: string;
        visualFlag?: string;
        paymentMethod?: string; // ⬅️ AGORA OPCIONAL
    }) => void;
    onClose: () => void;
}

export function AddSessionForm({ onSubmit, onClose, patient, doctors }: AddSessionFormProps) {
    const [session, setSession] = useState({
        date: new Date().toISOString().slice(0, 10),
        time: '08:00',
        professional: '',
        sessionType: 'fonoaudiologia',
        notes: '',
        value: '',
        paymentMethod: '', // ⬅️ PODE FICAR VAZIO
    });

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSession((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        // Validação dos campos obrigatórios (paymentMethod NÃO é mais obrigatório)
        if (!session.date || !session.time || !session.professional ) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

  /*       const formattedValue = removeCurrencyMask(session.value);

        if (isNaN(formattedValue)) {
            alert('O valor da sessão é inválido.');
            return;
        } */

        // Encontrar o médico selecionado para pegar a especialidade
        const selectedDoctor = doctors.find(doctor => doctor._id === session.professional);
        if (!selectedDoctor) {
            alert('Profissional selecionado não encontrado.');
            return;
        }

        // Formatar dados para a API - paymentMethod é opcional
        const sessionData: any = {
            date: session.date,
            time: session.time,
            notes: session.notes,
            patientId: patient._id,
            doctorId: session.professional,
            sessionType: session.sessionType,
            specialty: selectedDoctor.specialty,
            sessionValue: session.value,
            status: 'scheduled',
            isPaid: false,
            paymentStatus: 'pending',
            visualFlag: 'pending'
        };

        // Só inclui paymentMethod se foi preenchido
        if (session.paymentMethod && session.paymentMethod.trim() !== '') {
            sessionData.paymentMethod = session.paymentMethod;
        }

        // Chama a função onSubmit com os dados formatados
        onSubmit(sessionData);
    };

    const removeCurrencyMask = (value: string): number => {
        const numericValue = value.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(numericValue);
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-2xl max-w-md mx-auto z-50 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
                Adicionar Sessão
            </h2>
            <p className="text-gray-600 mb-6">
                Paciente: <span className="font-semibold">{patient.fullName}</span>
            </p>

            <div className="space-y-4">
                {/* Data */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Data da Sessão *
                    </Label>
                    <input
                        type="date"
                        name="date"
                        value={session.date}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all"
                    />
                </div>

                {/* Horário */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Horário da Sessão *
                    </Label>
                    <input
                        type="time"
                        name="time"
                        value={session.time}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all"
                    />
                </div>

                {/* Profissional */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Selecione o profissional *
                    </Label>
                    <Select
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all"
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
                </div>

                {/* Tipo de Sessão */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Sessão *
                    </Label>
                    <Select
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all"
                        name="sessionType"
                        value={session.sessionType}
                        onChange={handleChange}
                    >
                        <option value="">Selecione o tipo de sessão</option>
                        {THERAPY_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Valor */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor da Sessão *
                    </Label>
                    <InputCurrency
                        name="value"
                        value={session.value}
                        onChange={(e) => handleChange(e)}
                        placeholder="R$ 0,00"
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all"
                    />
                </div>

                {/* Método de Pagamento - AGORA OPCIONAL */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Método de Pagamento
                        <span className="text-gray-400 text-xs ml-1">(Opcional)</span>
                    </Label>
                    <select
                        name="paymentMethod"
                        value={session.paymentMethod}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all"
                    >
                        <option value="">Não informado</option>
                        <option value="cartao">Cartão</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="transferencia">Transferência</option>
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto</option>
                    </select>
                </div>

                {/* Notas */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações
                    </Label>
                    <textarea
                        name="notes"
                        value={session.notes}
                        onChange={handleChange}
                        placeholder="Adicione observações sobre a sessão..."
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-all resize-none"
                        rows={3}
                    />
                </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg hover:shadow-xl"
                >
                    Adicionar Sessão
                </button>
            </div>
        </div>
    );
}