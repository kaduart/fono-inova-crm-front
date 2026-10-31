// Fila REAL de entrega às plataformas (AdConversion), separada dos números comerciais.
// Fonte: GET /v2/analytics/roi/delivery-status. "Aceita (API)" = resposta comprovou o
// recebimento (Meta events_received≥1, TikTok code:0). NÃO significa atribuída/otimizada.
import { useEffect, useState, type ReactNode } from "react";
import { Send, CheckCircle2, Clock, Ban, AlertTriangle, Info } from "lucide-react";
import API from "../../services/api";

type Platform = {
  pending: number; accepted: number; sentLegacy: number; ignored: number; failed: number;
  lastSentAt: string | null; reasons: Record<string, number>;
};
type Payload = { total: number; platforms: { meta: Platform; google: Platform; tiktok: Platform } };

const NAMES: Record<string, { label: string; accent: string }> = {
  meta: { label: "Meta", accent: "bg-blue-500" },
  tiktok: { label: "TikTok", accent: "bg-slate-800" },
  google: { label: "Google", accent: "bg-amber-500" },
};
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca";
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

const Stat = ({ icon, value, label, tone }: { icon: ReactNode; value: number; label: string; tone: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={tone}>{icon}</span>
    <span className={`text-lg font-bold tabular-nums ${tone}`}>{value}</span>
    <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
  </div>
);

function Card({ id, p }: { id: string; p: Platform }) {
  const meta = NAMES[id] || { label: id, accent: "bg-slate-400" };
  const reasons = Object.entries(p.reasons || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.accent}`} />{meta.label}
        </span>
        <span className="text-[10px] text-slate-400">últ. envio: {fmtDate(p.lastSentAt)}</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        <Stat icon={<Clock size={14} />} value={p.pending} label="Pendentes" tone="text-slate-500" />
        <Stat icon={<CheckCircle2 size={14} />} value={p.accepted} label="Aceitas (API)" tone="text-emerald-600" />
        <Stat icon={<Send size={14} />} value={p.sentLegacy} label="Histórico" tone="text-slate-400" />
        <Stat icon={<Ban size={14} />} value={p.ignored} label="Ignoradas" tone="text-slate-500" />
        <Stat icon={<AlertTriangle size={14} />} value={p.failed} label="Falhas" tone="text-red-500" />
      </div>
      {reasons.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Motivos</p>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map(([r, n]) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {r}<span className="font-semibold tabular-nums">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryStatusPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    API.get("/v2/analytics/roi/delivery-status", { params: { days } })
      .then((r) => { if (alive) setData(r.data || null); })
      .catch((e) => {
        if (!alive) return;
        const st = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || "falha na requisição";
        setError(st ? `Erro ${st}: ${msg}` : `Sem resposta da API (${apiBase || "base não definida"}): ${msg}`);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Info size={13} className="shrink-0 text-slate-400" />
          <span><span className="font-medium text-slate-600">Aceita (API)</span> = resposta comprovou o recebimento. Não é atribuição ao anúncio nem otimização.</span>
        </p>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 transition">
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse h-28 bg-slate-100 rounded-xl" />)}</div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Não carregou — isto é um erro, não “sem dados”.</p>
              <p className="text-xs text-red-600 mt-0.5 break-all">{error}</p>
            </div>
          </div>
        ) : !data || data.total === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <Send size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nenhum envio registrado no período</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">A fila de conversões (AdConversion) está vazia nesta janela no banco atual.</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-400 mb-3">{data.total} registro(s) de conversão na janela.</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Card id="meta" p={data.platforms.meta} />
              <Card id="tiktok" p={data.platforms.tiktok} />
              <Card id="google" p={data.platforms.google} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
