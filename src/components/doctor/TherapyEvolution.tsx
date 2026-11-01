// src/components/doctor/TherapyEvolution.tsx
// Aba Evolução do Portal do Terapeuta. Ao abrir mostra a fila de quem está sem evolução
// (mesma regra do /v2/evolutions/pending usada no Dashboard) e os pacientes em atendimento;
// ao escolher um paciente mostra cabeçalho, plano terapêutico e a linha do tempo das sessões
// com o texto clínico visível, a variação de nota por área e o PDF de cada evolução.
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    ChevronDown,
    FileDown,
    GitBranch,
    Minus,
    MoreHorizontal,
    Plus,
    Search,
    Target,
    Trash2,
    TrendingDown,
    TrendingUp,
    UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../../utils/toast';
import { useAuth } from '../../contexts/AuthContext';
import { useEvolution } from '../../hooks/useEvolution';
import API from '../../services/api';
import { fetchMyPatients } from '../../services/doctorService';
import { fetchPendingEvolutions, type PendingEvolution } from '../../services/evolutionService';
import patientService from '../../services/patientService';
import { confirmToast } from '../../utils/confirmToast';
import { toDateString } from '../../utils/dateUtils';
import { IPatient } from '../../utils/types/types';
import ProtocolAnalytics from '../protocols/ProtocolAnalytics';
import EvolutionChart from './EvolutionChart';
import { NewEvaluationForm, NewEvaluationModal } from './NewEvaluationModal';
import { ageLabel, billingChip, Chip, dayDiff, lastLabel, nextLabel } from './patient/MyPatientsPanel';

type TherapyEvolutionProps = {
    patients: IPatient[];
    selectedPatient?: IPatient | null;
    onSelectPatient?: (patient: IPatient | null) => void;
    onOpenPatientDetail?: (patient: IPatient) => void;
    /** chamado depois de salvar/excluir, para o Dashboard atualizar as pendências */
    onEvolutionChanged?: () => void;
};

type TimelineBadge = {
    type: 'improvement' | 'regression' | 'stable' | 'protocol_change' | 'first';
    label: string;
};

const EVALUATION_TYPE_LABELS: Record<string, string> = {
    language: 'Linguagem',
    motor: 'Motor',
    cognitive: 'Cognitivo',
    behavior: 'Comportamento',
    social: 'Social',
    linguagem_expressiva: 'Linguagem Expressiva',
    linguagem_receptiva: 'Linguagem Receptiva',
    pragmatica: 'Pragmática',
    voz: 'Voz',
    motricidade_orofacial: 'Motricidade Orofacial',
    emocional: 'Emocional',
    autonomia: 'Autonomia',
    sensorial: 'Sensorial',
    avds: 'AVDs',
    praxia: 'Praxia',
    grafomotor: 'Grafomotor',
    postural: 'Controle Postural',
    marcha: 'Marcha',
    respiratorio: 'Respiratório',
    neuromotor: 'Neuromotor',
    atencao: 'Atenção',
    memoria: 'Memória',
    visuoespacial: 'Visuoespacial',
    executivo: 'Executivo',
    comunicacao: 'Comunicação',
    expressao_emocional: 'Expressão Emocional',
    socializacao: 'Socialização',
    motor_musical: 'Motor (via música)'
};

