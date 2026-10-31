// Fila REAL de entrega às plataformas (AdConversion), separada dos números comerciais.
// Fonte: GET /v2/analytics/roi/delivery-status. "Aceita" = a API recebeu o evento
// (NÃO significa atribuída ao anúncio nem usada na otimização).
import { useEffect, useState } from "react";
import API from "../../services/api";

type Platform = {
  pending: number;
  accepted: number;
  ignored: number;
  failed: number;
  lastSentAt: string | null;
  reasons: Record<string, number>;
};
type Payload = { total: number; platforms: { meta: Platform; google: Platform; tiktok: Platform } };

const NAMES: Record<string, string> = { meta: "Meta", tiktok: "TikTok", google: "Google" };
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

function Card({ id, p }: { id: string; p: Platform }) {
  const reasons = Object.entries(p.reasons || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-800">{NAMES[id] || id}</h4>
        <span className="text-xs text-slate-400">último envio: {fmtDate(p.lastSentAt)}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div><div className="text-lg font-bold text-slate-700 tabular-nums">{p.pending}</div><div className="text-[11px] text-slate-500">Pendentes</div></div>
        <div><div className="text-lg font-bold text-emerald-700 tabular-nums">{p.accepted}</div><div className="text-[11px] text-slate-500">Aceitas</div></div>
        <div><div className="text-lg font-bold text-slate-500 tabular-nums">{p.ignored}</div><div className="text-[11px] text-slate-500">Ignoradas</div></div>
        <div><div className="text-lg font-bold text-red-600 tabular-nums">{p.failed}</div><div className="text-[11px] text-slate-500">Falhas</div></div>
      </div>
      {reasons.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <p className="text-[11px] text-slate-400 mb-1">Motivos (ignoradas/falhas):</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            {reasons.map(([r, n]) => (
              <li key={r} className="flex justify-between"><span className="truncate pr-2">{r}</span><span className="tabular-nums">{n}</span></li>
            ))}
          </ul>
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
    setLoading(true);
    setError(null);
    API.get("/v2/analytics/roi/delivery-status", { params: { days } })
      .then((r) => { if (alive) setData(r.data || null); })
      .catch((e) => {
        if (!alive) return;
        const status = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || "falha na requisição";
        setError(status ? `Erro ${status}: ${msg}` : `Não foi possível falar com a API (${apiBase || "base não definida"}): ${msg}`);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-slate-800">Entrega das conversões às plataformas</h3>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700">
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Fila real do envio (registro AdConversion). <strong>Aceita</strong> = a API recebeu o evento —
        não significa atribuída ao anúncio nem usada na otimização (isso se confirma no Ads/Events Manager).
      </p>

      {loading ? (
        <div className="animate-pulse h-28 bg-slate-100 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Não carregou — isto é um erro, não “sem dados”.</p>
          <p className="text-xs text-red-600 mt-1 break-all">{error}</p>
        </div>
      ) : !data || data.total === 0 ? (
        <p className="text-sm text-slate-500">Nenhum registro de envio no período (consulta ok, fila vazia).</p>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">{data.total} registro(s) no período.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Card id="meta" p={data.platforms.meta} />
            <Card id="tiktok" p={data.platforms.tiktok} />
            <Card id="google" p={data.platforms.google} />
          </div>
        </>
      )}
    </div>
  );
}
