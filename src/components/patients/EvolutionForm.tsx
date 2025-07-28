import React from 'react';
import { useForm } from 'react-hook-form';

export interface EvolutionFormData {
    date: string;
    doctorId: string;
    appointmentId?: string;
    evaluationTypes?: string[];
    metrics?: { [key: string]: number };
    treatmentStatus?: string;
    observations?: string;
}

interface EvolutionFormProps {
    onSubmit: (data: EvolutionFormData) => void;
    isSubmitting?: boolean;
    professionals: { _id: string; fullName: string }[];
    patientId: string;
    appointments: { _id: string; date: string }[];
}

const evaluationOptions = [
    { label: 'Linguagem', value: 'language' },
    { label: 'Motor', value: 'motor' },
    { label: 'Cognitivo', value: 'cognitive' },
    { label: 'Motor', value: 'behavior' },
    { label: 'Social', value: 'social' },

    'language', 'motor', 'cognitive', 'behavior', 'social'];
const treatmentOptions = ['initial_evaluation', 'in_progress', 'improving', 'stable', 'regressing', 'completed'];

const EvolutionForm: React.FC<EvolutionFormProps> = ({
    onSubmit,
    isSubmitting = false,
    professionals,
    patientId,
    appointments
}) => {
    const { register, handleSubmit, reset } = useForm<EvolutionFormData>();
    const submit = (data: any) => {
        data.patientId = patientId;
        onSubmit(data);
        reset();
    };

    return (
        <form onSubmit={handleSubmit(submit)} className="space-y-4 p-4 bg-white rounded-xl shadow-md">
            <div>
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <input
                    type="date"
                    {...register('date', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Profissional</label>
                <select {...register('doctorId', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="">Selecione</option>
                    {professionals.map((p) => (
                        <option key={p._id} value={p._id}>{p.fullName}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Sessão (opcional)</label>
                <select {...register('appointmentId')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="">Nenhuma</option>
                    {appointments.map((a) => (
                        <option key={a._id} value={a._id}>{new Date(a.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Tipos de Avaliação</label>
                {evaluationOptions.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                        <input type="checkbox" value={value} {...register('evaluationTypes')} />
                        <label>{label}</label>
                    </div>
                ))}

            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Métricas</label>
                {evaluationOptions.map((type) => (
                    <input
                        key={type}
                        type="number"
                        placeholder={`Nota para ${type}`}
                        {...register(`metrics.${type}`)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm mb-2"
                    />
                ))}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Status do Tratamento</label>
                <select {...register('treatmentStatus')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    {treatmentOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                    {...register('observations')}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
                {isSubmitting ? 'Salvando...' : 'Salvar Evolução'}
            </button>
        </form>
    );
};

export default EvolutionForm;
