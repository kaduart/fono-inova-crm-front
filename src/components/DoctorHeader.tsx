// src/pages/doctor/components/DoctorHeader.tsx
import HeaderNavButton, { HeaderBrand, HEADER_SHELL_CLASS } from './ui/HeaderNavButton';
import ThemeToggle from './common/ThemeToggle';
import NovidadesCenter from './novidades/NovidadesCenter';
import {
    BarChart2,
    Calendar,
    ChevronDown,
    DollarSign,
    Home,
    LogOut,
    Stethoscope,
    Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import MobileTabBar, { MobileNavGroup, MobileNavItem, type MobileTab } from "./admin/MobileTabBar";
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

// Barra de baixo no celular (mesmo estilo do admin, mock aprovado 11/11).
const DOCTOR_TABS: MobileTab[] = [
    { key: 'overview', label: 'Início', icon: Home, match: ['overview'] },
    { key: 'appointments', label: 'Agenda', icon: Calendar, match: ['appointments'] },
    { key: 'patients', label: 'Pacientes', icon: Users, match: ['patients'] },
    { key: 'therapy', label: 'Evolução', icon: Stethoscope, match: ['therapy'] },
];

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
    const [moreGroupOpen, setMoreGroupOpen] = useState(true);
    useEffect(() => { setIsMobileMenuOpen(false); }, [activeTab]);

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
                            <ChevronDown className={`h-4 w-4 transition-transform duration-quick ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
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

                {/* Menu "Mais" no celular: mesmo estilo do admin (cartão do usuário, grupo recolhível,
                    ícones numa cor só). Abre pela barra de baixo. */}
                {isMobileMenuOpen && (
                    <div className="absolute inset-x-0 top-full h-[calc(100dvh-100%)] overflow-y-auto bg-gray-100 px-3 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3 text-left text-gray-900 lg:hidden dark:bg-gray-950 dark:text-gray-100">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-sm font-bold text-amber-950">{doctorInfo?.fullName?.charAt(0) || 'T'}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-bold">{doctorInfo?.fullName || 'Terapeuta'}</span>
                                    <span className="block text-xs text-gray-600 dark:text-gray-400">{SPECIALTY_LABEL[doctorInfo?.specialty] || doctorInfo?.specialty || 'Terapeuta'}</span>
                                </span>
                            </div>

                            <MobileNavGroup title="Mais telas" open={moreGroupOpen} onToggle={() => setMoreGroupOpen(v => !v)} count={isPrivate ? 2 : 1}>
                                <MobileNavItem active={activeTab === "insights"} onClick={() => handleMobileTabChange("insights")} icon={<BarChart2 size={20} />} hint="Seus números do mês">Insights</MobileNavItem>
                                {isPrivate && <MobileNavItem active={activeTab === "financial"} onClick={() => handleMobileTabChange("financial")} icon={<DollarSign size={20} />}>Financeiro</MobileNavItem>}
                            </MobileNavGroup>

                            <button type="button" onClick={handleLogout}
                                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-semibold text-red-700 shadow-sm ring-1 ring-gray-200/70 hover:bg-red-50 dark:bg-gray-900 dark:text-red-400 dark:ring-gray-800 dark:hover:bg-red-500/10">
                                <LogOut size={18} aria-hidden /> Sair do sistema
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <MobileTabBar
                tabs={DOCTOR_TABS}
                activeTab={activeTab}
                moreOpen={isMobileMenuOpen}
                onTab={(tab) => { setIsMobileMenuOpen(false); handleTabChange(tab); }}
                onToggleMore={() => setIsMobileMenuOpen(v => !v)}
                birthdayPending={0}
                leadsCount={0}
            />
        </header>
    );
};

export default DoctorHeader;