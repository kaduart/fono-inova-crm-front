import React from 'react';

interface MetricBadgeProps {
  label: string;
  value: React.ReactNode;
  color?: 'emerald' | 'blue' | 'indigo' | 'amber' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  gray: 'bg-gray-50 text-gray-700 border-gray-100',
};

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  label,
  value,
  color = 'gray',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-[10px]'
    : 'px-3 py-2 text-xs';

  return (
    <div
      className={`
        inline-flex flex-col items-start
        rounded-lg border
        ${colorMap[color]}
        ${sizeClasses}
        ${className}
      `}
    >
      <span className="font-medium opacity-80 leading-none mb-1">{label}</span>
      <span className="font-bold text-sm leading-none">{value}</span>
    </div>
  );
};
