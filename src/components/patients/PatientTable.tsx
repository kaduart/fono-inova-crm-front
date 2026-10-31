import { ChevronDown, ChevronUp, Edit, Eye, MoreHorizontal, Search, User, X } from "lucide-react";
import { openWhatsApp, reactivationMessage, renewalMessage } from "../commercial/commercialCopy";
import { getSpecialtyLabel } from "../../constants/specialties";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from "react-router-dom";
import patientService from '../../services/patientService';
import { PatientDTO, mapPatientListResponseDTO } from '../../dtos/patient.response.dto';
import { Pagination } from '../common/Pagination';

// ============================================================================
// Tipos e interfaces
// ============================================================================

interface PatientTableProps {
    patients?: PatientDTO[];
    onEditPatient?: (patient: PatientDTO) => void;
    onDeletePatient?: (patient: PatientDTO) => void;
    onPaymentAdvancedSuccess?: (patient: PatientDTO) => void;
    onRegisterPayment?: (patient: PatientDTO) => void;
    isRefreshing?: boolean;
    /** Total de pacientes cadastrados (o título mostra "X de Y"). */
    totalCount?: number;
    /** Quantos estão sem próxima sessão (fila comercial) e como abrir a fila. */
    noNextCount?: number;
    onOpenNoNext?: () => void;
}

// ============================================================================
// Componentes auxiliares (tipados)
// ============================================================================

// ============================================================================
// Utilitários
// ============================================================================

const formatDateBrazilian = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('pt-BR');
};

/** Normaliza string removendo acentos para busca */
const normalizeString = (str?: string | null): string => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

// ============================================================================
// Componente principal
// ============================================================================

