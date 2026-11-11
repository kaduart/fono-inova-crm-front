import ThemeToggle from '../common/ThemeToggle';
import NovidadesCenter from '../novidades/NovidadesCenter';
import {
    Activity,
    ChevronDown,
    ClipboardList,
    CalendarDays,
    DollarSign,
    Eye,
    Gauge,
    Home,
    LogOut,
    MessageCircle,
    Search,
    Stethoscope,
    User,
    Users,
    Wallet,
    ShieldCheck,
} from "lucide-react";
import { SECTION_MENU, sectionOfTab } from "../../pages/Financial/financialSections";
import React, { useEffect, useRef, useState } from "react";
import { BsSoundwave } from "react-icons/bs";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useOperationalCounts } from "../../hooks/useOperationalCounts";
import { useRetentionAlert } from "../../hooks/useRetentionAlert";
import HeaderNavButton, { HeaderBrand, HeaderCount, HEADER_ICON_BUTTON_CLASS, HEADER_SHELL_CLASS } from "../ui/HeaderNavButton";
import NavDropdownItem from "../ui/NavDropdownItem";
import CommandPalette, { useCommandPaletteHotkey, type CommandItem } from "../ui/CommandPalette";
import { NotificationBellFixed } from "../notifications/NotificationBellFixed";
import { WhatsAppNotificationButton } from "../notifications/WhatsAppNotificationButton";
import { useBirthdayAlert } from "../../hooks/useBirthdayAlert";
import MobileTabBar, { type MobileQuickActions } from "./MobileTabBar";

interface AdminHeaderProps {
    activeTab: string;
    openMenu: string;
    adminInfo: any;
    handleTabChange: (tab: string) => void;
    toggleMenu: (menuName: string) => void;
    setActiveTab: (tab: string) => void;
    onLogout?: () => void;
    /** Ações do botão + no celular (ver MobileTabBar). */
    quickActions?: MobileQuickActions;
}

