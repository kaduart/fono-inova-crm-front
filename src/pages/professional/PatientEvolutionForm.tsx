import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { SelectContent } from '../../components/ui/SelectContent';
import { SelectItem } from '../../components/ui/SelectItem';
import { SelectTrigger } from '../../components/ui/SelectTrigger';
import { SelectValue } from '../../components/ui/SelectValue';
import { Textarea } from '../../components/ui/TextArea';

interface Patient {
    _id: string;
    fullName: string;
}

interface TherapySession {
    patientId: string;
    date: string;
    objectives: string;
    activities: string;
    results: string;
    notes: string;
}

interface PatientEvolutionFormProps {
    patients: Patient[];
    onSuccess: (session: TherapySession) => void;
}

export default function PatientEvolutionForm({ patients, onSuccess }: PatientEvolutionFormProps) {
    const [formData, setFormData] = useState<TherapySession>({
        patientId: '',
        date: new Date().toISOString().split('T')[0],
        objectives: '',
        activities: '',
        results: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Na implementação real:
            // const response = await API.post('/doctors/therapy-sessions', formData);
            await new Promise(resolve => setTimeout(resolve, 1000));

            onSuccess({
                ...formData,
                _id: Math.random().toString(36).substr(2, 9),
                status: 'agendado'
            });

            setFormData({
                patientId: '',
                date: new Date().toISOString().split('T')[0],
                objectives: '',
                activities: '',
                results: '',
                notes: ''
            });
        } catch (error) {
            console.error('Erro ao registrar sessão:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Registrar Sessão Terapêutica</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="patientId">Paciente</Label>
                        <Select
                            value={formData.patientId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um paciente" />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map(patient => (
                                    <SelectItem key={patient._id} value={patient._id}>
                                        {patient.fullName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="date">Data da Sessão</Label>
                        <Input
                            type="date"
                            id="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="objectives">Objetivos da Sessão</Label>
                        <Textarea
                            id="objectives"
                            name="objectives"
                            value={formData.objectives}
                            onChange={handleChange}
                            rows={2}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="activities">Atividades Realizadas</Label>
                        <Textarea
                            id="activities"
                            name="activities"
                            value={formData.activities}
                            onChange={handleChange}
                            rows={3}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="results">Resultados/Observações</Label>
                        <Textarea
                            id="results"
                            name="results"
                            value={formData.results}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label htmlFor="notes">Notas Adicionais</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Salvando...' : 'Registrar Sessão'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}