function formatAreaName(id: string): string {
    return id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
const areaLabel = (id?: string, name?: string) => EVALUATION_TYPE_LABELS[id || ''] || name || formatAreaName(id || '');

/** minúsculas e sem acento, para a busca achar "Jose" em "José" */
const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const num = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Notas da sessão por área/métrica, para comparar com a sessão anterior. */
function scoresOf(evo: any): Record<string, number> {
    const out: Record<string, number> = {};
    (Array.isArray(evo?.metrics) ? evo.metrics : []).forEach((m: any) => { if (m?.name) out['m:' + m.name] = Number(m.value ?? 0); });
    (Array.isArray(evo?.evaluationAreas) ? evo.evaluationAreas : []).forEach((a: any) => {
        const id = a?.id || a?.name;
        if (id && a.score !== undefined && a.score !== null) out['a:' + id] = Number(a.score);
    });
    return out;
}

// Antes comparava só `metrics`; as sessões guardam a nota em `evaluationAreas`, então as
// etiquetas Evolução/Regressão/Estável nunca apareciam. Agora compara as duas.
function getTimelineBadges(current: any, previous: any | null): TimelineBadge[] {
    const badges: TimelineBadge[] = [];

    if (!previous) {
        badges.push({ type: 'first', label: 'Primeira sessão' });
        return badges;
    }

    const prevProtocol = previous.therapeuticPlan?.protocol?.code;
    const currProtocol = current.therapeuticPlan?.protocol?.code;
    if (prevProtocol && currProtocol && prevProtocol !== currProtocol) {
        badges.push({ type: 'protocol_change', label: 'Mudança de protocolo' });
    }

    const prev = scoresOf(previous);
    const curr = scoresOf(current);
    let improved = 0, regressed = 0, stable = 0;
    Object.entries(curr).forEach(([k, v]) => {
        if (prev[k] === undefined) return;
        if (v > prev[k]) improved++;
        else if (v < prev[k]) regressed++;
        else stable++;
    });

    // Diz quantas áreas mudaram: "Regressão" e "Evolução" juntos, sem número, pareciam contraditórios
    const areas = (n: number) => `${n} ${n === 1 ? 'área' : 'áreas'}`;
    if (regressed > 0) badges.push({ type: 'regression', label: `Regressão em ${areas(regressed)}` });
    if (improved > 0) badges.push({ type: 'improvement', label: `Evolução em ${areas(improved)}` });
    if (regressed === 0 && improved === 0 && stable > 0) badges.push({ type: 'stable', label: 'Estável' });

    return badges;
}

const BADGE_STYLE: Record<TimelineBadge['type'], string> = {
    improvement: 'border-green-200 bg-green-50 text-green-800',
    regression: 'border-red-200 bg-red-50 text-red-800',
    stable: 'border-gray-300 bg-gray-50 text-gray-700',
    protocol_change: 'border-blue-200 bg-blue-50 text-blue-800',
    first: 'border-amber-200 bg-amber-50 text-amber-800',
};
const BADGE_ICON = { improvement: ArrowUp, regression: ArrowDown, stable: Minus, protocol_change: GitBranch, first: Activity };

/** "dd/MM/yyyy" sem fuso: a data da evolução é gravada como meia-noite UTC do dia. */
function fmtDate(iso?: string | Date) {
    const ymd = toDateString(typeof iso === 'string' ? iso : iso ? new Date(iso).toISOString() : '');
    if (!ymd) return '—';
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
}
function weekday(iso?: string | Date) {
    const ymd = toDateString(typeof iso === 'string' ? iso : iso ? new Date(iso).toISOString() : '');
    if (!ymd) return '';
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
}

function pendingAge(iso: string) {
    const n = -dayDiff(iso);
    return { n, label: n <= 0 ? 'hoje' : n === 1 ? '1 dia' : `${n} dias` };
}

function reviewInfo(date?: string | Date | null) {
    if (!date) return null;
    const iso = typeof date === 'string' ? date : new Date(date).toISOString();
    const n = dayDiff(iso);
    if (n < 0) return { text: `vencida há ${-n} ${-n === 1 ? 'dia' : 'dias'}`, tone: 'text-red-700' };
    if (n === 0) return { text: 'hoje', tone: 'text-amber-800' };
    return { text: `em ${n} ${n === 1 ? 'dia' : 'dias'}`, tone: n <= 7 ? 'text-amber-800' : 'text-gray-600' };
}

const TREND = {
    improving: { label: 'melhorando', Icon: TrendingUp, tone: 'text-green-700' },
    stable: { label: 'estável', Icon: Minus, tone: 'text-gray-600' },
    regressing: { label: 'regredindo', Icon: TrendingDown, tone: 'text-red-700' },
} as const;

const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btn} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`;
const btnSoft = `${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`;
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const btnSm = 'min-h-9 px-2.5';
const card = 'rounded-2xl border border-gray-200 bg-white min-w-0';
const tabBtn = (on: boolean) => `-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`;

function EntryMenu({ label, deleting, onDelete }: { label: string; deleting: boolean; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, [open]);
    return (
        <div className="relative" ref={ref}>
            <button type="button" className={`${btnGhost} ${btnSm} w-9 px-0`} aria-label={`Mais ações da evolução de ${label}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-10 z-20 min-w-[190px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                    <button role="menuitem" type="button" disabled={deleting} onClick={() => { setOpen(false); onDelete(); }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:opacity-50">
                        <Trash2 className="h-4 w-4" aria-hidden />Excluir evolução
                    </button>
                </div>
            )}
        </div>
    );
}

