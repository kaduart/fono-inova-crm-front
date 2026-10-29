// src/pages/doctor/components/DashboardHeader.tsx
// O banner de boas-vindas ("Progresso do Dia 65%" fixo, "Online agora") saiu: o resumo
// real do dia agora fica em components/doctor/overview/DayBar.tsx, dentro da aba Dashboard.
import DoctorHeader from '../DoctorHeader';

interface DashboardHeaderProps {
    doctorData: any;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout?: () => void;
}

export default function DashboardHeader({
    doctorData,
    activeTab,
    onTabChange,
    onLogout
}: DashboardHeaderProps) {
    return (
        <DoctorHeader
            doctorInfo={doctorData}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onLogout={onLogout}
        />
    );
}
