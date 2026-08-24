import { Building2, Check, Edit2, Inbox, Info, Landmark, Mail, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { activateConvenio, Convenio, deactivateConvenio, getConvenios } from '../../../services/insuranceService';
import ConvenioFormModal from './ConvenioFormModal';

interface ConvenioManagerModalProps { open: boolean; onClose: () => void; embedded?: boolean; }

const Pill = ({ children, className }: { children: React.ReactNode; className: string }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}>{children}</span>;
const iconButton = 'inline-grid min-h-10 min-w-10 place-items-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-500';

const ConvenioManagerModal = ({ open, onClose, embedded = false }: ConvenioManagerModalProps) => {
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);
    const [detailsConvenio, setDetailsConvenio] = useState<Convenio | null>(null);
    const [deactivationTarget, setDeactivationTarget] = useState<Convenio | null>(null);

    const loadConvenios = async () => {
        setLoading(true);
        try { setConvenios(await getConvenios(showInactive)); }
        catch { toast.error('Erro ao carregar convênios'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (open) loadConvenios(); }, [open, showInactive]);

    const handleEdit = (convenio: Convenio) => { setEditingConvenio(convenio); setFormModalOpen(true); };
    const handleDeactivate = async () => {
        if (!deactivationTarget) return;
        try { setLoading(true); await deactivateConvenio(deactivationTarget.code); toast.success('Convênio desativado'); setDeactivationTarget(null); await loadConvenios(); }
        catch (error: any) { toast.error(extractErrorMessage(error, 'Erro ao desativar')); }
        finally { setLoading(false); }
    };
    const handleActivate = async (code: string) => {
        try { setLoading(true); await activateConvenio(code); toast.success('Convênio reativado'); await loadConvenios(); }
        catch { toast.error('Erro ao reativar'); }
        finally { setLoading(false); }
    };
    const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const renewal = (convenio: Convenio) => {
        switch (convenio.guidePolicy?.renewalType) {
            case 'advance_authorization': return ['Solicitação prévia', 'bg-purple-50 text-purple-700 ring-purple-200'];
            case 'until_consumed': return ['Válida até esgotar', 'bg-blue-50 text-blue-700 ring-blue-200'];
            case 'fixed_date': return ['Renova em data fixa', 'bg-red-50 text-red-700 ring-red-200'];
            case 'authorization_validity': return ['Até vencer autorização', 'bg-amber-50 text-amber-700 ring-amber-200'];
            default: return ['Renovação mensal', 'bg-gray-50 text-gray-700 ring-gray-200'];
        }
    };

    const content = <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2"><h3 className="text-base font-semibold text-gray-900">Convênios cadastrados</h3><Pill className="bg-gray-50 text-gray-700 ring-gray-200">{convenios.length}</Pill></div>
            <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-xs font-medium text-gray-600"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />Mostrar inativos</label>
                <button type="button" onClick={loadConvenios} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Atualizar</button>
                <button type="button" onClick={() => { setEditingConvenio(null); setFormModalOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Novo convênio</button>
            </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500"><tr>{['Código', 'Nome', 'Valor sessão', 'Faturamento', 'Regra da guia', 'Dia de envio', 'Status', 'Pendentes', 'Ações'].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
                {loading && convenios.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Carregando convênios…</td></tr> : convenios.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500"><Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />Nenhum convênio encontrado</td></tr> : convenios.map((convenio) => {
                    const guideRenewal = renewal(convenio); const sendDay = convenio.guidePolicy?.renewalType === 'advance_authorization' ? convenio.guidePolicy?.priorAuthRequestDay : convenio.guidePolicy?.billingSubmissionDay;
                    return <tr key={convenio._id} className={`transition-colors hover:bg-gray-50 ${convenio.active ? '' : 'bg-gray-50/70 opacity-70'}`}>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-gray-600">{convenio.code}</td><td className="px-3 py-3"><p className="font-semibold text-gray-900">{convenio.name}</p>{convenio.notes && <p className="mt-0.5 max-w-56 truncate text-xs text-gray-500" title={convenio.notes}>{convenio.notes}</p>}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-gray-900">{money(convenio.sessionValue)}</td>
                        <td className="px-3 py-3 text-center"><Pill className={convenio.billingMode === 'per_guide' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}>{convenio.billingMode === 'per_guide' ? 'Por guia' : 'Mensal'}</Pill></td>
                        <td className="px-3 py-3 text-center"><Pill className={guideRenewal[1]}>{guideRenewal[0]}</Pill></td><td className="px-3 py-3 text-center">{sendDay ? <Pill className="bg-amber-50 text-amber-700 ring-amber-200">Dia {sendDay}</Pill> : <span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-3 text-center"><Pill className={convenio.active ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-700 ring-gray-200'}>{convenio.active ? 'Ativo' : 'Inativo'}</Pill></td>
                        <td className="px-3 py-3 text-right">{convenio.stats?.pendingSessions ? <Pill className="bg-amber-50 text-amber-700 ring-amber-200">{convenio.stats.pendingSessions} sessões</Pill> : <span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-3"><div className="flex justify-end gap-1"><button type="button" title="Como e para quem enviar" aria-label={`Ver detalhes de envio de ${convenio.name}`} onClick={() => setDetailsConvenio(convenio)} className={`${iconButton} text-purple-600 hover:bg-purple-50`}><Info className="h-4 w-4" /></button>{convenio.active ? <><button type="button" title="Editar" aria-label={`Editar ${convenio.name}`} onClick={() => handleEdit(convenio)} className={`${iconButton} text-emerald-700 hover:bg-emerald-50`}><Edit2 className="h-4 w-4" /></button><button type="button" title="Desativar" aria-label={`Desativar ${convenio.name}`} onClick={() => setDeactivationTarget(convenio)} className={`${iconButton} text-red-600 hover:bg-red-50`}><Trash2 className="h-4 w-4" /></button></> : <button type="button" onClick={() => handleActivate(convenio.code)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-emerald-600 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"><Check className="h-4 w-4" />Ativar</button>}</div></td>
                    </tr>;
                })}
            </tbody>
        </table></div></div>
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p><strong>Dica:</strong> o código do convênio é usado internamente pelo sistema. Use apenas letras minúsculas, números e hífen. O valor da sessão é aplicado automaticamente aos lotes de faturamento.</p></div>
    </div>;

    const overlays = <>
        <ConvenioFormModal open={formModalOpen} onClose={() => setFormModalOpen(false)} onSaved={loadConvenios} editingConvenio={editingConvenio} />
        {detailsConvenio && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsConvenio(null); }}><section role="dialog" aria-modal="true" aria-labelledby="convenio-details-title" className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><h3 id="convenio-details-title" className="font-bold text-gray-900">{detailsConvenio.name}</h3><p className="mt-0.5 text-xs text-gray-500">Como e para quem enviar</p></div><button type="button" aria-label="Fechar detalhes" onClick={() => setDetailsConvenio(null)} className={`${iconButton} -mr-2 -mt-2 text-gray-500 hover:bg-gray-100`}><X className="h-4 w-4" /></button></div><Details convenio={detailsConvenio} /><button type="button" onClick={() => { const selected = detailsConvenio; setDetailsConvenio(null); handleEdit(selected); }} className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus:outline-none focus:underline">Editar essas informações →</button></section></div>}
        {deactivationTarget && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="deactivate-title" className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"><h3 id="deactivate-title" className="text-lg font-bold text-gray-900">Desativar convênio?</h3><p className="mt-2 text-sm text-gray-600">{deactivationTarget.name} deixará de aparecer nas seleções ativas. O cadastro poderá ser reativado depois.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeactivationTarget(null)} className="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="button" onClick={handleDeactivate} disabled={loading} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Desativar</button></div></section></div>}
    </>;

    if (embedded) return <><div className="bg-gray-50">{content}</div>{overlays}</>;
    if (!open) return null;
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="convenio-manager-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"><header className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></span><div><h2 id="convenio-manager-title" className="text-lg font-bold text-gray-900">Gerenciar convênios</h2><p className="text-xs text-gray-500">Faturamento, tipo de guia e prazos de cada convênio</p></div></div><button type="button" aria-label="Fechar gerenciamento de convênios" onClick={onClose} className={`${iconButton} text-gray-500 hover:bg-gray-100`}><X className="h-5 w-5" /></button></header><div className="overflow-y-auto bg-gray-50 p-4 sm:p-6">{content}</div><footer className="flex justify-end border-t border-gray-100 px-5 py-4"><button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">Fechar</button></footer>{overlays}</section></div>;
};

const Details = ({ convenio }: { convenio: Convenio }) => {
    const policy = convenio.guidePolicy; const advance = policy?.renewalType === 'advance_authorization'; const email = advance ? policy?.priorAuthEmail : policy?.billingEmail; const day = advance ? policy?.priorAuthRequestDay : policy?.billingSubmissionDay;
    return <div className="mt-4 space-y-4 text-sm"><Detail icon={Mail} label={advance ? 'E-mail de autorização prévia' : 'E-mail de faturamento'} value={email || 'Não informado'} /><Detail icon={Info} label="Prazo" value={advance ? (day ? `Solicitar até dia ${day} do mês anterior` : 'Não informado') : [day ? `Dia ${day} do mês` : '', policy?.billingDeadlineDays != null ? `${policy.billingDeadlineDays} dias corridos após o atendimento` : ''].filter(Boolean).join(' · ') || 'Não informado'} />{(convenio.legalName || convenio.taxId) && <Detail icon={Landmark} label="Dados da NF" value={[convenio.legalName, convenio.taxId].filter(Boolean).join(' · ')} />}</div>;
};
const Detail = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => <div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" /><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-0.5 text-gray-800">{value}</p></div></div>;

export default ConvenioManagerModal;
