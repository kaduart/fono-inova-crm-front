// src/pages/doctor/components/TabsNavigation.tsx
import { BarChart, Calendar, FileText, Stethoscope, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';

const tabs = [
    {
        value: 'overview',
        label: 'Visão Geral',
        icon: <BarChart size={16} />
    },
    {
        value: 'patients',
        label: 'Pacientes',
        icon: <User size={16} />
    },
    {
        value: 'therapy',
        label: 'Evolução',
        icon: <Stethoscope size={16} />
    },
    {
        value: 'appointments',
        label: 'Agendamentos',
        icon: <Calendar size={16} />
    },
    {
        value: 'reports',
        label: 'Relatórios',
        icon: <FileText size={16} />
    }
];

export default function TabsNavigation({
    activeTab,
    setActiveTab
}: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}) {
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-5 gap-2 w-full bg-gray-100 p-2 rounded-lg">
                {tabs.map(tab => (
                    <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="flex flex-col items-center justify-center p-3 rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        <span className="mb-1">{tab.icon}</span>
                        <span className="text-xs">{tab.label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}