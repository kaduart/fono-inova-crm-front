// src/pages/doctor/components/SpecialtyStatsCard.tsx
import { Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import SpecialtyCard from '../../pages/SpecialtyCard';

export default function SpecialtyStatsCard({ 
  doctorData, 
  stats 
}: { 
  doctorData: any; 
  stats: any;
}) {
  const hasStats = doctorData?.specialty && stats.specialty;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2 text-gray-700">
          <Stethoscope className="h-5 w-5" />
          <span className="font-medium">Estatísticas da Especialidade</span>
        </div>
      </CardHeader>
      <CardContent>
        {hasStats ? (
          <SpecialtyCard
            specialty={{
              id: doctorData.specialty,
              name: doctorData.specialty,
              icon: doctorData.specialty === 'Fonoaudiologia' ? 'hearing' : 'brain',
              color: doctorData.specialty === 'Fonoaudiologia' ? '#FF9800' : '#3B82F6',
              sessionDuration: 40
            }}
            stats={{
              scheduled: stats.specialties[doctorData.specialty].scheduled,
              completed: stats.specialties[doctorData.specialty].completed,
              canceled: stats.specialties[doctorData.specialty].canceled
            }}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhuma estatística disponível para sua especialidade
          </div>
        )}
      </CardContent>
    </Card>
  );
}