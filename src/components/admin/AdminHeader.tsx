// src/components/layout/AdminHeader.tsx - VERSÃO OTIMIZADA
import {
    Activity,
    Bell,
    ChevronDown,
    Clock,
    DollarSign,
    Home,
    LogOut,
    MessageCircle,
    Settings,
    Stethoscope,
    User,
    Users
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { BsSoundwave } from "react-icons/bs";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// Componentes UI
import NavButton from "../ui/NavButton";
import NavDropdownItem from "../ui/NavDropdownItem";

interface AdminHeaderProps {
    adminInfo: any;
    onLogout?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ adminInfo, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout: authLogout } = useAuth();

    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // 🎯 Fechar menus ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 🎯 Navegação baseada em rotas
    const navigation = [
        {
            name: "Dashboard",
            path: "/admin",
            icon: Home,
            color: "text-blue-500"
        },
        {
            name: "Gestão",
            icon: Users,
            color: "text-purple-500",
            submenu: [
                {
                    name: "Profissionais",
                    path: "/admin/profissionais",
                    icon: Stethoscope,
                    description: "Gerencie equipe"
                },
                {
                    name: "Pacientes",
                    path: "/admin/pacientes",
                    icon: Users,
                    description: "Cadastro e histórico"
                }
            ]
        },
        {
            name: "Agenda",
            path: "/admin/agenda",
            icon: Clock,
            color: "text-amber-500"
        },
        {
            name: "Financeiro",
            path: "/admin/financeiro",
            icon: DollarSign,
            color: "text-green-500"
        },
        {
            name: "Marketing",
            icon: Activity,
            color: "text-cyan-500",
            submenu: [
                {
                    name: "Leads",
                    path: "/admin/leads",
                    icon: Activity,
                    description: "Potenciais pacientes"
                },
                {
                    name: "Campanhas",
                    path: "/admin/campanhas",
                    icon: TrendingUp,
                    description: "Marketing digital"
                }
            ]
        },
        {
            name: "WhatsApp",
            path: "/admin/whatsapp",
            icon: MessageCircle,
            color: "text-emerald-500"
        }
    ];

    const handleLogout = async () => {
        try {
            await authLogout();
            localStorage.removeItem("token");
            localStorage.removeItem("userData");

            onLogout?.();
            navigate("/login");
        } catch (error) {
            console.error("Erro no logout:", error);
        }
    };

    const toggleMenu = (menuName: string) => {
        setOpenMenu(openMenu === menuName ? null : menuName);
    };

    const isActivePath = (path: string) => {
        return location.pathname === path;
    };

    return (
        <header className="bg-white shadow-lg border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* LOGO E NOME */}
                    <div className="flex items-center gap-3">
                        <NavLink
                            to="/admin"
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                <BsSoundwave className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-slate-800">
                                    Fono Inova
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                    Gestão Clínica Inteligente
                                </span>
                            </div>
                        </NavLink>
                    </div>

                    {/* NAVEGAÇÃO PRINCIPAL */}
                    <nav className="hidden lg:flex items-center space-x-1">
                        {navigation.map((item) => (
                            <div key={item.name} className="relative" ref={menuRef}>
                                {item.submenu ? (
                                    <>
                                        <NavButton
                                            active={item.submenu.some(sub => isActivePath(sub.path))}
                                            onClick={() => toggleMenu(item.name)}
                                            icon={<item.icon size={16} className={item.color} />}
                                            hasChevron
                                            className={
                                                item.submenu.some(sub => isActivePath(sub.path))
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                                            }
                                        >
                                            {item.name}
                                        </NavButton>

                                        {openMenu === item.name && (
                                            <div className="absolute z-50 mt-2 w-64 rounded-xl shadow-xl bg-white border border-slate-200 py-2 animate-in fade-in-0 zoom-in-95">
                                                {item.submenu.map((subItem) => (
                                                    <NavDropdownItem
                                                        key={subItem.name}
                                                        active={isActivePath(subItem.path)}
                                                        onClick={() => {
                                                            navigate(subItem.path);
                                                            setOpenMenu(null);
                                                        }}
                                                        icon={<subItem.icon className="h-4 w-4" />}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-800">
                                                                {subItem.name}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {subItem.description}
                                                            </span>
                                                        </div>
                                                    </NavDropdownItem>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <NavLink to={item.path!}>
                                        <NavButton
                                            active={isActivePath(item.path!)}
                                            icon={<item.icon size={16} className={item.color} />}
                                            className={
                                                isActivePath(item.path!)
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                                            }
                                        >
                                            {item.name}
                                        </NavButton>
                                    </NavLink>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* ÁREA DO USUÁRIO */}
                    <div className="flex items-center gap-3">
                        {/* NOTIFICAÇÕES */}
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                3
                            </span>
                        </button>

                        {/* PERFIL */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center space-x-3 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all duration-200 group border border-slate-200"
                            >
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-medium text-slate-800">
                                        {adminInfo?.fullName?.split(' ')[0] || "Admin"}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {adminInfo?.role || "Administrador"}
                                    </span>
                                </div>
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                    {adminInfo?.fullName?.charAt(0) || "A"}
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>

                            {isProfileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-3 z-50 border border-slate-200 animate-in fade-in-0 zoom-in-95">
                                    {/* Header do perfil */}
                                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-xl mb-2">
                                        <p className="text-sm font-semibold truncate">
                                            {adminInfo?.fullName || "Administrador"}
                                        </p>
                                        <p className="text-xs text-emerald-100 truncate mt-1">
                                            {adminInfo?.email || ""}
                                        </p>
                                    </div>

                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => {
                                                navigate("/admin/perfil");
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                                        >
                                            <User className="h-4 w-4 mr-3 text-emerald-600" />
                                            <span>Meu Perfil</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                navigate("/admin/configuracoes");
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors duration-150"
                                        >
                                            <Settings className="h-4 w-4 mr-3 text-slate-500" />
                                            <span>Configurações</span>
                                        </button>

                                        <div className="border-t border-slate-200 my-1"></div>

                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
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

export default AdminHeader;