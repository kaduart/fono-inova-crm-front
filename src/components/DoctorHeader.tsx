// src/pages/doctor/components/DoctorHeader.tsx
import {
    BarChart2,
    Calendar,
    ChevronDown,
    DollarSign,
    Home,
    LogOut,
    Menu,
    MessageCircle,
    Stethoscope,
    User,
    Users,
    X
} from "lucide-react";
import React, { useState } from "react";
import { BsSoundwave } from "react-icons/bs";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface DoctorHeaderProps {
    doctorInfo: any;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout?: () => void;
}

const DoctorHeader: React.FC<DoctorHeaderProps> = ({
    doctorInfo,
    activeTab,
    onTabChange,
    onLogout,
}) => {
    const navigate = useNavigate();
    const { logout: authLogout, user } = useAuth();
    const isPrivate = user?.role === 'doctor-private';
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await authLogout();
        localStorage.removeItem("token");
        localStorage.removeItem("userData");
        sessionStorage.removeItem("sessionToken");

        if (onLogout && typeof onLogout === "function") {
            onLogout();
        }

        navigate("/login");
    };

    const handleTabChange = (tab: string) => {
        onTabChange(tab);
        setOpenMenu(''); // Fecha menus abertos
    };

    const handleMobileTabChange = (tab: string) => {
        onTabChange(tab);
        setIsMobileMenuOpen(false);
    };

    const toggleMenu = (menuName: string) => {
        setOpenMenu(openMenu === menuName ? '' : menuName);
    };

    // Componente NavButton interno
    const NavButton = ({
        active,
        onClick,
        icon,
        children,
        hasChevron = false
    }: any) => (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-emerald-100 hover:bg-emerald-600 hover:text-white"
                }`}
        >
            {icon}
            <span>{children}</span>
            {hasChevron && <ChevronDown size={16} />}
        </button>
    );

    // Componente NavDropdownItem interno
    const NavDropdownItem = ({
        active,
        onClick,
        icon,
        children
    }: any) => (
        <button
            onClick={onClick}
            className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-colors duration-150 ${active ? "bg-emerald-50" : "hover:bg-gray-50"
                }`}
        >
            {icon}
            <div className="flex-1">
                {children}
            </div>
        </button>
    );

    return (
        <header className="shadow-lg border-b text-white" style={{ backgroundColor: 'rgb(13 138 108)', borderColor: 'rgba(255,255,255,0.2)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo e nome da clínica */}
                    <div className="flex items-center gap-3 cursor-pointer">
                        <NavLink
                            to="/doctor"
                            className="flex items-center gap-3"
                            onClick={() => handleTabChange("overview")}
                        >
                            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-md">
                                <img className="w-12 h-12" src="images/logo-padrao-3d-encurtada.png" alt="" />

                            </div>

                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">
                                    Fono Inova
                                </span>
                                <span className="hidden sm:block text-xs text-emerald-100 font-medium">
                                    Portal do Médico
                                </span>
                            </div>
                        </NavLink>
                    </div>

                    {/* Navegação Principal */}
                    <nav className="hidden md:flex items-center space-x-1">
                        <NavButton
                            active={activeTab === "overview"}
                            onClick={() => handleTabChange("overview")}
                            icon={<Home size={16} className="text-blue-500" />}
                        >
                            Dashboard
                        </NavButton>

                        <NavButton
                            active={activeTab === "patients"}
                            onClick={() => handleTabChange("patients")}
                            icon={<Users size={16} className="text-purple-500" />}
                        >
                            Pacientes
                        </NavButton>

                        <NavButton
                            active={activeTab === "therapy"}
                            onClick={() => handleTabChange("therapy")}
                            icon={<Stethoscope size={16} className="text-green-500" />}
                        >
                            Evolução
                        </NavButton>

                        <NavButton
                            active={activeTab === "appointments"}
                            onClick={() => handleTabChange("appointments")}
                            icon={<Calendar size={16} className="text-amber-500" />}
                        >
                            Agenda
                        </NavButton>

                        <NavButton
                            active={activeTab === "insights"}
                            onClick={() => handleTabChange("insights")}
                            icon={<BarChart2 size={16} className="text-cyan-400" />}
                        >
                            Insights
                        </NavButton>

                        {isPrivate && (
                            <NavButton
                                active={activeTab === "financial"}
                                onClick={() => handleTabChange("financial")}
                                icon={<DollarSign size={16} className="text-amber-500" />}
                            >
                                Financeiro
                            </NavButton>
                        )}

                        <NavButton
                            active={activeTab === "messages"}
                            onClick={() => handleTabChange("messages")}
                            icon={<MessageCircle size={16} className="text-emerald-500" />}
                        >
                            Mensagens
                        </NavButton>
                    </nav>

                    {/* Perfil + Hamburguer */}
                    <div className="flex items-center gap-2">
                        {/* Hamburguer - só no mobile */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center space-x-3 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200 group shadow-md"
                        >
                          {/*   <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-medium">
                                    Dr(a). {doctorInfo?.fullName?.split(' ')[0] || "Médico"}
                                </span>
                                <span className="text-xs text-emerald-100">
                                    {doctorInfo?.specialty || "Médico"}
                                </span>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center border border-white/30">
                                <span className="text-sm font-bold">
                                    {doctorInfo?.fullName?.charAt(0) || "D"}
                                </span>
                            </div> */}
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-3 z-50 border border-emerald-200">
                                <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-xl">
                                    <p className="text-sm font-semibold">
                                        Dr(a). {doctorInfo?.fullName || "Médico"}
                                    </p>
                                    <p className="text-xs text-emerald-100 truncate mt-1">
                                        {doctorInfo?.specialty || "Especialidade"}
                                    </p>
                                </div>

                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            handleTabChange("profile");
                                            setIsProfileDropdownOpen(false);
                                        }}
                                        className="flex items-center w-full px-3 py-3 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                                    >
                                        <User className="h-4 w-4 mr-3 text-emerald-600" />
                                        <span>Meu Perfil</span>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center w-full px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 mt-1"
                                    >
                                        <LogOut className="h-4 w-4 mr-3" />
                                        <span className="font-medium">Sair do Sistema</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    </div>{/* fecha flex items-center gap-2 */}
                </div>

                {/* Menu Mobile */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-emerald-600 pt-3 mt-3 pb-2 space-y-1">
                        <button onClick={() => handleMobileTabChange("overview")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                            <Home size={18} className="text-blue-400" /> Dashboard
                        </button>
                        <button onClick={() => handleMobileTabChange("patients")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "patients" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                            <Users size={18} className="text-purple-400" /> Pacientes
                        </button>
                        <button onClick={() => handleMobileTabChange("therapy")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "therapy" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                            <Stethoscope size={18} className="text-green-400" /> Evolução
                        </button>
                        <button onClick={() => handleMobileTabChange("appointments")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "appointments" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                            <Calendar size={18} className="text-amber-400" /> Agenda
                        </button>
                        <button onClick={() => handleMobileTabChange("insights")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "insights" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                            <BarChart2 size={18} className="text-cyan-400" /> Insights
                        </button>
                        {isPrivate && (
                            <button onClick={() => handleMobileTabChange("financial")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "financial" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                                <DollarSign size={18} className="text-amber-400" /> Financeiro
                            </button>
                        )}
                        <button onClick={() => handleMobileTabChange("messages")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "messages" ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"}`}>
                            <MessageCircle size={18} className="text-emerald-400" /> Mensagens
                        </button>
                        <div className="border-t border-emerald-600 mt-2 pt-2">
                            <button onClick={() => { handleMobileTabChange("profile"); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-100 hover:bg-emerald-700 transition-colors">
                                <User size={18} className="text-emerald-300" /> Meu Perfil
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors">
                                <LogOut size={18} /> Sair do Sistema
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default DoctorHeader;