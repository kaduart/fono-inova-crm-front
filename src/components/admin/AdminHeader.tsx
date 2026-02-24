import {
    Activity,
    ChevronDown,
    Clock,
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
import { useAuth } from "../../contexts/AuthContext";
import NavButton from "../ui/NavButton";
import NavDropdownItem from "../ui/NavDropdownItem";
import { NotificationBellFixed } from "../notifications/NotificationBellFixed";

interface AdminHeaderProps {
    activeTab: string;
    openMenu: string;
    adminInfo: any;
    handleTabChange: (tab: string) => void;
    toggleMenu: (menuName: string) => void;
    setActiveTab: (tab: string) => void;
    onLogout?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
    activeTab,
    openMenu,
    adminInfo,
    handleTabChange,
    toggleMenu,
    setActiveTab,
    onLogout,
}) => {
    const navigate = useNavigate();
    const { logout: authLogout } = useAuth();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isMarketingActive =
        activeTab === "Leads" || activeTab === "Analytics";

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

    const handleMobileTabChange = (tab: string) => {
        handleTabChange(tab);
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="bg-emerald-700 shadow-lg border-b border-emerald-600 text-white py-3 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo e nome da clínica */}
                    <NavLink
                        to="/admin"
                        className="flex items-center gap-3"
                        onClick={() => handleTabChange("Dashboard")}
                    >
                        <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                            <img className="w-12 h-12 object-cover" src="images/cabeca-logo-verde-clara.png" alt="" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-white leading-tight">
                                Fono Inova
                            </span>
                            <span className="hidden sm:block text-xs text-emerald-100 font-medium">
                                Gestão Clínica
                            </span>
                        </div>
                    </NavLink>

                    {/* Navegação desktop */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {/* (mesmo conteúdo, mantido) */}
                        <div className="relative">
                            <NavButton
                                active={activeTab === "Add Profissional" || activeTab === "Add Paciente"}
                                onClick={() => toggleMenu("gestao")}
                                hasChevron
                                icon={<Users size={16} className="text-purple-500" />}
                                className={
                                    activeTab === "Add Profissional" || activeTab === "Add Paciente"
                                        ? "bg-blue-100 text-blue-600"
                                        : "!text-white"
                                }
                            >
                                Gestão
                            </NavButton>
                            {openMenu === "gestao" && (
                                <div className="absolute z-10 mt-2 w-56 rounded-lg shadow-xl bg-white border border-emerald-200 py-2">
                                    <NavDropdownItem
                                        active={activeTab === "Add Profissional"}
                                        onClick={() => handleTabChange("Add Profissional")}
                                        icon={<Stethoscope className="h-4 w-4 text-purple-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Profissionais</span>
                                            <span className="text-xs text-gray-500">Gerencie equipe</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Add Paciente"}
                                        onClick={() => handleTabChange("Add Paciente")}
                                        icon={<Users className="h-4 w-4 text-blue-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Pacientes</span>
                                            <span className="text-xs text-gray-500">Cadastro e histórico</span>
                                        </div>
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <NavButton
                            active={activeTab === "Calendário"}
                            onClick={() => handleTabChange("Calendário")}
                            icon={<Clock className="h-4 w-4 text-amber-500" />}
                            className={activeTab === "Calendário" ? "bg-blue-100 text-blue-600" : "!text-white"}
                        >
                            Agenda
                        </NavButton>

                        <NavButton
                            active={activeTab === "Financeiro"}
                            onClick={() => handleTabChange("Financeiro")}
                            icon={<DollarSign className="h-4 w-4 text-green-500" />}
                            className={activeTab === "Financeiro" ? "bg-blue-100 text-blue-600" : "!text-white"}
                        >
                            Financeiro
                        </NavButton>

                        <div className="relative">
                            <NavButton
                                active={isMarketingActive}
                                onClick={() => toggleMenu("marketing")}
                                icon={<Activity className="h-4 w-4 text-cyan-500" />}
                                hasChevron
                                className={isMarketingActive ? "bg-blue-100 text-blue-600" : "!text-white"}
                            >
                                Marketing
                            </NavButton>
                            {openMenu === "marketing" && (
                                <div className="absolute z-10 mt-2 w-56 rounded-lg shadow-xl bg-white border border-emerald-200 py-2">
                                    <NavDropdownItem
                                        active={activeTab === "Leads"}
                                        onClick={() => handleTabChange("Leads")}
                                        icon={<Activity className="h-4 w-4 text-cyan-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Leads</span>
                                            <span className="text-xs text-gray-500">Potenciais pacientes</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Analytics"}
                                        onClick={() => handleTabChange("Analytics")}
                                        icon={<Activity className="h-4 w-4 text-indigo-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Analytics</span>
                                            <span className="text-xs text-gray-500">Desempenho de campanhas</span>
                                        </div>
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <NavButton
                            active={activeTab === "Mensagens"}
                            onClick={() => handleTabChange("Mensagens")}
                            icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
                            className={activeTab === "Mensagens" ? "bg-blue-100 text-blue-600" : "!text-white"}
                        >
                            WhatsApp
                        </NavButton>
                    </nav>

                    {/* 🔔 Notificações + Perfil + Hamburguer */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <NotificationBellFixed />

                        {/* Hamburguer - mobile */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {/* Perfil - desktop */}
                        <div className="relative hidden md:block">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center space-x-3 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200 group shadow-md"
                            >
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-sm font-medium">
                                        {adminInfo?.fullName?.split(' ')[0] || "Admin"}
                                    </span>
                                    <span className="text-xs text-emerald-100">
                                        {adminInfo?.role || "Administrador"}
                                    </span>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center border border-white/30">
                                    <span className="text-sm font-bold">
                                        {adminInfo?.fullName?.charAt(0) || "A"}
                                    </span>
                                </div>
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProfileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-3 z-50 border border-emerald-200">
                                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-xl">
                                        <p className="text-sm font-semibold">
                                            {adminInfo?.fullName || "Administrador"}
                                        </p>
                                        <p className="text-xs text-emerald-100 truncate mt-1">
                                            {adminInfo?.email || ""}
                                        </p>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={() => {
                                                setActiveTab("Profile");
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
                    </div>
                </div>

                {/* Menu Mobile - refinado */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-emerald-600 mt-3 pt-3 pb-2 space-y-1">
                        <div className="px-3 py-2 bg-emerald-800/30 rounded-lg mb-2">
                            <p className="text-xs text-emerald-200 font-medium">
                                Olá, {adminInfo?.fullName?.split(' ')[0] || "Admin"}
                            </p>
                            <p className="text-xs text-emerald-300 truncate">{adminInfo?.email || ""}</p>
                        </div>

                        <button
                            onClick={() => handleMobileTabChange("Dashboard")}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Dashboard"
                                    ? "bg-emerald-600 text-white"
                                    : "text-emerald-100 hover:bg-emerald-700"
                                }`}
                        >
                            <Home size={18} className="text-blue-400" /> Dashboard
                        </button>

                        <div className="space-y-1">
                            <p className="px-4 pt-2 pb-1 text-xs text-emerald-300 font-semibold uppercase tracking-wide">Gestão</p>
                            <button
                                onClick={() => handleMobileTabChange("Add Profissional")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Add Profissional"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Stethoscope size={18} className="text-purple-400" /> Profissionais
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("Add Paciente")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Add Paciente"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Users size={18} className="text-blue-400" /> Pacientes
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("Calendário")}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Calendário"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Clock size={18} className="text-amber-400" /> Agenda
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("Financeiro")}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Financeiro"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <DollarSign size={18} className="text-green-400" /> Financeiro
                            </button>
                        </div>

                        <div className="space-y-1">
                            <p className="px-4 pt-2 pb-1 text-xs text-emerald-300 font-semibold uppercase tracking-wide">Marketing</p>
                            <button
                                onClick={() => handleMobileTabChange("Leads")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Leads"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Activity size={18} className="text-cyan-400" /> Leads
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("Analytics")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Analytics"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Activity size={18} className="text-indigo-400" /> Analytics
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("Mensagens")}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Mensagens"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <MessageCircle size={18} className="text-emerald-400" /> WhatsApp
                            </button>
                        </div>

                        <div className="border-t border-emerald-600 mt-2 pt-2">
                            <button
                                onClick={() => {
                                    setActiveTab("Profile");
                                    setIsMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-emerald-100 hover:bg-emerald-700 transition-colors"
                            >
                                <User size={18} className="text-emerald-300" /> Meu Perfil
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors"
                            >
                                <LogOut size={18} /> Sair do Sistema
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AdminHeader;