// Funil comercial por CANAL DE MARKETING (vem da atribuição, não da origem técnica).
// Fonte: GET /v2/analytics/roi/funnel-by-channel. Independe da fila do pixel.
import { useEffect, useState } from "react";
import API from "../../services/api";

type Row = {
  channel: string;
  contatos: number;
  preAgendamentos: number;
  agendamentos: number;
  conversao: number | null;
};
type Totals = { contatos: number; preAgendamentos: number; agendamentos: number; conversao: number | null };

const LABELS: Record<string, string> = {
  meta_ads: "Meta Ads (Facebook)",
  instagram_ads: "Instagram Ads",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok_ads: "TikTok Ads",
  tiktok: "TikTok",
  google_ads: "Google Ads",
  google: "Google",
  gmb: "Google Meu Negócio",
  indication: "Indicação",
  nao_identificado: "Não identificado",
};
const label = (c: string) => LABELS[c] || c;
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

export default function ConversionFunnelPanel() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    API.get("/v2/analytics/roi/funnel-by-channel", { params: { days } })
      .then((r) => {
        if (!alive) return;
        setRows(r.data?.data || []);
        setTotals(r.data?.totals || { contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
      })
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
        <h3 className="text-base font-semibold text-slate-800">Funil por canal de aquisição</h3>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700">
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Canal vem da atribuição (Meta, TikTok, Instagram, Google, indicação…). Unidade: contato (telefone distinto);
        remarcações e sessões recorrentes contam uma vez. Conversão = agendamentos ÷ contatos do mesmo canal.
      </p>

      {loading ? (
        <div className="animate-pulse h-32 bg-slate-100 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Não carregou — isto é um erro, não “sem dados”.</p>
          <p className="text-xs text-red-600 mt-1 break-all">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Sem contatos no período (consulta ok, resultado vazio).</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Canal</th>
                <th className="py-2 px-3 text-right">Contatos</th>
                <th className="py-2 px-3 text-right">Pré-agend. pendentes</th>
                <th className="py-2 px-3 text-right">Agendamentos</th>
                <th className="py-2 pl-3 text-right">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.channel} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 text-slate-700">{label(r.channel)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.contatos}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-amber-600">{r.preAgendamentos}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700">{r.agendamentos}</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{pct(r.conversao)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-800">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 px-3 text-right tabular-nums">{totals.contatos}</td>
                <td className="py-2 px-3 text-right tabular-nums text-amber-600">{totals.preAgendamentos}</td>
                <td className="py-2 px-3 text-right tabular-nums text-emerald-700">{totals.agendamentos}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{pct(totals.conversao)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
