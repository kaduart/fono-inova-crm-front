// src/components/doctor/TherapyEvolution.tsx
import { LinearProgress } from '@mui/material';
import { format } from 'date-fns';
import {
    Activity,
    AlertCircle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    ChevronDown,
    GitBranch,
    Minus,
    Plus,
    Target,
    Trash2,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvolution } from '../../hooks/useEvolution';
import API from '../../services/api';
import patientService from '../../services/patientService';
import { toast } from 'react-toastify';
import { confirmToast } from '../../utils/confirmToast';
import { IPatient } from '../../utils/types/types';
import ProtocolAnalytics from '../protocols/ProtocolAnalytics';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import EvolutionChart from './EvolutionChart';
import { NewEvaluationForm, NewEvaluationModal } from './NewEvaluationModal';


type TherapyEvolutionProps = {
    patients: IPatient[];
    selectedPatient?: IPatient | null;
    onSelectPatient?: (patient: IPatient | null) => void;
    onOpenPatientDetail?: (patient: IPatient) => void;
};

type TimelineBadge = {
    type: 'improvement' | 'regression' | 'stable' | 'protocol_change' | 'first';
    label: string;
};

function getTimelineBadges(current: any, previous: any | null): TimelineBadge[] {
    const badges: TimelineBadge[] = [];

    if (!previous) {
        badges.push({ type: 'first', label: 'Primeira sessão' });
        return badges;
    }

    // Detecta mudança de protocolo
    const prevProtocol = previous.therapeuticPlan?.protocol?.code;
    const currProtocol = current.therapeuticPlan?.protocol?.code;
    if (prevProtocol && currProtocol && prevProtocol !== currProtocol) {
        badges.push({ type: 'protocol_change', label: 'Mudança de protocolo' });
    }

    // Compara métricas
    const prevMetrics: Record<string, number> = {};
    if (previous.metrics && Array.isArray(previous.metrics)) {
        previous.metrics.forEach((m: any) => {
            prevMetrics[m.name] = Number(m.value ?? 0);
        });
    }

    let improved = 0;
    let regressed = 0;
    let stable = 0;

    if (current.metrics && Array.isArray(current.metrics)) {
        current.metrics.forEach((m: any) => {
            const prevValue = prevMetrics[m.name];
            if (prevValue !== undefined) {
                const currValue = Number(m.value ?? 0);
                if (currValue > prevValue) improved++;
                else if (currValue < prevValue) regressed++;
                else stable++;
            }
        });
    }

    if (regressed > 0) badges.push({ type: 'regression', label: 'Regressão detectada' });
    if (improved > 0) badges.push({ type: 'improvement', label: 'Evolução' });
    if (regressed === 0 && improved === 0 && stable > 0) badges.push({ type: 'stable', label: 'Estável' });

    return badges;
}

