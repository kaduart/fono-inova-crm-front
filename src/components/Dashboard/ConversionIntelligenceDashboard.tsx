// src/components/Dashboard/ConversionIntelligenceDashboard.tsx
// Aba "Inteligência de Conversão" (Vendas & Marketing).
// Reúne, num lugar dedicado, a inteligência de conversão por canal — a mesma
// atribuição (conversa -> 1º agendamento -> valor) que alimenta a otimização
// do pixel (Meta/TikTok) via o loop de conversão do back:
//   - Resultado real por canal/anúncio .. AcquisitionByChannel     -> /v2/analytics/roi/acquisition(-by-ad)
//        (TikTok Ads, Meta Ads, Google, GMB, ChatGPT — com lançamento de gasto por anúncio)
//   - Conversão por origem do lead ...... FollowupConversionChart   -> /followups/conversion-by-origin
//   - KPIs de follow-up/conversão ....... FollowupInsights          -> /followups/analytics
//   - Funil GMB (leads -> agendados) .... GmbConversionDashboard    -> /gmb/conversion-metrics
// O custo/retorno consolidado por canal fica na aba "ROI & Atribuição" (RoiTab).
import type { ReactNode } from 'react';
import { Gauge, Radio, TrendingUp } from 'lucide-react';
import AcquisitionByChannel from './AcquisitionByChannel';
import ConversionFunnelPanel from './ConversionFunnelPanel';
import DeliveryStatusPanel from './DeliveryStatusPanel';
import FollowupInsights from './FollowupInsights';
import FollowupConversionChart from './FollowupConversionChart';
import GmbConversionDashboard from './GmbConversionDashboard';

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
                {icon}
            </div>
            <div>
                <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
        </div>
    );
}

export default function ConversionIntelligenceDashboard() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 shadow-sm md:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Gauge size={22} className="text-teal-600" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                        Inteligência de Conversão
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-600">
                        Do contato ao agendamento, por canal. É a mesma leitura que o loop de conversão
                        envia ao pixel (Meta/TikTok) para o algoritmo caçar quem realmente agenda — aqui
                        local para decisões rápidas. Custo/retorno consolidado fica em{' '}
                        <span className="font-medium text-emerald-700">ROI &amp; Atribuição</span>.
                    </p>
                </div>
            </div>

            {/* Funil comercial por canal — vem da atribuição, independe do pixel */}
            <section className="flex flex-col gap-3">
                <SectionTitle
                    icon={<Gauge size={16} className="text-emerald-600" />}
                    title="Funil comercial por canal"
                    subtitle="Contatos → pré-agendamentos → agendamentos por canal de marketing (independe do pixel)"
                />
                <ConversionFunnelPanel />
            </section>

            {/* Entrega das conversões às plataformas — fila real do AdConversion */}
            <section className="flex flex-col gap-3">
                <SectionTitle
                    icon={<Radio size={16} className="text-emerald-600" />}
                    title="Entrega das conversões às plataformas"
                    subtitle="Fila real de envio ao pixel (pendente/aceita/ignorada/falha) — separada dos números comerciais"
                />
                <DeliveryStatusPanel />
            </section>

            {/* Resultado real por canal/anúncio — o que alimenta o pixel */}
            <section className="flex flex-col gap-3">
                <SectionTitle
                    icon={<Radio size={16} className="text-emerald-600" />}
                    title="Resultado real por canal e anúncio"
                    subtitle="TikTok, Meta, Google, GMB e ChatGPT: conversas → agendamento → valor (lance o gasto por anúncio para ver o ROI)"
                />
                <AcquisitionByChannel />
            </section>

            {/* Conversão por origem */}
            <section className="flex flex-col gap-3">
                <SectionTitle
                    icon={<Gauge size={16} className="text-blue-600" />}
                    title="Conversão por origem"
                    subtitle="Quanto cada fonte de lead vira paciente"
                />
                <FollowupConversionChart />
            </section>

            {/* KPIs de follow-up / conversão */}
            <section className="flex flex-col gap-3">
                <SectionTitle
                    icon={<TrendingUp size={16} className="text-emerald-600" />}
                    title="Desempenho de follow-up"
                    subtitle="Volume, resposta, melhor horário e taxa de conversão"
                />
                <FollowupInsights />
            </section>

            {/* Funil GMB por ângulo/especialidade */}
            <section className="flex flex-col gap-3">
                <SectionTitle
                    icon={<TrendingUp size={16} className="text-teal-600" />}
                    title="Funil de aquisição (GMB)"
                    subtitle="Leads → agendados, por abordagem e especialidade"
                />
                <GmbConversionDashboard />
            </section>
        </div>
    );
}
