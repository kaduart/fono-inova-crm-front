// src/pages/doctor/components/DoctorHeader.tsx
import HeaderNavButton, { HeaderBrand, HEADER_ICON_BUTTON_CLASS, HEADER_SHELL_CLASS } from './ui/HeaderNavButton';
import ThemeToggle from './common/ThemeToggle';
import NovidadesCenter from './novidades/NovidadesCenter';
import {
    BarChart2,
    Calendar,
    ChevronDown,
    DollarSign,
    Home,
    LogOut,
    Menu,
    Stethoscope,
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

const SPECIALTY_LABEL: Record<string, string> = {
    fonoaudiologia: 'Fonoaudióloga', psicologia: 'Psicóloga', psicopedagogia: 'Psicopedagoga',
    terapia_ocupacional: 'Terapeuta ocupacional', fisioterapia: 'Fisioterapeuta', musicoterapia: 'Musicoterapeuta',
};

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
        <header className={HEADER_SHELL_CLASS}>
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
                <div className="flex h-16 items-center justify-between gap-4">
                    {/* Logo e nome da clínica */}
                    <div className="flex items-center gap-3 cursor-pointer">
                        <NavLink
                            to="/doctor"
                            className="flex items-center rounded-xl pr-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 xl:border-r xl:border-white/15"
                            onClick={() => handleTabChange("overview")}
                            aria-label="Fono Inova, ir para o Dashboard"
                        >
                            <HeaderBrand subtitle="Área do Terapeuta" />
                        </NavLink>
                    </div>

                    {/* Navegação Principal */}
                    <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="Menu principal">
                        <HeaderNavButton
                            active={activeTab === "overview"}
                            onClick={() => handleTabChange("overview")}
                            icon={<Home />}
                        >
                            Dashboard
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "patients"}
                            onClick={() => handleTabChange("patients")}
                            icon={<Users />}
                        >
                            Pacientes
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "therapy"}
                            onClick={() => handleTabChange("therapy")}
                            icon={<Stethoscope />}
                        >
                            Evolução
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "appointments"}
                            onClick={() => handleTabChange("appointments")}
                            icon={<Calendar />}
                        >
                            Agenda
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "insights"}
                            onClick={() => handleTabChange("insights")}
                            icon={<BarChart2 />}
                        >
                            Insights
                        </HeaderNavButton>

                        {isPrivate && (
                            <HeaderNavButton
                                active={activeTab === "financial"}
                                onClick={() => handleTabChange("financial")}
                                icon={<DollarSign />}
                            >
                                Financeiro
                            </HeaderNavButton>
                        )}

                    </nav>

                    {/* Tema + Perfil + Hamburguer */}
                    <div className="flex shrink-0 items-center gap-1.5">
                        <NovidadesCenter area="doctor" activeTab={activeTab} />
                        <ThemeToggle className="!h-10 !w-10 !rounded-[11px] border border-white/15 !bg-white/[0.08] hover:!bg-white/15" />
                        {/* Hamburguer - só no mobile */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`${HEADER_ICON_BUTTON_CLASS} lg:hidden`}
                            aria-label="Menu" aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            aria-label="Menu do perfil"
                            aria-haspopup="menu"
                            aria-expanded={isProfileDropdownOpen}
                            className="ml-1 flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.08] py-1 pl-1.5 pr-1.5 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:pl-3"
                        >
                          <div className="hidden sm:flex flex-col items-end">
                                <span className="text-[13.5px] font-semibold leading-tight">
                                    {doctorInfo?.fullName?.split(' ')[0] || "Terapeuta"}
                                </span>
                                <span className="text-[11px] leading-tight text-white/70">
                                    {SPECIALTY_LABEL[doctorInfo?.specialty] || doctorInfo?.specialty || "Terapeuta"}
                                </span>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-amber-200 to-amber-400 text-amber-950">
                                <span className="text-sm font-bold">
                                    {doctorInfo?.fullName?.charAt(0) || "T"}
                                </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-3 z-50 border border-emerald-200">
                                <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-xl">
                                    <p className="text-sm font-semibold">
                                        {doctorInfo?.fullName || "Terapeuta"}
                                    </p>
                                    <p className="text-xs text-white truncate mt-1">
                                        {SPECIALTY_LABEL[doctorInfo?.specialty] || doctorInfo?.specialty || "Terapeuta"}
                                    </p>
                                </div>

                                <div className="p-2">

                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center w-full px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
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
                    <div className="lg:hidden border-t border-emerald-600 pt-3 mt-3 pb-2 space-y-1">
                        <button onClick={() => handleMobileTabChange("overview")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-700"}`}>
                            <Home size={18} className="text-blue-400" /> Dashboard
                        </button>
                        <button onClick={() => handleMobileTabChange("patients")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "patients" ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-700"}`}>
                            <Users size={18} className="text-purple-400" /> Pacientes
                        </button>
                        <button onClick={() => handleMobileTabChange("therapy")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "therapy" ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-700"}`}>
                            <Stethoscope size={18} className="text-green-400" /> Evolução
                        </button>
                        <button onClick={() => handleMobileTabChange("appointments")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "appointments" ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-700"}`}>
                            <Calendar size={18} className="text-amber-400" /> Agenda
                        </button>
                        <button onClick={() => handleMobileTabChange("insights")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "insights" ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-700"}`}>
                            <BarChart2 size={18} className="text-cyan-400" /> Insights
                        </button>
                        {isPrivate && (
                            <button onClick={() => handleMobileTabChange("financial")} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "financial" ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-700"}`}>
                                <DollarSign size={18} className="text-amber-400" /> Financeiro
                            </button>
                        )}
                        <div className="border-t border-emerald-600 mt-2 pt-2">
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