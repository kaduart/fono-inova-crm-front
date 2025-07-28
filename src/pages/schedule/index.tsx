import { useState } from 'react';
import SpecialtySelector from '../../components/common/SpecialtySelector';
import CalendarView from '../appointments/CalendarView';

export default function SchedulePage() {
    // Considerando que o ID da especialidade seja string ou "all"
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Minha Agenda</h1>
                <div className="w-64">
                    <SpecialtySelector
                        value={selectedSpecialty}
                        onChange={setSelectedSpecialty}
                    />
                </div>
            </div>
            <CalendarView specialty={selectedSpecialty} />
        </div>
    );
}
