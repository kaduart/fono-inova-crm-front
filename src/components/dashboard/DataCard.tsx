import React from 'react';

interface DataCardProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  highlightColor?: string;
  onClick?: () => void;
}

export const DataCard: React.FC<DataCardProps> = ({
  children,
  className = '',
  highlight = false,
  highlightColor = '#00B57A',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl border border-gray-100
        p-4 sm:p-5
        transition-all duration-200
        hover:shadow-md hover:border-gray-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={highlight ? { borderLeftWidth: '4px', borderLeftColor: highlightColor } : {}}
    >
      {children}
    </div>
  );
};
