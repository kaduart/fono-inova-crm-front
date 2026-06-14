import { useEffect, useState } from "react";
import API from "../../services/api";

interface Metric {
  service: string;
  operation: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  last: number;
}

interface FinancialMetricsResponse {
  success: boolean;
  window: string;
  generatedAt: string;
  metrics: Metric[];
  legacy: Record<string, number>;
}

const windowOptions = [
  { value: "1h", label: "Última hora" },
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" }
];

export default function FinancialMetricsDashboard() {
  const [data, setData] = useState<FinancialMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [window, setWindow] = useState("24h");
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (selectedWindow: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get<FinancialMetricsResponse>(`/v2/admin/financial-metrics?window=${selectedWindow}`);
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erro ao carregar métricas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(window);
    const interval = setInterval(() => fetchMetrics(window), 30000);
    return () => clearInterval(interval);
  }, [window]);

  const services = Array.from(new Set(data?.metrics.map(m => m.service) || []));

  const formatMs = (value: number) => `${Math.round(value)}ms`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">📊 Financial Metrics</h1>
            <p className="text-sm text-gray-400">
              Monitoramento de performance dos serviços financeiros.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Janela:</label>
            <select
              value={window}
              onChange={e => setWindow(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {windowOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && !data && (
          <div className="text-center py-12 text-gray-400">Carregando métricas...</div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Legado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-sm text-gray-400">Legacy Cashflow</p>
                <p className="text-2xl font-bold text-yellow-400">{data.legacy.LegacyCashflow || 0}</p>
                <p className="text-xs text-gray-500">chamadas</p>
              </div>
              <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-sm text-gray-400">Legacy Dashboard</p>
                <p className="text-2xl font-bold text-yellow-400">{data.legacy.LegacyFinancialDashboard || 0}</p>
                <p className="text-xs text-gray-500">chamadas</p>
              </div>
              <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-sm text-gray-400">Legacy Metrics</p>
                <p className="text-2xl font-bold text-yellow-400">{data.legacy.LegacyFinancialMetrics || 0}</p>
                <p className="text-xs text-gray-500">chamadas</p>
              </div>
            </div>

            {/* Métricas por serviço */}
            {services.map(service => (
              <div key={service} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h2 className="font-semibold text-emerald-400">{service}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-800/50 text-gray-400">
                      <tr>
                        <th className="px-4 py-2 text-left">Operação</th>
                        <th className="px-4 py-2 text-right">Chamadas</th>
                        <th className="px-4 py-2 text-right">Média</th>
                        <th className="px-4 py-2 text-right">Min</th>
                        <th className="px-4 py-2 text-right">Max</th>
                        <th className="px-4 py-2 text-right">Última</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.metrics
                        .filter(m => m.service === service)
                        .map(m => (
                          <tr key={`${m.service}-${m.operation}`}>
                            <td className="px-4 py-2 text-gray-300">{m.operation}</td>
                            <td className="px-4 py-2 text-right">{m.count}</td>
                            <td className="px-4 py-2 text-right">{formatMs(m.avg)}</td>
                            <td className="px-4 py-2 text-right text-emerald-400">{formatMs(m.min)}</td>
                            <td className={`px-4 py-2 text-right ${m.max > 2000 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {formatMs(m.max)}
                            </td>
                            <td className="px-4 py-2 text-right">{formatMs(m.last)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <p className="text-xs text-gray-500 text-right">
              Gerado em: {new Date(data.generatedAt).toLocaleString("pt-BR")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
