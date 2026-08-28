// src/pages/Financial/tabs/RascunhosTab.tsx
// Aba "Rascunhos" — preparos de faturamento iniciados e não concluídos.
//
// Por que esta tela existe: criar um preparo grava um BillingSubmission em `draft`
// que RESERVA as sessões escolhidas. Fechar o wizard sem finalizar deixava o draft
// vivo, e aquelas sessões ficavam presas para sempre — a próxima tentativa de
// faturar batia num 409 BILLING_SUBMISSION_SESSION_RESERVED que não dizia quem
// estava segurando nem oferecia saída. O endpoint de cancelar já existia desde
// sempre; faltava qualquer caminho pela interface (achado 2026-08-11, depois de 5
// rascunhos vazados em 3 dias travarem o faturamento).
import { useCallback, useEffect, useState } from 'react';
import { Typography, Skeleton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { FileClock, Trash2, User, Calendar, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    listBillingSubmissions,
    cancelBillingSubmission,
    BillingSubmission
} from '../../../services/billingSubmissionService';
import { extractErrorMessage } from '../../../utils/errorUtils';

interface Props {
    onChanged?: () => void;
    onCountChange?: (count: number) => void;
    patientFilter?: string;
}

function patientNameOf(s: BillingSubmission) {
    return typeof s.patientId === 'object' ? s.patientId.fullName : '—';
}

function insuranceNameOf(s: BillingSubmission) {
    return typeof s.insuranceProviderId === 'object' ? s.insuranceProviderId.name : '—';
}

function fmtDateTime(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtCompetence(c?: string) {
    if (!c || !/^\d{4}-\d{2}$/.test(c)) return c || '—';
    const [y, m] = c.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Quantos dias o rascunho está parado — é o sinal de que foi abandonado, não de
// que alguém está trabalhando nele agora.
function daysSince(iso?: string) {
    if (!iso) return 0;
    const diff = Date.now() - new Date(iso).getTime();
    return Math.floor(diff / 86400000);
}

export default function RascunhosTab({ onChanged, onCountChange, patientFilter = '' }: Props) {
    const [items, setItems] = useState<BillingSubmission[]>([]);
    const filteredItems = patientFilter.trim()
        ? items.filter(s => patientNameOf(s).toLowerCase().includes(patientFilter.trim().toLowerCase()))
        : items;
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [target, setTarget] = useState<BillingSubmission | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listBillingSubmissions({ status: 'draft', limit: 100 });
            const data = res.data.data || [];
            setItems(data);
            onCountChange?.(data.length);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar rascunhos'));
        } finally {
            setLoading(false);
        }
    }, [onCountChange]);

    useEffect(() => { void load(); }, [load]);

    const handleCancel = async () => {
        if (!target) return;
        setCancelling(true);
        try {
            await cancelBillingSubmission(target._id);
            toast.success('Rascunho cancelado. As sessões foram liberadas.');
            setTarget(null);
            await load();
            // O faturamento de outras abas depende dessas sessões terem sido
            // liberadas — recarregar só esta lista deixaria o resto desatualizado.
            onChanged?.();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao cancelar rascunho'));
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="p-4">
            <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#B45309' }}>
                    <FileClock className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Preparos em aberto</h2>
                    <p className="text-sm text-gray-500">
                        Faturamentos iniciados e não concluídos. Enquanto estiverem aqui, as sessões
                        deles ficam reservadas e não podem ser faturadas de novo.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={104} />)}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FileClock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {items.length === 0 ? 'Nenhum preparo em aberto' : 'Nenhum rascunho encontrado'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {items.length === 0
                            ? 'Nenhuma sessão está reservada — todo faturamento iniciado foi concluído ou cancelado.'
                            : 'Nenhum resultado para o filtro de paciente aplicado.'}
                    </Typography>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredItems.map(s => {
                        const parado = daysSince(s.createdAt);
                        // 1 dia já é sinal: o preparo é feito e finalizado na mesma sessão de trabalho.
                        const alerta = parado >= 1;
                        return (
                            <div
                                key={s._id}
                                className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden"
                                style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
                            >
                                <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: alerta ? '#D97706' : '#94A3B8' }} />
                                <div className="pl-5 pr-4 py-3.5 flex items-start justify-between gap-3 flex-wrap">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <User size={14} className="text-slate-400 shrink-0" />
                                            <span className="text-[14.5px] font-bold text-slate-900 truncate">
                                                {patientNameOf(s)}
                                            </span>
                                            <span className="text-[12px] text-slate-500 font-medium">
                                                · {insuranceNameOf(s)}
                                            </span>
                                            {alerta && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-3xs font-bold text-amber-700">
                                                    parado há {parado} dia{parado !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[12px] text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar size={12} className="text-slate-400" />
                                                competência <span className="font-semibold text-slate-700 capitalize">{fmtCompetence(s.billingCompetence)}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Layers size={12} className="text-slate-400" />
                                                <span className="font-semibold text-slate-700">{s.sessionIds?.length || 0}</span>
                                                {' '}sess{(s.sessionIds?.length || 0) === 1 ? 'ão' : 'ões'} reservada{(s.sessionIds?.length || 0) !== 1 ? 's' : ''}
                                            </span>
                                            <span>iniciado em {fmtDateTime(s.createdAt)}</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setTarget(s)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-bold text-rose-700 transition hover:bg-rose-100 shrink-0"
                                    >
                                        <Trash2 size={13} /> Cancelar preparo
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!target} onClose={() => !cancelling && setTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Cancelar preparo?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '0.9rem' }}>
                        As <strong>{target?.sessionIds?.length || 0} sessões</strong> de{' '}
                        <strong>{target ? patientNameOf(target) : ''}</strong> voltam a ficar disponíveis
                        para faturamento.
                        <br /><br />
                        Nada é apagado: o rascunho fica registrado como cancelado. Nenhuma nota fiscal
                        ou envio ao convênio é afetado — este preparo nunca chegou a ser finalizado.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setTarget(null)} disabled={cancelling}>Voltar</Button>
                    <Button onClick={handleCancel} variant="contained" color="error" disabled={cancelling}>
                        {cancelling ? 'Cancelando...' : 'Cancelar preparo'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
