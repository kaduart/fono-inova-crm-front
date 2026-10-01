// Funil por canal (atribuição automática via WhatsApp):
// conversas iniciadas → 1º agendamento → receita → conversão enviada às plataformas
// Aba "Por anúncio": o mesmo funil aberto por anúncio (ID do anúncio de WhatsApp ou campanha do link do site).
import { useEffect, useState } from "react";
import API from "../../services/api";

type Row = {
  source: string;
  conversations: number;
  firstAppointments: number;
  revenue: number;
  sentMeta: number;
  sentGoogle: number;
  bookingRate: number | null;
};

type AdRow = {
  adKey: string;
  kind: "whatsapp_ad" | "text_tag" | "site_link";
  source: string | null;
  adTitle: string | null;
  conversations: number;
  firstAppointments: number;
  revenue: number;
  spend: number;
  costPerConversation: number | null;
  costPerAppointment: number | null;
  bookingRate: number | null;
};

const LABELS: Record<string, string> = {
  tiktok_ads: "TikTok Ads",
  tiktok: "TikTok",
  meta_ads: "Meta Ads (Facebook)",
  instagram_ads: "Instagram Ads",
  instagram: "Instagram",
  instagram_organic: "Instagram orgânico",
  facebook: "Facebook",
  facebook_organic: "Facebook orgânico",
  google_ads: "Google Ads",
  google_organic: "Google orgânico",
  google: "Google",
  gmb: "Google Meu Negócio",
  site_direto: "Site (direto)",
  indication: "Indicação",
  unknown: "Sem origem identificada",
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const adName = (r: AdRow) =>
  r.adTitle || (r.kind === "whatsapp_ad" ? `Anúncio …${r.adKey.slice(-6)}` : r.adKey);

export default function AcquisitionByChannel() {
  const [days, setDays] = useState(30);
  const [view, setView] = useState<"canal" | "anuncio">("canal");
  const [data, setData] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ conversations: 0, firstAppointments: 0, revenue: 0 });
  const [ads, setAds] = useState<AdRow[]>([]);
  const [adTotals, setAdTotals] = useState({ conversations: 0, firstAppointments: 0, revenue: 0, spend: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Gasto digitado à mão (sem token de API): soma no período; "desfazer" remove o último lançamento
  const addSpend = async (adKey: string) => {
    const raw = window.prompt(`Gasto (R$) deste anúncio nos últimos ${days} dias — será somado ao já lançado:`);
    if (!raw) return;
    try {
      await API.post("/v2/analytics/roi/acquisition-by-ad/spend", { adKey, amount: raw });
      setReload((n) => n + 1);
    } catch {
      window.alert("Valor inválido. Use números, por exemplo 45,90.");
    }
  };
  const undoSpend = async (adKey: string) => {
    if (!window.confirm("Desfazer o último lançamento de gasto deste anúncio?")) return;
    try {
      await API.delete("/v2/analytics/roi/acquisition-by-ad/spend/last", { params: { adKey } });
      setReload((n) => n + 1);
    } catch {
      window.alert("Nenhum lançamento para desfazer.");
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const url = view === "canal" ? "/v2/analytics/roi/acquisition" : "/v2/analytics/roi/acquisition-by-ad";
    API.get(url, { params: { days } })
      .then((r) => {
        if (!alive) return;
        const empty = { conversations: 0, firstAppointments: 0, revenue: 0 };
        if (view === "canal") {
          setData(r.data?.data || []);
          setTotals(r.data?.totals || empty);
        } else {
          setAds(r.data?.data || []);
          setAdTotals(r.data?.totals || { ...empty, spend: 0 });
        }
      })
      .catch(() => alive && setError("Erro ao carregar aquisição"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days, view, reload]);

  const shown = view === "canal" ? totals : adTotals;
  const tab = (id: "canal" | "anuncio", label: string) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`text-xs px-3 py-1 rounded-lg border ${
        view === id ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Resultado real por canal</h3>
          <p className="text-xs text-slate-500">
            Conversas no WhatsApp com origem identificada → 1º agendamento → valor. Conta só pacientes novos.
          </p>
          <div className="flex gap-2 mt-2">
            {tab("canal", "Por canal")}
            {tab("anuncio", "Por anúncio")}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">1º agendamentos</div>
            <div className="text-lg font-bold text-emerald-600">{shown.firstAppointments}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Valor</div>
            <div className="text-lg font-bold text-amber-600">{brl(shown.revenue)}</div>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1"
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">Carregando...</div>}
      {error && !loading && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && view === "canal" && data.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-6">
          Ainda sem dados. A captura de origem começou em 27/09.
        </div>
      )}

      {!loading && !error && view === "canal" && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Canal</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Conversas</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">1º agend.</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Taxa</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Valor</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 hidden md:table-cell">Enviado Meta / Google</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.source} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{LABELS[r.source] || r.source}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{r.conversations || 0}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{r.firstAppointments || 0}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {r.bookingRate == null ? "—" : `${(r.bookingRate * 100).toFixed(0)}%`}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-800">{brl(r.revenue)}</td>
                  <td className="px-3 py-2 text-right text-slate-500 hidden md:table-cell">
                    {r.sentMeta || 0} / {r.sentGoogle || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && view === "anuncio" && ads.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-6">
          Ainda sem dados por anúncio. Aparece quando chegarem conversas de anúncio de WhatsApp ou de links do site com campanha.
        </div>
      )}

      {!loading && !error && view === "anuncio" && ads.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Anúncio / campanha</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Conversas</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">1º agend.</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Taxa</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Valor</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Gasto</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 hidden md:table-cell">Custo/conversa</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 hidden md:table-cell">Custo/agend.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ads.map((r) => (
                <tr key={r.adKey} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{adName(r)}</div>
                    <div className="text-xs text-slate-400">
                      {LABELS[r.source || ""] || r.source || "—"} · {r.kind === "whatsapp_ad" ? `anúncio de WhatsApp · ID …${r.adKey.slice(-8)}` : r.kind === "text_tag" ? "marcador no texto da mensagem" : "link do site"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{r.conversations || 0}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{r.firstAppointments || 0}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {r.bookingRate == null ? "—" : `${(r.bookingRate * 100).toFixed(0)}%`}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-800">{brl(r.revenue)}</td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {r.spend > 0 ? brl(r.spend) : "—"}
                    <button type="button" onClick={() => addSpend(r.adKey)} className="ml-2 text-xs text-emerald-600 hover:underline" title="Lançar gasto">＋</button>
                    {r.spend > 0 && (
                      <button type="button" onClick={() => undoSpend(r.adKey)} className="ml-1 text-xs text-slate-400 hover:underline" title="Desfazer último lançamento">↶</button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 hidden md:table-cell">
                    {r.costPerConversation == null ? "—" : brl(r.costPerConversation)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 hidden md:table-cell">
                    {r.costPerAppointment == null ? "—" : brl(r.costPerAppointment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
