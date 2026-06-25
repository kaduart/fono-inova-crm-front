import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = '#9CA3AF',
  action,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-6 text-center
        bg-gray-50/50 rounded-2xl border border-dashed border-gray-200
        ${className}
      `}
    >
      {Icon && (
        <div
          className="p-4 rounded-2xl mb-4"
          style={{ backgroundColor: `${iconColor}12`, color: iconColor }}
        >
          <Icon size={40} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