// Item do menu "Mais" no celular (mock aprovado 11/11): fundo claro, ícone numa cor só,
// verde só no item ativo. Altura mínima de 48px para o dedo.
const MobileNavItem = ({
    active,
    onClick,
    icon,
    children,
    badge,
    hint,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: React.ReactNode;
    hint?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-12 w-full items-center gap-3 border-t border-gray-100 px-4 text-left text-[15px] transition-colors first:border-t-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-gray-800 ${active
            ? 'bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/60'}`}
    >
        <span aria-hidden className={`shrink-0 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>{icon}</span>
        <span className="min-w-0 flex-1">
            <span className="block truncate">{children}</span>
            {hint && <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">{hint}</span>}
        </span>
        {badge}
    </button>
);

// Grupo do menu "Mais" que abre e fecha; mostra quantos itens tem quando fechado.
const MobileNavGroup = ({ title, open, onToggle, count, children }: { title: string; open: boolean; onToggle: () => void; count: number; children: React.ReactNode }) => (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
        <button type="button" onClick={onToggle} aria-expanded={open}
            className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-xs font-bold uppercase tracking-wide text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-gray-400">
            <span className="flex-1">{title}</span>
            {!open && <span className="text-xs font-medium normal-case tracking-normal">{count} {count === 1 ? 'item' : 'itens'}</span>}
            <ChevronDown size={18} aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </section>
);

const AdminHeader: React.FC<AdminHeaderProps> = ({
    activeTab,
    openMenu,
    adminInfo,
    handleTabChange,
    toggleMenu,
    setActiveTab,
    onLogout,
    quickActions,
}) => {
    const navigate = useNavigate();
    const { logout: authLogout, user: authUser } = useAuth();
    // Secretárias é só do admin (o back responde 403 para os outros perfis).
    const isAdmin = authUser?.role === 'admin';
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const opCounts       = useOperationalCounts();
    const retentionAlert = useRetentionAlert();
    const birthdayPending = useBirthdayAlert();
    // Grupos do menu "Mais" no celular: abre o grupo da tela atual; Sistema começa fechado.
    const [mobileGroups, setMobileGroups] = useState<Record<string, boolean>>({ gestao: true, vendas: true, sistema: false });
    const toggleGroup = (k: string) => setMobileGroups(g => ({ ...g, [k]: !g[k] }));
    useEffect(() => { setIsMobileMenuOpen(false); }, [activeTab]);

    const [cmdkOpen, setCmdkOpen] = useState(false);
    const openCmdk = React.useCallback(() => setCmdkOpen(true), []);
    useCommandPaletteHotkey(openCmdk);
    const goFin = (id: string) => navigate(`/admin?tab=${SECTION_MENU[sectionOfTab(id)]}&financialTab=${id}`);
    const cmdItems: CommandItem[] = [
        { id: 'dash', group: 'Principal', label: 'Dashboard', hint: 'Precisa de você hoje, aniversariantes e pacientes', icon: <Home size={16} />, run: () => handleTabChange('Dashboard') },
        { id: 'agenda', group: 'Principal', label: 'Agenda', hint: 'Calendário e pré-agendamentos', icon: <CalendarDays size={16} />, keywords: 'calendario horario encaixe', badge: retentionAlert.loading ? 0 : retentionAlert.total, run: () => handleTabChange('Calendário') },
        { id: 'conversas', group: 'Principal', label: 'Conversas', hint: 'WhatsApp com as famílias', icon: <MessageCircle size={16} />, keywords: 'mensagens whatsapp chat', run: () => handleTabChange('Mensagens') },
        { id: 'leads', group: 'Vendas', label: 'Leads & Follow-up', hint: 'Fila operacional da secretária', icon: <Users size={16} />, keywords: 'retorno followup comercial', badge: opCounts.total, hot: opCounts.overdue > 0, run: () => handleTabChange('Leads') },
        { id: 'interesse', group: 'Vendas', label: 'Interesse em convênios', icon: <ClipboardList size={16} />, keywords: 'convenio plano lista espera', run: () => handleTabChange('InteresseConvenios') },
        { id: 'conversao', group: 'Marketing', label: 'Inteligência de Conversão', hint: 'Do contato ao agendamento, por canal', icon: <Gauge size={16} />, keywords: 'funil canal pixel', run: () => handleTabChange('Conversao') },
        { id: 'roi', group: 'Marketing', label: 'ROI & Atribuição', hint: 'Receita por campanha e origem', icon: <DollarSign size={16} />, keywords: 'campanha anuncio retorno', run: () => handleTabChange('ROI') },
        { id: 'social', group: 'Marketing', label: 'Social Media', hint: 'GMB, Instagram, Facebook, vídeos', icon: <Activity size={16} />, keywords: 'post instagram gmb', run: () => handleTabChange('SocialMedia') },
        { id: 'analytics', group: 'Marketing', label: 'Analytics do Site', hint: 'Métricas GA4 e conversões', icon: <Activity size={16} />, keywords: 'ga4 site landing', run: () => handleTabChange('Analytics') },
        { id: 'fin-caixa', group: 'Caixa', label: 'Caixa & Fluxo', icon: <DollarSign size={16} />, keywords: 'caixa dia fluxo', run: () => goFin('caixa-unificado') },
        { id: 'fin-pag', group: 'Caixa', label: 'Recebimentos', icon: <DollarSign size={16} />, keywords: 'cobrar receber pix', run: () => goFin('pagamentos') },
        { id: 'fin-conv', group: 'Convênios', label: 'Convênios', icon: <DollarSign size={16} />, keywords: 'guia faturamento convenio', run: () => goFin('convenios') },
        { id: 'fin-desp', group: 'Financeiro', label: 'Despesas', icon: <DollarSign size={16} />, run: () => goFin('despesas') },
        { id: 'fin-nfse', group: 'Financeiro', label: 'NFSe', icon: <DollarSign size={16} />, keywords: 'nota fiscal', run: () => goFin('nfse') },
        { id: 'fin-ind', group: 'Financeiro', label: 'Resultados', icon: <DollarSign size={16} />, keywords: 'kpi producao indicadores', run: () => goFin('dashboard') },
        { id: 'fin-painel', group: 'Financeiro', label: 'Painel completo', hint: 'Metas do mês, insights, ranking e projeção', icon: <DollarSign size={16} />, keywords: 'analytics metas mes ritmo ranking insights projecao cenarios decisao', run: () => navigate('/admin?tab=Financeiro&financialTab=dashboard&resultados=painel') },
        { id: 'fin-metas-mes', group: 'Financeiro', label: 'Metas do mês', hint: 'Ritmo e gap diário', icon: <DollarSign size={16} />, keywords: 'meta ritmo gap', run: () => navigate('/admin?tab=Financeiro&financialTab=dashboard&resultados=painel&dashboardTab=metas') },
        { id: 'fin-intel', group: 'Financeiro', label: 'Inteligência Financeira', hint: 'Vamos bater a meta? Régua, cenários e avisos', icon: <DollarSign size={16} />, keywords: 'analytics provisionamento inteligencia financeira meta cenario', run: () => navigate('/admin?tab=Financeiro&financialTab=dashboard&resultados=inteligencia') },
        { id: 'fin-proj', group: 'Financeiro', label: 'Projeção Mensal', hint: 'Projeção do mês por semana', icon: <DollarSign size={16} />, keywords: 'projecao previsao mes', run: () => navigate('/admin?tab=Financeiro&financialTab=dashboard&resultados=projecao') },
        { id: 'fin-prof', group: 'Financeiro', label: 'Repasse', icon: <DollarSign size={16} />, keywords: 'comissao profissionais', run: () => goFin('profissionais') },
        { id: 'fin-metas', group: 'Financeiro', label: 'Metas do ano', icon: <DollarSign size={16} />, keywords: 'planejamento meta', run: () => goFin('planejamento') },
        { id: 'g-prof', group: 'Gestão', label: 'Profissionais', hint: 'Gerencie equipe', icon: <Stethoscope size={16} />, keywords: 'terapeuta doutor', run: () => handleTabChange('Add Profissional') },
        { id: 'g-pac', group: 'Gestão', label: 'Pacientes', hint: 'Cadastro e histórico', icon: <Users size={16} />, keywords: 'paciente cadastro', run: () => handleTabChange('Add Paciente') },
        ...(isAdmin ? [{ id: 'g-sec', group: 'Gestão', label: 'Secretárias', hint: 'Cadastro e acesso', icon: <User size={16} />, run: () => handleTabChange('Add Secretária') }] : []),
        { id: 'sis', group: 'Sistema', label: 'Sistema', hint: 'Observabilidade, eventos e health', icon: <Activity size={16} />, run: () => handleTabChange('Sistema') },
        { id: 'amanda', group: 'Sistema', label: 'Amanda AI', icon: <Activity size={16} />, run: () => handleTabChange('AmandaMetrics') },
        { id: 'wpp', group: 'Sistema', label: 'WhatsApp Conexão', hint: 'QR code, status e reconexão', icon: <MessageCircle size={16} />, run: () => handleTabChange('WhatsApp') },
    ];

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
        activeTab === "Leads" || activeTab === "InteresseConvenios" || activeTab === "Analytics" || activeTab === "SocialMedia" || activeTab === "ROI" || activeTab === "Conversao";
    
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
        <header className={HEADER_SHELL_CLASS}>
            <div className="mx-auto max-w-[1600px] px-4 py-2.5 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    {/* Logo e nome da clínica */}
                    <NavLink
                        to="/admin"
                        className="flex items-center rounded-xl pr-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 min-[1400px]:border-r min-[1400px]:border-white/15"
                        onClick={() => handleTabChange("Dashboard")}
                        aria-label="Fono Inova, ir para o Dashboard"
                    >
                        <HeaderBrand subtitle="Gestão Clínica" />
                    </NavLink>

                    {/* Navegação desktop */}
                    <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="Menu principal">
                        {/* (mesmo conteúdo, mantido) */}
                        <div className="relative" ref={gestaoRef}>
                            <HeaderNavButton
                                active={activeTab === "Add Profissional" || activeTab === "Add Paciente" || activeTab === "Add Secretária"}
                                onClick={() => toggleMenu("gestao")}
                                hasChevron
                                open={openMenu === "gestao"}
                                icon={<Users />}
                            >
                                Gestão
                            </HeaderNavButton>
                            {openMenu === "gestao" && (
                                <div className="absolute z-10 mt-2 w-56 rounded-xl shadow-xl bg-white border border-gray-200 py-2 dark:border-white/10 dark:bg-[#161d1b]">
                                    <NavDropdownItem
                                        active={activeTab === "Add Profissional"}
                                        onClick={() => handleTabChange("Add Profissional")}
                                        icon={<Stethoscope className="h-4 w-4 text-purple-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Profissionais</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Gerencie equipe</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Add Paciente"}
                                        onClick={() => handleTabChange("Add Paciente")}
                                        icon={<Users className="h-4 w-4 text-blue-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Pacientes</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Cadastro e histórico</span>
                                        </div>
                                    </NavDropdownItem>
                                    {isAdmin && (
                                    <NavDropdownItem
                                        active={activeTab === "Add Secretária"}
                                        onClick={() => handleTabChange("Add Secretária")}
                                        icon={<User className="h-4 w-4 text-emerald-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Secretárias</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Cadastro e acesso</span>
                                        </div>
                                    </NavDropdownItem>
                                    )}
                                </div>
                            )}
                        </div>

                        <HeaderNavButton
                            active={activeTab === "Calendário"}
                            onClick={() => handleTabChange("Calendário")}
                            icon={<CalendarDays />}
                            badge={!retentionAlert.loading && retentionAlert.total > 0
                                ? <HeaderCount value={retentionAlert.total} active={activeTab === "Calendário"} label={`${retentionAlert.total} alertas de acompanhamento`} />
                                : undefined}
                        >
                            Agenda
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "Caixa"}
                            onClick={() => handleTabChange("Caixa")}
                            icon={<Wallet />}
                        >
                            Caixa
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "Convenios"}
                            onClick={() => handleTabChange("Convenios")}
                            icon={<ShieldCheck />}
                        >
                            Convênios
                        </HeaderNavButton>

                        <HeaderNavButton
                            active={activeTab === "Financeiro"}
                            onClick={() => handleTabChange("Financeiro")}
                            icon={<DollarSign />}
                        >
                            Financeiro
                        </HeaderNavButton>

                        <div className="relative" ref={vendasRef}>
                            <HeaderNavButton
                                active={isVendasMarketingActive}
                                onClick={() => toggleMenu("vendas-marketing")}
                                icon={<Activity />}
                                hasChevron
                                open={openMenu === "vendas-marketing"}
                                badge={opCounts.total > 0 ? <HeaderCount value={opCounts.total} hot label={`${opCounts.total} leads pedindo ação`} /> : undefined}
                            >
                                Vendas & Marketing
                            </HeaderNavButton>
                            {openMenu === "vendas-marketing" && (
                                <div className="absolute z-10 mt-2 w-64 rounded-xl shadow-xl bg-white border border-gray-200 py-2 dark:border-white/10 dark:bg-[#161d1b]">
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
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Leads & Follow-up</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Fila operacional da secretária</span>
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
                                    <NavDropdownItem
                                        active={activeTab === "InteresseConvenios"}
                                        onClick={() => handleTabChange("InteresseConvenios")}
                                        icon={<ClipboardList className="h-4 w-4 text-emerald-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Interesse em Convênios</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">GEAP, IPASGO e Bradesco em credenciamento</span>
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
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Social Media</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">GMB, Instagram, Facebook, Vídeos</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Analytics"}
                                        onClick={() => handleTabChange("Analytics")}
                                        icon={<Activity className="h-4 w-4 text-indigo-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Analytics do Site</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Métricas GA4 e conversões</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "ROI"}
                                        onClick={() => handleTabChange("ROI")}
                                        icon={<DollarSign className="h-4 w-4 text-green-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">ROI & Atribuição</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Receita por campanha e origem</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "Conversao"}
                                        onClick={() => handleTabChange("Conversao")}
                                        icon={<Gauge className="h-4 w-4 text-teal-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Inteligência de Conversão</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Funil: conversa → agendamento por origem</span>
                                        </div>
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>

                        <WhatsAppNotificationButton
                            onClick={() => handleTabChange("Mensagens")}
                            label="Conversas"
                            active={activeTab === "Mensagens"}
                        />

                        {/* Menu Sistema/Dev */}
                        <div className="relative" ref={sistemaRef}>
                            <HeaderNavButton
                                active={isSistemaActive}
                                onClick={() => toggleMenu("sistema")}
                                icon={<Gauge />}
                                hasChevron
                                open={openMenu === "sistema"}
                            >
                                Sistema
                            </HeaderNavButton>
                            {openMenu === "sistema" && (
                                <div className="absolute z-10 mt-2 w-56 rounded-xl shadow-xl bg-white border border-gray-200 py-2 dark:border-white/10 dark:bg-[#161d1b]">
                                    <NavDropdownItem
                                        active={activeTab === "Sistema"}
                                        onClick={() => handleTabChange("Sistema")}
                                        icon={<Activity className="h-4 w-4 text-orange-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Sistema</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Observabilidade, eventos e health</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "AmandaMetrics"}
                                        onClick={() => handleTabChange("AmandaMetrics")}
                                        icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Amanda AI</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Decisões RULE / HYBRID / AI</span>
                                        </div>
                                    </NavDropdownItem>
                                    <NavDropdownItem
                                        active={activeTab === "WhatsApp"}
                                        onClick={() => handleTabChange("WhatsApp")}
                                        icon={<MessageCircle className="h-4 w-4 text-green-600" />}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">WhatsApp Conexão</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">QR code, status e reconexão</span>
                                        </div>
                                    </NavDropdownItem>
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* 🔔 Notificações + Perfil + Hamburguer */}
                    <div className="flex shrink-0 items-center gap-1.5">
                        <button type="button" onClick={openCmdk} aria-label="Ir para uma tela (Ctrl + K)" title="Ir para… (Ctrl + K)"
                            className={`${HEADER_ICON_BUTTON_CLASS} xl:w-auto xl:gap-2 xl:px-3`}>
                            <Search size={18} />
                            <span className="sr-only">Ir para…</span>
                            <kbd className="hidden rounded border border-white/25 px-1 text-[10px] font-sans text-white/80 xl:inline">Ctrl K</kbd>
                        </button>
                        <NotificationBellFixed />
                        <NovidadesCenter area="admin" activeTab={activeTab} />
                        <ThemeToggle className="!h-10 !w-10 !rounded-[11px] border border-white/15 !bg-white/[0.08] hover:!bg-white/15" />


                        {/* Perfil - desktop */}
                        <div className="relative hidden lg:block" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                aria-label={`Menu de perfil — logado como ${adminInfo?.fullName || "Administrador"}`}
                                aria-haspopup="true"
                                aria-expanded={isProfileDropdownOpen}
                                className="ml-1 flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.08] py-1 pl-3 pr-1.5 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-sm font-medium leading-tight">
                                        {adminInfo?.fullName?.split(' ')[0] || "Admin"}
                                    </span>
                                    <span className="text-[11px] leading-tight text-white/70">
                                        {adminInfo?.role === 'admin' || !adminInfo?.role ? "Administrador" : adminInfo.role}
                                    </span>
                                </div>
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-amber-200 to-amber-400 text-amber-950">
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

                {/* Menu "Mais" no celular (mock aprovado 11/11): grupos que abrem e fecham, ícones numa
                    cor só, sem e-mail na tela. Abre pela barra de baixo (MobileTabBar). */}
                {isMobileMenuOpen && (
                    <div className="absolute inset-x-0 top-full h-[calc(100dvh-100%)] overflow-y-auto bg-gray-100 px-3 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3 text-left text-gray-900 lg:hidden dark:bg-gray-950 dark:text-gray-100">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-sm font-bold text-amber-950">{adminInfo?.fullName?.charAt(0) || 'A'}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-bold">{adminInfo?.fullName?.split(' ')[0] || 'Admin'}</span>
                                    <span className="block text-xs text-gray-600 dark:text-gray-400">{adminInfo?.role === 'admin' || !adminInfo?.role ? 'Administrador' : adminInfo.role}</span>
                                </span>
                                <button type="button" onClick={() => { setActiveTab('Profile'); setIsMobileMenuOpen(false); }}
                                    className="min-h-11 rounded-xl px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">Meu perfil</button>
                            </div>

                            <MobileNavGroup title="Gestão e financeiro" open={mobileGroups.gestao} onToggle={() => toggleGroup('gestao')} count={isAdmin ? 5 : 4}>
                                <MobileNavItem active={activeTab === "Add Profissional"} onClick={() => handleMobileTabChange("Add Profissional")} icon={<Stethoscope size={20} />}>Profissionais</MobileNavItem>
                                {isAdmin && <MobileNavItem active={activeTab === "Add Secretária"} onClick={() => handleMobileTabChange("Add Secretária")} icon={<User size={20} />}>Secretárias</MobileNavItem>}
                                <MobileNavItem active={activeTab === "Convenios"} onClick={() => handleMobileTabChange("Convenios")} icon={<ShieldCheck size={20} />}>Convênios</MobileNavItem>
                                <MobileNavItem active={activeTab === "Financeiro"} onClick={() => handleMobileTabChange("Financeiro")} icon={<DollarSign size={20} />} hint="Despesas, NFSe, resultados, repasse e metas">Financeiro</MobileNavItem>
                                <MobileNavItem active={activeTab === "Mensagens"} onClick={() => handleMobileTabChange("Mensagens")} icon={<MessageCircle size={20} />} hint="Conversas com as famílias">WhatsApp</MobileNavItem>
                            </MobileNavGroup>

                            <MobileNavGroup title="Vendas e marketing" open={mobileGroups.vendas} onToggle={() => toggleGroup('vendas')} count={6}>
                                <MobileNavItem
                                    active={activeTab === "Leads"}
                                    onClick={() => handleMobileTabChange("Leads")}
                                    icon={<Users size={20} />}
                                    badge={opCounts.total > 0 && (
                                        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{opCounts.total}</span>
                                    )}
                                >
                                    Leads e follow-up
                                </MobileNavItem>
                                <MobileNavItem active={activeTab === "InteresseConvenios"} onClick={() => handleMobileTabChange("InteresseConvenios")} icon={<ClipboardList size={20} />}>Interesse em convênios</MobileNavItem>
                                <MobileNavItem active={activeTab === "Conversao"} onClick={() => handleMobileTabChange("Conversao")} icon={<Gauge size={20} />}>Inteligência de conversão</MobileNavItem>
                                <MobileNavItem active={activeTab === "ROI"} onClick={() => handleMobileTabChange("ROI")} icon={<DollarSign size={20} />}>ROI e atribuição</MobileNavItem>
                                <MobileNavItem active={activeTab === "Analytics"} onClick={() => handleMobileTabChange("Analytics")} icon={<Activity size={20} />}>Analytics do site</MobileNavItem>
                                <MobileNavItem active={activeTab === "SocialMedia"} onClick={() => handleMobileTabChange("SocialMedia")} icon={<Activity size={20} />}>Social media</MobileNavItem>
                            </MobileNavGroup>

                            <MobileNavGroup title="Sistema" open={mobileGroups.sistema || isSistemaActive} onToggle={() => toggleGroup('sistema')} count={3}>
                                <MobileNavItem active={activeTab === "Sistema"} onClick={() => handleMobileTabChange("Sistema")} icon={<Activity size={20} />} hint="Observabilidade, eventos e health">Sistema</MobileNavItem>
                                <MobileNavItem active={activeTab === "AmandaMetrics"} onClick={() => handleMobileTabChange("AmandaMetrics")} icon={<MessageCircle size={20} />}>Amanda AI</MobileNavItem>
                                <MobileNavItem active={activeTab === "WhatsApp"} onClick={() => handleMobileTabChange("WhatsApp")} icon={<MessageCircle size={20} />} hint="QR code, status e reconexão">WhatsApp conexão</MobileNavItem>
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
                activeTab={activeTab}
                moreOpen={isMobileMenuOpen}
                onTab={(tab) => { setIsMobileMenuOpen(false); handleTabChange(tab); }}
                onToggleMore={() => setIsMobileMenuOpen(v => !v)}
                birthdayPending={birthdayPending}
                leadsCount={opCounts.total}
                onSchedule={quickActions?.onSchedule}
                onNewPatient={quickActions?.onNewPatient}
                onPayment={quickActions?.onPayment}
                onLeads={quickActions?.onLeads ?? (() => handleTabChange('Leads'))}
            />
        <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} items={cmdItems} />
            </header>
    );
};

export default AdminHeader;
