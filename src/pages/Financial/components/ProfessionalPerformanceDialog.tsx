// Faturamento x custo por profissional no mês (Despesas → "Faturamento x custo").
// Todos os números vêm do back (GET /expenses/commissions/performance); aqui só exibe.
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, Skeleton } from '@mui/material';
import { X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { expenseService, type ProfessionalPerformance } from '../../../services/expenseService';
import { notifyApiError } from '../../../utils/notifyApiError';
import { brl } from './finUi';

interface Props {
    open: boolean;
    month: number;
    year: number;
    onClose: () => void;
}

const ORIGINS = [
    { key: 'convenio', label: 'Convênio' },
    { key: 'pacote', label: 'Pacote' },
    { key: 'avulso', label: 'Avulso' },
    { key: 'liminar', label: 'Liminar' },
] as const;

const pct = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

const ProfessionalPerformanceDialog = ({ open, month, year, onClose }: Props) => {
    const [data, setData] = useState<ProfessionalPerformance | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        setLoading(true);
        setData(null);
        expenseService.getProfessionalPerformance(month, year)
            .then(d => { if (alive) setData(d); })
            .catch(err => notifyApiError(err, 'Erro ao carregar faturamento por profissional'))
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [open, month, year]);

    const monthLabel = format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ pr: 6 }}>
                <span className="block text-base font-semibold">Faturamento x custo por profissional</span>
                <span className="block text-xs text-gray-500 font-normal capitalize">{monthLabel}</span>
                <IconButton aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <X size={18} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <p className="text-xs text-gray-500 mb-3">
                    Faturou = valor das sessões realizadas no mês (mesma base da comissão). Custo = salário fixo,
                    quando o profissional é fixo, ou a comissão calculada pelas regras. Faltas não entram.
                </p>

                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={64} />)}
                    </div>
                )}

                {!loading && data && data.rows.length === 0 && (
                    <p className="text-sm text-gray-500 py-6 text-center">Nenhum atendimento realizado neste mês.</p>
                )}

                {!loading && data && data.rows.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            <Kpi label="Faturou" value={brl(data.totals.revenue)} />
                            <Kpi label="Custo profissionais" value={brl(data.totals.cost)} />
                            <Kpi label="Sobra para a clínica" value={brl(data.totals.result)} tone={data.totals.result < 0 ? 'neg' : 'pos'} />
                            <Kpi label="Custo / faturamento" value={pct(data.totals.costShare)} />
                        </div>

                        <ul className="space-y-2">
                            {data.rows.map(r => (
                                <li key={r.doctorId} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">{r.doctorName}</p>
                                            <p className="text-xs text-gray-500">
                                                {r.sessions} {r.sessions === 1 ? 'sessão' : 'sessões'}
                                                {r.patientsCount > 0 && <> · {r.patientsCount} {r.patientsCount === 1 ? 'paciente' : 'pacientes'}</>}
                                                {r.sessions > 0 && <> · ticket médio {brl(r.ticketAverage)}</>}
                                                {' · '}
                                                {r.compensationModel === 'fixed_monthly'
                                                    ? <span className="font-medium text-indigo-700">fixo {brl(r.fixedMonthlyAmount)}/mês</span>
                                                    : 'comissão por sessão'}
                                            </p>
                                        </div>
                                        <span className={`text-sm font-semibold whitespace-nowrap ${r.result < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                            {brl(r.result)}
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                        <div><span className="block text-gray-500">Faturou</span><span className="font-medium">{brl(r.revenue)}</span></div>
                                        <div><span className="block text-gray-500">Custo</span><span className="font-medium">{brl(r.cost)}</span></div>
                                        <div><span className="block text-gray-500">Custo / fat.</span><span className="font-medium">{pct(r.costShare)}</span></div>
                                    </div>
                                    {r.revenue > 0 && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            {ORIGINS.filter(o => r.revenueByOrigin?.[o.key] > 0)
                                                .map(o => `${o.label} ${brl(r.revenueByOrigin[o.key])}`)
                                                .join(' · ')}
                                        </p>
                                    )}
                                    {r.compensationModel === 'fixed_monthly' && r.sessions > 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Se fosse por comissão, custaria {brl(r.commissionIfPerSession)}
                                            {r.simulatedWithStandardRules ? ' (regra padrão da equipe: R$ 65 particular/pacote, R$ 50 convênio, R$ 65 liminar)' : ''}.
                                        </p>
                                    )}
                                    {r.missingCommissionRules && (
                                        <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                                            <AlertTriangle size={14} />
                                            Sem regra de comissão e sem salário fixo: não entra no "Gerar comissões". Configure no cadastro do profissional.
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) => (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
        <span className="block text-[11px] text-gray-500">{label}</span>
        <span className={`block text-sm font-semibold ${tone === 'neg' ? 'text-red-600' : tone === 'pos' ? 'text-emerald-700' : ''}`}>{value}</span>
    </div>
);

export default ProfessionalPerformanceDialog;
