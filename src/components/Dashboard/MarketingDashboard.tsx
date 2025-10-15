// src/pages/MarketingDashboard.tsx
import MarketingOverviewCard from "@/components/Dashboard/MarketingOverviewCard"; // ✅ Novo import
import { useEffect, useState } from "react";
import marketingService from "../../services/marketingService";
import AdsCampaignsChart from "./AdsCampaignsChart";
import AdsCampaignsTable from "./AdsCampaignsTable";
import KPICards from "./KPICards";
import PerformanceOverTimeChart from "./PerformanceOverTimeChart";
import SiteAnalyticsChart from "./SiteAnalyticsChart";
import SiteAnalyticsTable from "./SiteAnalyticsTable";

const MarketingDashboard = () => {
  const [adsCampaigns, setAdsCampaigns] = useState([]);
  const [siteAnalytics, setSiteAnalytics] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [overviewData, setOverviewData] = useState(null); // ✅ Novo estado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  console.log("Renderizando MarketingDashboard...");
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [adsData, analyticsData, performanceData, overviewRes] = await Promise.all([
  marketingService.getGoogleAdsCampaigns(),
  marketingService.getSiteAnalytics(),
  marketingService.getPerformanceOverTime(),
  fetch(import.meta.env.VITE_API_URL + "/marketing/overview")
    .then(async (res) => {
      console.log("📡 Status overview:", res.status);
      if (!res.ok) throw new Error("Erro HTTP " + res.status);
      const json = await res.json();
      console.log("📊 Resposta overview:", json);
      return json;
    })
    .catch((err) => {
      console.error("❌ Erro ao buscar overview:", err);
      return null;
    }),
]);


        console.log("Dados recebidos:", {
          adsData,
          analyticsData,
          performanceData,
          overviewRes,
        });

        setAdsCampaigns(adsData);
        setSiteAnalytics(analyticsData);
        setPerformanceData(performanceData);
        console.log("Visão Geral (GA4 + Followup):", overviewRes); // ✅ Novo log
        if (overviewRes?.data) setOverviewData(overviewRes.data); // ✅ Novo

        // Coletar informações para debug
        setDebugInfo({
          adsCount: Array.isArray(adsData) ? adsData.length : 0,
          analyticsCount: Array.isArray(analyticsData) ? analyticsData.length : 0,
          performanceType: performanceData ? typeof performanceData : "null",
          overviewLoaded: overviewRes?.success ? "ok" : "fail",
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        setError("Erro ao carregar dados de marketing.");
        console.error("Erro detalhado:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const fetchData = async () => {
      try {
        const [adsData, analyticsData, performanceData, overviewRes] = await Promise.all([
          marketingService.getGoogleAdsCampaigns(),
          marketingService.getSiteAnalytics(),
          marketingService.getPerformanceOverTime(),
          fetch("/api/marketing/overview").then((res) => res.json()).catch(() => null),
        ]);
        setAdsCampaigns(adsData);
        setSiteAnalytics(analyticsData);
        setPerformanceData(performanceData);
        if (overviewRes?.data) setOverviewData(overviewRes.data);
      } catch (err) {
        setError("Erro ao carregar dados de marketing.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  const handleTestEndpoints = async () => {
    try {
      console.log("Testando endpoints...");

      const endpoints = [
        { name: "Google Ads", call: marketingService.getGoogleAdsCampaigns },
        { name: "Site Analytics", call: marketingService.getSiteAnalytics },
        { name: "Performance", call: marketingService.getPerformanceOverTime },
      ];

      for (const endpoint of endpoints) {
        try {
          const result = await endpoint.call();
          console.log(`${endpoint.name}:`, result);
        } catch (e) {
          console.error(`Erro em ${endpoint.name}:`, e);
        }
      }

      // ✅ Teste manual do novo endpoint
      const overviewRes = await fetch("/api/marketing/overview").then((r) => r.json());
      console.log("Visão Geral (GA4 + Followup):", overviewRes);
    } catch (err) {
      console.error("Erro no teste de endpoints:", err);
    }
  };

  // ==============================
  // ESTADOS DE CARREGAMENTO / ERRO
  // ==============================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Marketing Dashboard</h1>
            <p className="text-gray-600">Carregando dados de marketing...</p>
          </div>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Marketing Dashboard</h1>
            <p className="text-gray-600">Dashboard de performance de marketing</p>
          </div>
          <div className="text-center py-8">
            <div className="text-red-500 text-xl mb-4">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors mr-2"
            >
              Tentar Novamente
            </button>
            <button
              onClick={handleTestEndpoints}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Testar Endpoints
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // VERIFICAÇÃO DE DADOS
  // ==============================

  const allDataEmpty =
    (!adsCampaigns || adsCampaigns.length === 0) &&
    (!siteAnalytics || siteAnalytics.length === 0) &&
    (!performanceData ||
      (performanceData.byStatus && performanceData.byStatus.length === 0) &&
      (performanceData.byOrigin && performanceData.byOrigin.length === 0));

  if (allDataEmpty) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Marketing Dashboard</h1>
            <p className="text-gray-600">Dashboard de performance de marketing</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Nenhum dado encontrado. Isso pode ser devido a:
                </p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc pl-5">
                  <li>Problemas de conexão com as APIs</li>
                  <li>Configuração incorreta das credenciais</li>
                  <li>Período selecionado sem dados disponíveis</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações de Debug</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ações</h3>
              <button
                onClick={handleRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors mb-3"
              >
                Recarregar Dados
              </button>
              <button
                onClick={handleTestEndpoints}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                Testar Endpoints no Console
              </button>

              <div className="mt-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Verifique o console do navegador (F12) para mais detalhes sobre os dados recebidos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // RENDER FINAL
  // ==============================

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Marketing Dashboard</h1>
          <p className="text-gray-600">
            Dashboard de performance de marketing integrando Google Ads, Analytics e Follow-ups
          </p>
        </div>

        {/* ✅ Novo card de visão geral global (GA4 + Followup) */}
        {overviewData && (
          <div className="mb-8">
            <MarketingOverviewCard data={overviewData} />
          </div>
        )}

        {/* KPI Cards */}
        {(adsCampaigns?.length || siteAnalytics?.length) ? (
          <KPICards adsData={adsCampaigns} analyticsData={siteAnalytics} />
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-yellow-700">
              Dados insuficientes para mostrar KPIs. Verifique se há campanhas ativas.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Google Ads */}
          {adsCampaigns?.length ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">
                Campanhas Google Ads
              </h2>
              <AdsCampaignsChart data={adsCampaigns} />
            </div>
          ) : null}

          {/* Site Analytics */}
          {siteAnalytics?.length ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">
                Analytics do Site
              </h2>
              <SiteAnalyticsChart data={siteAnalytics} />
            </div>
          ) : null}
        </div>

        {/* Performance Over Time */}
        {performanceData &&
          ((performanceData.byStatus?.length || performanceData.byOrigin?.length) ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover mb-6">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">
                Performance ao Longo do Tempo
              </h2>
              <PerformanceOverTimeChart data={performanceData} />
            </div>
          ) : null)}

        {/* Tabelas Detalhadas */}
        <div className="grid grid-cols-1 gap-6">
          {adsCampaigns?.length ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">
                Detalhes das Campanhas
              </h2>
              <AdsCampaignsTable data={adsCampaigns} />
            </div>
          ) : null}

          {siteAnalytics?.length ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">
                Detalhes dos Eventos
              </h2>
              <SiteAnalyticsTable data={siteAnalytics} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboard;
