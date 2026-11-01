// Funil comercial por CANAL (atribuição). Fonte: GET /v2/analytics/roi/funnel-by-channel.
// Enxuto: 4 indicadores + 1 tabela por canal. Clique na linha abre os contatos (nome/telefone/status).
// Período vem do filtro do topo (startDate/endDate). Detalhe por LP fica na aba Analytics do Site.
import { Fragment, useEffect, useMemo, useState } from "react";
import { Unlink, ChevronDown, ChevronRight, MessageCircle, Trophy } from "lucide-react";
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
  agendou: { label: "Agendou", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  pre: { label: "Pré", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  contato: { label: "Só contato", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};
const SDOT: Record<Detalhe["status"], string> = { agendou: "bg-emerald-500", pre: "bg-amber-500", contato: "bg-slate-300" };
const fone = (p: string) => { const d = (p || "").replace(/\D/g, "").replace(/^55/, ""); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : p; };
const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || "";

function MiniBar({ v }: { v: number | null }) {
  const w = v == null ? 0 : Math.max(4, Math.min(100, v * 100));
  return (
    <span className="hidden sm:inline-block h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 align-middle">
      <span className="block h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${w}%` }} />
    </span>
  );
}

type Filtro = "todos" | Detalhe["status"];
const FILTROS: { k: Filtro; label: string }[] = [
  { k: "todos", label: "Todos" }, { k: "pre", label: "Pré" }, { k: "agendou", label: "Agendou" }, { k: "contato", label: "Só contato" },
];

export default function ConversionFunnelPanel({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ contatos: 0, preAgendamentos: 0, agendamentos: 0, conversao: null });
  const [semVinculo, setSemVinculo] = useState({ agendamentos: 0, preAgendamentos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setOpen(null); setFiltro("todos");
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
  // Inteligência comercial (só leitura, calculada no front a partir do mesmo payload):
  // melhor canal com volume e quantos "Pré" ainda dá para converter.
  const melhor = useMemo(() => {
    const cand = rows.filter((r) => r.conversao != null && r.contatos >= 1 && r.channel !== "nao_identificado");
    return cand.sort((a, b) => (b.conversao ?? 0) - (a.conversao ?? 0) || b.contatos - a.contatos)[0] || null;
  }, [rows]);
  const soContato = Math.max(0, totals.contatos - totals.agendamentos - totals.preAgendamentos);
  const seg = (n: number) => (totals.contatos > 0 ? Math.min(100, (n / totals.contatos) * 100) : 0);
  const toggle = (c: string) => { setOpen(open === c ? null : c); setFiltro("todos"); };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">De onde vieram e quanto agendaram</h3>
        <p className="text-[11px] text-slate-400">Contatos (telefones) por canal de marketing — independe do pixel. Clique num canal para ver os contatos.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="animate-pulse h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="animate-pulse h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 break-all">Não carregou (erro, não “sem dados”): {error}</div>
      ) : (
        <>
          {/* Herói: a conversão + como os contatos do período se dividem (barra segmentada) */}
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:grid-cols-[auto,1fr] sm:items-center sm:gap-6 dark:bg-slate-800/40 dark:ring-slate-800">
            <div>
              <div className={`text-5xl font-black leading-none tabular-nums tracking-tighter ${totals.conversao == null ? "text-slate-400" : "text-emerald-700 dark:text-emerald-400"}`}>{pct(totals.conversao)}</div>
              <div className="mt-1.5 text-xs text-slate-500">dos contatos agendaram</div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <b className="tabular-nums">{totals.agendamentos}</b> de <b className="tabular-nums">{totals.contatos}</b> contatos recebidos viraram agendamento
              </p>
              <div className="mt-2.5 flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="img"
                aria-label={`${totals.agendamentos} agendaram, ${totals.preAgendamentos} pré-agendaram, ${soContato} só contato`}>
                <div className="h-full bg-emerald-600 transition-[width] duration-700" style={{ width: `${seg(totals.agendamentos)}%` }} />
                <div className="h-full bg-amber-400 transition-[width] duration-700" style={{ width: `${seg(totals.preAgendamentos)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-600" /><b className="tabular-nums text-slate-700 dark:text-slate-200">{totals.agendamentos}</b> agendaram</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-400" /><b className="tabular-nums text-slate-700 dark:text-slate-200">{totals.preAgendamentos}</b> pré-agendaram</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-300 dark:bg-slate-600" /><b className="tabular-nums text-slate-700 dark:text-slate-200">{soContato}</b> só contato</span>
                <span className="text-slate-400">· <b className="tabular-nums">{totals.contatos}</b> contatos recebidos</span>
              </div>
            </div>
          </div>

          {(melhor || totals.preAgendamentos > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {melhor && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Trophy size={12} /> Melhor canal: <b>{ch(melhor.channel).label}</b> · {pct(melhor.conversao)}
                </span>
              )}
              {totals.preAgendamentos > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <MessageCircle size={12} /> {totals.preAgendamentos} pré-agendamento(s) para confirmar: abra o canal e filtre por Pré
                </span>
              )}
            </div>
          )}

          {/* 2. Canais */}
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 mt-4">Sem contatos no período.</p>
          ) : (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Por canal</h4>
              <div className="-mx-1 mt-2 overflow-x-auto px-1"><table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="w-[34%] sm:w-[40%] text-left font-medium py-1.5 pr-2">Canal</th>
                    <th className="text-right font-medium py-1.5 px-1 sm:px-2"><span className="sm:hidden">Cont.</span><span className="hidden sm:inline">Contatos</span></th>
                    <th className="text-right font-medium py-1.5 px-1 sm:px-2">Pré</th>
                    <th className="text-right font-medium py-1.5 px-1 sm:px-2">Agend.</th>
                    <th className="w-[18%] sm:w-[22%] text-right font-medium py-1.5 pl-2">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isOpen = open === r.channel;
                    const det = r.detalhes || [];
                    const cont = { todos: det.length, agendou: 0, pre: 0, contato: 0 } as Record<Filtro, number>;
                    det.forEach((d) => { cont[d.status] += 1; });
                    const vis = filtro === "todos" ? det : det.filter((d) => d.status === filtro);
                    return (
                      <Fragment key={r.channel}>
                        <tr onClick={() => det.length && toggle(r.channel)}
                          className={`border-b border-slate-50 last:border-0 dark:border-slate-800 ${det.length ? "cursor-pointer" : ""} ${isOpen ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                          <td className="py-2 pr-2">
                            <span className="inline-flex items-center gap-1.5 leading-tight text-slate-700 dark:text-slate-200">
                              {det.length ? (isOpen ? <ChevronDown size={13} className="text-emerald-600" /> : <ChevronRight size={13} className="text-slate-400" />) : <span className="w-[13px]" />}
                              <span className={`h-2 w-2 rounded-full ${ch(r.channel).dot}`} />{ch(r.channel).label}
                            </span>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.contatos}</td>
                          <td className="py-2 px-1 sm:px-2 text-right tabular-nums text-amber-600">{r.preAgendamentos}</td>
                          <td className="py-2 px-1 sm:px-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{r.agendamentos}</td>
                          <td className={`py-2 pl-2 text-right tabular-nums font-medium whitespace-nowrap ${convTone(r.conversao)}`}>
                            <span className="inline-flex items-center gap-2"><MiniBar v={r.conversao} />{pct(r.conversao)}</span>
                          </td>
                        </tr>
                        {isOpen && det.length > 0 && (
                          <tr>
                            <td colSpan={5} className="p-0">
                              {/* 3. Contatos do canal */}
                              <div className="my-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">Contatos de {ch(r.channel).label} <span className="tabular-nums text-slate-400">({det.length})</span></span>
                                  <div className="flex flex-wrap gap-1">
                                    {FILTROS.filter((f) => f.k === "todos" || cont[f.k] > 0).map((f) => (
                                      <button key={f.k} type="button" onClick={(e) => { e.stopPropagation(); setFiltro(f.k); }}
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${filtro === f.k ? "bg-emerald-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:ring-slate-700 dark:text-slate-300"}`}>
                                        {f.label} <span className="tabular-nums opacity-70">{cont[f.k]}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <ul className="max-h-72 divide-y divide-slate-50 overflow-auto dark:divide-slate-800">
                                  {vis.map((d, i) => (
                                    <li key={`${d.telefone}-${i}`} className="flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      <span className={`h-2 w-2 shrink-0 rounded-full ${SDOT[d.status]}`} />
                                      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2.5">
                                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{d.nome || "— sem nome —"}</span>
                                        <a href={`https://wa.me/${(d.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title="Abrir no WhatsApp"
                                          onClick={(e) => e.stopPropagation()} className="inline-flex shrink-0 items-center gap-1 tabular-nums text-xs text-slate-400 hover:text-emerald-600">
                                          <MessageCircle size={11} />{fone(d.telefone)}
                                        </a>
                                      </span>
                                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ST[d.status].cls}`}>{ST[d.status].label}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
          )}

          {orphan > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
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