export default function TherapyEvolution({
    patients,
    selectedPatient,
    onSelectPatient,
    onOpenPatientDetail,
}: TherapyEvolutionProps) {
    const { user } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');

    // Busca de paciente — mesmo padrão do ScheduleAppointmentModal
    const [patientSearch, setPatientSearch] = useState('');
    const [searchedPatients, setSearchedPatients] = useState<IPatient[]>([]);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    // Debounced search → API
    useEffect(() => {
        const term = patientSearch.trim();
        setSearchedPatients([]);
        if (term.length < 2) return;
        if (selectedPatientId && resolvedPatient?.fullName?.toLowerCase() === term.toLowerCase()) return;

        const t = setTimeout(async () => {
            setIsSearchingPatient(true);
            try {
                const results = await patientService.search(term);
                setSearchedPatients(results);
            } catch { /* silently */ }
            finally { setIsSearchingPatient(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [patientSearch]);

    // Resolver: selectedPatient prop → preenche campo de busca com o nome
    useEffect(() => {
        if (selectedPatient?.fullName) {
            setPatientSearch(selectedPatient.fullName);
        } else if (!selectedPatient) {
            setPatientSearch('');
        }
    }, [selectedPatient?._id]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
                setSearchedPatients([]);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

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
    const [showDetails, setShowDetails] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ID é a fonte de verdade — dados derivados do prop ou do item selecionado no search
    const [resolvedPatient, setResolvedPatient] = useState<IPatient | null>(null);
    const selectedPatientData = resolvedPatient || ({} as IPatient);
    const [protocols, setProtocols] = useState<any[]>([]);
    const [protocolsLoading, setProtocolsLoading] = useState(false);
    const [protocolsError, setProtocolsError] = useState<string | null>(null);
    const [selectedProtocolCode, setSelectedProtocolCode] = useState<string | null>(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>((user as any)?.specialty || '');
    const [activeTab, setActiveTab] = useState<'evolution' | 'analytics'>('evolution');
    const [evolutionSubTab, setEvolutionSubTab] = useState<'history' | 'chart'>('history');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Sincroniza patientId externo com estado local
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
    }, [selectedPatient]);

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

    const handleSaveEvaluation = async (form: NewEvaluationForm) => {
        if (!selectedPatientId) {
            alert('Selecione um paciente antes de salvar a avaliação.');
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

        const areasWithScore = evaluationAreas;
        const evaluationTypes = areasWithScore.map(a => a.id);

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
        }
    };

    function formatAreaName(id: string): string {
        return id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

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
            }
        } finally {
            setDeletingId(null);
        }
    };

    const calculateProgress = () => {
        // 🎯 Prioridade 1: Plano Terapêutico (objetivos com currentScore / targetScore)
        if (progressData?.objectives && progressData.objectives.length > 0) {
            const activeObjectives = progressData.objectives.filter((obj: any) => !obj.achieved);
            if (activeObjectives.length === 0) {
                // Todos os objetivos atingidos → 100%
                return 100;
            }
            const total = activeObjectives.reduce((sum: number, obj: any) => {
                const current = Number(obj.current ?? obj.currentScore ?? 0);
                const target = Number(obj.target ?? obj.targetScore ?? 10);
                if (target <= 0) return sum;
                const pct = Math.min((current / target) * 100, 100);
                return sum + pct;
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
            />

            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">

                    {/* ✅ TABS */}
                    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-xl mb-6">
                        <div className="border-b border-gray-200 px-4">
                            <nav className="flex gap-2 -mb-px">
                                <button
                                    onClick={() => setActiveTab('evolution')}
                                    className={`px-6 py-4 text-base font-semibold border-b-4 transition-all ${activeTab === 'evolution'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Activity className="h-5 w-5 inline mr-2" />
                                    Evolução de Pacientes
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`px-6 py-4 text-base font-semibold border-b-4 transition-all ${activeTab === 'analytics'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <BarChart3 className="h-5 w-5 inline mr-2" />
                                    Analytics
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* ✅ ABA EVOLUÇÃO */}
                    {activeTab === 'evolution' && (
                        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl overflow-hidden">
                            <Card className="border-0">
                                <CardHeader className="bg-gradient-to-r from-green-600 via-green-500 to-cyan-500 p-4 sm:p-8">
                                    <CardTitle className="flex items-center gap-3 sm:gap-4 text-white text-xl sm:text-3xl font-bold drop-shadow-lg">
                                        <Activity className="h-8 w-8" />
                                        Evolução Terapêutica
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-3 sm:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-10">
                                        {/* seleção de paciente */}
                                        <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-white rounded-2xl border-2 border-green-100 shadow-lg hover:shadow-xl transition-all">
                                            <Label
                                                htmlFor="patientId"
                                                className="block font-bold text-gray-800 flex items-center gap-3 text-lg"
                                            >
                                                <Users size={24} className="text-green-600" />
                                                Selecione o Paciente
                                            </Label>
                                            <div className="relative" ref={searchDropdownRef}>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={patientSearch}
                                                        onChange={(e) => {
                                                            setPatientSearch(e.target.value);
                                                            if (!e.target.value) {
                                                                setSelectedPatientId('');
                                                                onSelectPatient?.(null);
                                                            }
                                                        }}
                                                        placeholder="Digite o nome do paciente..."
                                                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md text-base font-medium pr-10"
                                                    />
                                                    {isSearchingPatient && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <svg className="animate-spin h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                {patientSearch.trim().length >= 2 && (
                                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                                        {isSearchingPatient ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500">Buscando...</div>
                                                        ) : searchedPatients.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-400">Nenhum paciente encontrado</div>
                                                        ) : (
                                                            <ul className="max-h-48 overflow-auto">
                                                                {searchedPatients.map(p => (
                                                                    <li
                                                                        key={p._id}
                                                                        onMouseDown={() => {
                                                                            setSelectedPatientId(p._id);
                                                                            setResolvedPatient(p);
                                                                            setPatientSearch(p.fullName);
                                                                            setSearchedPatients([]);
                                                                            onSelectPatient?.(p);
                                                                        }}
                                                                        className="px-4 py-3 cursor-pointer hover:bg-green-50 text-sm text-gray-700 font-medium border-b border-gray-50 last:border-0"
                                                                    >
                                                                        {p.fullName}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* progresso geral */}
                                        <div className="space-y-4 p-6 bg-gradient-to-br from-cyan-50 to-white rounded-2xl border-2 border-cyan-100 shadow-lg hover:shadow-xl transition-all">
                                            <label className="block font-bold text-gray-800 text-lg flex items-center gap-3">
                                                <span className="text-2xl">📈</span>
                                                Progresso Geral
                                            </label>
                                            {calculateProgress() > 0 || (progressData?.objectives && progressData.objectives.length > 0) || (chartData?.metrics && Object.keys(chartData.metrics).length > 0) ? (
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-4 overflow-hidden shadow-inner">
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={calculateProgress()}
                                                            className="h-full rounded-full"
                                                            sx={{
                                                                backgroundColor: 'transparent',
                                                                '& .MuiLinearProgress-bar': {
                                                                    background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)',
                                                                    borderRadius: '9999px'
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-cyan-500 min-w-[60px] sm:min-w-[80px] text-right">
                                                        {Math.round(calculateProgress())}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <p className="text-sm text-gray-500">
                                                        Nenhum plano terapêutico ou métrica registrada para calcular progresso.
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Registre objetivos no plano terapêutico ou métricas nas evoluções.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* plano terapêutico atual */}
                                    {selectedPatient && (
                                        <div className="mb-10">
                                            <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Target className="h-6 w-6 text-green-600" />
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-900">
                                                                Plano Terapêutico Atual
                                                            </h3>
                                                            <p className="text-sm text-gray-500">
                                                                Progresso em relação aos objetivos definidos no plano.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {progressData?.currentPlan?.protocol && (
                                                        <div className="text-right text-sm text-gray-600">
                                                            <p className="font-semibold text-gray-800">
                                                                {progressData.currentPlan.protocol.name}
                                                            </p>
                                                            <p className="text-gray-500 text-xs">
                                                                Código: {progressData.currentPlan.protocol.code}
                                                            </p>
                                                            {progressData.currentPlan.reviewDate && (
                                                                <p className="text-gray-500 text-xs">
                                                                    Revisão em:{' '}
                                                                    {new Date(progressData.currentPlan.reviewDate).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {isLoading && (
                                                    <p className="text-sm text-gray-500 italic">
                                                        Carregando progresso...
                                                    </p>
                                                )}

                                                {!isLoading &&
                                                    (!progressData || !progressData.objectives || progressData.objectives.length === 0) && (
                                                        <p className="text-sm text-gray-500 italic">
                                                            Nenhum plano terapêutico estruturado encontrado para este paciente.
                                                        </p>
                                                    )}

                                                {!isLoading &&
                                                    progressData?.objectives &&
                                                    progressData.objectives.length > 0 && (
                                                        <div className="space-y-4 mt-4">
                                                            {progressData.objectives.map((obj: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    className="p-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">
                                                                                {obj.area}
                                                                            </p>
                                                                            <p className="text-sm font-semibold text-gray-800">
                                                                                {obj.description}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                Meta: {obj.target} • Atual: {obj.current ?? '-'}
                                                                            </p>
                                                                            {obj.targetDate && (
                                                                                <p className="text-xs text-gray-500">
                                                                                    Prazo alvo:{' '}
                                                                                    {new Date(obj.targetDate).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            )}
                                                                            {obj.projectedCompletion && (
                                                                                <p className="text-xs text-gray-500">
                                                                                    Projeção de conclusão:{' '}
                                                                                    {new Date(obj.projectedCompletion).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                                                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                                                                <span>
                                                                                    {obj.trend === 'improving' && 'Melhorando'}
                                                                                    {obj.trend === 'stable' && 'Estável'}
                                                                                    {obj.trend === 'regressing' && 'Regredindo'}
                                                                                    {!obj.trend && '-'}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-cyan-500">
                                                                                {Math.round(obj.progress ?? 0)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-3">
                                                                        <LinearProgress
                                                                            variant="determinate"
                                                                            value={obj.progress ?? 0}
                                                                            className="h-2 rounded-full"
                                                                            sx={{
                                                                                backgroundColor: '#e5e7eb',
                                                                                '& .MuiLinearProgress-bar': {
                                                                                    background:
                                                                                        'linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #22d3ee 100%)',
                                                                                    borderRadius: '9999px'
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPatient ? (
                                        <div className="space-y-6">
                                            {/* Header com ação */}
                                            <div className="flex flex-wrap justify-between items-center gap-3 p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-2 border-gray-200 shadow-md">
                                                <div>
                                                    <h3 className="font-bold text-lg sm:text-2xl text-gray-900 flex items-center gap-2 sm:gap-3">
                                                        <span className="text-2xl sm:text-3xl">📋</span>
                                                        Evoluções — {selectedPatientData.fullName}
                                                    </h3>
                                                    <p className="text-gray-500 text-sm mt-1">
                                                        {evaluations.length} registro{evaluations.length !== 1 ? 's' : ''} encontrado{evaluations.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => setIsAdding(true)}
                                                    className="bg-gradient-to-r from-green-600 to-cyan-500 hover:from-green-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                                >
                                                    <Plus className="h-5 w-5 mr-2" />
                                                    Nova Evolução
                                                </Button>
                                            </div>

                                            {/* Sub-tabs: Histórico / Gráfico */}
                                            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                                                <div className="border-b border-gray-200 px-4">
                                                    <nav className="flex gap-2 -mb-px">
                                                        <button
                                                            onClick={() => { setEvolutionSubTab('history'); setCurrentPage(1); }}
                                                            className={`px-5 py-3 text-sm font-semibold border-b-4 transition-all ${evolutionSubTab === 'history'
                                                                ? 'border-green-500 text-green-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                                                }`}
                                                        >
                                                            <Activity className="h-4 w-4 inline mr-2" />
                                                            Histórico
                                                        </button>
                                                        <button
                                                            onClick={() => setEvolutionSubTab('chart')}
                                                            className={`px-5 py-3 text-sm font-semibold border-b-4 transition-all ${evolutionSubTab === 'chart'
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                                                }`}
                                                        >
                                                            <BarChart3 className="h-4 w-4 inline mr-2" />
                                                            Gráfico
                                                        </button>
                                                    </nav>
                                                </div>

                                                <div className="p-4 sm:p-6">
                                                    {/* ─── ABA HISTÓRICO (Timeline Clínica) ─── */}
                                                    {evolutionSubTab === 'history' && (
                                                        <div className="space-y-4">
                                                            {evaluations.length > 0 ? (
                                                                <>
                                                                    {(() => {
                                                                        const totalPages = Math.ceil(evaluations.length / ITEMS_PER_PAGE);
                                                                        const start = (currentPage - 1) * ITEMS_PER_PAGE;
                                                                        const paginated = evaluations.slice(start, start + ITEMS_PER_PAGE);
                                                                        return (
                                                                            <>
                                                                                {/* Timeline vertical */}
                                                                                <div className="relative">
                                                                                    {/* Linha vertical */}
                                                                                    <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-200" />

                                                                                    {paginated.map((evaluation: any, index: number) => {
                                                                                        const realIndex = start + index;
                                                                                        const previous = evaluations[realIndex + 1] || null;
                                                                                        const badges = getTimelineBadges(evaluation, previous);
                                                                                        const isOpen = showDetails === realIndex;

                                                                                        return (
                                                                                            <div key={evaluation._id} className="relative pl-12 pb-8 last:pb-0">
                                                                                                {/* Dot na linha */}
                                                                                                <div className={`absolute left-2 top-2 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center shadow-sm ${
                                                                                                    badges.some(b => b.type === 'regression')
                                                                                                        ? 'border-red-400'
                                                                                                        : badges.some(b => b.type === 'improvement')
                                                                                                            ? 'border-green-400'
                                                                                                            : badges.some(b => b.type === 'protocol_change')
                                                                                                                ? 'border-blue-400'
                                                                                                                : 'border-gray-300'
                                                                                                }`}>
                                                                                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                                                                                        badges.some(b => b.type === 'regression')
                                                                                                            ? 'bg-red-400'
                                                                                                            : badges.some(b => b.type === 'improvement')
                                                                                                                ? 'bg-green-400'
                                                                                                                : badges.some(b => b.type === 'protocol_change')
                                                                                                                    ? 'bg-blue-400'
                                                                                                                    : 'bg-gray-300'
                                                                                                    }`} />
                                                                                                </div>

                                                                                                {/* Card */}
                                                                                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 hover:shadow-lg transition-all hover:border-green-200">
                                                                                                    {/* Header: data + badges + ações */}
                                                                                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                                                                        <div className="flex-1 min-w-[200px]">
                                                                                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                                                                                <span className="font-bold text-base text-gray-900">
                                                                                                                    {format(new Date(evaluation.date), 'dd/MM/yyyy')}
                                                                                                                </span>
                                                                                                                <span className="text-sm text-gray-500">
                                                                                                                    às {evaluation.time}
                                                                                                                </span>
                                                                                                            </div>

                                                                                                            {/* Badges clínicos */}
                                                                                                            {badges.length > 0 && (
                                                                                                                <div className="flex gap-2 flex-wrap">
                                                                                                                    {badges.map((badge, bIdx) => {
                                                                                                                        const styles = {
                                                                                                                            improvement: 'bg-green-50 text-green-700 border-green-200',
                                                                                                                            regression: 'bg-red-50 text-red-700 border-red-200',
                                                                                                                            stable: 'bg-gray-50 text-gray-600 border-gray-200',
                                                                                                                            protocol_change: 'bg-blue-50 text-blue-700 border-blue-200',
                                                                                                                            first: 'bg-amber-50 text-amber-700 border-amber-200',
                                                                                                                        }[badge.type];
                                                                                                                        const Icon = {
                                                                                                                            improvement: ArrowUp,
                                                                                                                            regression: ArrowDown,
                                                                                                                            stable: Minus,
                                                                                                                            protocol_change: GitBranch,
                                                                                                                            first: Activity,
                                                                                                                        }[badge.type];
                                                                                                                        return (
                                                                                                                            <span
                                                                                                                                key={bIdx}
                                                                                                                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border ${styles}`}
                                                                                                                            >
                                                                                                                                <Icon className="h-3 w-3" />
                                                                                                                                {badge.label}
                                                                                                                            </span>
                                                                                                                        );
                                                                                                                    })}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>

                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <Button
                                                                                                                variant="outline"
                                                                                                                size="sm"
                                                                                                                onClick={() => setShowDetails(isOpen ? null : realIndex)}
                                                                                                                className="text-gray-600 hover:text-green-600 border-2 border-gray-300 hover:border-green-400 rounded-xl p-2 transition-all hover:scale-110"
                                                                                                            >
                                                                                                                <ChevronDown
                                                                                                                    className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                                                                                                />
                                                                                                            </Button>
                                                                                                            <Button
                                                                                                                variant="outline"
                                                                                                                size="sm"
                                                                                                                disabled={deletingId === evaluation._id}
                                                                                                                onClick={() => handleDeleteEvaluation(evaluation._id)}
                                                                                                                className="text-red-600 border-2 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-400 rounded-xl p-2 transition-all hover:scale-110"
                                                                                                                title="Excluir avaliação"
                                                                                                            >
                                                                                                                <Trash2 className="h-5 w-5" />
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Linha resumo */}
                                                                                                    <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                                                                                                        <Users size={14} className="text-green-600" />
                                                                                                        <span className="font-medium">{evaluation.doctor?.fullName}</span>
                                                                                                        <span className="text-gray-400">•</span>
                                                                                                        <span>{evaluation.doctor?.specialty}</span>
                                                                                                    </div>

                                                                                                    {/* Tipos de avaliação */}
                                                                                                    {evaluation.evaluationTypes?.length > 0 && (
                                                                                                        <div className="flex gap-2 flex-wrap mt-2">
                                                                                                            {evaluation.evaluationTypes.map((type: string) => (
                                                                                                                <span
                                                                                                                    key={type}
                                                                                                                    className="px-2 py-0.5 text-2xs font-bold rounded-full bg-gradient-to-r from-green-100 to-cyan-100 text-green-800 border border-green-200"
                                                                                                                >
                                                                                                                    {type}
                                                                                                                </span>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {/* Detalhes expandidos */}
                                                                                                    {isOpen && (
                                                                                                        <div className="mt-5 space-y-5 pt-5 border-t-2 border-gray-200">
                                                                                                            <div>
                                                                                                                <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                                                                                                                    <span className="text-base">📊</span>
                                                                                                                    Métricas Registradas
                                                                                                                </h4>
                                                                                                                {evaluation.metrics && evaluation.metrics.length > 0 ? (
                                                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                                                                        {evaluation.metrics.map((metric: any) => (
                                                                                                                            <div
                                                                                                                                key={metric.name}
                                                                                                                                className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border-2 border-gray-200"
                                                                                                                            >
                                                                                                                                <span className="font-semibold text-gray-800 text-sm">{metric.name}</span>
                                                                                                                                <span className="bg-gradient-to-r from-green-500 to-cyan-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                                                                                                                    {metric.value}
                                                                                                                                </span>
                                                                                                                            </div>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <p className="text-gray-500 text-sm italic">Nenhuma métrica registrada</p>
                                                                                                                )}
                                                                                                            </div>

                                                                                                            <div>
                                                                                                                <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                                                                                                                    <span className="text-base">📝</span>
                                                                                                                    Relatório Clínico
                                                                                                                </h4>
                                                                                                                <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200">
                                                                                                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed font-light text-sm">
                                                                                                                        {evaluation.content || 'Nenhum relatório registrado'}
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                {/* Paginação */}
                                                                                {totalPages > 1 && (
                                                                                    <div className="flex items-center justify-between pt-4">
                                                                                        <p className="text-sm text-gray-500">
                                                                                            Página {currentPage} de {totalPages}
                                                                                        </p>
                                                                                        <div className="flex gap-2">
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                disabled={currentPage === 1}
                                                                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                                                                className="rounded-lg px-4"
                                                                                            >
                                                                                                Anterior
                                                                                            </Button>
                                                                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                                                                <button
                                                                                                    key={page}
                                                                                                    onClick={() => setCurrentPage(page)}
                                                                                                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === page
                                                                                                        ? 'bg-green-600 text-white shadow-md'
                                                                                                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-green-300'
                                                                                                        }`}
                                                                                                >
                                                                                                    {page}
                                                                                                </button>
                                                                                            ))}
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                disabled={currentPage === totalPages}
                                                                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                                                                className="rounded-lg px-4"
                                                                                            >
                                                                                                Próxima
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </>
                                                            ) : (
                                                                <div className="text-center py-16 bg-gradient-to-br from-green-50 to-cyan-50 rounded-2xl border-2 border-dashed border-green-200">
                                                                    <Activity className="h-16 w-16 mx-auto text-green-300 mb-4" />
                                                                    <p className="text-gray-700 font-bold text-lg mb-1">
                                                                        Nenhuma avaliação registrada
                                                                    </p>
                                                                    <p className="text-gray-400 text-sm mb-6">
                                                                        Registre a primeira evolução deste paciente
                                                                    </p>
                                                                    <Button
                                                                        onClick={() => setIsAdding(true)}
                                                                        className="bg-gradient-to-r from-green-600 to-cyan-500 hover:from-green-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                                                    >
                                                                        <Plus className="h-5 w-5 mr-2" />
                                                                        Adicionar Evolução
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
{/* ─── ABA GRÁFICO ─── */}
                                                    {evolutionSubTab === 'chart' && (
                                                        <div>
                                                            {chartData && chartData.dates && chartData.dates.length > 0 ? (
                                                                <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-3 sm:p-6 hover:shadow-2xl transition-shadow">
                                                                    <EvolutionChart chartData={chartData} />
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-16 bg-gradient-to-br from-green-50 to-cyan-50 rounded-2xl border-2 border-dashed border-green-200">
                                                                    <BarChart3 className="h-16 w-16 mx-auto text-green-300 mb-4" />
                                                                    <p className="text-gray-700 font-bold text-lg mb-1">
                                                                        Nenhum dado para exibir
                                                                    </p>
                                                                    <p className="text-gray-400 text-sm mb-6">
                                                                        Clique no botão abaixo para adicionar a primeira evolução e gerar os gráficos
                                                                    </p>
                                                                    <Button
                                                                        onClick={() => setIsAdding(true)}
                                                                        className="bg-gradient-to-r from-green-600 to-cyan-500 hover:from-green-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                                                    >
                                                                        <Plus className="h-5 w-5 mr-2" />
                                                                        Adicionar Evolução
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-24 bg-gradient-to-br from-green-50 to-cyan-50 rounded-2xl border-2 border-dashed border-green-200">
                                            <Activity className="h-24 w-24 mx-auto text-green-300 mb-8" />
                                            <p className="text-gray-700 font-bold text-2xl mb-3">
                                                Selecione um paciente
                                            </p>
                                            <p className="text-gray-500 text-lg">
                                                Escolha um paciente para visualizar a evolução terapêutica
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ✅ ABA ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl overflow-hidden">
                            <Card className="border-0">
                                <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-4 sm:p-8">
                                    <CardTitle className="flex items-center gap-3 text-white text-xl sm:text-3xl font-bold drop-shadow-lg">
                                        <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
                                        Analytics de Protocolos
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-3 sm:p-8">
                                    <ProtocolAnalytics specialty={(user as any)?.specialty} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
