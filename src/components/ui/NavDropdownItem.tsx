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
        className={`w-full flex items-center px-4 py-2 text-sm text-left space-x-2 ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
    >
        {icon && <span className="text-gray-500">{icon}</span>}
        <span>{children}</span>
    </button>
);

export default NavDropdownItem;