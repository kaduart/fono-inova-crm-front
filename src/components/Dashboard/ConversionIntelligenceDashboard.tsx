// Aba "Inteligência de Conversão" — enxuta. Responde: de onde vieram os contatos,
// quantos pré-agendaram/agendaram, e se as conversões foram enviadas ao pixel.
// ROI/valor fica em "ROI & Atribuição"; follow-up em "Leads & Follow-up"; GMB em "Social Media".
// Período = PeriodBar PADRÃO da app (mesmo do ROI/Financeiro); start/end -> startDate/endDate.
import { Gauge } from 'lucide-react';
import { PeriodBar } from '../../pages/Financial/components/finUi';
import { CUR_MONTH, CUR_YEAR, useSalesPeriod } from '../mkt/SalesParts';
import ConversionFunnelPanel from './ConversionFunnelPanel';
import DeliveryStatusPanel from './DeliveryStatusPanel';

export default function ConversionIntelligenceDashboard() {
    const [period, setPeriod] = useSalesPeriod();

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6 max-w-5xl mx-auto w-full">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <Gauge size={18} className="text-teal-600" />
                </div>
                <div>
                    <h1 className="text-lg font-bold leading-tight text-gray-900">Inteligência de Conversão</h1>
                    <p className="text-xs text-gray-500">
                        Do contato ao agendamento, por canal — e se a conversão foi enviada ao pixel. Custo/ROI fica em ROI &amp; Atribuição.
                    </p>
                </div>
            </div>

            <PeriodBar value={period} month={CUR_MONTH} year={CUR_YEAR} onChange={setPeriod} />

            <ConversionFunnelPanel startDate={period.start} endDate={period.end} />
            <DeliveryStatusPanel startDate={period.start} endDate={period.end} />
        </div>
    );
}
