/**
 * LeadJourneyPanel
 * Painel colapsável exibido no ChatWindow mostrando a jornada do lead no site:
 * origem, páginas visitadas, CTAs clicados e score.
 */

import { useEffect, useState } from 'react';
import { MapPin, Globe, MousePointer, TrendingUp, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import axios from 'axios';

interface PageVisit {
  url: string;
  title?: string;
  timestamp: string;
}

interface JourneyInteraction {
  type: string;
  ctaType?: string;
  page?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface LeadJourney {
  journeyId?: string;
  journeySource?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  pagesVisited?: PageVisit[];
  journeyTimeline?: JourneyInteraction[];
  hasClickedWhatsapp?: boolean;
  maxScrollDepth?: number;
  lpScore?: number;
  lpScoreGrade?: string;
  pageViews?: number;
  whatsappClicks?: number;
  sessionCount?: number;
}

interface Props {
  leadId: string | undefined;
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  landing_page: 'Landing Page',
  organic: 'Orgânico',
  direct: 'Direto',
  referral: 'Referência',
  whatsapp: 'WhatsApp',
};

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
};

export default function LeadJourneyPanel({ leadId }: Props) {
  const [journey, setJourney] = useState<LeadJourney | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setJourney(null);
    setLoading(true);
    axios
      .get(`/api/leads/${leadId}`)
      .then(({ data }) => {
        const lead = data.lead || data;
        setJourney({
          journeyId: lead.journeyId,
          journeySource: lead.journeySource,
          utmSource: lead.utmSource,
          utmMedium: lead.utmMedium,
          utmCampaign: lead.utmCampaign,
          landingPage: lead.landingPage,
          pagesVisited: lead.pagesVisited || [],
          journeyTimeline: lead.journeyTimeline || [],
          hasClickedWhatsapp: lead.hasClickedWhatsapp,
          maxScrollDepth: lead.maxScrollDepth,
          lpScore: lead.lpScore,
          lpScoreGrade: lead.lpScoreGrade,
          pageViews: lead.pageViews || 0,
          whatsappClicks: lead.whatsappClicks || 0,
          sessionCount: lead.sessionCount || 1,
        });
      })
      .catch(() => setJourney(null))
      .finally(() => setLoading(false));
  }, [leadId]);

  // Sem dados de jornada — não renderiza nada
  const hasData =
    journey &&
    (journey.journeyId ||
      (journey.pagesVisited && journey.pagesVisited.length > 0) ||
      journey.utmSource ||
      journey.landingPage);

  if (!leadId || loading || !hasData) return null;

  const source = journey.utmSource || journey.journeySource || 'direct';
  const sourceLabel = SOURCE_LABEL[source] || source;
  const pages = journey.pagesVisited ?? [];
  const whatsappClicks = journey.journeyTimeline?.filter(
    (i) => i.type === 'cta_click' && i.ctaType === 'whatsapp'
  ).length ?? journey.whatsappClicks ?? 0;

  return (
    <div className="border-b border-gray-100 bg-slate-50 text-xs">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-gray-600 hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          Jornada no site
          {journey.lpScoreGrade && (
            <span className={`px-1.5 py-0.5 rounded font-semibold ${GRADE_COLOR[journey.lpScoreGrade] ?? 'bg-gray-100 text-gray-600'}`}>
              {journey.lpScoreGrade}
            </span>
          )}
          <span className="text-gray-400">
            · {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
            {whatsappClicks > 0 && ` · ${whatsappClicks}x WhatsApp`}
          </span>
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Origem */}
          <div className="flex flex-wrap gap-3">
            <Chip icon={<MapPin className="w-3 h-3" />} label={sourceLabel} />
            {journey.utmCampaign && (
              <Chip icon={<TrendingUp className="w-3 h-3" />} label={journey.utmCampaign} />
            )}
            {journey.sessionCount && journey.sessionCount > 1 && (
              <Chip label={`${journey.sessionCount} sessões`} />
            )}
            {journey.maxScrollDepth != null && journey.maxScrollDepth > 0 && (
              <Chip label={`Scroll ${journey.maxScrollDepth}%`} />
            )}
          </div>

          {/* Landing page de entrada */}
          {journey.landingPage && (
            <div className="text-gray-500">
              <span className="font-medium text-gray-700">LP:</span>{' '}
              <span className="font-mono">{journey.landingPage}</span>
            </div>
          )}

          {/* Páginas visitadas */}
          {pages.length > 0 && (
            <div>
              <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Páginas visitadas
              </div>
              <ol className="space-y-0.5">
                {pages.slice(0, 6).map((p, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-gray-600">
                    <span className="text-gray-400 w-3 text-right">{i + 1}.</span>
                    <span className="font-mono truncate max-w-[200px]" title={p.url}>{p.url}</span>
                    <span className="text-gray-400 ml-auto shrink-0">
                      {new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
                {pages.length > 6 && (
                  <li className="text-gray-400 pl-4">+{pages.length - 6} mais</li>
                )}
              </ol>
            </div>
          )}

          {/* CTAs */}
          {whatsappClicks > 0 && (
            <div className="flex items-center gap-1.5 text-green-700">
              <MousePointer className="w-3 h-3" />
              Clicou no WhatsApp <strong>{whatsappClicks}x</strong> antes de entrar em contato
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">
      {icon}
      {label}
    </span>
  );
}
