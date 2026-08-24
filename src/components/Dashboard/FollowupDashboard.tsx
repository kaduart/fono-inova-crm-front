// src/pages/FollowupDashboard.tsx - VERSÃO OTIMIZADA
import { AlertCircle, RefreshCw } from 'lucide-react';
import React from 'react';
import { useFollowupAnalytics } from '../../hooks/useFollowupAnalytics';
import ErrorBoundary from '../common/ErrorBoundary';
import FollowupConversionChart from './FollowupConversionChart';
import FollowupPerformanceChart from './FollowupPerformanceChart';
import FollowupStats from './FollowupStats';
import FollowupTrendChart from './FollowupTrendChart';

const FollowupDashboard: React.FC = () => {
  const { data, loading, error, refetch } = useFollowupAnalytics();

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-2xl mx-auto mt-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Erro ao carregar dashboard</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-red-700"
          >
            <RefreshCw size={16} />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard de Follow-ups</h1>
            <p className="text-slate-600">Acompanhe o desempenho dos seus follow-ups</p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* Stats */}
        <ErrorBoundary>
          <FollowupStats data={data?.stats} loading={loading} />
        </ErrorBoundary>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ErrorBoundary>
            <FollowupTrendChart data={data?.trend} />
          </ErrorBoundary>

          <ErrorBoundary>
            <FollowupConversionChart data={data?.conversion} />
          </ErrorBoundary>
        </div>

        {/* Performance Chart */}
        <ErrorBoundary>
          <FollowupPerformanceChart data={data?.stats} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default FollowupDashboard;
