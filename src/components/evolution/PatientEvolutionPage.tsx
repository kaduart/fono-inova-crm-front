
import { ClipboardList, FileText, LineChart, Stethoscope, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import API from '../../services/api';
import SpecialtyTimeline from '../SpecialtyTimeline';
import PatientEvolution from '../patients/PatientEvolution';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import EvolutionNotesForm from './EvolutionNotesForm ';
import PatientInfoCard from './PatientInfoCard ';
import SessionHistory from './SessionHistory';

const PatientEvolutionPage = ({ patientId, patients }) => {
    const [patient, setPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('evolution');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                setIsLoading(true);
                const response = await API.get(`/patients/${patientId}`);
                setPatient(response.data);
                setIsLoading(false);
            } catch (error) {
                console.error('Erro ao carregar dados do paciente:', error);
                setIsLoading(false);
            }
        };

        fetchPatientData();
    }, [patientId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Paciente não encontrado</h3>
                <p className="mt-1 text-gray-500">
                    Não foi possível carregar as informações do paciente.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Evolução do Paciente</h1>
                    <p className="text-gray-600">
                        Acompanhamento terapêutico de {patient.fullName}
                    </p>
                </div>
                <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Relatório
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Coluna lateral com informações do paciente */}
                <div className="lg:col-span-1">
                    <PatientInfoCard patient={patient} />

                    <Card className="mt-6">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="h-5 w-5" />
                                <span className="font-medium">Especialidades</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SpecialtyTimeline items={[
                                {
                                    id: '1',
                                    specialty: 'Fonoaudiologia Infantil',
                                    date: new Date('2023-03-15'),
                                    description: 'Especialização em desenvolvimento da linguagem em crianças',
                                    institution: 'Universidade de São Paulo',
                                    duration: '2 anos',
                                    skills: ['Linguagem infantil', 'Transtornos de fala', 'Estimulação precoce']
                                },
                                {
                                    id: '2',
                                    specialty: 'Audiologia Clínica',
                                    date: new Date('2021-06-10'),
                                    description: 'Diagnóstico e reabilitação auditiva',
                                    institution: 'Faculdade de Medicina do ABC',
                                    duration: '18 meses',
                                    skills: ['Audiometria', 'Seleção de AASI', 'Treinamento auditivo']
                                }
                            ]} />
                        </CardContent>
                    </Card>
                </div>

                {/* Conteúdo principal com abas */}
                <div className="lg:col-span-3">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-4 bg-gray-100 p-2 rounded-lg">
                            <TabsTrigger value="evolution" className="flex items-center gap-2">
                                <LineChart className="h-4 w-4" />
                                <span>Evolução</span>
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4" />
                                <span>Anotações</span>
                            </TabsTrigger>
                            <TabsTrigger value="sessions" className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                <span>Sessões</span>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>Histórico</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="evolution">
                            <Card className="mt-4">
                                <CardContent className="p-6">
                                    <PatientEvolution
                                        patientId={patientId}
                                        patientName={patient.fullName}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notes">
                            <Card className="mt-4">
                                <CardContent className="p-6">
                                    <EvolutionNotesForm patientId={patientId} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="sessions">
                            <Card className="mt-4">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Stethoscope className="h-5 w-5" />
                                        <span className="font-medium">Sessões Terapêuticas</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <SessionHistory patientId={patientId} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history">
                            <Card className="mt-4">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        <span className="font-medium">Histórico Completo</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium mb-3">Evoluções Registradas</h3>
                                            {/* Lista de evoluções */}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-medium mb-3">Exames Realizados</h3>
                                            {/* Lista de exames */}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-medium mb-3">Documentos Anexados</h3>
                                            {/* Lista de documentos */}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default PatientEvolutionPage;