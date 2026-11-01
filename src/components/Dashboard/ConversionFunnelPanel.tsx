// Funil comercial por CANAL (atribuição). Fonte: GET /v2/analytics/roi/funnel-by-channel.
// Enxuto: 4 indicadores + 1 tabela por canal. Clique na linha abre os contatos (nome/telefone/status).
// Período vem do filtro do topo (startDate/endDate). Detalhe por LP fica na aba Analytics do Site.
import { useEffect, useState } from "react";
import { Unlink, ChevronDown, ChevronRight } from "lucide-react";
import API from "../../services/api";

type Detalhe = { nome: string | null; telefone: string; status: "agendou" | "pre" | "contato" };
type Row = { channel: string; contatos: number; preAgendamentos: number; agendamentos: number; conversao: number | null; detalhes?: Detalhe[] };
type Totals = { contatos: number; preAgendamentos: number; agendamentos: number; conversao: number | null };

const CH: Record<string, { label: string; dot: string }> = {
  meta_ads: { label: "Meta Ads", dot: "bg-blue-500" }, instagram_ads: { label: "Instagram Ads", dot: "bg-pink-500" },
  instagram: { label: "Instagram", dot: "bg-pink-400" }, facebook: { label: "Facebook", dot: "bg-blue-600" },
  tiktok_ads: { label: "TikTok Ads", dot: "bg-slate-800" }, tiktok: { label: "TikTok", dot: "bg-slate-700" },
  google_ads: { label: "Google Ads", dot: "bg-amber-500" }, google: { label: "Google (orgânico)", dot: "bg-amber-300" },
  gmb: { label: "Google Meu Negócio", dot: "bg-emerald-500" }, indication: { label: "Indicação", dot: "bg-purple-500" },
  nao_identificado: { label: "Não identificado", dot: "bg-slate-300" },
};
const ch = (c: string) => CH[c] || { label: c, dot: "bg-slate-400" };
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(0)}%`);
const convTone = (v: number | null) => (v == null ? "text-slate-400" : v >= 0.3 ? "text-emerald-700" : v >= 0.1 ? "text-amber-600" : "text-slate-500");
const ST: Record<Detalhe["status"], { label: string; cls: string }> = {
  agendou: { label: "Agendou", cls: "bg-emerald-50 text-emerald-700" },
  pre: { label: "Pré", cls: "bg-amber-50 text-amber-700" },
  contato: { label: "Só contato", cls: "bg-slate-100 text-slate-500" },
};
const SDOT: Record<Detalhe["status"], string> = { agendou: "bg-emerald-500", pre: "bg-amber-500", contato: "bg-slate-300" };
const fone = (p: string) => { const d = (p || "").replace(/\D/g, "").replace(/^55/, ""); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : p; };
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

function Kpi({ label, value, tone = "text-slate-800" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className={`text-xl font-bold leading-tight tabular-nums ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function ConversionFunnelPanel({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
  const [semVinculo, setSemVinculo] = useState({ agendamentos: 0, preAgendamentos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setOpen(null);
    API.get("/v2/analytics/roi/funnel-by-channel", { params: { startDate, endDate, details: 1 } })
      .then((r) => {
        if (!alive) return;
        setRows(r.data?.data || []);
        setTotals(r.data?.totals || { contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
        setSemVinculo(r.data?.semVinculo || { agendamentos: 0, preAgendamentos: 0 });
      })
      .catch((e) => {
        if (!alive) return;
        const st = e?.response?.status; const msg = e?.response?.data?.message || e?.message || "falha na requisição";
        setError(st ? `Erro ${st}: ${msg}` : `Sem resposta da API (${apiBase || "base não definida"}): ${msg}`);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [startDate, endDate]);

  const orphan = semVinculo.agendamentos + semVinculo.preAgendamentos;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">De onde vieram e quanto agendaram</h3>
        <p className="text-[11px] text-slate-400">Contatos (telefones) por canal de marketing — independe do pixel. Clique num canal para ver os contatos.</p>
      </div>

      {loading ? (
        <div className="animate-pulse h-28 bg-slate-100 rounded-lg" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 break-all">Não carregou (erro, não “sem dados”): {error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Kpi label="Contatos recebidos" value={totals.contatos} />
            <Kpi label="Pré-agendaram" value={totals.preAgendamentos} tone="text-amber-600" />
            <Kpi label="Agendaram" value={totals.agendamentos} tone="text-emerald-700" />
            <Kpi label="Conversão" value={pct(totals.conversao)} tone={convTone(totals.conversao)} />
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 mt-3">Sem contatos no período.</p>
          ) : (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="text-left font-medium py-1.5 pr-2">Canal</th>
                  <th className="text-right font-medium py-1.5 px-2">Contatos</th>
                  <th className="text-right font-medium py-1.5 px-2">Pré</th>
                  <th className="text-right font-medium py-1.5 px-2">Agend.</th>
                  <th className="text-right font-medium py-1.5 pl-2">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = open === r.channel;
                  const det = r.detalhes || [];
                  return (
                    <>
                      <tr key={r.channel} onClick={() => setOpen(isOpen ? null : r.channel)}
                        className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50">
                        <td className="py-1.5 pr-2">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            {det.length ? (isOpen ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />) : <span className="w-[13px]" />}
                            <span className={`h-2 w-2 rounded-full ${ch(r.channel).dot}`} />{ch(r.channel).label}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{r.contatos}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-amber-600">{r.preAgendamentos}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-700">{r.agendamentos}</td>
                        <td className={`py-1.5 pl-2 text-right tabular-nums font-medium ${convTone(r.conversao)}`}>{pct(r.conversao)}</td>
                      </tr>
                      {isOpen && det.length > 0 && (
                        <tr key={r.channel + "-det"} className="bg-slate-50/50">
                          <td colSpan={5} className="p-0">
                            <div className="mx-1.5 my-1.5 overflow-hidden rounded-lg border border-slate-200/70 bg-white">
                              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Contatos · {ch(r.channel).label}</span>
                                <span className="text-[10px] tabular-nums text-slate-400">{det.length}</span>
                              </div>
                              <ul className="max-h-64 divide-y divide-slate-50 overflow-auto">
                                {det.map((d, i) => (
                                  <li key={i} className="flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-slate-50">
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SDOT[d.status]}`} />
                                    <span className="min-w-0 max-w-[48%] truncate text-slate-700">{d.nome || "— sem nome —"}</span>
                                    <a href={`https://wa.me/${(d.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()} className="shrink-0 tabular-nums text-xs text-slate-400 hover:text-teal-600">{fone(d.telefone)}</a>
                                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ST[d.status].cls}`}>{ST[d.status].label}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}

          {orphan > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Unlink size={12} /> {semVinculo.agendamentos} agendado(s) sem vínculo com contato (telefone sem Lead) — fora da conversão.
            </p>
          )}

          <button type="button" onClick={() => setShowHelp((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
            <ChevronDown size={12} className={showHelp ? "rotate-180 transition" : "transition"} /> como é calculado
          </button>
          {showHelp && (
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Unidade = contato (telefone distinto), não pacientes nem sessões; remarcação e recorrência contam uma vez.
              Canal vem da atribuição de marketing (não de insurance_plan/guide/reschedule). Conversão = contatos que agendaram ÷ contatos recebidos da mesma coorte, por canal. Detalhe por LP fica em Analytics do Site.
            </p>
          )}
        </>
      )}
    </div>
  );
}