export default function TherapyEvolution({
    patients,
    selectedPatient,
    onSelectPatient,
    onOpenPatientDetail,
    onEvolutionChanged,
}: TherapyEvolutionProps) {
    const { user } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [resolvedPatient, setResolvedPatient] = useState<IPatient | null>(null);

    // Busca de paciente — mesmo padrão do ScheduleAppointmentModal
    const [patientSearch, setPatientSearch] = useState('');
    const [searchedPatients, setSearchedPatients] = useState<IPatient[]>([]);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [mySearched, setMySearched] = useState<any[]>([]);
    const detailRef = useRef<HTMLDivElement>(null);

    // Fila: pendentes de evolução + pacientes em atendimento (dados do back, não do cache do Dashboard)
    const [pending, setPending] = useState<PendingEvolution[]>([]);
    const [activeList, setActiveList] = useState<any[]>([]);
    const [queueLoading, setQueueLoading] = useState(true);
    const [patientInfo, setPatientInfo] = useState<any | null>(null);
    // Últimas 5 avaliações registradas pelo profissional (atalho em chips)
    const [recent, setRecent] = useState<any[]>([]);
    const [focusEvoId, setFocusEvoId] = useState<string | null>(null);

    const loadQueue = useCallback(async () => {
        setQueueLoading(true);
        const [pend, act, rec] = await Promise.all([
            fetchPendingEvolutions().catch(() => [] as PendingEvolution[]),
            fetchMyPatients({ care: 'active', sort: 'next', limit: 50 }).then(r => r.data || []).catch(() => [] as any[]),
            // Promise.resolve: uma falha síncrona (ou mock sem retorno) não derruba a fila inteira
            Promise.resolve().then(() => API.get('/v2/evolutions/search', { params: { limit: 5 } })).then(r => r?.data?.data || []).catch(() => [] as any[]),
        ]);
        setPending(Array.isArray(pend) ? pend : []);
        setActiveList(Array.isArray(act) ? act : []);
        setRecent(Array.isArray(rec) ? rec.filter((e: any) => e?.patient?._id).slice(0, 5) : []);
        setQueueLoading(false);
    }, []);
    useEffect(() => { loadQueue(); }, [loadQueue]);

    // Busca: filtra a própria fila na hora e, com 2+ letras, busca no back os pacientes do
    // terapeuta (inclui sem próxima sessão/inativos) e os demais pacientes da clínica.
    useEffect(() => {
        const term = patientSearch.trim();
        setSearchedPatients([]);
        setMySearched([]);
        if (term.length < 2) return;

        let alive = true;
        const t = setTimeout(async () => {
            setIsSearchingPatient(true);
            const [mine, all] = await Promise.all([
                fetchMyPatients({ search: term, sort: 'name', limit: 30 }).then(r => r.data || []).catch(() => [] as any[]),
                patientService.search(term).catch(() => [] as IPatient[]),
            ]);
            if (!alive) return;
            setMySearched(Array.isArray(mine) ? mine : []);
            setSearchedPatients(Array.isArray(all) ? all : []);
            setIsSearchingPatient(false);
        }, 300);
        return () => { alive = false; clearTimeout(t); };
    }, [patientSearch]);

    // 🧬 Hook de evolução — abstrai toda a lógica de API, cache e estados
    const {
        evaluations,
        chartData,
        progressData,
        lastEvolution,
        isLoading,
        create,
        remove,
    } = useEvolution(selectedPatientId || null);

    const [isAdding, setIsAdding] = useState(false);
    const [addDefaults, setAddDefaults] = useState<{ date?: string; time?: string }>({});
    const [openIds, setOpenIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pdfId, setPdfId] = useState<string | null>(null);


    const term = norm(patientSearch.trim());
    const matches = (name?: string) => !term || norm(name || '').includes(term);

    const pickPatient = (p: IPatient) => {
        setSelectedPatientId(p._id);
        setResolvedPatient(p);
        setPatientSearch('');
        setSearchedPatients([]);
        setMySearched([]);
        onSelectPatient?.(p);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }
    };

    const [protocols, setProtocols] = useState<any[]>([]);
    const [protocolsLoading, setProtocolsLoading] = useState(false);
    const [protocolsError, setProtocolsError] = useState<string | null>(null);
    const [selectedProtocolCode, setSelectedProtocolCode] = useState<string | null>(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>((user as any)?.specialty || '');
    const [activeTab, setActiveTab] = useState<'evolution' | 'analytics'>('evolution');
    const [evolutionSubTab, setEvolutionSubTab] = useState<'history' | 'chart'>('history');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Sincroniza paciente externo (ex.: "Registrar evolução" no Dashboard) com estado local
    useEffect(() => {
        if (selectedPatient && selectedPatient._id) {
            setSelectedPatientId(selectedPatient._id);
            setResolvedPatient(selectedPatient);
        } else {
            setSelectedPatientId('');
            setResolvedPatient(null);
        }
        setCurrentPage(1);
        setEvolutionSubTab('history');
        setOpenIds(new Set());
    }, [selectedPatient]);

    // Veio de um chip de "Últimas avaliações": abre aquela evolução quando o histórico carregar
    useEffect(() => {
        if (!focusEvoId || isLoading) return;
        const idx = evaluations.findIndex((e: any) => e._id === focusEvoId);
        if (idx === -1) return;
        setOpenIds(new Set([focusEvoId]));
        setCurrentPage(Math.floor(idx / 5) + 1);
        setFocusEvoId(null);
    }, [focusEvoId, evaluations, isLoading, selectedPatient]);

    // Dados de cabeçalho do paciente (idade, responsável, convênio, próxima sessão)
    useEffect(() => {
        setPatientInfo(null);
        if (!selectedPatientId) return;
        let alive = true;
        fetchMyPatients({ ids: [selectedPatientId], limit: 1 })
            .then(r => { if (alive) setPatientInfo((r.data || [])[0] || null); })
            .catch(() => { /* paciente de outro profissional: usa o que veio da busca */ });
        return () => { alive = false; };
    }, [selectedPatientId]);

    // Sincroniza protocolo selecionado com plano terapêutico carregado
    useEffect(() => {
        if (progressData?.currentPlan?.protocol?.code) {
            setSelectedProtocolCode(progressData.currentPlan.protocol.code);
        } else {
            setSelectedProtocolCode(null);
        }
    }, [progressData]);

    // Carrega protocolos do profissional
    useEffect(() => {
        if (user) loadProtocols();
    }, [user]);

    useEffect(() => {
        if (selectedSpecialty) loadProtocolsBySpecialty(selectedSpecialty);
    }, [selectedSpecialty]);

    const loadProtocols = async () => {
        try {
            setProtocolsLoading(true);
            setProtocolsError(null);
            const specialty = (user as any)?.specialty;
            const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
            const response = await API.get(`/protocols${query}`);
            setProtocols(response.data || []);
        } catch (err: any) {
            setProtocolsError('Erro ao carregar protocolos terapêuticos');
        } finally {
            setProtocolsLoading(false);
        }
    };

    const loadProtocolsBySpecialty = async (specialty: string) => {
        try {
            setProtocolsLoading(true);
            setProtocolsError(null);
            const query = `?specialty=${encodeURIComponent(specialty)}`;
            const response = await API.get(`/protocols${query}`);
            setProtocols(response.data || []);
        } catch (err: any) {
            setProtocolsError('Erro ao carregar protocolos terapêuticos');
        } finally {
            setProtocolsLoading(false);
        }
    };

    const handleSaveEvaluation = async (form: NewEvaluationForm) => {
        if (!selectedPatientId) {
            toast.warn('Selecione um paciente antes de salvar a avaliação.');
            return;
        }

        const metricsArray = Object.entries(form.metrics || {})
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([name, value]) => ({ name: String(name), value: Number(value) }));

        const evaluationAreas = Object.entries(form.areaScores || {})
            .filter(([_, score]) => score !== undefined && score !== null)
            .map(([id, score]) => ({
                id: String(id),
                name: EVALUATION_TYPE_LABELS[id] || formatAreaName(id),
                score: Number(score)
            }));

        const evaluationTypes = evaluationAreas.map(a => a.id);

        const protocolCode =
            progressData?.currentPlan?.protocol?.code ||
            selectedProtocolCode ||
            null;

        let therapeuticPlan: any = null;

        if (progressData?.currentPlan) {
            therapeuticPlan = {
                protocol: progressData.currentPlan.protocol || undefined,
                objectives: (progressData.objectives || []).map((obj: any) => {
                    const sliderScore = form.areaScores?.[obj.area];
                    return {
                        area: obj.area,
                        description: obj.description,
                        targetScore: Number(obj.target ?? obj.targetScore ?? 10),
                        currentScore: Number(sliderScore ?? obj.current ?? 0),
                        targetDate: obj.targetDate || null,
                        notes: obj.notes || ''
                    };
                }),
                reviewDate: progressData.currentPlan.reviewDate || null
            };
        } else if (protocolCode) {
            const selectedProtocol = protocols.find((p: any) => p.code === protocolCode);
            therapeuticPlan = {
                protocol: selectedProtocol
                    ? { code: selectedProtocol.code, name: selectedProtocol.name, customNotes: '' }
                    : { code: protocolCode, name: protocolCode, customNotes: '' },
                objectives: evaluationAreas.map(area => ({
                    area: area.id,
                    description: `Objetivo em ${area.name}`,
                    targetScore: 10,
                    currentScore: area.score,
                    targetDate: null,
                    notes: ''
                })),
                reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };
        }

        const payload = {
            patient: selectedPatientId,
            specialty: (user as any)?.specialty || selectedSpecialty || 'geral',
            date: new Date(form.date),
            time: form.time || '10:00',
            content: form.content || '',
            metrics: metricsArray,
            evaluationAreas,
            evaluationTypes,
            plan: '',
            treatmentStatus: 'in_progress',
            ...(therapeuticPlan && { therapeuticPlan }),
            ...(protocolCode && { protocolCode })
        };

        const result = await create(payload as any);
        if (result.success) {
            setIsAdding(false);
            loadQueue();
            onEvolutionChanged?.();
        }
    };

    const handleDeleteEvaluation = async (evaluationId: string) => {
        const confirmed = await confirmToast(
            'Tem certeza que deseja excluir esta avaliação? Essa ação não pode ser desfeita.'
        );
        if (!confirmed) return;

        try {
            setDeletingId(evaluationId);
            const result = await remove(evaluationId);
            if (!result.success) {
                console.error(result.error);
            } else {
                loadQueue();
                onEvolutionChanged?.();
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownloadPdf = async (evaluation: any) => {
        try {
            setPdfId(evaluation._id);
            const response = await API.get(`/v2/evolutions/${evaluation._id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const name = (resolvedPatient?.fullName || 'paciente').replace(/\s+/g, '_');
            link.setAttribute('download', `Evolucao_${name}_${toDateString(evaluation.date)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao gerar PDF da evolução:', error);
            toast.error('Não foi possível gerar o PDF desta evolução.');
        } finally {
            setPdfId(null);
        }
    };

    const calculateProgress = () => {
        // 🎯 Prioridade 1: Plano Terapêutico (objetivos com currentScore / targetScore)
        if (progressData?.objectives && progressData.objectives.length > 0) {
            const activeObjectives = progressData.objectives.filter((obj: any) => !obj.achieved);
            if (activeObjectives.length === 0) return 100;
            const total = activeObjectives.reduce((sum: number, obj: any) => {
                const current = Number(obj.current ?? obj.currentScore ?? 0);
                const target = Number(obj.target ?? obj.targetScore ?? 10);
                if (target <= 0) return sum;
                return sum + Math.min((current / target) * 100, 100);
            }, 0);
            return Math.round(total / activeObjectives.length);
        }

        // Fallback: métricas do gráfico (evolução ao longo do tempo)
        if (!chartData?.metrics) return 0;
        const metricKeys = Object.keys(chartData.metrics);
        if (metricKeys.length === 0) return 0;

        let totalProgress = 0;
        let count = 0;
        metricKeys.forEach(key => {
            const metric = chartData.metrics[key];
            if (!metric?.values || metric.values.length < 2) return;
            const firstValue = metric.values[0];
            const lastValue = metric.values[metric.values.length - 1];
            const { minValue = 0, maxValue = 10 } = metric.config || {};
            if (firstValue !== null && lastValue !== null) {
                const progress = ((lastValue - firstValue) / (maxValue - minValue || 1)) * 100;
                totalProgress += Math.min(Math.max(progress, 0), 100);
                count++;
            }
        });
        return count > 0 ? totalProgress / count : 0;
    };

    const pendingIds = useMemo(() => new Set(pending.map(p => String(p._id))), [pending]);
    const activeNotPending = useMemo(() => activeList.filter(p => !pendingIds.has(String(p._id))), [activeList, pendingIds]);
    const pendingShown = pending.filter(p => matches(p.fullName));
    const activeShown = activeNotPending.filter(p => matches(p.fullName));
    // Com busca: meus outros pacientes (sem próxima sessão/inativos) e depois o resto da clínica
    const shownIds = new Set([...pendingShown, ...activeShown].map(p => String(p._id)));
    const mineExtra = term ? mySearched.filter(p => !shownIds.has(String(p._id)) && !pendingIds.has(String(p._id))) : [];
    mineExtra.forEach(p => shownIds.add(String(p._id)));
    const ownLocal = term ? (patients || []).filter(p => matches(p.fullName) && !shownIds.has(String(p._id))) : [];
    ownLocal.forEach(p => shownIds.add(String(p._id)));
    // o back também acha por telefone/CPF; com letras, mantém só quem tem o nome parecido
    const byName = /[a-z]/.test(term);
    const othersShown = term ? searchedPatients.filter(p => !shownIds.has(String(p._id)) && (!byName || matches(p.fullName))).slice(0, 20) : [];
    const selectedPending = pending.find(p => String(p._id) === selectedPatientId) || null;
    const info = { ...(resolvedPatient || {}), ...(patientInfo || {}) } as any;
    const objectives = progressData?.objectives || [];
    const plan = progressData?.currentPlan;
    const review = reviewInfo(plan?.reviewDate);
    const progress = Math.round(calculateProgress());
    const hasChart = !!(chartData && chartData.dates && chartData.dates.length > 0);

    const openAdd = (defaults: { date?: string; time?: string } = {}) => { setAddDefaults(defaults); setIsAdding(true); };
    const toggleOpen = (id: string) => setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const queueRow = (p: { _id: string; fullName: string }, sub: React.ReactNode, aside?: React.ReactNode) => {
        const on = String(p._id) === selectedPatientId;
        return (
            <li key={p._id}>
                <button type="button" onClick={() => pickPatient(p as IPatient)} aria-current={on ? 'true' : undefined}
                    className={`flex w-full items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${on ? 'bg-emerald-50 shadow-[inset_3px_0_0_#047857]' : 'hover:bg-gray-50'}`}>
                    <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-900">{p.fullName}</span>
                        <span className="block truncate text-xs text-gray-600">{sub}</span>
                    </span>
                    {aside}
                </button>
            </li>
        );
    };

    const sectionLabel = 'px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-gray-600';

    const pageCount = Math.ceil(evaluations.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = evaluations.slice(start, start + ITEMS_PER_PAGE);

    return (
        <>
            <NewEvaluationModal
                open={isAdding}
                onClose={() => setIsAdding(false)}
                onSave={handleSaveEvaluation}
                currentPlan={progressData?.currentPlan}
                objectives={progressData?.objectives || []}
                protocols={protocols}
                selectedProtocolCode={selectedProtocolCode}
                onSelectProtocol={(code) => setSelectedProtocolCode(code || null)}
                protocolsLoading={protocolsLoading}
                protocolsError={protocolsError}
                onSpecialtyChange={(specialty) => setSelectedSpecialty(specialty)}
                doctorSpecialty={(user as any)?.specialty}
                lastEvolution={lastEvolution}
                defaultDate={addDefaults.date}
                defaultTime={addDefaults.time}
            />

            <div className="space-y-4 text-left">
                <div role="tablist" aria-label="Evolução" className="flex gap-1 border-b border-gray-200">
                    <button role="tab" type="button" aria-selected={activeTab === 'evolution'} className={tabBtn(activeTab === 'evolution')} onClick={() => setActiveTab('evolution')}>
                        <Activity className="mr-1.5 inline h-4 w-4" aria-hidden />Evolução de pacientes
                    </button>
                    <button role="tab" type="button" aria-selected={activeTab === 'analytics'} className={tabBtn(activeTab === 'analytics')} onClick={() => setActiveTab('analytics')}>
                        <BarChart3 className="mr-1.5 inline h-4 w-4" aria-hidden />Analytics de protocolos
                    </button>
                </div>

                {activeTab === 'evolution' && recent.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Últimas avaliações registradas">
                        <span className="text-sm font-medium text-gray-600">Últimas avaliações:</span>
                        {recent.map((e: any) => {
                            const on = String(e.patient._id) === selectedPatientId;
                            const name = String(e.patient.fullName || '').split(' ').filter(Boolean).slice(0, 2).join(' ');
                            return (
                                <button key={e._id} type="button" aria-pressed={on}
                                    onClick={() => { setFocusEvoId(e._id); pickPatient(e.patient as IPatient); }}
                                    title={`${e.patient.fullName} · ${fmtDate(e.date)}`}
                                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                                    <b className="tabular-nums">{fmtDate(e.date).slice(0, 5)}</b>{name}
                                </button>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'evolution' && (
                    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                        {/* ── Fila ─────────────────────────────────── */}
                        <section className={card} aria-labelledby="evo-fila">
                            <h2 id="evo-fila" className="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-900">Pacientes</h2>
                            <div className="relative p-3">
                                <label htmlFor="evo-busca" className="sr-only">Buscar paciente</label>
                                <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                                <input
                                    id="evo-busca"
                                    type="search"
                                    autoComplete="off"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    placeholder="Buscar paciente pelo nome"
                                    className="min-h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                            </div>

                            <p className={sectionLabel}>Evolução pendente · {queueLoading ? '…' : pendingShown.length}</p>
                            {!queueLoading && pendingShown.length === 0 && (
                                <p className="px-4 pb-3 text-sm text-gray-600">{term ? 'Ninguém pendente com esse nome.' : 'Tudo em dia: todo atendimento recente tem evolução.'}</p>
                            )}
                            <ul>
                                {pendingShown.map(p => {
                                    const age = pendingAge(p.lastCompletedDate);
                                    return queueRow(p, `atendido ${lastLabel(p.lastCompletedDate)}`,
                                        <span className={`shrink-0 rounded-full px-2 py-px text-xs font-semibold ${age.n >= 3 ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{age.label}</span>);
                                })}
                            </ul>

                            <p className={`${sectionLabel} mt-1`}>Em atendimento · {queueLoading ? '…' : activeShown.length}</p>
                            {!queueLoading && activeShown.length === 0 && (
                                <p className="px-4 pb-3 text-sm text-gray-600">{term ? 'Ninguém em atendimento com esse nome.' : 'Nenhum outro paciente com sessão marcada.'}</p>
                            )}
                            <ul className="max-h-[420px] overflow-auto pb-1">
                                {activeShown.map(p => {
                                    const next = nextLabel(p.nextAppointment);
                                    return queueRow(p, `última sessão ${lastLabel(p.lastAppointment)}${next ? ` · próxima ${next}` : ''}`);
                                })}
                            </ul>

                            {term && (
                                <>
                                    <p className={`${sectionLabel} mt-1`}>Outros resultados · {isSearchingPatient ? '…' : mineExtra.length + ownLocal.length + othersShown.length}</p>
                                    {patientSearch.trim().length < 2 ? (
                                        <p className="px-4 pb-3 text-sm text-gray-600">Digite ao menos 2 letras para buscar em todos os pacientes.</p>
                                    ) : !isSearchingPatient && mineExtra.length + ownLocal.length + othersShown.length === 0 ? (
                                        <p className="px-4 pb-3 text-sm text-gray-600">Nenhum outro paciente com esse nome.</p>
                                    ) : null}
                                    <ul className="max-h-[360px] overflow-auto pb-1">
                                        {mineExtra.map(p => queueRow(p, `meu paciente · última sessão ${lastLabel(p.lastAppointment)}`))}
                                        {ownLocal.map(p => queueRow(p, 'meu paciente'))}
                                        {othersShown.map(p => queueRow(p, 'paciente da clínica'))}
                                    </ul>
                                </>
                            )}
                        </section>

                        {/* ── Paciente ─────────────────────────────── */}
                        <div ref={detailRef} className="min-w-0 scroll-mt-4 space-y-4">
                            {!selectedPatientId ? (
                                <div className={`${card} px-6 py-14 text-center`}>
                                    <Activity className="mx-auto mb-3 h-10 w-10 text-emerald-600" aria-hidden />
                                    <p className="text-lg font-semibold text-gray-900">Escolha um paciente</p>
                                    <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
                                        Clique em alguém da lista para ver o plano terapêutico e o histórico de sessões, ou registrar a evolução de hoje.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Cabeçalho */}
                                    <section className={card} aria-label="Paciente selecionado">
                                        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                                            <div className="min-w-0">
                                                <h2 className="text-xl font-semibold text-gray-900">{info.fullName}</h2>
                                                <p className="mt-0.5 text-sm text-gray-600">
                                                    {[ageLabel(info.dateOfBirth), info.legalGuardian ? `Resp.: ${info.legalGuardian}` : null, info.mainComplaint ? `Queixa: ${info.mainComplaint}` : null].filter(Boolean).join(' · ') || 'Dados do paciente na ficha'}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {billingChip(info)}
                                                    {info.careStatus === 'active' && <Chip tone="ok">Em atendimento</Chip>}
                                                    {info.careStatus === 'no_next' && <Chip tone="warn">Sem próxima sessão</Chip>}
                                                    {info.nextAppointment && <Chip tone="neu">próxima: {nextLabel(info.nextAppointment)}</Chip>}
                                                    {!isLoading && <Chip tone="neu">{evaluations.length} {evaluations.length === 1 ? 'evolução' : 'evoluções'}</Chip>}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {onOpenPatientDetail && (
                                                    <button type="button" className={btnGhost} onClick={() => onOpenPatientDetail(info as IPatient)}>
                                                        <UserRound className="h-4 w-4" aria-hidden />Ver ficha
                                                    </button>
                                                )}
                                                <button type="button" className={btnPrimary} onClick={() => openAdd()}>
                                                    <Plus className="h-4 w-4" aria-hidden />{evaluations.length === 0 && !isLoading ? 'Registrar primeira evolução' : 'Registrar evolução'}
                                                </button>
                                            </div>
                                        </div>
                                        {selectedPending && (
                                            <div role="status" className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-900 sm:mx-5">
                                                <span className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                                                    Sessão de {fmtDate(selectedPending.lastCompletedDate)} ({lastLabel(selectedPending.lastCompletedDate)}) ainda sem evolução.
                                                </span>
                                                <button type="button" className={`${btnSoft} ${btnSm}`} onClick={() => openAdd({ date: toDateString(selectedPending.lastCompletedDate) })}>
                                                    Registrar essa sessão
                                                </button>
                                            </div>
                                        )}
                                    </section>

                                    {/* Plano terapêutico */}
                                    {isLoading ? (
                                        <div className={`${card} px-4 py-4 text-sm text-gray-600`}>Carregando plano e histórico...</div>
                                    ) : objectives.length === 0 ? (
                                        <div className={`${card} flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm text-gray-600`}>
                                            <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-700" aria-hidden />
                                                Sem plano terapêutico ainda. Ele é criado ao escolher o protocolo numa evolução.</span>
                                            {progress > 0 && <span>Progresso pelas métricas: <b className="text-gray-900">{progress}%</b></span>}
                                        </div>
                                    ) : (
                                        <section className={card} aria-labelledby="evo-plano">
                                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3">
                                                <h3 id="evo-plano" className="text-base font-semibold text-gray-900">
                                                    Plano terapêutico{plan?.protocol?.name ? ` · ${plan.protocol.name}` : ''}
                                                    {plan?.protocol?.code && <span className="ml-1.5 text-xs font-medium text-gray-600">{plan.protocol.code}</span>}
                                                </h3>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                                    <span>Progresso geral <b className="text-gray-900">{progress}%</b></span>
                                                    {plan?.reviewDate && review && (
                                                        <span>Revisão <b className="text-gray-900">{fmtDate(plan.reviewDate).slice(0, 5)}</b> · <span className={`font-semibold ${review.tone}`}>{review.text}</span></span>
                                                    )}
                                                </div>
                                            </div>
                                            <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
                                                {objectives.map((obj: any, idx: number) => {
                                                    const t = TREND[obj.trend as keyof typeof TREND];
                                                    const pct = Math.max(0, Math.min(100, Math.round(obj.progress ?? 0)));
                                                    return (
                                                        <li key={idx} className="border-t border-gray-100 px-4 py-3 sm:border-r">
                                                            <p className="text-xs font-semibold text-emerald-800">{areaLabel(obj.area)}</p>
                                                            <p className="mt-0.5 font-semibold text-gray-900">{obj.description}</p>
                                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso em ${areaLabel(obj.area)}`}>
                                                                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-gray-600">
                                                                <span>{obj.current ?? '—'} de {obj.target ?? 10} · {pct}%</span>
                                                                {t ? <span className={`inline-flex items-center gap-1 font-semibold ${t.tone}`}><t.Icon className="h-3.5 w-3.5" aria-hidden />{t.label}</span> : <span>—</span>}
                                                            </div>
                                                            {(obj.targetDate || obj.projectedCompletion) && (
                                                                <p className="mt-1 text-xs text-gray-600">
                                                                    {obj.targetDate && <>Prazo alvo {fmtDate(obj.targetDate)}</>}
                                                                    {obj.targetDate && obj.projectedCompletion && ' · '}
                                                                    {obj.projectedCompletion && <>Projeção {new Date(obj.projectedCompletion).toLocaleDateString('pt-BR')}</>}
                                                                </p>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </section>
                                    )}

                                    {/* Histórico / Gráfico */}
                                    {!isLoading && (
                                        <section className={card} aria-label="Histórico de evoluções">
                                            <div role="tablist" className="flex gap-1 border-b border-gray-200 px-3">
                                                <button role="tab" type="button" aria-selected={evolutionSubTab === 'history'} className={tabBtn(evolutionSubTab === 'history')} onClick={() => { setEvolutionSubTab('history'); setCurrentPage(1); }}>
                                                    Histórico · {evaluations.length}
                                                </button>
                                                {evaluations.length > 0 && (
                                                    <button role="tab" type="button" aria-selected={evolutionSubTab === 'chart'} className={tabBtn(evolutionSubTab === 'chart')} onClick={() => setEvolutionSubTab('chart')}>
                                                        Gráfico
                                                    </button>
                                                )}
                                            </div>

                                            {evolutionSubTab === 'history' && (
                                                evaluations.length === 0 ? (
                                                    <div className="px-6 py-10 text-center">
                                                        <p className="font-semibold text-gray-900">Nenhuma evolução registrada</p>
                                                        <p className="mt-1 text-sm text-gray-600">A primeira evolução cria o histórico e, se você escolher um protocolo, o plano terapêutico.</p>
                                                        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => openAdd()}>
                                                            <Plus className="h-4 w-4" aria-hidden />Registrar primeira evolução
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <ol>
                                                            {paginated.map((evaluation: any, index: number) => {
                                                                const realIndex = start + index;
                                                                const previous = evaluations[realIndex + 1] || null;
                                                                const badges = getTimelineBadges(evaluation, previous);
                                                                const isOpen = openIds.has(evaluation._id);
                                                                const prevScores = scoresOf(previous);
                                                                const areas: any[] = Array.isArray(evaluation.evaluationAreas) ? evaluation.evaluationAreas : [];
                                                                const areaIds = new Set(areas.map(a => a.id || a.name));
                                                                const extraTypes: string[] = (evaluation.evaluationTypes || []).filter((t: string) => !areaIds.has(t));
                                                                const text = typeof evaluation.content === 'string' ? evaluation.content.trim() : '';
                                                                return (
                                                                    <li key={evaluation._id} className="grid gap-3 border-t border-gray-100 px-4 py-4 first:border-t-0 sm:grid-cols-[92px_minmax(0,1fr)_auto]">
                                                                        <div>
                                                                            <p className="font-semibold text-gray-900">{fmtDate(evaluation.date)}</p>
                                                                            <p className="text-xs text-gray-600">{weekday(evaluation.date)}{evaluation.time ? ` · ${evaluation.time}` : ''}</p>
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {badges.map((badge, bIdx) => {
                                                                                    const Icon = BADGE_ICON[badge.type];
                                                                                    return (
                                                                                        <span key={bIdx} className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-xs font-semibold ${BADGE_STYLE[badge.type]}`}>
                                                                                            <Icon className="h-3 w-3" aria-hidden />{badge.label}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                                {areas.map((a: any) => {
                                                                                    const id = a.id || a.name;
                                                                                    const before = prevScores['a:' + id];
                                                                                    const diff = before !== undefined ? Number(a.score) - before : 0;
                                                                                    return (
                                                                                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-2 py-px text-xs font-medium text-gray-800">
                                                                                            {areaLabel(a.id, a.name)} {num(Number(a.score))}
                                                                                            {diff !== 0 && <b className={diff > 0 ? 'text-green-700' : 'text-red-700'}>{diff > 0 ? '+' : '−'}{num(Math.abs(diff))}</b>}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                                {extraTypes.map(type => (
                                                                                    <span key={type} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-px text-xs font-medium text-emerald-800">{areaLabel(type)}</span>
                                                                                ))}
                                                                            </div>
                                                                            <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 ${isOpen ? '' : 'line-clamp-2'}`}>
                                                                                {text || <span className="italic text-gray-600">Nenhum relatório registrado</span>}
                                                                            </p>
                                                                            <p className="mt-1.5 text-xs text-gray-600">
                                                                                {evaluation.doctor?.fullName}{evaluation.doctor?.specialty ? ` · ${evaluation.doctor.specialty}` : ''}
                                                                            </p>
                                                                            {isOpen && (
                                                                                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                                                                    <p className="mb-1.5 text-sm font-semibold text-gray-900">Métricas registradas</p>
                                                                                    {evaluation.metrics && evaluation.metrics.length > 0 ? (
                                                                                        <ul className="grid gap-1.5 sm:grid-cols-2">
                                                                                            {evaluation.metrics.map((metric: any) => {
                                                                                                const before = prevScores['m:' + metric.name];
                                                                                                const diff = before !== undefined ? Number(metric.value) - before : 0;
                                                                                                return (
                                                                                                    <li key={metric.name} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm">
                                                                                                        <span className="text-gray-800">{metric.name}</span>
                                                                                                        <span className="font-semibold text-gray-900">{metric.value}{metric.unit ? ` ${metric.unit}` : ''}
                                                                                                            {diff !== 0 && <b className={`ml-1 text-xs ${diff > 0 ? 'text-green-700' : 'text-red-700'}`}>{diff > 0 ? '+' : '−'}{num(Math.abs(diff))}</b>}
                                                                                                        </span>
                                                                                                    </li>
                                                                                                );
                                                                                            })}
                                                                                        </ul>
                                                                                    ) : (
                                                                                        <p className="text-sm italic text-gray-600">Nenhuma métrica registrada</p>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <button type="button" className={`${btnGhost} ${btnSm}`} aria-expanded={isOpen} onClick={() => toggleOpen(evaluation._id)}>
                                                                                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />{isOpen ? 'Recolher' : 'Ver tudo'}
                                                                            </button>
                                                                            <button type="button" className={`${btnGhost} ${btnSm}`} disabled={pdfId === evaluation._id} onClick={() => handleDownloadPdf(evaluation)} aria-label={`Baixar PDF da evolução de ${fmtDate(evaluation.date)}`}>
                                                                                <FileDown className="h-4 w-4" aria-hidden />{pdfId === evaluation._id ? 'Gerando…' : 'PDF'}
                                                                            </button>
                                                                            <EntryMenu label={fmtDate(evaluation.date)} deleting={deletingId === evaluation._id} onDelete={() => handleDeleteEvaluation(evaluation._id)} />
                                                                        </div>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ol>

                                                        {pageCount > 1 && (
                                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
                                                                <span>Página {currentPage} de {pageCount} · {ITEMS_PER_PAGE} por página</span>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    <button type="button" className={`${btnGhost} ${btnSm}`} disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Anterior</button>
                                                                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                                                                        <button key={page} type="button" aria-current={currentPage === page ? 'page' : undefined} onClick={() => setCurrentPage(page)}
                                                                            className={`${btn} ${btnSm} w-9 px-0 ${currentPage === page ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                                                                            {page}
                                                                        </button>
                                                                    ))}
                                                                    <button type="button" className={`${btnGhost} ${btnSm}`} disabled={currentPage === pageCount} onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}>Próxima</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )
                                            )}

                                            {evolutionSubTab === 'chart' && (
                                                <div className="p-3 sm:p-5">
                                                    {hasChart ? (
                                                        <EvolutionChart chartData={chartData} objectives={objectives} />
                                                    ) : (
                                                        <p className="py-8 text-center text-sm text-gray-600">Ainda não há notas suficientes para o gráfico.</p>
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <section className={`${card} p-3 sm:p-6`} aria-label="Analytics de protocolos">
                        <ProtocolAnalytics specialty={(user as any)?.specialty} />
                    </section>
                )}
            </div>
        </>
    );
}