const PatientTable: React.FC<PatientTableProps> = ({
    patients: initialPatients = [],
    onEditPatient,
    onDeletePatient,
    onPaymentAdvancedSuccess,
    onRegisterPayment,
    isRefreshing = false,
    totalCount,
    noNextCount,
    onOpenNoNext,
}) => {
    const [menuFor, setMenuFor] = useState<string | null>(null);
    useEffect(() => {
        if (!menuFor) return;
        const close = () => setMenuFor(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', onKey); };
    }, [menuFor]);
    // ------------------------------------------------------------
    // Hooks (sempre no topo)
    // ------------------------------------------------------------
    const [patients, setPatients] = useState<PatientDTO[]>(initialPatients);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [onlyWithDebt, setOnlyWithDebt] = useState(false);
    const [debtTotal, setDebtTotal] = useState<number | null>(null);
    const [debtTotalAmount, setDebtTotalAmount] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'ascending' | 'descending';
    }>({
        key: 'nextAppointment',
        direction: 'ascending',
    });
    // Guarda contra corrida: busca por nome (500ms debounce) e toggle de saldo
    // devedor (sem debounce) podem disparar 2 requisições que voltam fora de
    // ordem — a mais lenta (desatualizada) sobrescrevendo a mais recente.
    // Só aplica a resposta se ainda for a última requisição disparada.
    const requestSeqRef = useRef(0);

    // Sincroniza com props apenas quando não há busca/filtro ativo (evita sobrescrever)
    useEffect(() => {
        if (searchTerm === '' && !onlyWithDebt && initialPatients) {
            setPatients(initialPatients);
        }
    }, [initialPatients, searchTerm, onlyWithDebt]);

    // ------------------------------------------------------------
    // 🚀 V2: Busca na API quando o usuário digita algo OU ativa "Saldo devedor".
    // Os 5 pacientes vindos via prop (initialPatients) são só "os últimos mexidos" —
    // pra filtrar por débito (ou por nome) em TODA a base, precisa bater no backend,
    // igual a busca por nome já fazia. PatientsView já tem stats.totalPendingParticular
    // pré-calculado, então o filtro é feito no banco (query param hasDebt), não em memória.
    // ------------------------------------------------------------
    useEffect(() => {
        // Invalida qualquer requisição anterior ainda em voo (ex: usuário desligou
        // o filtro ou limpou a busca antes da resposta chegar) — incrementa sempre,
        // mesmo quando este efeito não vai disparar uma nova busca.
        const thisRequestId = ++requestSeqRef.current;
        if (!searchTerm.trim() && !onlyWithDebt) return;

        const isDebtRequest = onlyWithDebt;

        const fetchPatients = async () => {
            setIsSearching(true);
            try {
                const result = await patientService.list({
                    search: searchTerm.trim() || undefined,
                    hasDebt: isDebtRequest,
                    limit: 100
                });
                if (thisRequestId !== requestSeqRef.current) return; // resposta obsoleta — ignora
                const mapped = mapPatientListResponseDTO(result.patients);
                setPatients(mapped);
                setCurrentPage(1);
                if (isDebtRequest) {
                    setDebtTotal(result.pagination.total);
                    setDebtTotalAmount(mapped.reduce((sum, p) => sum + (p.debt ?? 0), 0));
                }
            } catch (error) {
                console.error('❌ Erro ao buscar pacientes:', error);
            } finally {
                if (thisRequestId === requestSeqRef.current) setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchPatients, searchTerm.trim() ? 500 : 0);
        return () => clearTimeout(timer);
    }, [searchTerm, onlyWithDebt]);

    // ------------------------------------------------------------
    // Memo
    // ------------------------------------------------------------
    const sortedPatients = useMemo(() => {
        if (!patients || patients.length === 0) return [];

        const sortablePatients = [...patients];

        sortablePatients.sort((a, b) => {
            const dateA = a.nextAppointment?.date
                ? new Date(a.nextAppointment.date).getTime()
                : Number.MAX_SAFE_INTEGER;

            const dateB = b.nextAppointment?.date
                ? new Date(b.nextAppointment.date).getTime()
                : Number.MAX_SAFE_INTEGER;

            if (sortConfig.direction === 'ascending') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });

        return sortablePatients;
    }, [patients, sortConfig]);

    // ------------------------------------------------------------
    // Paginação — `patients` já vem filtrado do backend (busca por nome e/ou
    // hasDebt), não há filtro local aqui.
    // ------------------------------------------------------------
    const filteredPatients = sortedPatients;

    // ------------------------------------------------------------
    // Flag para estado vazio (mas sem early return para manter a busca visível)
    // ------------------------------------------------------------
    const isEmpty = filteredPatients.length === 0;

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPatients = filteredPatients.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    const sortData = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const toggleRow = (patientId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [patientId]: !prev[patientId],
        }));
    };

    // ------------------------------------------------------------
    // Renderização (mock aprovado em 30/10: https://claude.ai/artifact/MoYkuNDdaGko6QwwWTTqBS)
    // Terapia e próxima sessão numa coluna; ver/editar à mostra, o resto no "…";
    // devedor marcado só no selo do saldo. Nenhuma informação da versão anterior saiu.
    // ------------------------------------------------------------
    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const shownTotal = onlyWithDebt && debtTotal !== null ? debtTotal : filteredPatients.length;
    const chipCls = (active: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${active
        ? 'border-red-300 bg-red-50 font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`;

    return (
        <div className="relative text-left">
            {/* Overlay suave de refresh — NÃO desmonta a tabela, preserva filtro */}
            {isRefreshing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] dark:bg-gray-900/60">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
                </div>
            )}

            {/* Busca + filtros */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                    <input
                        type="search"
                        aria-label="Buscar paciente"
                        placeholder="Buscar por nome ou telefone"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                    {isSearching ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" /></div>
                    ) : searchTerm && (
                        <button type="button" aria-label="Limpar busca" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        aria-pressed={onlyWithDebt}
                        onClick={() => {
                            setOnlyWithDebt(prev => !prev);
                            if (onlyWithDebt) { setDebtTotal(null); setDebtTotalAmount(null); } // desligando: descarta resultado da última consulta
                            setCurrentPage(1);
                        }}
                        title="Busca na base toda só quem tem saldo devedor"
                        className={chipCls(onlyWithDebt)}
                    >
                        Saldo devedor
                        {onlyWithDebt && debtTotal !== null && <span className="ml-1 opacity-80">{debtTotal}</span>}
                        {onlyWithDebt && debtTotalAmount !== null && debtTotalAmount > 0 && (
                            // A soma é dos pacientes carregados (até 100); com mais devedores, o rótulo diz isso
                            // em vez de parecer o total da clínica (auditoria 31/10/2026, A3).
                            <span className="ml-1 font-bold">· {brl(debtTotalAmount)}{debtTotal !== null && debtTotal > patients.length ? ` nos ${patients.length} primeiros` : ''}</span>
                        )}
                    </button>
                    {onOpenNoNext && (noNextCount ?? 0) > 0 && (
                        <button type="button" onClick={onOpenNoNext} title="Abre a fila de quem foi atendido e não tem nada marcado"
                            className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                            Sem próxima sessão <span className="opacity-80">{noNextCount}</span>
                        </button>
                    )}
                </div>
            </div>

            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {isSearching ? 'Buscando…' : searchTerm || onlyWithDebt
                    ? `${shownTotal} ${shownTotal === 1 ? 'paciente encontrado' : 'pacientes encontrados'}`
                    : `${filteredPatients.length} mexidos por último${totalCount ? ` de ${totalCount.toLocaleString('pt-BR')} cadastrados` : ''} · busque para ver os outros`}
            </p>

            {isEmpty ? (
                <div className="py-10 text-center">
                    <User className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden />
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Nenhum paciente encontrado</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {onlyWithDebt ? 'Ninguém com saldo devedor agora.' : searchTerm ? 'Tente outro nome ou telefone.' : 'Carregando os pacientes…'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                    <th className="px-3 py-2">Paciente</th>
                                    <th className="px-3 py-2">
                                        <button type="button" onClick={() => sortData('nextAppointment')} className="inline-flex items-center gap-1 uppercase hover:text-gray-700">
                                            Terapia · próxima sessão {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                        </button>
                                    </th>
                                    <th className="px-3 py-2">Saldo</th>
                                    <th className="px-3 py-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPatients.map((patient, rowIndex) => {
                                    const pid = patient.patientId || patient.id;
                                    const isExpanded = expandedRows[patient.id];
                                    const p: any = patient;
                                    const planName = patient.healthPlan?.name;
                                    const isConvenio = (planName && planName.toLowerCase() !== 'particular') || patient.tags?.includes('convenio');
                                    const activePackages: any[] = (patient.packages || []).filter((x: any) => x.status === 'active');
                                    const pkg = activePackages[0];
                                    const pkgLeft = pkg ? (pkg.sessionsRemaining ?? Math.max(0, (pkg.totalSessions || 0) - (pkg.sessionsDone || 0))) : null;
                                    const nextDate = patient.nextAppointment?.date || patient.nextAppointmentDate;
                                    const lastDate = p.lastAppointment?.date || patient.lastAppointmentDate || p.raw?.lastAppointment?.date;
                                    const specialty = pkg?.sessionType || p.raw?.specialty || p.nextAppointment?.specialty || p.nextAppointment?.sessionType || p.lastAppointment?.specialty || p.lastAppointment?.sessionType || patient.lastAppointment?.doctor?.specialty;
                                    const doctor = patient.doctorName || patient.nextAppointment?.doctor?.name || patient.lastAppointment?.doctor?.name;
                                    const saldo = patient.debt ?? 0;
                                    const convenioPending = (patient.totalPending ?? 0) - (patient.totalPendingParticular ?? 0);
                                    // Nas últimas linhas o menu abre para cima, senão a rolagem da tabela o corta
                                    const menuUp = paginatedPatients.length > 2 && rowIndex >= paginatedPatients.length - 2;
                                    const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000) : null;
                                    return (
                                        <React.Fragment key={patient.id}>
                                            <tr onClick={() => toggleRow(patient.id)} className="cursor-pointer border-b border-gray-100 align-middle hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                                                {/* Paciente */}
                                                <td className="px-3 py-2.5">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                            {patient.fullName?.charAt(0).toUpperCase()}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="flex items-center gap-1.5 truncate font-semibold text-gray-900 dark:text-gray-50">
                                                                {patient.fullName || '-'}
                                                                {patient.tags?.includes('vip') && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">VIP</span>}
                                                            </p>
                                                            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                <span className="tabular-nums">{patient.phone || 'sem telefone'}</span>
                                                                <span aria-hidden>·</span>
                                                                <span className={`rounded-full px-1.5 text-[11px] font-semibold ${isConvenio ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'}`}>
                                                                    {isConvenio ? (planName && planName.toLowerCase() !== 'particular' ? planName : 'Convênio') : 'Particular'}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Terapia · próxima sessão */}
                                                <td className="px-3 py-2.5">
                                                    <p className="truncate text-gray-800 dark:text-gray-200">
                                                        {specialty ? (/^[a-z_]+$/.test(specialty) ? getSpecialtyLabel(specialty) : specialty) : <span className="text-gray-400">Terapia não definida</span>}
                                                        {doctor && <span className="text-gray-500 dark:text-gray-400"> · {doctor}</span>}
                                                    </p>
                                                    {pkg && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            Pacote {pkg.sessionsDone}/{pkg.totalSessions}{activePackages.length > 1 ? ` · +${activePackages.length - 1}` : ''}
                                                            {pkgLeft !== null && pkgLeft <= 2 && (
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); openWhatsApp(patient.phone, renewalMessage({ name: patient.fullName, specialty: pkg.sessionType, remaining: pkgLeft })); }}
                                                                    disabled={!patient.phone} title="WhatsApp com a mensagem de renovação"
                                                                    className="ml-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-500/10 dark:text-amber-300">
                                                                    {pkgLeft === 0 ? 'acabou' : pkgLeft === 1 ? '1 restante' : '2 restantes'} · renovar
                                                                </button>
                                                            )}
                                                        </p>
                                                    )}
                                                    {nextDate ? (
                                                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                                            Próxima: {new Date(nextDate).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')}
                                                            {lastDate && <span className="font-normal text-gray-500 dark:text-gray-400"> · última {formatDateBrazilian(lastDate)}</span>}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                                            Sem próxima sessão{daysSinceLast !== null ? ` · última há ${daysSinceLast} ${daysSinceLast === 1 ? 'dia' : 'dias'}` : ''}
                                                            {daysSinceLast !== null && patient.phone && (
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); openWhatsApp(patient.phone, reactivationMessage({ name: patient.fullName, specialty })); }}
                                                                    title="WhatsApp com convite para voltar" className="ml-1.5 font-semibold underline-offset-2 hover:underline">
                                                                    chamar
                                                                </button>
                                                            )}
                                                        </p>
                                                    )}
                                                </td>
                                                {/* Saldo */}
                                                <td className="px-3 py-2.5 tabular-nums">
                                                    {saldo > 0 ? (
                                                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">deve {brl(saldo)}</span>
                                                    ) : saldo < 0 ? (
                                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">crédito {brl(Math.abs(saldo))}</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">{brl(0)}</span>
                                                    )}
                                                    {convenioPending > 0.01 && <p className="mt-0.5 text-[11px] text-blue-600 dark:text-blue-400">+{brl(convenioPending)} conv.</p>}
                                                </td>
                                                {/* Ações */}
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link to={`/patient-dashboard/${pid}`} title="Ver paciente" aria-label="Ver paciente" onClick={(e) => e.stopPropagation()}
                                                            className="grid h-8 w-8 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                        <button type="button" title="Editar" aria-label="Editar" onClick={(e) => { e.stopPropagation(); onEditPatient?.(patient); }}
                                                            className="grid h-8 w-8 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <span className="relative">
                                                            <button type="button" aria-label="Mais ações" aria-haspopup="menu" aria-expanded={menuFor === patient.id}
                                                                onClick={(e) => { e.stopPropagation(); setMenuFor(m => (m === patient.id ? null : patient.id)); }}
                                                                className="grid h-8 w-8 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                            {menuFor === patient.id && (
                                                                <div role="menu" onClick={(e) => e.stopPropagation()}
                                                                    className={`absolute right-0 z-20 min-w-[190px] ${menuUp ? 'bottom-9' : 'top-9'} rounded-lg border border-gray-200 bg-white p-1 text-left shadow-lg dark:border-gray-700 dark:bg-gray-900`}>
                                                                    {patient.phone && (
                                                                        <button type="button" role="menuitem" onClick={() => { setMenuFor(null); openWhatsApp(patient.phone); }}
                                                                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800">Abrir WhatsApp</button>
                                                                    )}
                                                                    <Link role="menuitem" to={`/patient-dashboard/${pid}?tab=evolucoes`} onClick={() => setMenuFor(null)}
                                                                        className="block rounded-md px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800">Ver evoluções</Link>
                                                                    {onRegisterPayment && (
                                                                        <button type="button" role="menuitem" onClick={() => { setMenuFor(null); onRegisterPayment(patient); }}
                                                                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800">Registrar pagamento</button>
                                                                    )}
                                                                    {onDeletePatient && (
                                                                        <button type="button" role="menuitem" onClick={() => { setMenuFor(null); onDeletePatient(patient); }}
                                                                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">Excluir paciente</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </span>
                                                        <span className="grid h-8 w-6 place-items-center text-gray-400" aria-hidden>
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Detalhes da linha */}
                                            {isExpanded && (
                                                <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
                                                    <td colSpan={4} className="px-3 py-3">
                                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                            {[
                                                                { label: 'Atendidos', value: patient.totalCompleted ?? 0 },
                                                                { label: 'Cancelamentos', value: patient.totalCanceled ?? 0 },
                                                                { label: 'Receita total', value: brl(patient.totalRevenue ?? 0) },
                                                                { label: 'Pendente', value: (patient.totalPendingNet ?? patient.totalPending) > 0 ? brl(patient.totalPendingNet ?? patient.totalPending) : '—' },
                                                            ].map(s => (
                                                                <div key={s.label} className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                                                                    <p className="font-bold text-gray-900 dark:text-gray-50">{s.value}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row dark:border-gray-800">
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>Mostrando {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredPatients.length)} de {filteredPatients.length}</span>
                            <label className="flex items-center gap-2">
                                <span>Exibir</span>
                                <select value={itemsPerPage} onChange={handleItemsPerPageChange}
                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                </select>
                            </label>
                        </div>
                        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accentClassName="bg-gray-800" />
                    </div>
                </>
            )}
        </div>
    );
};

export default PatientTable;
