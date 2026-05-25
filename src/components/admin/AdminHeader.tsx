import {
    Activity,
    ChevronDown,
    Clock,
    DollarSign,
    Eye,
    Home,
    LogOut,
    Menu,
    MessageCircle,
    Stethoscope,
    User,
    Users,
    X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { BsSoundwave } from "react-icons/bs";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useOperationalCounts } from "../../hooks/useOperationalCounts";
import { useRetentionAlert } from "../../hooks/useRetentionAlert";
import NavButton from "../ui/NavButton";
import NavDropdownItem from "../ui/NavDropdownItem";
import { NotificationBellFixed } from "../notifications/NotificationBellFixed";
import { WhatsAppNotificationButton } from "../notifications/WhatsAppNotificationButton";

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
    const opCounts       = useOperationalCounts();
    const retentionAlert = useRetentionAlert();

    const gestaoRef = useRef<HTMLDivElement>(null);
    const vendasRef = useRef<HTMLDivElement>(null);
    const sistemaRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedGestao = gestaoRef.current?.contains(target);
            const clickedVendas = vendasRef.current?.contains(target);
            const clickedSistema = sistemaRef.current?.contains(target);
            const clickedProfile = profileRef.current?.contains(target);

            if (!clickedGestao && !clickedVendas && !clickedSistema && !clickedProfile) {
                if (openMenu) toggleMenu('');
                if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenu, toggleMenu, isProfileDropdownOpen]);

    const isVendasMarketingActive =
        activeTab === "Leads" || activeTab === "Analytics" || activeTab === "SocialMedia" || activeTab === "ROI";
    
    const isSistemaActive =
        activeTab === "Sistema" || activeTab === "AmandaMetrics" || activeTab === "WhatsApp";

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
        <header className="shadow-lg border-b text-white py-3 sticky top-0 z-50" style={{ backgroundColor: 'rgb(13 138 108)', borderColor: 'rgba(255,255,255,0.2)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo e nome da clínica */}
                    <NavLink
                        to="/admin"
                        className="flex items-center gap-3"
                        onClick={() => handleTabChange("Dashboard")}
                    >
                        <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                            <img className="w-12 h-12 object-cover" src="images/logo-padrao-3d-encurtada.png" alt="" />
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
                        <div className="relative" ref={gestaoRef}>
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
                            <span className="flex items-center gap-1.5">
                                Agenda
                                {!retentionAlert.loading && retentionAlert.total > 0 && (
                                    <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                                        {retentionAlert.total}
                                    </span>
                                )}
                            </span>
                        </NavButton>

                        <NavButton
                            active={activeTab === "Financeiro"}
                            onClick={() => handleTabChange("Financeiro")}
                            icon={<DollarSign className="h-4 w-4 text-green-500" />}
                            className={activeTab === "Financeiro" ? "bg-blue-100 text-blue-600" : "!text-white"}
                        >
                            Financeiro
                        </NavButton>

                        <div className="relative" ref={vendasRef}>
                            <NavButton
                                active={isVendasMarketingActive}
                                onClick={() => toggleMenu("vendas-marketing")}
                                icon={<Activity className="h-4 w-4 text-cyan-500" />}
                                hasChevron
                                className={isVendasMarketingActive ? "bg-blue-100 text-blue-600" : "!text-white"}
                            >
                                <span className="flex items-center gap-1.5">
                                    Vendas & Marketing
                                    {opCounts.total > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                                            {opCounts.total}
                                        </span>
                                    )}
                                </span>
                            </NavButton>
                            {openMenu === "vendas-marketing" && (
                                <div className="absolute z-10 mt-2 w-64 rounded-lg shadow-xl bg-white border border-emerald-200 py-2">
                                    {/* SEÇÃO VENDAS */}
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Vendas
                                    </div>
                                    <NavDropdownItem
                                        active={activeTab === "Leads"}
                                        onClick={() => handleTabChange("Leads")}
                                        icon={<Users className="h-4 w-4 text-cyan-500" />}
                                    >
                                        <div className="flex items-center justify-between w-full gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-800">Leads & Follow-up</span>
                                                <span className="text-xs text-gray-500">Fila operacional da secretária</span>
                                            </div>
                                            {(opCounts.overdue > 0 || opCounts.today > 0) && (
                                                <div className="flex flex-col gap-0.5 items-end flex-shrink-0">
                                                    {opCounts.overdue > 0 && (
                                                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                            🔴 {opCounts.overdue}
                                                        </span>
                                                    )}
                                                    {opCounts.today > 0 && (
                                                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                            🟡 {opCounts.today}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </NavDropdownItem>
                                    
                                    <div className="my-2 border-t border-gray-100"></div>
                                    
                                    {/* SEÇÃO MARKETING */}
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Marketing Digital
                                    </div>
                                    <NavDropdownItem
                                        active={activeTab === "SocialMedia"}
                                        onClick={() => handleTabChange("SocialMedia")}
                                        icon={<Activity className="h-4 w-4 text-pink-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Social Media</span>
                                            <span className="text-xs text-gray-500">GMB, Instagram, Facebook, Vídeos</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Analytics"}
                                        onClick={() => handleTabChange("Analytics")}
                                        icon={<Activity className="h-4 w-4 text-indigo-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Analytics do Site</span>
                                            <span className="text-xs text-gray-500">Métricas GA4 e conversões</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "ROI"}
                                        onClick={() => handleTabChange("ROI")}
                                        icon={<DollarSign className="h-4 w-4 text-green-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">ROI & Atribuição</span>
                                            <span className="text-xs text-gray-500">Receita por campanha e origem</span>
                                        </div>
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <WhatsAppNotificationButton 
                            onClick={() => handleTabChange("Mensagens")}
                        />

                        {/* Menu Sistema/Dev */}
                        <div className="relative" ref={sistemaRef}>
                            <NavButton
                                active={isSistemaActive}
                                onClick={() => toggleMenu("sistema")}
                                icon={<Eye className="h-4 w-4 text-orange-500" />}
                                hasChevron
                                className={isSistemaActive ? "bg-blue-100 text-blue-600" : "!text-white"}
                            >
                                Sistema
                            </NavButton>
                            {openMenu === "sistema" && (
                                <div className="absolute z-10 mt-2 w-56 rounded-lg shadow-xl bg-white border border-emerald-200 py-2">
                                    <NavDropdownItem
                                        active={activeTab === "Sistema"}
                                        onClick={() => handleTabChange("Sistema")}
                                        icon={<Activity className="h-4 w-4 text-orange-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Sistema</span>
                                            <span className="text-xs text-gray-500">Observabilidade, eventos e health</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "AmandaMetrics"}
                                        onClick={() => handleTabChange("AmandaMetrics")}
                                        icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Amanda AI</span>
                                            <span className="text-xs text-gray-500">Decisões RULE / HYBRID / AI</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "WhatsApp"}
                                        onClick={() => handleTabChange("WhatsApp")}
                                        icon={<MessageCircle className="h-4 w-4 text-green-600" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">WhatsApp Conexão</span>
                                            <span className="text-xs text-gray-500">QR code, status e reconexão</span>
                                        </div>
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>
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
                        <div className="relative hidden md:block" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center space-x-3 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200 group shadow-md"
                            >
                               {/*  <div className="hidden sm:flex flex-col items-end">
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
                                </div> */}
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
                            <p className="px-4 pt-2 pb-1 text-xs text-emerald-300 font-semibold uppercase tracking-wide">Vendas & Marketing</p>
                            <button
                                onClick={() => handleMobileTabChange("Leads")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Leads"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Users size={18} className="text-cyan-400" />
                                <span className="flex-1 text-left">Leads & Follow-up</span>
                                {opCounts.total > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                        {opCounts.total}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("SocialMedia")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "SocialMedia"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Activity size={18} className="text-pink-400" /> Social Media
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("Analytics")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Analytics"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Activity size={18} className="text-indigo-400" /> Analytics do Site
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("ROI")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "ROI"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <DollarSign size={18} className="text-green-400" /> ROI & Atribuição
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

                        <div className="space-y-1">
                            <p className="px-4 pt-2 pb-1 text-xs text-emerald-300 font-semibold uppercase tracking-wide">Sistema</p>
                            <button
                                onClick={() => handleMobileTabChange("Sistema")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "Sistema"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <Activity size={18} className="text-orange-400" /> Sistema
                            </button>
                            <button
                                onClick={() => handleMobileTabChange("AmandaMetrics")}
                                className={`flex items-center gap-3 w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "AmandaMetrics"
                                        ? "bg-emerald-600 text-white"
                                        : "text-emerald-100 hover:bg-emerald-700"
                                    }`}
                            >
                                <MessageCircle size={18} className="text-emerald-400" /> Amanda AI
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