import {
    Activity,
    Brain,
    ChevronDown,
    Clock,
    LogOut,
    Puzzle,
    Stethoscope,
    User,
    Users
} from "lucide-react";
import React, { useState } from "react";
import { BsSoundwave } from "react-icons/bs";
import { NavLink, useNavigate } from "react-router-dom";
import logoUnica from "../../../public/images/logo-clinica-site.png";
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
        <header className="bg-gradient-to-r from-teal-400 via-emerald-500 to-green-400 shadow-md text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo e nome da clínica */}
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
                        <NavLink
                            to="/admin"
                            className="flex items-center gap-3"
                            onClick={() => handleTabChange("Dashboard")}
                        >

                            <div className="h-8 w-auto rounded-md shadow-sm bg-white/10 p-1">
                                <BsSoundwave className="w-7 h-7 text-emerald-600" />
                               {/*  <Puzzle className="w-5 h-5 text-yellow-500" /> */}

                            </div>

                           
                            <span className="text-2xl font-semibold tracking-wide drop-shadow-sm">
                                {/* Clínica{" "} */}
                                <span className="font-extrabold tracking-tight">Fono Inova</span>
                            </span>
                        </NavLink>
                    </div>

                    {/* Navegação */}
                    <nav className="hidden md:flex items-center space-x-2">
                        <NavButton
                            active={activeTab === "Dashboard"}
                            onClick={() => handleTabChange("Dashboard")}
                            className="hover:bg-white/20"
                        >
                            Dashboard
                        </NavButton>

                        <div className="relative">
                            <NavButton
                                active={
                                    activeTab === "Add Profissional" || activeTab === "Add Paciente"
                                }
                                onClick={() => toggleMenu("gestao")}
                                hasChevron
                            >
                                Gestão
                            </NavButton>

                            {openMenu === "gestao" && (
                                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white text-gray-700 ring-1 ring-emerald-500/20 py-1">
                                    <NavDropdownItem
                                        active={activeTab === "Add Profissional"}
                                        onClick={() => handleTabChange("Add Profissional")}
                                        icon={<Stethoscope className="h-4 w-4" />}
                                    >
                                        Profissionais
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Add Paciente"}
                                        onClick={() => handleTabChange("Add Paciente")}
                                        icon={<Users className="h-4 w-4" />}
                                    >
                                        Pacientes
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <NavButton
                            active={activeTab === "Calendário"}
                            onClick={() => handleTabChange("Calendário")}
                            icon={<Clock className="h-4 w-4" />}
                        >
                            Agenda
                        </NavButton>

                        <NavButton
                            active={activeTab === "Financeiro"}
                            onClick={() => handleTabChange("Financeiro")}
                            icon={<span className="text-sm">💵</span>}
                        >
                            Financeiro
                        </NavButton>

                        <div className="relative">
                            <NavButton
                                active={activeTab === "Leads"}
                                onClick={() => toggleMenu("marketing")}
                                icon={<Activity className="h-4 w-4" />}
                                hasChevron
                            >
                                Marketing
                            </NavButton>

                            {openMenu === "marketing" && (
                                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white text-gray-700 ring-1 ring-emerald-500/20 py-1">
                                    <NavDropdownItem
                                        active={activeTab === "Leads"}
                                        onClick={() => handleTabChange("Leads")}
                                    >
                                        Leads
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <NavButton
                            active={activeTab === "Mensagens"}
                            onClick={() => handleTabChange("Mensagens")}
                            icon={<span className="text-sm">📳</span>}
                        >
                            WhatsApp
                        </NavButton>
                    </nav>

                    {/* Perfil */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/10 transition-colors"
                        >
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                    {adminInfo?.fullName?.charAt(0) || "A"}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-emerald-100">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-800">
                                        {adminInfo?.fullName || "Admin"}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {adminInfo?.email || ""}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveTab("Profile");
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50"
                                >
                                    <User className="h-4 w-4 mr-2 text-emerald-600" />
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
