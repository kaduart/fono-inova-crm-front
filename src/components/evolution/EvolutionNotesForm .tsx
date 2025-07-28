import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/TextArea';
import { Button } from '../ui/Button';

const EvolutionNotesForm = ({ patientId }) => {
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Simular envio para API
            await new Promise(resolve => setTimeout(resolve, 1000));
            setNotes('');
            // Adicionar feedback para o usuário
        } catch (error) {
            console.error('Erro ao salvar notas:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-medium">
                <Calendar className="h-5 w-5" />
                <span>Anotações de Evolução</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="evolutionNotes">Registrar nova evolução</Label>
                    <Textarea
                        id="evolutionNotes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descreva a evolução do paciente, observações, metas alcançadas, etc."
                        rows={6}
                        className="mt-1"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting || !notes.trim()}>
                        {isSubmitting ? 'Salvando...' : 'Salvar Evolução'}
                    </Button>
                </div>
            </form>

            <div className="mt-8">
                <h3 className="text-md font-medium mb-3">Anotações Anteriores</h3>
                <div className="space-y-4">
                    {/* Lista de anotações anteriores */}
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between items-start">
                            <p className="font-medium">15/06/2025</p>
                            <span className="text-sm text-gray-500">Dr. João Silva</span>
                        </div>
                        <p className="mt-2 text-gray-700">
                            Paciente apresentou melhora significativa na articulação de fonemas complexos.
                            Exercícios de repetição estão sendo bem assimilados.
                        </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4 py-2">
                        <div className="flex justify-between items-start">
                            <p className="font-medium">08/06/2025</p>
                            <span className="text-sm text-gray-500">Dr. João Silva</span>
                        </div>
                        <p className="mt-2 text-gray-700">
                            Primeira sessão: Paciente demonstrou dificuldade inicial com exercícios de respiração.
                            Estabelecemos metas para as próximas semanas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvolutionNotesForm;