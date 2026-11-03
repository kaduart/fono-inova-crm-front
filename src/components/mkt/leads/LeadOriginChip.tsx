import { Megaphone } from 'lucide-react';
import { leadOrigin, leadSpecialty } from '../../commercial/commercialCopy';

type Props = { lead: Parameters<typeof leadOrigin>[0]; full?: boolean };

/**
 * De onde o lead veio ("Google Ads · fala tardia") e a especialidade de interesse.
 * Dados que o back já grava (metaTracking/utm/origin); aqui só mostramos.
 */
export default function LeadOriginChip({ lead, full }: Props) {
    const o = leadOrigin(lead);
    const area = leadSpecialty(lead);
    if (!o && !area) return null;
    const text = [o?.label, o?.campaign, area && !o?.campaign?.toLowerCase().includes(area.slice(0, 4)) ? area : null].filter(Boolean).join(' · ');
    return (
        <span title={o?.campaign ? `Campanha: ${o.campaign}` : undefined}
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${o?.paid ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <Megaphone size={11} aria-hidden className="shrink-0" />
            <span className={full ? '' : 'truncate'}>{text}</span>
        </span>
    );
}
