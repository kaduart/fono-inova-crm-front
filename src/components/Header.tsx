
import { Hospital } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';

export const Header = () => {
    const navigate = useNavigate();
    const handleButtonClick = (route) => {
        navigate(route);
    };
    return (
        <header className="bg-white text-blue-700 px-6 py-4 shadow flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                    <Hospital className="h-6 w-6 text-blue-600" />
                </div>
                <NavLink to="/admin" className={({ isActive }) =>
                    `text-2xl font-extrabold leading-tight tracking-tight ${isActive ? 'text-blue-900' : 'text-blue-700'
                    }`
                }
                >
                    Clínica Fono <span className="text-blue-500">Inova</span>
                </NavLink>

            </div>

            <div className="flex items-center gap-4">
                <Button className='text-blue-700 px-4 py-2 shadow flex items-center justify-between' onClick={() => handleButtonClick('/login')}>Login</Button>
                <Button className='text-blue-700 px-4 py-2 shadow flex items-center justify-between' onClick={() => handleButtonClick('/signup')}>Sair</Button>
            </div>

        </header>
    );
};



// header com padrao ja com todos os links e dropdowns
/* import { ChevronDown, Hospital, User } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';

export const Header = ({ adminInfo, activeTab, setActiveTab }) => {
    const navigate = useNavigate();
    const [openMenu, setOpenMenu] = useState(null);

    const toggleMenu = (menuName) => {
        setOpenMenu(openMenu === menuName ? null : menuName);
    };

    const handleButtonClick = (route) => {
        navigate(route);
    };

    const menuItems = [
        {
            label: 'Dashboard',
            icon: null,
            route: '/admin',
            tab: 'Dashboard'
        },
        {
            label: 'Gestão',
            icon: '👤',
            items: [
                { label: 'Profissionais', tab: 'Add Profissional' },
                { label: 'Pacientes', tab: 'Add Paciente' },
                { label: 'Administradores', tab: 'Add Admin' }
            ]
        },
        {
            label: 'Agenda',
            icon: '📅',
            items: [
                { label: 'Calendário', tab: 'Calendário' }
            ]
        },
        {
            label: 'Financeiro',
            icon: '💵',
            items: [
                { label: 'Pagamentos', tab: 'Financeiro' }
            ]
        },
        {
            label: 'Marketing',
            icon: '📈',
            items: [
                { label: 'Leads', tab: 'Leads' }
            ]
        },
        {
            label: 'WhatsApp',
            icon: '📳',
            items: [
                { label: 'Mensagens', tab: 'Mensagens' }
            ]
        }
    ];

    return (
        <header className="bg-white shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <NavLink
                            to="/admin"
                            className="flex items-center space-x-2"
                            onClick={() => setActiveTab('Dashboard')}
                        >
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Hospital className="h-6 w-6 text-blue-600" />
                            </div>
                            <span className="text-xl font-bold text-blue-800">
                                Clínica <span className="text-blue-600">FonoInova</span>
                            </span>
                        </NavLink>
                    </div>

                    <nav className="hidden md:flex items-center space-x-2">
                        {menuItems.map((item) => (
                            <div key={item.label} className="relative">
                                {item.items ? (
                                    <>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${openMenu === item.label || item.items.some(i => i.tab === activeTab)
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                                }`}
                                        >
                                            {item.icon && <span className="mr-1">{item.icon}</span>}
                                            {item.label}
                                            <ChevronDown
                                                className={`ml-1 h-4 w-4 transition-transform ${openMenu === item.label ? 'rotate-180' : ''
                                                    }`}
                                            />
                                        </button>

                                        {openMenu === item.label && (
                                            <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                                <div className="py-1">
                                                    {item.items.map((subItem) => (
                                                        <button
                                                            key={subItem.tab}
                                                            onClick={() => {
                                                                setActiveTab(subItem.tab);
                                                                setOpenMenu(null);
                                                            }}
                                                            className={`block px-4 py-2 text-sm w-full text-left ${activeTab === subItem.tab
                                                                ? 'bg-blue-100 text-blue-600'
                                                                : 'text-gray-700 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {subItem.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setActiveTab(item.tab)}
                                        className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === item.tab
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                )}
                            </div>
                        ))}
                    </nav>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setActiveTab('Profile')}
                            className="flex items-center space-x-2 group"
                        >
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                {adminInfo?.fullName ? (
                                    <span className="text-sm font-medium text-blue-600">
                                        {adminInfo.fullName.charAt(0)}
                                    </span>
                                ) : (
                                    <User className="h-4 w-4 text-blue-600" />
                                )}
                            </div>
                            <span className="hidden md:inline text-sm font-medium text-gray-700">
                                {adminInfo?.fullName || 'Perfil'}
                            </span>
                        </button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleButtonClick('/login')}
                            className="hidden md:inline-flex"
                        >
                            Sair
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}; */