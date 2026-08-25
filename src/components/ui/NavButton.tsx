import { ChevronDown } from 'lucide-react';
import React from 'react';

interface NavButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  hasChevron?: boolean;
  className?: string; // 👈 permite sobrescrever estilos
}

const NavButton: React.FC<NavButtonProps> = ({
  children,
  active,
  onClick,
  icon,
  hasChevron = false,
  className = '', // 👈 evita undefined
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 
      ${active ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:text-emerald-600'}
      ${className}`} // 👈 aplica classes externas (tem prioridade)
  >
    {icon && <span>{icon}</span>}
    <span>{children}</span>
    {hasChevron && (
      <ChevronDown
        className={`ml-1 h-4 w-4 transition-transform ${active ? 'rotate-180' : ''}`}
      />
    )}
  </button>
);

export default NavButton;
