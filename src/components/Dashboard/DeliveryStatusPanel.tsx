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
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Envio das conversões ao pixel
          </h3>
          <p className="text-[11px] text-slate-400">Fila real (AdConversion). Aceita = a API recebeu — não é atribuição nem otimização.</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">diagnóstico técnico</span>
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
              <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
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
                  <tr key={k} className="border-b border-slate-100/70 last:border-0 dark:border-slate-800">
                    <td className="py-1.5 pr-2"><span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span></td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-500 dark:text-slate-300">{p.pending}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-700">{p.accepted}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-500 dark:text-slate-300">{p.ignored}</td>
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
