import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

const SessionHistory = ({ patientId }) => {
    const [sessions, setSessions] = useState([
        {
            id: '1',
            date: '2025-06-29T15:00:00.000Z',
            duration: 45,
            status: 'concluído',
            objectives: 'Melhora na articulação de fonemas complexos',
            activities: 'Exercícios de repetição e respiração',
            results: 'Paciente demonstrou progresso significativo',
            notes: 'Continuar com exercícios diários em casa'
        },
        {
            id: '2',
            date: '2025-06-22T14:30:00.000Z',
            duration: 30,
            status: 'concluído',
            objectives: 'Iniciar trabalho com fonemas /r/ e /s/',
            activities: 'Exercícios de repetição e jogos fonéticos',
            results: 'Bom engajamento, dificuldade inicial com /r/',
            notes: 'Praticar exercício 3 diariamente'
        },
        {
            id: '3',
            date: '2025-06-15T10:00:00.000Z',
            duration: 60,
            status: 'concluído',
            objectives: 'Avaliação inicial e estabelecimento de metas',
            activities: 'Testes de articulação e compreensão',
            results: 'Identificadas áreas prioritárias de trabalho',
            notes: 'Iniciar plano terapêutico na próxima sessão'
        }
    ]);

    const handleCompleteSession = (sessionId) => {
        setSessions(sessions.map(session =>
            session.id === sessionId ? { ...session, status: 'concluído' } : session
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Sessões Realizadas</h3>
                <Button>
                    <Calendar className="mr-2 h-4 w-4" />
                    Nova Sessão
                </Button>
            </div>

            {sessions.length > 0 ? (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <Card key={session.id} className="border-l-4 border-blue-500">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium">
                                            {new Date(session.date).toLocaleDateString('pt-BR', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Duração: {session.duration} minutos
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {session.status === 'concluído' ? (
                                            <span className="flex items-center text-green-600">
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Concluído
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-yellow-600">
                                                <Clock className="h-4 w-4 mr-1" />
                                                Pendente
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700">Objetivos</h4>
                                        <p className="text-sm mt-1">{session.objectives}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700">Atividades</h4>
                                        <p className="text-sm mt-1">{session.activities}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700">Resultados</h4>
                                        <p className="text-sm mt-1">{session.results}</p>
                                    </div>
                                </div>

                                {session.notes && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-700">Observações</h4>
                                        <p className="text-sm mt-1">{session.notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma sessão registrada</h3>
                    <p className="mt-1 text-gray-500">
                        Registre a primeira sessão terapêutica para começar o acompanhamento.
                    </p>
                    <Button className="mt-4">
                        <Calendar className="mr-2 h-4 w-4" />
                        Registrar Sessão
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SessionHistory;