import { useForm } from 'react-hook-form';

export default function NeuropedEvolutionForm({ patient }) {
    const { register, handleSubmit } = useForm();

    return (
        <form onSubmit={handleSubmit}>
            <h3>Avaliação Neuropediátrica</h3>

            <div className="form-section">
                <label>Histórico Desenvolvimental</label>
                <DevelopmentalMilestones />
            </div>

            <div className="form-section">
                <label>Frequência de Crises (última semana)</label>
                <input type="number" {...register('seizureFrequency')} />
            </div>

            <button type="submit">Salvar Avaliação</button>
        </form>
    );
}