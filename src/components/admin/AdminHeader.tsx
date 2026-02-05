import {
    Activity,
    CalendarPlus,
    ChevronDown,
    Clock,
    DollarSign,
    Home,
    LogOut,
    MessageCircle,
    Stethoscope,
    User,
    Users
} from "lucide-react";
import React, { useState } from "react";
import { BsSoundwave } from "react-icons/bs";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import NavButton from "../ui/NavButton";
import NavDropdownItem from "../ui/NavDropdownItem";

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
    // 1) logo após os hooks/props, crie este helper:
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

    return (
        <header className="bg-emerald-700 shadow-lg border-b border-emerald-600 text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between  items-center">
                    {/* Logo e nome da clínica */}
                    <div className="flex items-center gap-3 cursor-pointer">
                        <NavLink
                            to="/admin"
                            className="flex items-center gap-3"
                            onClick={() => handleTabChange("Dashboard")}
                        >
                            <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center">
                                <img className="w-12 h-12" src="images/cabeca-logo-verde-clara.png" alt="" />

                            </div>

                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">
                                    Fono Inova
                                </span>
                                <span className="text-xs text-emerald-100 font-medium">
                                    Gestão Clínica
                                </span>
                            </div>
                        </NavLink>
                    </div>

                    {/* Navegação - CORRIGIDO: texto em cinza para não selecionados */}
                    <nav className="hidden md:flex items-center space-x-1">
                        <NavButton
                            active={activeTab === "Dashboard"}
                            onClick={() => handleTabChange("Dashboard")}
                            icon={<Home size={16} className="text-blue-500" />}
                            className={activeTab === "Dashboard" ? "bg-blue-100 text-blue-600" : "!text-white"}
                        >
                            Dashboard
                        </NavButton>

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
                                // fica ativo quando qualquer aba de Marketing estiver selecionada
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
                                    {/* Leads */}
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

                                    {/* Mensagens (WhatsApp/Chat) */}
                                    {/* <NavDropdownItem
                                        active={activeTab === "Mensagens"}
                                        onClick={() => handleTabChange("Mensagens")}
                                        icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Mensagens</span>
                                            <span className="text-xs text-gray-500">WhatsApp / Chat</span>
                                        </div>
                                    </NavDropdownItem> */}

                                    {/* Analytics */}
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

                        <NavButton
                            active={activeTab === "Pré-Agendamentos"}
                            onClick={() => handleTabChange("Pré-Agendamentos")}
                            icon={<CalendarPlus className="h-4 w-4 text-pink-500" />}
                            className={activeTab === "Pré-Agendamentos" ? "bg-blue-100 text-blue-600" : "!text-white"}
                        >
                            Pré-Agendamentos
                        </NavButton>
                    </nav>

                    {/* Perfil - VERSÃO ELEGANTE MELHORADA */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center space-x-3 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200 group shadow-md"
                        >
                            <div className="flex flex-col items-end">
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
                                {/* Header do perfil elegante */}
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
        </header>
    );
};

export default AdminHeader;