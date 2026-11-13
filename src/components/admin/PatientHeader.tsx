import {
    ArrowLeft,
    CalendarPlus,
    ChevronDown,
    LineChart,
    LogOut,
    Menu,
    Package,
    Shield,
    User,
    X
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAdmin } from "../../hooks/useAdmin";
import ThemeToggle from "../common/ThemeToggle";
import HeaderNavButton, { HEADER_SHELL_CLASS, HeaderBrand } from "../ui/HeaderNavButton";

interface PatientHeaderProps {
    activeTab: string;
    patientInfo: { fullName?: string; email?: string; healthPlan?: { name?: string } } | null | undefined;
    handleTabChange: (tab: string) => void;
    onLogout?: () => void;
    onNewAppointment?: () => void;
}

const PATIENT_TABS = [
    { id: "Dashboard", label: "Dashboard" },
    { id: "Profile", label: "Perfil" },
    { id: "Appointment Booking", label: "Agenda" },
    { id: "Management Packages", label: "Pacotes" },
    { id: "Insurance Guides", label: "Convênios" },
    { id: "Liminar", label: "Liminar" },
    { id: "Evolution", label: "Evolução" },
];

const getInitials = (name?: string) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "P";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PatientHeader: React.FC<PatientHeaderProps> = ({
    activeTab,
    patientInfo,
    handleTabChange,
    onLogout,
    onNewAppointment,
}) => {
    const navigate = useNavigate();
    const { logout: authLogout } = useAuth();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { adminInfo } = useAdmin();

    const patientName: string = patientInfo?.fullName || "Paciente";

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

    const PatientChip = ({ className = "" }: { className?: string }) => (
        <span
            className={`flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.18] bg-white/10 py-[5px] pl-1.5 pr-3 text-[13px] font-semibold text-white ${className}`}
            title={patientName}
        >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-emerald-100 text-[11px] font-extrabold text-emerald-800">
                {getInitials(patientName)}
            </span>
            <span className="truncate">{patientName}</span>
        </span>
    );

    return (
        <header className={`${HEADER_SHELL_CLASS} px-3 py-2.5`}>
            <div className="mx-auto flex max-w-[1515px] items-center gap-3 lg:gap-4">
                {/* Marca */}
                <button
                    type="button"
                    onClick={() => navigate("/admin")}
                    className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Ir para o painel"
                >
                    <HeaderBrand subtitle="Ficha do paciente" />
                </button>

                {/* Voltar para a lista */}
                <button
                    type="button"
                    onClick={() => navigate("/admin")}
                    className="hidden shrink-0 items-center gap-1.5 border-r border-white/[0.18] pr-3.5 text-xs font-semibold text-white/85 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex"
                >
                    <ArrowLeft size={14} aria-hidden /> Pacientes
                </button>

                {/* Abas */}
                <nav className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex" aria-label="Abas do paciente">
                    {PATIENT_TABS.map((item) => (
                        <HeaderNavButton
                            key={item.id}
                            active={activeTab === item.id}
                            onClick={() => handleTabChange(item.id)}
                        >
                            {item.label}
                        </HeaderNavButton>
                    ))}
                </nav>

                {/* Lado direito */}
                <div className="ml-auto flex min-w-0 items-center gap-2.5">
                    <PatientChip className="hidden max-w-[240px] sm:flex" />

                    <button
                        type="button"
                        onClick={onNewAppointment}
                        className="hidden items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-white px-3 py-2 text-[13px] font-bold text-emerald-800 transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
                    >
                        <CalendarPlus size={15} aria-hidden /> Novo agendamento
                    </button>

                    <ThemeToggle className="!h-10 !w-10 !rounded-[11px] border border-white/15 !bg-white/[0.08] hover:!bg-white/15" />

                    {/* Hamburguer: só no mobile */}
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] border border-white/15 bg-white/[0.08] text-white transition-colors hover:bg-white/15 md:hidden"
                        aria-label="Menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    {/* Menu do usuário */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            aria-expanded={isProfileDropdownOpen}
                            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-2.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                            <span className="hidden sm:inline">{adminInfo?.fullName?.split(" ")[0] || "Admin"}</span>
                            <ChevronDown size={14} className={`transition-transform ${isProfileDropdownOpen ? "rotate-180" : ""}`} aria-hidden />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-emerald-200 bg-white py-3 text-gray-700 shadow-2xl dark:border-emerald-900 dark:bg-slate-900 dark:text-slate-200">
                                <div className="rounded-t-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-white">
                                    <p className="text-sm font-semibold">{patientName}</p>
                                    <p className="mt-1 truncate text-xs text-emerald-100">{patientInfo?.email || ""}</p>
                                    <p className="mt-1 text-xs text-emerald-200">
                                        Plano: {patientInfo?.healthPlan?.name || "Não informado"}
                                    </p>
                                </div>

                                <div className="space-y-1 p-2">
                                    {[
                                        { tab: "Profile", label: "Meu Perfil Completo", icon: <User className="mr-3 h-4 w-4 text-emerald-600" /> },
                                        { tab: "Evolution", label: "Ver Minha Evolução", icon: <LineChart className="mr-3 h-4 w-4 text-cyan-500" /> },
                                        { tab: "Management Packages", label: "Meus Pacotes", icon: <Package className="mr-3 h-4 w-4 text-green-500" /> },
                                        { tab: "Insurance Guides", label: "Guias de Convênio", icon: <Shield className="mr-3 h-4 w-4 text-blue-500" /> },
                                    ].map((item) => (
                                        <button
                                            key={item.tab}
                                            onClick={() => {
                                                handleTabChange(item.tab);
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center rounded-lg px-3 py-3 text-sm transition-colors duration-150 hover:bg-emerald-50 dark:hover:bg-white/5"
                                        >
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </button>
                                    ))}

                                    <div className="my-1 border-t border-gray-200 dark:border-white/10"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center rounded-lg px-3 py-3 text-sm text-red-600 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                    >
                                        <LogOut className="mr-3 h-4 w-4" />
                                        <span className="font-medium">Sair do Sistema</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Celular: selo do paciente abaixo do logo */}
            <div className="mx-auto mt-2 flex max-w-[1515px] sm:hidden">
                <PatientChip className="max-w-full" />
            </div>

            {/* Menu mobile: largura total, mesmos rótulos do desktop */}
            {isMobileMenuOpen && (
                <nav className="mx-auto mt-3 max-w-[1515px] space-y-1 border-t border-white/15 pb-2 pt-3 md:hidden" aria-label="Abas do paciente">
                    <button
                        type="button"
                        onClick={() => { navigate("/admin"); setIsMobileMenuOpen(false); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                    >
                        <ArrowLeft size={18} /> Pacientes
                    </button>
                    {PATIENT_TABS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { handleTabChange(item.id); setIsMobileMenuOpen(false); }}
                            aria-current={activeTab === item.id ? "page" : undefined}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                activeTab === item.id ? "bg-white font-semibold text-emerald-800" : "text-white/90 hover:bg-white/10"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="mt-2 border-t border-white/15 pt-2">
                        <button
                            onClick={() => { onNewAppointment?.(); setIsMobileMenuOpen(false); }}
                            className="mb-1 flex w-full items-center gap-3 rounded-lg bg-white/15 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                        >
                            <CalendarPlus size={18} /> Novo agendamento
                        </button>
                        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-100 transition-colors hover:bg-red-900/30">
                            <LogOut size={18} /> Sair do sistema
                        </button>
                    </div>
                </nav>
            )}
        </header>
    );
};

export default PatientHeader;
