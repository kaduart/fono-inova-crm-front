// Ficha do paciente na visão do terapeuta, no padrão do Dashboard admin: cabeçalho enxuto,
// indicadores de frequência/presença (PatientInsights), dados clínicos à vista e o resto
// recolhido em "ver detalhes" (nada some). Seção atual fica na URL (?secao=).
// Dados: /v2/patients/:id (resumo: próxima/última sessão) + /patients/:id (cadastro e dados
// clínicos, que o resumo não traz) + /patients/:id/appointments-summary (frequência).
import {
    Activity, ArrowLeft, BarChart3, Calendar, ClipboardList, FileText, IdCard, MapPin,
    MessageCircle, Package, Phone, RefreshCw, School, Shield, Stethoscope,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import API from '../../../services/api';
import { getEvaluationsByPatient } from '../../../services/evaluationService';
import PackagesReadOnly from './PackagesReadOnly';
import MedicalReportsSection from './reports/MedicalReportsSection';
import PatientInsights, { FoldSection } from '../../patients/PatientInsights';
import PatientEvolution from '../../patients/PatientEvolution';
import { waLink } from '../../commercial/commercialCopy';

export type PatientSection = 'overview' | 'anamnesis' | 'school' | 'medical' | 'evolution' | 'packages';

interface PatientDetailProps {
    patientId?: string;
    onBack?: () => void;
    /** Seção para abrir (atalhos da lista de pacientes). */
    initialSection?: PatientSection;
    /** Muda de valor para abrir o modal de novo relatório da seção (anamnese/escolar/médico). */
    createSignal?: number;
}

const SECTIONS: { id: PatientSection; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Visão geral', icon: BarChart3 },
    { id: 'anamnesis', label: 'Anamnese', icon: ClipboardList },
    { id: 'school', label: 'Rel. escolares', icon: School },
    { id: 'medical', label: 'Rel. médicos', icon: FileText },
    { id: 'evolution', label: 'Evolução', icon: Activity },
    { id: 'packages', label: 'Pacotes', icon: Package },
];
const isSection = (v: string | null): v is PatientSection => !!v && SECTIONS.some(s => s.id === v);
// Compatibilidade com links antigos (?tab=anamnesis&create=new).
const legacyTab = (v: string | null): PatientSection | null => (v === 'anamnesis' || v === 'school' || v === 'medical' ? v : null);

// Datas do banco chegam como ISO à meia-noite UTC: ler o dia gravado, sem fuso
// (new Date().toLocaleDateString mostrava o dia anterior no Brasil).
const ymd = (d?: string | null) => (d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null);
const fmtDay = (d?: string | null) => { const m = ymd(d); return m ? `${m[3]}/${m[2]}/${m[1]}` : null; };
function ageOf(d?: string | null): number | null {
    const m = ymd(d);
    if (!m) return null;
    const now = new Date();
    let age = now.getFullYear() - Number(m[1]);
    const mm = now.getMonth() + 1 - Number(m[2]);
    if (mm < 0 || (mm === 0 && now.getDate() < Number(m[3]))) age -= 1;
    return age >= 0 && age < 130 ? age : null;
}
const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
const sessionText = (s?: { date?: string; time?: string } | null) => {
    const day = fmtDay(s?.date);
    return day ? `${day}${s?.time ? ` às ${s.time}` : ''}` : null;
};

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-36 shrink-0 text-xs font-medium text-gray-600">{label}</dt>
            <dd className="text-sm text-gray-900">{value || <span className="text-gray-500">Não informado</span>}</dd>
        </div>
    );
}

export default function PatientDetail({ patientId, onBack, initialSection, createSignal }: PatientDetailProps) {
    const { id: urlPatientId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const pid = patientId || urlPatientId;

    const fromUrl = isSection(params.get('secao')) ? params.get('secao') as PatientSection : legacyTab(params.get('tab'));
    const [section, setSection] = useState<PatientSection>(initialSection || fromUrl || 'overview');
    const [create, setCreate] = useState<number>(() => (params.get('create') === 'new' ? Date.now() : 0));

    const [patient, setPatient] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [evolutions, setEvolutions] = useState<any[] | null>(null);
    const [evoError, setEvoError] = useState(false);

    // Atalhos de fora (lista de pacientes) trocam a seção e pedem o modal de novo.
    useEffect(() => { if (initialSection) setSection(initialSection); }, [initialSection]);
    useEffect(() => { if (createSignal) setCreate(createSignal); }, [createSignal]);

    // Seção na URL para voltar/compartilhar no mesmo ponto.
    useEffect(() => {
        if (params.get('secao') === section && !params.get('tab') && !params.get('create')) return;
        const next = new URLSearchParams(params);
        next.set('secao', section);
        next.delete('tab');
        next.delete('create');
        setParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section]);

    const load = useCallback(async () => {
        if (!pid) { setError(true); setLoading(false); return; }
        setLoading(true);
        setError(false);
        const [view, raw, appts] = await Promise.allSettled([
            API.get(`/v2/patients/${pid}`),
            API.get(`/patients/${pid}`),
            API.get(`/patients/${pid}/appointments-summary`),
        ]);
        const v = view.status === 'fulfilled' ? (view.value.data?.data || view.value.data) : null;
        const r = raw.status === 'fulfilled' ? raw.value.data : null;
        if (!v && !r) { setError(true); setLoading(false); return; }
        // Cadastro completo primeiro; o resumo acrescenta próxima/última sessão e contagens.
        setPatient({ ...(r || {}), ...(v || {}), _id: pid, fullName: v?.fullName || r?.fullName });
        setAppointments(appts.status === 'fulfilled' ? (appts.value.data?.data || []) : []);
        setLoading(false);
    }, [pid]);

    useEffect(() => { load(); }, [load]);

    const loadEvolutions = useCallback(async () => {
        if (!pid) return;
        setEvoError(false);
        setEvolutions(null);
        try { setEvolutions(((await getEvaluationsByPatient(pid)) as any[]) || []); } catch { setEvoError(true); setEvolutions([]); }
    }, [pid]);
    useEffect(() => { if (section === 'evolution' && evolutions === null) loadEvolutions(); }, [section, evolutions, loadEvolutions]);

    const handleBack = () => (onBack ? onBack() : navigate('/patients'));
    const goCreate = (s: 'anamnesis' | 'school') => { setSection(s); setCreate(Date.now()); };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl space-y-4 text-left" aria-busy="true">
                <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
                <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
                <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
                <h3 className="text-base font-semibold text-gray-900">Não foi possível abrir a ficha deste paciente.</h3>
                <p className="mt-1 text-sm text-gray-600">Pode ser a conexão ou o cadastro foi removido.</p>
                <div className="mt-5 flex justify-center gap-2">
                    <button type="button" onClick={handleBack} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Voltar</button>
                    <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        <RefreshCw size={14} aria-hidden /> Tentar de novo
                    </button>
                </div>
            </div>
        );
    }

    const age = ageOf(patient.dateOfBirth);
    const birth = fmtDay(patient.dateOfBirth);
    const next = sessionText(patient.nextAppointment);
    const last = sessionText(patient.lastAppointment);
    const wa = waLink(patient.phone);
    const addr = patient.address || {};
    const addrText = [addr.street && `${addr.street}${addr.number ? `, ${addr.number}` : ''}`, addr.neighborhood || addr.district, addr.city && `${addr.city}${addr.state ? `/${addr.state}` : ''}`, addr.zipCode && `CEP ${addr.zipCode}`].filter(Boolean).join(' · ');
    const emergency = patient.emergencyContact?.name
        ? `${patient.emergencyContact.name}${patient.emergencyContact.relationship ? ` (${patient.emergencyContact.relationship})` : ''}${patient.emergencyContact.phone ? ` · ${patient.emergencyContact.phone}` : ''}`
        : null;

    const renderSection = () => {
        switch (section) {
            case 'overview':
                return (
                    <div className="space-y-4">
                        {appointments.length > 0
                            ? <PatientInsights appointments={appointments} />
                            : <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Ainda não há sessões registradas para medir frequência e presença.</p>}

                        <section className="rounded-xl border border-gray-200 bg-white p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Stethoscope size={16} className="text-emerald-700" aria-hidden /> Dados clínicos</h3>
                            <dl className="space-y-2.5">
                                <Info label="Queixa principal" value={patient.mainComplaint} />
                                <Info label="Histórico clínico" value={patient.clinicalHistory} />
                                <Info label="Medicações" value={patient.medications} />
                                <Info label="Alergias" value={patient.allergies} />
                                <Info label="Histórico familiar" value={patient.familyHistory} />
                            </dl>
                        </section>

                        <FoldSection title="Cadastro" icon={<IdCard size={16} />}
                            meta={[birth && `Nascimento ${birth}`, patient.healthPlan?.name || 'Particular', addr.city].filter(Boolean).join(' · ')}>
                            <dl className="space-y-2.5">
                                <Info label="Nascimento" value={birth} />
                                <Info label="Gênero" value={patient.gender} />
                                <Info label="Naturalidade" value={patient.placeOfBirth} />
                                <Info label="Profissão" value={patient.profession} />
                                <Info label="Estado civil" value={patient.maritalStatus} />
                                <Info label="Responsável" value={patient.legalGuardian} />
                                <Info label="CPF" value={patient.cpf} />
                                <Info label="RG" value={patient.rg} />
                                <Info label="E-mail" value={patient.email} />
                                <Info label="Convênio" value={patient.healthPlan?.name ? `${patient.healthPlan.name}${patient.healthPlan.policyNumber ? ` · ${patient.healthPlan.policyNumber}` : ''}` : 'Particular'} />
                                <Info label="Endereço" value={addrText} />
                                <Info label="Contato de emergência" value={emergency} />
                                <Info label="Uso de imagem" value={patient.imageAuthorization == null ? null : patient.imageAuthorization ? 'Autorizado' : 'Não autorizado'} />
                            </dl>
                        </FoldSection>
                    </div>
                );
            case 'anamnesis':
            case 'school':
            case 'medical':
                return <MedicalReportsSection key={section} patient={patient} reportType={section} createSignal={create || undefined} />;
            case 'evolution':
                if (evolutions === null) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" aria-busy="true" />;
                if (evoError) {
                    return (
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium text-gray-900">Não foi possível carregar as evoluções.</p>
                            <button type="button" onClick={loadEvolutions} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <RefreshCw size={14} aria-hidden /> Tentar de novo
                            </button>
                        </div>
                    );
                }
                return <PatientEvolution patientId={pid!} patientName={patient.fullName} initialEvolutions={evolutions} />;
            case 'packages':
                return <PackagesReadOnly patientId={pid} />;
            default:
                return null;
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-4 text-left">
            <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                <ArrowLeft size={16} aria-hidden /> Meus pacientes
            </button>

            {/* Cabeçalho */}
            <header className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-base font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" aria-hidden>{initials(patient.fullName)}</span>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold text-gray-900">{patient.fullName}</h1>
                            <p className="mt-0.5 text-sm text-gray-600">
                                {[age !== null && `${age} ${age === 1 ? 'ano' : 'anos'}`, patient.legalGuardian && `Responsável: ${patient.legalGuardian}`].filter(Boolean).join(' · ') || 'Idade não informada'}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700"><Shield size={12} aria-hidden />{patient.healthPlan?.name || 'Particular'}</span>
                                {addr.city && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700"><MapPin size={12} aria-hidden />{addr.city}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {patient.phone && (
                            <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Phone size={14} aria-hidden /> {patient.phone}
                            </a>
                        )}
                        {wa && (
                            <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400">
                                <MessageCircle size={14} aria-hidden /> WhatsApp
                            </a>
                        )}
                        <button type="button" onClick={() => goCreate('anamnesis')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                            <ClipboardList size={14} aria-hidden /> Nova anamnese
                        </button>
                        <button type="button" onClick={() => goCreate('school')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <School size={14} aria-hidden /> Rel. escolar
                        </button>
                    </div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-emerald-700 dark:text-emerald-400" aria-hidden />
                        <dt className="text-gray-600">Próxima sessão:</dt>
                        <dd className="font-semibold text-gray-900">{next || 'nenhuma agendada'}</dd>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-gray-500" aria-hidden />
                        <dt className="text-gray-600">Última sessão:</dt>
                        <dd className="font-semibold text-gray-900">{last || '—'}</dd>
                    </div>
                </dl>
            </header>

            {/* Seções */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 px-2" aria-label="Seções da ficha" role="tablist">
                    {SECTIONS.map(s => {
                        const Icon = s.icon;
                        const active = s.id === section;
                        return (
                            <button key={s.id} type="button" role="tab" aria-selected={active} onClick={() => { setSection(s.id); setCreate(0); }}
                                className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${active ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                                <Icon size={15} aria-hidden /> {s.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 sm:p-5">{renderSection()}</div>
            </div>
        </div>
    );
}
