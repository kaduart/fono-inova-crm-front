// components/SpecialtyCard.tsx
import * as LucideIcons from 'lucide-react';
import React from 'react';

// Mapeamento de ícones
const iconMap: Record<string, keyof typeof LucideIcons> = {
  accessibility: 'Accessibility',
  psychology: 'BrainCog',
  medical: 'Stethoscope',
  hearing: 'Ear',
  default: 'HelpCircle'
};

interface SpecialtyCardProps {
  specialty: {
    id: string;
    name: string;
    icon: string;
    color: string;
    sessionDuration: number;
  };
  stats: {
    scheduled: number;
    completed: number;
    canceled: number;
    revenue?: number;
  };
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ specialty, stats }) => {
  const validIconName = iconMap[specialty.icon.toLowerCase()] || iconMap.default;
  const IconComponent = LucideIcons[validIconName];
  
  return (
    <div
      className="bg-white p-6 rounded-lg shadow-md border-l-4 transition-all duration-200 hover:shadow-lg"
      style={{ borderLeftColor: specialty.color }}
    >
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3" style={{ color: specialty.color }}>
          {IconComponent ? <IconComponent size={24} /> : <span>❓</span>}
        </span>
        <h3 className="text-xl font-semibold text-gray-800">{specialty.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Agendados</p>
          <p className="text-2xl font-bold text-gray-800">{stats.scheduled}</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Concluídos</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Cancelados</p>
          <p className="text-2xl font-bold text-red-600">{stats.canceled}</p>
        </div>

        {stats.revenue !== undefined && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Receita</p>
            <p className="text-2xl font-bold text-blue-600">
              R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialtyCard;