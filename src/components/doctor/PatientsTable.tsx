// src/pages/doctor/components/PatientsTable.tsx
import { Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';

export default function PatientsTable({ patients }: { patients: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPatients = patients.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-600" />
                        Gestão de Pacientes
                    </CardTitle>

                    <div className="flex gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar pacientes..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Novo Paciente
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Paciente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Diagnóstico
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Última Consulta
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map(patient => (
                                    <tr key={patient._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                                                <div className="ml-4">
                                                    <div className="font-medium text-gray-900">{patient.fullName}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {patient.healthPlan?.name || 'Particular'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {patient.diagnosis || 'Não informado'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {patient.phone || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {patient.lastAppointment
                                                    ? new Date(patient.lastAppointment).toLocaleDateString('pt-BR')
                                                    : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Ativo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <Button variant="outline" size="sm" className="mr-2">
                                                Visualizar
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                Agendar
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="text-gray-500 flex flex-col items-center">
                                            <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
                                            <p>Nenhum paciente encontrado</p>
                                            <p className="text-sm mt-2">
                                                {searchTerm
                                                    ? 'Tente ajustar sua busca'
                                                    : 'Adicione seu primeiro paciente'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}