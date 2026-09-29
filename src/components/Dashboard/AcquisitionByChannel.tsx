// Funil por canal (atribuição automática via WhatsApp):
// conversas iniciadas → 1º agendamento → receita → conversão enviada às plataformas
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

export default function AcquisitionByChannel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ conversations: 0, firstAppointments: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    API.get("/v2/analytics/roi/acquisition", { params: { days } })
      .then((r) => {
        if (!alive) return;
        setData(r.data?.data || []);
        setTotals(r.data?.totals || { conversations: 0, firstAppointments: 0, revenue: 0 });
      })
      .catch(() => alive && setError("Erro ao carregar aquisição por canal"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [days]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Resultado real por canal</h3>
          <p className="text-xs text-slate-500">
            Conversas no WhatsApp com origem identificada → 1º agendamento → valor. Conta só pacientes novos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">1º agendamentos</div>
            <div className="text-lg font-bold text-emerald-600">{totals.firstAppointments}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Valor</div>
            <div className="text-lg font-bold text-amber-600">{brl(totals.revenue)}</div>
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

      {!loading && !error && data.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-6">
          Ainda sem dados. A captura de origem começou em 27/09.
        </div>
      )}

      {!loading && !error && data.length > 0 && (
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
    </div>
  );
}
