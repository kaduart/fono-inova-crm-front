import {
    Calendar,
    ChevronDown,
    Clock,
    Heart,
    Home,
    LineChart,
    LogOut,
    Menu,
    Package,
    Scale,
    Shield,
    User,
    UserCircle,
    X
} from "lucide-react";
import ThemeToggle from '../common/ThemeToggle';
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAdmin } from "../../hooks/useAdmin";
import NavButton from "../ui/NavButton";

interface PatientHeaderProps {
    activeTab: string;
    patientInfo: any;
    handleTabChange: (tab: string) => void;
    onLogout?: () => void;
    onNewAppointment?: () => void;
}

const PATIENT_TABS = [
    { id: "Dashboard", label: "Dashboard", icon: <Home size={14} /> },
    { id: "Profile", label: "Perfil", icon: <UserCircle size={14} /> },
    { id: "Appointment Booking", label: "Agenda", icon: <Calendar size={14} /> },
    { id: "Management Packages", label: "Pacotes", icon: <Package size={14} /> },
    { id: "Insurance Guides", label: "Convênios", icon: <Shield size={14} /> },
    { id: "Liminar", label: "Liminar", icon: <Scale size={14} /> },
    { id: "Evolution", label: "Evolução", icon: <LineChart size={14} /> },
];

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
        <header className="bg-emerald-700 text-white px-3 py-3.5 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo e nome da clínica */}
                    <div className="flex items-center gap-1.5 cursor-pointer ml-2 sm:ml-6 shrink-0" onClick={() => navigate("/admin")}>
                    <div className="bg-white p-1 rounded-full">
                        <Heart className="h-4 w-4 text-emerald-700" />
                    </div>
                    <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                        Fono <span className="text-emerald-200">Inova</span>
                    </span>
                </div>

                    {/* Navegação */}
                    <nav className="hidden md:flex items-center gap-1">
                        {PATIENT_TABS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                                    activeTab === item.id
                                        ? "bg-white text-emerald-700 font-medium"
                                        : "text-emerald-100 hover:bg-emerald-600"
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Botão de Ação Rápida - Novo Agendamento */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onNewAppointment}
                            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs bg-white text-emerald-700 hover:bg-emerald-50 rounded-md transition-all"
                        >
                            <Clock size={12} />
                            Novo
                        </button>

                        <ThemeToggle />

                        {/* Hamburguer - só no mobile */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {/* Perfil do Paciente */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-500 rounded-md transition-all"
                            >
                                <span className="hidden sm:inline">{adminInfo?.fullName?.split(' ')[0] || "Admin"}</span>
                                <ChevronDown size={12} />
                            </button>

                            {isProfileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-3 z-50 border border-emerald-200">
                                    {/* Header do perfil elegante */}
                                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-xl">
                                        <p className="text-sm font-semibold">
                                            {patientInfo?.fullName || "Paciente"}
                                        </p>
                                        <p className="text-xs text-emerald-100 truncate mt-1">
                                            {patientInfo?.email || ""}
                                        </p>
                                        <p className="text-xs text-emerald-200 mt-1">
                                            Plano: {patientInfo?.healthPlan?.name || "Não informado"}
                                        </p>
                                    </div>

                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => {
                                                handleTabChange("Profile");
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-3 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                                        >
                                            <User className="h-4 w-4 mr-3 text-emerald-600" />
                                            <span>Meu Perfil Completo</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleTabChange("Evolution");
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-3 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                                        >
                                            <LineChart className="h-4 w-4 mr-3 text-cyan-500" />
                                            <span>Ver Minha Evolução</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleTabChange("Management Packages");
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-3 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                                        >
                                            <Package className="h-4 w-4 mr-3 text-green-500" />
                                            <span>Meus Pacotes</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleTabChange("Insurance Guides");
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-3 text-sm text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                                        >
                                            <Shield className="h-4 w-4 mr-3 text-blue-500" />
                                            <span>Guias de Convênio</span>
                                        </button>

                                        <div className="border-t border-gray-200 my-1"></div>

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
                    </div>
                

            </div>
            {/* Menu Mobile: fora da linha do header, em largura total, mesmos rótulos do desktop */}
            {isMobileMenuOpen && (
                <nav className="md:hidden max-w-7xl mx-auto border-t border-emerald-600 pt-3 mt-3 pb-2 space-y-1" aria-label="Abas do paciente">
                    {PATIENT_TABS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { handleTabChange(item.id); setIsMobileMenuOpen(false); }}
                            aria-current={activeTab === item.id ? "page" : undefined}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? "bg-white text-emerald-700" : "text-emerald-50 hover:bg-emerald-600"}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                    <div className="border-t border-emerald-600 mt-2 pt-2">
                        <button
                            onClick={() => { onNewAppointment?.(); setIsMobileMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors mb-1"
                        >
                            <Clock size={18} /> Novo agendamento
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-100 hover:bg-red-900/30 transition-colors">
                            <LogOut size={18} /> Sair do sistema
                        </button>
                    </div>
                </nav>
            )}
        </header>
    );
};

export default PatientHeader;