// Fila REAL de envio ao pixel (AdConversion) por Meta/TikTok/Google — bloco compacto.
// Fonte: GET /v2/analytics/roi/delivery-status. Aceita(API)=resposta comprovou o recebimento
// (Meta events_received>=1, TikTok code:0); NÃO é atribuição ao anúncio nem otimização.
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import API from "../../services/api";

type Platform = {
  pending: number; inconsistent: number; accepted: number; sentLegacy: number; ignored: number; failed: number;
  lastSentAt: string | null; reasons: Record<string, number>;
};
type Payload = { total: number; platforms: { meta: Platform; google: Platform; tiktok: Platform } };

const ORDER: [keyof Payload["platforms"], string, string][] = [
  ["meta", "Meta", "bg-blue-500"], ["tiktok", "TikTok", "bg-slate-800"], ["google", "Google Ads", "bg-amber-500"],
];
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca");
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

export default function DeliveryStatusPanel({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    API.get("/v2/analytics/roi/delivery-status", { params: { startDate, endDate } })
      .then((r) => { if (alive) setData(r.data || null); })
      .catch((e) => {
        if (!alive) return;
        const st = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || "falha na requisição";
        setError(st ? `Erro ${st}: ${msg}` : `Sem resposta da API (${apiBase || "base não definida"}): ${msg}`);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [startDate, endDate]);

  const plats = data?.platforms;
  const anyExtra = plats && ORDER.some(([k]) => plats[k].inconsistent > 0 || Object.keys(plats[k].reasons || {}).length > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Envio das conversões ao pixel</h3>
        <p className="text-[11px] text-slate-400">Fila real (AdConversion). Aceita = a API recebeu — não é atribuição nem otimização.</p>
      </div>

      {loading ? (
        <div className="animate-pulse h-20 bg-slate-100 rounded-lg" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 break-all">Não carregou (erro, não “sem dados”): {error}</div>
      ) : !plats || data?.total === 0 ? (
        <p className="text-xs text-slate-400">Nenhum envio registrado no período.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="text-left font-medium py-1.5 pr-2">Plataforma</th>
                <th className="text-right font-medium py-1.5 px-2">Pend.</th>
                <th className="text-right font-medium py-1.5 px-2">Aceitas</th>
                <th className="text-right font-medium py-1.5 px-2">Ignor.</th>
                <th className="text-right font-medium py-1.5 pl-2">Falhas</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map(([k, label, dot]) => {
                const p = plats[k];
                return (
                  <tr key={k} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 pr-2"><span className="inline-flex items-center gap-2 text-slate-700"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span></td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-500">{p.pending}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-700">{p.accepted}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-500">{p.ignored}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-red-500">{p.failed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {anyExtra && (
            <>
              <button type="button" onClick={() => setOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
                <ChevronDown size={12} className={open ? "rotate-180 transition" : "transition"} /> motivos e inconsistências
              </button>
              {open && (
                <div className="mt-2 space-y-2">
                  {ORDER.map(([k, label]) => {
                    const p = plats[k];
                    const reasons = Object.entries(p.reasons || {}).sort((a, b) => b[1] - a[1]);
                    if (p.inconsistent === 0 && reasons.length === 0 && !p.lastSentAt) return null;
                    return (
                      <div key={k} className="text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">{label}</span>
                        {p.lastSentAt && <span className="text-slate-400"> · últ. envio {fmtDate(p.lastSentAt)}</span>}
                        {p.inconsistent > 0 && <span className="text-amber-600"> · {p.inconsistent} pendente(s) em registro finalizado (inconsistência, não é envio ativo; histórico preservado)</span>}
                        {reasons.length > 0 && (
                          <span> · motivos: {reasons.map(([r, n]) => `${r} (${n})`).join(", ")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
