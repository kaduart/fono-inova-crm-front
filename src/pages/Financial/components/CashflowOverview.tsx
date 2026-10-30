import { useEffect, useState } from 'react';
import { CashflowV2Data } from '../../../services/cashflowService';
import { commercialService, PackageEndingItem } from '../../../services/commercialService';
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const button = 'min-h-11 rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950';
interface Props {
    data: CashflowV2Data; periodLabel: string; patientsWithoutNext: number; patientsLoading: boolean; patientsError: boolean;
    patientsImpact: number; recurrent: number; onSchedule: () => void; onCollect: () => void;
    onBill: () => void; slotsAtRisk: number; slotImpact: number; onFit: () => void; onContact: (phone: string) => void;
}
export default function CashflowOverview(p: Props) {
    const { data } = p;
    const [packages, setPackages] = useState<PackageEndingItem[]>([]);
    const [packageState, setPackageState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [showPackages, setShowPackages] = useState(false);
    useEffect(() => {
        let active = true;
        setPackageState('loading');
        commercialService.packageEnding().then(items => { if (active) { setPackages(items); setPackageState('ready'); } })
            .catch(() => { if (active) setPackageState('error'); });
        return () => { active = false; };
    }, [data]);
    const pending = data.pendentesCobranca || [];
    const bills = data.conveniosAtendidos || [];
    const metrics = [
        { label: 'Caixa recebido', value: money(data.caixa.total), detail: p.periodLabel === 'do Dia' ? `Dia anterior: ${money(data.comparativos.ontem)} · ${data.comparativos.variacaoVsOntem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : 'Dinheiro recebido no período' },
        { label: 'Previsto da agenda', value: data.agenda ? money(data.agenda.previsto) : 'Não disponível', detail: data.agenda ? `${data.agenda.sessoes} sessões · faltas e cancelamentos fora do previsto` : 'Atualize o backend para consultar' },
        { label: `A receber ${p.periodLabel.toLowerCase()}`, value: money(pending.reduce((sum, item) => sum + item.valor, 0)), detail: `${pending.length} ${pending.length === 1 ? 'atendido sem pagamento' : 'atendidos sem pagamento'}` },
        { label: 'Atendidos', value: data.atendimentos ? `${data.atendimentos.realizados} / ${data.atendimentos.total}` : 'Não disponível', detail: data.atendimentos ? `${data.atendimentos.faltantes} aguardando · ${data.agenda?.faltasOuCancelados ?? 0} faltas/cancelamentos` : 'Contagem operacional indisponível' },
        { label: 'Ticket médio do caixa', value: money(data.estatisticas.ticketMedio), detail: `Acumulado do mês: ${money(data.comparativos.totalAcumuladoMes)}` },
    ];
    return <div className="mb-5 space-y-5 text-gray-900 dark:text-gray-100">
        <dl className="grid grid-cols-1 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white sm:grid-cols-2 lg:grid-cols-5 lg:divide-y-0 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
            {metrics.map(metric => <div key={metric.label} className="min-w-0 px-4 py-4"><dt className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">{metric.label}</dt><dd className="mt-2 text-xl font-bold tabular-nums">{metric.value}</dd><dd className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-300">{metric.detail}</dd></div>)}
        </dl>
        <section aria-labelledby="cashflow-actions"><h3 id="cashflow-actions" className="mb-2 text-sm font-semibold">O que fazer para não perder receita</h3>
            <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {pending.length > 0 && <Action title={`${pending.length} ${pending.length === 1 ? 'atendido sem pagamento' : 'atendidos sem pagamento'}`} detail={pending.map(item => item.paciente).join(', ')} value={money(pending.reduce((s, i) => s + i.valor, 0))} label="Cobrar" onClick={p.onCollect} />}
                {!p.patientsLoading && !p.patientsError && p.patientsWithoutNext > 0 && <Action title={`${p.patientsWithoutNext} pacientes sem próxima sessão`} detail={`${p.recurrent} recorrentes`} value={`${money(p.patientsImpact)}/mês`} label="Agendar" onClick={p.onSchedule} />}
                {packageState === 'ready' && packages.length > 0 && <Action title={`${packages.length} ${packages.length === 1 ? 'pacote acabando' : 'pacotes acabando'} (até 2 sessões)`} detail="Fila atual de renovação · valor da nova oferta a definir" value="" label="Renovar" onClick={() => setShowPackages(open => !open)} />}
                {p.slotsAtRisk > 0 && <Action title={`${p.slotsAtRisk} horários críticos na grade`} detail="Grade atual · confirme disponibilidade e candidatos" value={`${money(p.slotImpact)}/mês em risco`} label="Encaixar" onClick={p.onFit} />}
                {bills.length > 0 && <Action title={`${bills.length} ${bills.length === 1 ? 'atendimento' : 'atendimentos'} de convênio para faturar`} detail="Consultar os atendimentos e suas guias" value={money(bills.reduce((s, i) => s + i.valor, 0))} label="Faturar" onClick={p.onBill} />}
            </div>
            {p.patientsLoading && <p role="status" className="mt-2 text-sm text-gray-600 dark:text-gray-300">Consultando pacientes sem próxima sessão…</p>}
            {p.patientsError && <p role="alert" className="mt-2 text-sm">Não foi possível consultar pacientes sem próxima sessão. Selecione o período novamente para tentar.</p>}
            {packageState !== 'ready' && <p role="status" className="mt-2 text-sm text-gray-600 dark:text-gray-300">{packageState === 'loading' ? 'Consultando renovações…' : 'Não foi possível consultar as renovações. Atualize a tela para tentar novamente.'}</p>}
            {!pending.length && !bills.length && !p.slotsAtRisk && !p.patientsLoading && !p.patientsError && !p.patientsWithoutNext && packageState === 'ready' && !packages.length && <p className="py-3 text-sm text-gray-600 dark:text-gray-300">Nada pendente nas filas consultadas.</p>}
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Renovações e horários críticos mostram as filas atuais. Confirme a agenda antes de oferecer um encaixe.</p>
            {showPackages && <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"><h4 className="mb-2 font-semibold">Pacotes para renovar</h4>{packages.map(item => <div key={item.packageId} className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 py-3 dark:border-gray-700"><div><p className="font-medium">{item.name}</p><p className="text-sm text-gray-600 dark:text-gray-300">{item.specialty} · {item.remaining} sessões restantes</p></div>{item.phone ? <button type="button" className={button} onClick={() => p.onContact(item.phone)}>Abrir conversa</button> : <span className="text-sm">Telefone não informado</span>}</div>)}</div>}
        </section>
        <section aria-labelledby="cashflow-origin"><h3 id="cashflow-origin" className="mb-3 text-sm font-semibold">De onde veio o caixa</h3><div className="grid gap-5 md:grid-cols-2">
            <Breakdown title="Por forma de pagamento" values={[
                ['Pix', data.caixa.pix], ['Cartão', data.caixa.cartao], ['Dinheiro', data.caixa.dinheiro], ['Transferência', data.caixa.transferencia], ['Outros', data.caixa.outros]
            ]} />
            <Breakdown title="Por tipo" values={[
                ['Particular', data.porTipo.particular], ['Pacotes', data.porTipo.pacote], ['Convênio', data.porTipo.convenio], ['Liminar', data.porTipo.liminar]
            ]} />
        </div></section>
    </div>;
}
function Action({ title, detail, value, label, onClick }: { title: string; detail: string; value: string; label: string; onClick: () => void }) {
    return <div className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1 basis-48"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">{detail}</p></div><span className="text-sm font-semibold tabular-nums">{value}</span><button type="button" className={button} onClick={onClick}>{label}</button></div>;
}
function Breakdown({ title, values }: { title: string; values: [string, number][] }) {
    const items = values.filter(([, value]) => value > 0);
    return <div><h4 className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">{title}</h4><dl className="space-y-2">{items.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-sm"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money(value)}</dd></div>)}</dl>{!items.length && <p className="text-sm text-gray-600 dark:text-gray-300">Sem recebimentos.</p>}</div>;
}
