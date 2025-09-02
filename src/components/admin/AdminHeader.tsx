import { Activity, ChevronDown, Clock, Hospital, LogOut, Stethoscope, User, Users } from 'lucide-react';
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import NavButton from '../ui/NavButton';
import NavDropdownItem from '../ui/NavDropdownItem';

interface AdminHeaderProps {
    activeTab: string;
    openMenu: string;
    adminInfo: any;
    handleTabChange: (tab: string) => void;
    toggleMenu: (menuName: string) => void;
    setActiveTab: (tab: string) => void;
    onLogout?: () => void; // Nova prop para logout
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
    activeTab,
    openMenu,
    adminInfo,
    handleTabChange,
    toggleMenu,
    setActiveTab,
    onLogout
}) => {
    const navigate = useNavigate();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    // Função de logout padrão caso não seja fornecida via props
    const handleLogout = () => {
        // Limpar dados de autenticação
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('sessionToken');

        // Executar função personalizada de logout se fornecida
        if (onLogout && typeof onLogout === 'function') {
            onLogout();
        }

        // Redirecionar para a página de login
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <NavLink
                            to="/admin"
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            onClick={() => handleTabChange('Dashboard')}
                        >
                            <div className="bg-blue-100/80 p-2.5 rounded-xl shadow-sm">
                                <Hospital className="h-6 w-6 text-blue-600" />
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-blue-500 transition-all duration-300">
                                Fono<span className="font-extrabold gap-4">Inova</span>&nbsp;&nbsp;
                            </span>
                        </NavLink>
                    </div>

                    <nav className="hidden md:flex items-center space-x-2">
                        <NavButton
                            active={activeTab === 'Dashboard'}
                            onClick={() => handleTabChange('Dashboard')}
                        >
                            Dashboard
                        </NavButton>

                        <div className="relative">
                            <NavButton
                                active={activeTab === 'Add Profissional' || activeTab === 'Add Paciente'}
                                onClick={() => toggleMenu('gestao')}
                                hasChevron
                            >
                                Gestão
                            </NavButton>

                            {openMenu === 'gestao' && (
                                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                                    <NavDropdownItem
                                        active={activeTab === 'Add Profissional'}
                                        onClick={() => handleTabChange('Add Profissional')}
                                        icon={<Stethoscope className="h-4 w-4" />}
                                    >
                                        Profissionais
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === 'Add Paciente'}
                                        onClick={() => handleTabChange('Add Paciente')}
                                        icon={<Users className="h-4 w-4" />}
                                    >
                                        Pacientes
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <NavButton
                            active={activeTab === 'Calendário'}
                            onClick={() => handleTabChange('Calendário')}
                            icon={<Clock className="h-4 w-4" />}
                        >
                            Agenda
                        </NavButton>

                        <NavButton
                            active={activeTab === 'Financeiro'}
                            onClick={() => handleTabChange('Financeiro')}
                            icon={<span className="text-sm">💵</span>}
                        >
                            Financeiro
                        </NavButton>

                        <div className="relative">
                            <NavButton
                                active={activeTab === 'Leads'}
                                onClick={() => toggleMenu('marketing')}
                                icon={<Activity className="h-4 w-4" />}
                                hasChevron
                            >
                                Marketing
                            </NavButton>

                            {openMenu === 'marketing' && (
                                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                                    <NavDropdownItem
                                        active={activeTab === 'Leads'}
                                        onClick={() => handleTabChange('Leads')}
                                    >
                                        Leads
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <NavButton
                            active={activeTab === 'Mensagens'}
                            onClick={() => handleTabChange('Mensagens')}
                            icon={<span className="text-sm">📳</span>}
                        >
                            WhatsApp
                        </NavButton>
                    </nav>

                    {/* Área do perfil com dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center space-x-2 p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                    {adminInfo?.fullName?.charAt(0) || 'A'}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-800">{adminInfo?.fullName || 'Admin'}</p>
                                    <p className="text-xs text-gray-500 truncate">{adminInfo?.email || ''}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveTab('Profile');
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <User className="h-4 w-4 mr-2" />
                                    Meu Perfil
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sair
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;