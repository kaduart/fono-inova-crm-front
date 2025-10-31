import {
    Calendar,
    ChevronDown,
    Clock,
    Heart,
    Home,
    LineChart,
    LogOut,
    MessageCircle,
    Package,
    User,
    UserCircle
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAdmin } from "../../routes/hooks/useAdmin";
import NavButton from "../ui/NavButton";

interface PatientHeaderProps {
    activeTab: string;
    patientInfo: any;
    handleTabChange: (tab: string) => void;
    onLogout?: () => void;
    onNewAppointment?: () => void;
}

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
        <header className="bg-emerald-700 shadow-lg border-b border-emerald-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo e nome da clínica */}
                    <div className="flex items-center gap-3 cursor-pointer">
                        <div
                            onClick={() => navigate("/admin")}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                        >

                            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-md">
                                <Heart className="w-6 h-6 text-emerald-600" />
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">
                                    Fono Inova
                                </span>
                                <span className="text-xs text-emerald-100 font-medium">
                                    Área do Paciente
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navegação Específica para Pacientes */}
                    <nav className="hidden md:flex items-center space-x-1">
                        <NavButton
                            active={activeTab === "Dashboard"}
                            onClick={() => handleTabChange("Dashboard")}
                            icon={<Home size={16} className="text-blue-400" />}
                            className={activeTab === "Dashboard" ? "bg-white text-emerald-700" : "!text-white hover:bg-emerald-600"}
                        >
                            Dashboard
                        </NavButton>

                        <NavButton
                            active={activeTab === "Profile"}
                            onClick={() => handleTabChange("Profile")}
                            icon={<UserCircle size={16} className="text-purple-400" />}
                            className={activeTab === "Profile" ? "bg-white text-emerald-700" : "!text-white hover:bg-emerald-600"}
                        >
                            Meu Perfil
                        </NavButton>

                        <NavButton
                            active={activeTab === "Appointment Booking"}
                            onClick={() => handleTabChange("Appointment Booking")}
                            icon={<Calendar size={16} className="text-amber-400" />}
                            className={activeTab === "Appointment Booking" ? "bg-white text-emerald-700" : "!text-white hover:bg-emerald-600"}
                        >
                            Agendamentos
                        </NavButton>

                        <NavButton
                            active={activeTab === "Management Packages"}
                            onClick={() => handleTabChange("Management Packages")}
                            icon={<Package size={16} className="text-green-400" />}
                            className={activeTab === "Management Packages" ? "bg-white text-emerald-700" : "!text-white hover:bg-emerald-600"}
                        >
                            Pacotes
                        </NavButton>

                        <NavButton
                            active={activeTab === "Evolution"}
                            onClick={() => handleTabChange("Evolution")}
                            icon={<LineChart size={16} className="text-cyan-400" />}
                            className={activeTab === "Evolution" ? "bg-white text-emerald-700" : "!text-white hover:bg-emerald-600"}
                        >
                            Evolução
                        </NavButton>

                        <NavButton
                            active={activeTab === "Messages"}
                            onClick={() => handleTabChange("Messages")}
                            icon={<MessageCircle size={16} className="text-emerald-300" />}
                            className={activeTab === "Messages" ? "bg-white text-emerald-700" : "!text-white hover:bg-emerald-600"}
                        >
                            Mensagens
                        </NavButton>
                    </nav>

                    {/* Botão de Ação Rápida - Novo Agendamento */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onNewAppointment}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium shadow-md"
                        >
                            <Clock size={16} />
                            Novo Agendamento
                        </button>

                        {/* Perfil do Paciente */}
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
            </div>
        </header>
    );
};

export default PatientHeader;