import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  className?: string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = '#00B57A',
  action,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
            >
              <Icon size={22} />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
};
