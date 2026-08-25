import React, { useEffect, useState, useCallback } from 'react';
import { ExternalLink, Mail, Pencil, Phone, Power, Search, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import patientService from '../../services/patientService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = [
    { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300' },
    { bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-300' },
    { bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-300' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300' },
    { bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-cyan-300' },
    { bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-300' },
    { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-300' },
];

function getColor(name: string) {
    return COLORS[(name?.charCodeAt(0) || 65) % COLORS.length];
}

function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPhone(phone?: string) {
    if (!phone) return null;
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
}

function formatDate(iso?: string | null) {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
        return null;
    }
}

function resolveDate(field: any): string | null {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field.date) return field.date;
    return null;
}

// ─── STATUS ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
    active:   { label: 'Ativo',   dot: 'bg-emerald-500', text: 'text-emerald-600' },
    inactive: { label: 'Inativo', dot: 'bg-gray-400',    text: 'text-gray-400' },
    lead:     { label: 'Lead',    dot: 'bg-amber-500',   text: 'text-amber-600' },
};

// ─── PatientCard ──────────────────────────────────────────────────────────────

interface PatientCardProps {
    patient: any;
    onEdit: (p: any) => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onEdit }) => {
    const navigate = useNavigate();
    const name = patient.fullName || patient.name || '';
    const color = getColor(name);
    const initials = getInitials(name);
    const status = patient.status || 'active';
    const st = STATUS_CFG[status] || STATUS_CFG.active;
    const id = patient._id || patient.patientId;

    const nextDate = formatDate(resolveDate(patient.nextAppointment));
    const lastDate = formatDate(resolveDate(patient.lastAppointment));
    const phone = formatPhone(patient.phone);

    return (
        <div className="rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow flex flex-col">

            {/* Header — altura fixa 80px */}
            <div className="p-4 h-20 flex items-start gap-3 flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold border-2 ${color.bg} ${color.text} ${color.border}`}>
                    {initials}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate leading-tight" title={name}>
                        {name}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-2xs font-medium ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                    </span>
                </div>
            </div>

            {/* Linha de data — altura fixa 20px, sempre presente */}
            <div className="px-4 h-5 flex-shrink-0">
                {nextDate ? (
                    <p className="text-2xs text-gray-500 truncate">Próx: {nextDate}</p>
                ) : lastDate ? (
                    <p className="text-2xs text-gray-400 truncate">Última: {lastDate}</p>
                ) : (
                    <p className="text-2xs text-gray-300">Sem agendamento</p>
                )}
            </div>

            {/* Contato — altura fixa 52px */}
            <div className="px-4 pt-2 pb-1 h-[52px] flex-shrink-0 space-y-1 overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{phone ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 h-4">
                    {patient.email ? (
                        <>
                            <Mail size={11} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate" title={patient.email}>{patient.email}</span>
                        </>
                    ) : (
                        <span className="text-gray-300 text-2xs">Sem e-mail</span>
                    )}
                </div>
            </div>

            {/* Ações — sempre no fundo */}
            <div className="px-4 pt-2 pb-4 flex gap-2 mt-auto">
                <button
                    onClick={() => onEdit(patient)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                >
                    <Pencil size={11} />
                    Editar
                </button>
                <button
                    onClick={() => navigate(`/patients/${id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                >
                    <ExternalLink size={11} />
                    Detalhes
                </button>
            </div>
        </div>
    );
};

// ─── PatientList ──────────────────────────────────────────────────────────────

type TabType = 'active' | 'inactive' | 'lead';

interface PatientListProps {
    onEdit: (patient: any) => void;
    refreshSignal?: number;
}

const TABS: { key: TabType; label: string; Icon: React.ElementType }[] = [
    { key: 'active',   label: 'Ativos',   Icon: User },
    { key: 'inactive', label: 'Inativos', Icon: Power },
    { key: 'lead',     label: 'Leads',    Icon: Users },
];

const PatientList: React.FC<PatientListProps> = ({ onEdit, refreshSignal = 0 }) => {
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('active');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await patientService.list({ limit: 500 });
            setPatients(result.patients);
        } catch {
            toast.error('Erro ao carregar pacientes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load, refreshSignal]);

    const countByStatus = (s: string) =>
        patients.filter(p => (p.status || 'active') === s).length;

    const filtered = patients
        .filter(p => (p.status || 'active') === activeTab)
        .filter(p => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                (p.fullName || p.name || '').toLowerCase().includes(q) ||
                (p.phone || '').includes(q) ||
                (p.email || '').toLowerCase().includes(q) ||
                (p.cpf || '').includes(q)
            );
        });

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
                    {TABS.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                                activeTab === key
                                    ? 'bg-white text-emerald-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Icon size={15} />
                                {label}
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === key
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {countByStatus(key)}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Nome, telefone, CPF..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-64"
                    />
                </div>
            </div>

            {/* Conteúdo */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-12 text-center">
                    <User className="mx-auto text-gray-400 mb-4" size={40} />
                    <h3 className="text-lg font-medium text-gray-900">Nenhum paciente encontrado</h3>
                    <p className="text-gray-500 mt-1 text-sm">
                        {search.trim()
                            ? `Sem resultados para "${search}"`
                            : `Nenhum paciente ${activeTab === 'active' ? 'ativo' : activeTab === 'inactive' ? 'inativo' : 'lead'} cadastrado`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filtered.map(p => (
                        <PatientCard
                            key={p._id || p.patientId}
                            patient={p}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientList;
