import React from 'react';

interface NavDropdownItemProps {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
}

const NavDropdownItem: React.FC<NavDropdownItemProps> = ({ children, active, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-2 text-sm text-left space-x-2 ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5'
            }`}
    >
        {icon && <span className="text-gray-500">{icon}</span>}
        <span>{children}</span>
    </button>
);

export default NavDropdownItem;