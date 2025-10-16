// src/pages/MarketingDashboard.tsx
import MarketingOverviewCard from "@/components/Dashboard/MarketingOverviewCard";
import { useEffect, useState } from "react";
import { Megaphone, RefreshCw, AlertCircle, Play, BarChart3, Globe, TrendingUp } from "lucide-react";
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
  const [overviewData, setOverviewData] = useState(null);
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
        console.log("Visão Geral (GA4 + Followup):", overviewRes);
        if (overviewRes?.data) setOverviewData(overviewRes.data);

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
      <div className="min-h-screen bg-slate-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Cabeçalho elegante */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Megaphone size={28} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">Marketing Dashboard</h1>
                <p className="text-slate-600">Carregando dados de marketing...</p>
              </div>
            </div>
          </div>
          
          {/* Loading skeleton */}
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-slate-500">Carregando dados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Cabeçalho elegante */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Megaphone size={28} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">Marketing Dashboard</h1>
                <p className="text-slate-600">Dashboard de performance de marketing</p>
              </div>
            </div>
          </div>

          {/* Mensagem de erro elegante */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Erro ao carregar dados</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <RefreshCw size={16} />
                Tentar Novamente
              </button>
              <button
                onClick={handleTestEndpoints}
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <BarChart3 size={16} />
                Testar Endpoints
              </button>
            </div>
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
      <div className="min-h-screen bg-slate-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Cabeçalho elegante */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Megaphone size={28} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">Marketing Dashboard</h1>
                <p className="text-slate-600">Dashboard de performance de marketing</p>
              </div>
            </div>
          </div>

          {/* Alerta elegante */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-amber-800 font-medium mb-2">Nenhum dado encontrado</h4>
                <p className="text-amber-700 text-sm mb-3">
                  Isso pode ser devido a problemas de conexão, configuração incorreta ou período sem dados.
                </p>
                <ul className="text-amber-700 text-sm list-disc pl-4 space-y-1">
                  <li>Problemas de conexão com as APIs</li>
                  <li>Configuração incorreta das credenciais</li>
                  <li>Período selecionado sem dados disponíveis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Painéis de debug e ações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Informações de Debug</h3>
              <div className="bg-slate-50 rounded-xl p-4">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Ações</h3>
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <RefreshCw size={16} />
                  Recarregar Dados
                </button>
                <button
                  onClick={handleTestEndpoints}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Play size={16} />
                  Testar Endpoints no Console
                </button>
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">
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
    <div className="min-h-screen bg-slate-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header elegante */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Megaphone size={28} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">Marketing Dashboard</h1>
                <p className="text-slate-600">
                  Dashboard de performance de marketing integrando Google Ads, Analytics e Follow-ups
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
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
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
              <p className="text-amber-700 text-sm">
                Dados insuficientes para mostrar KPIs. Verifique se há campanhas ativas.
              </p>
            </div>
          </div>
        )}

        {/* Grid de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Google Ads */}
          {adsCampaigns?.length ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Campanhas Google Ads</h2>
                  <p className="text-sm text-slate-500">Performance das campanhas ativas</p>
                </div>
              </div>
              <AdsCampaignsChart data={adsCampaigns} />
            </div>
          ) : null}

          {/* Site Analytics */}
          {siteAnalytics?.length ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                  <Globe size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Analytics do Site</h2>
                  <p className="text-sm text-slate-500">Métricas de tráfego e engajamento</p>
                </div>
              </div>
              <SiteAnalyticsChart data={siteAnalytics} />
            </div>
          ) : null}
        </div>

        {/* Performance Over Time */}
        {performanceData &&
          ((performanceData.byStatus?.length || performanceData.byOrigin?.length) ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <BarChart3 size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Performance ao Longo do Tempo</h2>
                  <p className="text-sm text-slate-500">Evolução temporal das métricas</p>
                </div>
              </div>
              <PerformanceOverTimeChart data={performanceData} />
            </div>
          ) : null)}

        {/* Tabelas Detalhadas */}
        <div className="grid grid-cols-1 gap-6">
          {adsCampaigns?.length ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Detalhes das Campanhas</h2>
                  <p className="text-sm text-slate-500">Análise detalhada por campanha</p>
                </div>
              </div>
              <AdsCampaignsTable data={adsCampaigns} />
            </div>
          ) : null}

          {siteAnalytics?.length ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                  <Globe size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-lg">Detalhes dos Eventos</h2>
                  <p className="text-sm text-slate-500">Eventos e conversões do site</p>
                </div>
              </div>
              <SiteAnalyticsTable data={siteAnalytics} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboard;