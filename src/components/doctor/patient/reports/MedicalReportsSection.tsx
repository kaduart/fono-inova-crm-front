// Lista de relatórios do paciente (anamnese, escolar, médico) com criar, editar e excluir.
// Editar reabre o modal do próprio tipo, já preenchido. Editar/excluir só para quem escreveu
// ou para a equipe (o back confere de novo em routes/reports/index.js).
import { Calendar, Edit, FileText, Plus, RefreshCw, School, Search, Stethoscope, Trash2, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import reportsService from '../../../../services/reportsService';
import SchoolReportModal from './SchoolReportModal';
import MedicalReportModal from './MedicalReportModal';
import AnamnesisModal from './AnamnesisModal';
import { confirmDialog } from '../../../ui/ConfirmHost';
import { useAuth } from '../../../../contexts/AuthContext';
import { notifyApiError } from '../../../../utils/notifyApiError';
import { toast } from '../../../../utils/toast';

type Kind = 'medical' | 'anamnesis' | 'school';
interface Report {
    _id: string;
    type?: string;
    title: string;
    summary?: string;
    patientName?: string;
    date?: string;
    content?: any;
    createdBy?: string | { _id?: string };
    createdByName?: string;
    status?: string;
    createdAt?: string;
}

interface MedicalReportsSectionProps {
    patient: any;
    reportType: 'all' | Kind;
    /** Muda de valor para abrir o modal de "novo" (ex.: atalho da lista de pacientes). */
    createSignal?: number;
}

const KIND_UI: Record<Kind, { label: string; icon: React.ReactNode; cls: string; noun: string }> = {
    anamnesis: { label: 'Anamnese', icon: <User size={12} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', noun: 'a anamnese' },
    school: { label: 'Escolar', icon: <School size={12} />, cls: 'bg-violet-50 text-violet-700 border-violet-200', noun: 'o relatório escolar' },
    medical: { label: 'Médico', icon: <Stethoscope size={12} />, cls: 'bg-orange-50 text-orange-700 border-orange-200', noun: 'o relatório médico' },
};

const STATUS_UI: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    draft: { label: 'Rascunho', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    archived: { label: 'Arquivado', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    sent_to_school: { label: 'Enviado à escola', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    reviewed: { label: 'Revisado', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

// Datas de relatório vêm como "yyyy-mm-dd" ou ISO à meia-noite UTC: formatar pelo dia
// gravado, sem fuso (senão aparece o dia anterior no Brasil).
const fmtDay = (d?: string) => {
    if (!d) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
};

const kindOf = (r: Report, fallback: Kind): Kind =>
    r.type === 'anamnesis' || r.type === 'school' ? r.type : r.type ? 'medical' : fallback;

export default function MedicalReportsSection({ patient, reportType = 'all', createSignal }: MedicalReportsSectionProps) {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [modal, setModal] = useState<{ kind: Kind; report: Report | null } | null>(null);
    const [listRef] = useAutoAnimate<HTMLDivElement>();

    const pid = patient?._id;
    const defaultKind: Kind = reportType === 'all' ? 'medical' : reportType;
    const isStaff = ['admin', 'secretary'].includes(String(user?.role));
    const canChange = (r: Report) => {
        if (isStaff) return true;
        const author = typeof r.createdBy === 'object' ? r.createdBy?._id : r.createdBy;
        return !!author && !!user?._id && String(author) === String(user._id);
    };

    const fetchReports = useCallback(async () => {
        if (!pid) { setLoading(false); return; }
        setLoading(true);
        setLoadError(false);
        const params = { page: 1, limit: 100 };
        try {
            const kinds: Kind[] = reportType === 'all' ? ['medical', 'school', 'anamnesis'] : [reportType];
            const res = await Promise.all(kinds.map(k =>
                k === 'anamnesis' ? reportsService.getAnamnesisReports(pid, params)
                    : k === 'school' ? reportsService.getSchoolReports(pid, params)
                        : reportsService.getMedicalReports(pid, params)));
            setReports(res.flatMap((r: any) => r?.reports || r?.data || []));
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [pid, reportType]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const openNew = useCallback(() => { if (pid) setModal({ kind: defaultKind, report: null }); }, [pid, defaultKind]);

    // Atalho externo ("Nova anamnese" na lista de pacientes): abre o modal assim que monta.
    useEffect(() => { if (createSignal) openNew(); }, [createSignal, openNew]);

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return reports;
        return reports.filter(r => [r.title, r.summary, r.content?.diagnosis, r.createdByName]
            .some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
    }, [reports, searchTerm]);

    const save = async (kind: Kind, data: any) => {
        const editing = modal?.report;
        const payload = { ...data, patientId: pid, patientName: patient.fullName || patient.name };
        if (editing && kind === 'anamnesis') payload.title = editing.title; // título original (tem a data da entrevista)
        setSaving(true);
        try {
            let res: any;
            if (editing) {
                res = kind === 'anamnesis' ? await reportsService.updateAnamnesisReport(editing._id, payload)
                    : kind === 'school' ? await reportsService.updateSchoolReport(editing._id, payload)
                        : await reportsService.updateMedicalReport(editing._id, payload);
                setReports(prev => prev.map(r => (r._id === editing._id ? { ...r, ...(res?.report || payload) } : r)));
            } else {
                res = kind === 'anamnesis' ? await reportsService.createAnamnesisReport(payload)
                    : kind === 'school' ? await reportsService.createSchoolReport(payload)
                        : await reportsService.createMedicalReport(payload);
                if (res?.report) setReports(prev => [res.report, ...prev]);
                else fetchReports();
            }
            toast.success(editing ? 'Relatório atualizado' : kind === 'anamnesis' ? 'Anamnese salva' : 'Relatório salvo');
            setModal(null);
        } catch (e) {
            // O modal continua aberto com tudo preenchido; o aviso aparece por cima dele.
            notifyApiError(e, `Não foi possível salvar ${KIND_UI[kind].noun}. O que você preencheu continua no formulário.`);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (r: Report) => {
        const kind = kindOf(r, defaultKind);
        const ok = await confirmDialog(`"${r.title}" será excluído e não dá para desfazer.`, { title: `Excluir ${KIND_UI[kind].noun}?`, confirmText: 'Excluir' });
        if (!ok) return;
        try {
            if (kind === 'anamnesis') await reportsService.deleteAnamnesisReport(r._id);
            else if (kind === 'school') await reportsService.deleteSchoolReport(r._id);
            else await reportsService.deleteMedicalReport(r._id);
            setReports(prev => prev.filter(x => x._id !== r._id));
            toast.success('Relatório excluído');
        } catch (e) {
            notifyApiError(e, 'Não foi possível excluir o relatório');
        }
    };

    // Conteúdo para reabrir o modal certo já preenchido.
    const editData = (r: Report | null, kind: Kind) => {
        if (!r) return undefined;
        if (kind === 'medical') return { title: r.title, type: r.type, date: r.date, content: r.content, status: r.status };
        if (kind === 'school') return { ...(r.content || {}), title: r.title };
        return r.content || {};
    };

    const newLabel = reportType === 'anamnesis' ? 'Nova anamnese' : reportType === 'school' ? 'Novo relatório escolar' : 'Novo relatório';

    return (
        <div className="space-y-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                    <input type="search" placeholder="Buscar por título, diagnóstico ou autor" value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} aria-label="Buscar relatórios"
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <button type="button" onClick={openNew} disabled={!pid}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Plus size={16} aria-hidden /> {newLabel}
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Relatórios <span className="font-normal text-gray-500">({filtered.length})</span></h3>
                </div>

                {loading && reports.length === 0 ? (
                    <div className="space-y-2 p-4" aria-busy="true">
                        {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}
                    </div>
                ) : loadError ? (
                    <div className="px-4 py-10 text-center">
                        <p className="text-sm font-medium text-gray-900">Não foi possível carregar os relatórios.</p>
                        <p className="mt-1 text-sm text-gray-600">Confira a conexão e tente de novo.</p>
                        <button type="button" onClick={fetchReports} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <RefreshCw size={14} aria-hidden /> Tentar de novo
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                        <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" aria-hidden />
                        <p className="text-sm font-medium text-gray-900">{searchTerm ? 'Nada encontrado nessa busca' : 'Nenhum relatório ainda'}</p>
                        {!searchTerm && (
                            <button type="button" onClick={openNew} disabled={!pid} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
                                <Plus size={14} aria-hidden /> {newLabel}
                            </button>
                        )}
                    </div>
                ) : (
                    <div ref={listRef} className="divide-y divide-gray-100">
                        {filtered.map(r => {
                            const kind = kindOf(r, defaultKind);
                            const k = KIND_UI[kind];
                            const st = STATUS_UI[r.status || ''];
                            const editable = canChange(r);
                            return (
                                <div key={r._id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900">{r.title}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                                            {reportType === 'all' && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${k.cls}`}>{k.icon}{k.label}</span>}
                                            <span className="inline-flex items-center gap-1"><Calendar size={12} aria-hidden />{fmtDay(r.date || r.createdAt)}</span>
                                            {r.createdByName && <span>por {r.createdByName}</span>}
                                            {st && <span className={`rounded-full border px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span>}
                                        </div>
                                        {r.summary && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{r.summary}</p>}
                                    </div>
                                    {editable && (
                                        <div className="flex shrink-0 gap-1">
                                            <button type="button" onClick={() => setModal({ kind, report: r })}
                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                                                <Edit size={14} aria-hidden /> Editar
                                            </button>
                                            <button type="button" onClick={() => remove(r)}
                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400">
                                                <Trash2 size={14} aria-hidden /> Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AnamnesisModal open={modal?.kind === 'anamnesis'} onClose={() => setModal(null)} onSave={(d) => save('anamnesis', d)}
                patient={patient} loading={saving} initialData={modal?.kind === 'anamnesis' ? editData(modal.report, 'anamnesis') : undefined} />
            <SchoolReportModal open={modal?.kind === 'school'} onClose={() => setModal(null)} onSave={(d) => save('school', d)}
                patient={patient} loading={saving} initialData={modal?.kind === 'school' ? editData(modal.report, 'school') : undefined} />
            <MedicalReportModal open={modal?.kind === 'medical'} onClose={() => setModal(null)} onSave={(d) => save('medical', d)}
                patient={patient} loading={saving} initialData={modal?.kind === 'medical' ? editData(modal.report, 'medical') : undefined} />
        </div>
    );
}
