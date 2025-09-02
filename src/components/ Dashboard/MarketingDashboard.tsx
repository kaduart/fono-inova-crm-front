import { useEffect, useState } from "react";
import marketingService from "../../services/marketingService";
import AdsCampaignsChart from "./AdsCampaignsChart";
import AdsCampaignsTable from "./AdsCampaignsTable";
import KPICards from "./KPICards";
import SiteAnalyticsChart from "./SiteAnalyticsChart";
import SiteAnalyticsTable from "./SiteAnalyticsTable";

const MarketingDashboard = () => {
  const [adsCampaigns, setAdsCampaigns] = useState([]);
  const [siteAnalytics, setSiteAnalytics] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [adsData, analyticsData, performanceData] = await Promise.all([
          marketingService.getGoogleAdsCampaigns(),
          marketingService.getSiteAnalytics(),
          marketingService.getPerformanceOverTime(),
        ]);

        console.log("Dados recebidos:", {
          adsData,
          analyticsData,
          performanceData
        });

        setAdsCampaigns(adsData);
        setSiteAnalytics(analyticsData);
        setPerformanceData(performanceData);

        // Coletar informações para debug
        setDebugInfo({
          adsCount: Array.isArray(adsData) ? adsData.length : 0,
          analyticsCount: Array.isArray(analyticsData) ? analyticsData.length : 0,
          performanceType: performanceData ? typeof performanceData : 'null',
          timestamp: new Date().toISOString()
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
        const [adsData, analyticsData, performanceData] = await Promise.all([
          marketingService.getGoogleAdsCampaigns(),
          marketingService.getSiteAnalytics(),
          marketingService.getPerformanceOverTime(),
        ]);
        setAdsCampaigns(adsData);
        setSiteAnalytics(analyticsData);
        setPerformanceData(performanceData);
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

      // Testar cada endpoint individualmente
      const endpoints = [
        { name: 'Google Ads', call: marketingService.getGoogleAdsCampaigns },
        { name: 'Site Analytics', call: marketingService.getSiteAnalytics },
        { name: 'Performance', call: marketingService.getPerformanceOverTime }
      ];

      for (const endpoint of endpoints) {
        try {
          const result = await endpoint.call();
          console.log(`${endpoint.name}:`, result);
        } catch (e) {
          console.error(`Erro em ${endpoint.name}:`, e);
        }
      }
    } catch (err) {
      console.error("Erro no teste de endpoints:", err);
    }
  };

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

  // Verificar se todos os dados estão vazios
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
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
              <pre className="bg-gray-100 p-4 rounded text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Marketing Dashboard</h1>
          <p className="text-gray-600">Dashboard de performance de marketing integrando Google Ads e Analytics</p>
        </div>

        {/* KPI Cards - Só mostra se houver dados */}
        {(adsCampaigns && adsCampaigns.length > 0) ||
          (siteAnalytics && siteAnalytics.length > 0) ? (
          <KPICards adsData={adsCampaigns} analyticsData={siteAnalytics} />
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Dados insuficientes para mostrar KPIs. Verifique se há campanhas ativas.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Google Ads Section - Só mostra se houver dados */}
          {adsCampaigns && adsCampaigns.length > 0 ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Campanhas Google Ads</h2>
              <AdsCampaignsChart data={adsCampaigns} />
            </div>
          ) : (
            <div className="p-6 shadow-lg rounded-lg bg-gray-50">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Campanhas Google Ads</h2>
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p>Nenhuma campanha encontrada</p>
              </div>
            </div>
          )}

          {/* Site Analytics Section - Só mostra se houver dados */}
          {siteAnalytics && siteAnalytics.length > 0 ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Analytics do Site</h2>
              <SiteAnalyticsChart data={siteAnalytics} />
            </div>
          ) : (
            <div className="p-6 shadow-lg rounded-lg bg-gray-50">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Analytics do Site</h2>
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>Nenhum dado de analytics disponível</p>
              </div>
            </div>
          )}
        </div>

        {/* Performance Over Time - Só mostra se houver dados */}
        {performanceData &&
          ((performanceData.byStatus && performanceData.byStatus.length > 0) ||
            (performanceData.byOrigin && performanceData.byOrigin.length > 0)) ? (
          <div className="p-6 shadow-lg rounded-lg bg-white card-hover mb-6">
            <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Performance ao Longo do Tempo</h2>
            <PerformanceOverTimeChart data={performanceData} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6">
          {/* Google Ads Table - Só mostra se houver dados */}
          {adsCampaigns && adsCampaigns.length > 0 ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Detalhes das Campanhas</h2>
              <AdsCampaignsTable data={adsCampaigns} />
            </div>
          ) : null}

          {/* Site Analytics Table - Só mostra se houver dados */}
          {siteAnalytics && siteAnalytics.length > 0 ? (
            <div className="p-6 shadow-lg rounded-lg bg-white card-hover">
              <h2 className="font-semibold text-xl mb-4 text-gray-800 border-b pb-2">Detalhes dos Eventos</h2>
              <SiteAnalyticsTable data={siteAnalytics} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboard;