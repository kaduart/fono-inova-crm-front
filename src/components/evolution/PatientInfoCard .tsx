import { Calendar, HeartPulse, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';

const PatientInfoCard = ({ patient }) => {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                    <div>
                        <h2 className="text-lg font-bold">{patient.fullName}</h2>
                        <p className="text-sm text-gray-600">
                            {patient.gender === 'masculino' ? 'Homem' : 'Mulher'}, {calculateAge(patient.dateOfBirth)} anos
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-start">
                    <Phone className="text-gray-500 mt-0.5 mr-3" size={18} />
                    <div>
                        <p className="text-sm text-gray-500">Telefone</p>
                        <p className="font-medium">{patient.phone || 'Não informado'}</p>
                    </div>
                </div>

                <div className="flex items-start">
                    <Mail className="text-gray-500 mt-0.5 mr-3" size={18} />
                    <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{patient.email || 'Não informado'}</p>
                    </div>
                </div>

                <div className="flex items-start">
                    <Calendar className="text-gray-500 mt-0.5 mr-3" size={18} />
                    <div>
                        <p className="text-sm text-gray-500">Nascimento</p>
                        <p className="font-medium">
                            {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informado'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start">
                    <HeartPulse className="text-gray-500 mt-0.5 mr-3" size={18} />
                    <div>
                        <p className="text-sm text-gray-500">Plano de Saúde</p>
                        <p className="font-medium">
                            {patient.healthPlan?.name || 'Particular'}
                            {patient.healthPlan?.policyNumber && ` (Nº ${patient.healthPlan.policyNumber})`}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 'N/I';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

export default PatientInfoCard;