// Funil comercial por CANAL DE MARKETING (vem da atribuição, não da origem técnica).
// Fonte: GET /v2/analytics/roi/funnel-by-channel. Independe da fila do pixel.
import { useEffect, useState } from "react";
import { Users, Info, AlertTriangle, Unlink } from "lucide-react";
import API from "../../services/api";

type Row = {
  channel: string;
  contatos: number;
  preAgendamentos: number;
  agendamentos: number;
  conversao: number | null;
};
type Totals = { contatos: number; preAgendamentos: number; agendamentos: number; conversao: number | null };

const CH: Record<string, { label: string; dot: string }> = {
  meta_ads: { label: "Meta Ads", dot: "bg-blue-500" },
  instagram_ads: { label: "Instagram Ads", dot: "bg-pink-500" },
  instagram: { label: "Instagram", dot: "bg-pink-400" },
  facebook: { label: "Facebook", dot: "bg-blue-600" },
  tiktok_ads: { label: "TikTok Ads", dot: "bg-slate-800" },
  tiktok: { label: "TikTok", dot: "bg-slate-700" },
  google_ads: { label: "Google Ads", dot: "bg-amber-500" },
  google: { label: "Google", dot: "bg-amber-400" },
  gmb: { label: "Google Meu Negócio", dot: "bg-emerald-500" },
  indication: { label: "Indicação", dot: "bg-purple-500" },
  nao_identificado: { label: "Não identificado", dot: "bg-slate-300" },
};
const ch = (c: string) => CH[c] || { label: c, dot: "bg-slate-400" };
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const convTone = (v: number | null) =>
  v == null ? "bg-slate-100 text-slate-500"
    : v >= 0.3 ? "bg-emerald-100 text-emerald-700"
    : v >= 0.1 ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

function SemVinculo({ s }: { s: { agendamentos: number; preAgendamentos: number } }) {
  if (s.agendamentos + s.preAgendamentos === 0) return null;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <Unlink size={14} className="shrink-0 text-slate-400 mt-0.5" />
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-600">Agendamentos sem vínculo com contato:</span>{" "}
        {s.agendamentos} agendado(s){s.preAgendamentos ? `, ${s.preAgendamentos} pré-agendado(s)` : ""} — telefone sem Lead; mostrados à parte, fora da taxa de conversão.
      </p>
    </div>
  );
}

export default function ConversionFunnelPanel() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
  const [semVinculo, setSemVinculo] = useState({ agendamentos: 0, preAgendamentos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    API.get("/v2/analytics/roi/funnel-by-channel", { params: { days } })
      .then((r) => {
        if (!alive) return;
        setRows(r.data?.data || []);
        setTotals(r.data?.totals || { contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
        setSemVinculo(r.data?.semVinculo || { agendamentos: 0, preAgendamentos: 0 });
      })
      .catch((e) => {
        if (!alive) return;
        const st = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || "falha na requisição";
        setError(st ? `Erro ${st}: ${msg}` : `Sem resposta da API (${apiBase || "base não definida"}): ${msg}`);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days]);

  const DaySelect = (
    <select value={days} onChange={(e) => setDays(Number(e.target.value))}
      className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 transition">
      <option value={7}>Últimos 7 dias</option>
      <option value={30}>Últimos 30 dias</option>
      <option value={90}>Últimos 90 dias</option>
    </select>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Info size={13} className="shrink-0 text-slate-400" />
          Contagem de <span className="font-medium text-slate-600">contatos</span> (telefones) — não pacientes nem atendimentos.
        </p>
        {DaySelect}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="animate-pulse h-9 bg-slate-100 rounded-lg" />)}</div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Não carregou — isto é um erro, não “sem dados”.</p>
              <p className="text-xs text-red-600 mt-0.5 break-all">{error}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <Users size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nenhum contato neste período</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              A consulta respondeu normalmente — não há contatos registrados neste período.
            </p>
            <SemVinculo s={semVinculo} />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="text-left font-medium py-2 pr-3">Canal</th>
                  <th className="text-right font-medium py-2 px-3">Contatos recebidos</th>
                  <th className="text-right font-medium py-2 px-3">Pré-agendaram</th>
                  <th className="text-right font-medium py-2 px-3">Agendaram</th>
                  <th className="text-right font-medium py-2 pl-3">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.channel} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${ch(r.channel).dot}`} />
                        {ch(r.channel).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">{r.contatos}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-amber-600">{r.preAgendamentos}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-700">{r.agendamentos}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${convTone(r.conversao)}`}>{pct(r.conversao)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold text-slate-800">
                  <td className="py-2.5 pr-3">Total</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{totals.contatos}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-amber-600">{totals.preAgendamentos}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">{totals.agendamentos}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${convTone(totals.conversao)}`}>{pct(totals.conversao)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="text-[11px] text-slate-400 mt-3">
              Conversão = contatos que agendaram ÷ contatos recebidos do mesmo canal (mesma coorte do período). Canal vem da atribuição; remarcação e sessões recorrentes contam uma vez.
            </p>
            <SemVinculo s={semVinculo} />
          </div>
        )}
      </div>
    </div>
  );
}
