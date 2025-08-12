// src/pages/doctor/components/ReportsSection.tsx
import { Activity, BarChart2, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export default function ReportsSection() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Relatórios e Análises
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Progresso dos Pacientes</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 bg-gray-50 rounded-lg border border-dashed flex flex-col items-center justify-center p-4">
                                <BarChart2 className="h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-500 text-center">
                                    Gráfico comparativo do progresso terapêutico
                                </p>
                                <p className="text-gray-400 text-sm mt-2 text-center">
                                    Visualize o progresso dos pacientes ao longo do tempo
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-purple-600" />
                                <span className="font-medium">Frequência às Sessões</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 bg-gray-50 rounded-lg border border-dashed flex flex-col items-center justify-center p-4">
                                <Activity className="h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-500 text-center">
                                    Taxa de comparecimento por período
                                </p>
                                <p className="text-gray-400 text-sm mt-2 text-center">
                                    Acompanhe a frequência dos pacientes às sessões
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <div className="font-medium">Relatório de Sessões</div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-4">
                                Relatório detalhado de todas as sessões realizadas
                            </p>
                            <Button variant="outline" className="w-full">
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Relatório
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="font-medium">Relatório Financeiro</div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-4">
                                Resumo de pagamentos e receitas
                            </p>
                            <Button variant="outline" className="w-full">
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Relatório
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="font-medium">Relatório de Pacientes</div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-4">
                                Lista completa de pacientes com histórico
                            </p>
                            <Button variant="outline" className="w-full">
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Relatório
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}