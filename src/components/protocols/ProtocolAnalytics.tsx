import React, { useState, useEffect } from 'react';
import API from '../../services/api';

interface ProtocolUsage {
  code: string;
  specialty: string;
  totalUsage: number;
  uniquePatients: number;
  avgObjectivesAchieved: number;
  protocolName: string;
  successRate: number;
}

interface ProtocolEffectiveness {
  protocol: string;
  stats: {
    totalPatients: number;
    avgSessions: number;
    avgProgress: number;
    successRate: number;
  };
  patients: Array<{
    patient: { _id: string; fullName: string };
    sessionsCompleted: number;
    startDate: string;
    lastDate: string;
    treatmentStatus: string;
    avgProgress: number;
    objectivesAchieved: number;
    totalObjectives: number;
  }>;
}

interface ProtocolAnalyticsProps {
  specialty?: string;
}

const ProtocolAnalytics: React.FC<ProtocolAnalyticsProps> = ({ specialty }) => {
  const [usage, setUsage] = useState<ProtocolUsage[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [effectiveness, setEffectiveness] = useState<ProtocolEffectiveness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, [specialty]);

  useEffect(() => {
    if (selectedProtocol) {
      fetchEffectiveness(selectedProtocol);
    }
  }, [selectedProtocol]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const params = specialty ? `?specialty=${specialty}` : '';
      const response = await API.get(`/protocols/analytics/usage${params}`);
      setUsage(response.data);
      
      // Auto-selecionar primeiro protocolo se houver
      if (response.data.length > 0) {
        setSelectedProtocol(response.data[0].code);
      }
    } catch (error) {
      console.error('Erro ao buscar analytics de uso:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEffectiveness = async (code: string) => {
    try {
      const response = await API.get(`/protocols/analytics/effectiveness?code=${code}`);
      setEffectiveness(response.data);
    } catch (error) {
      console.error('Erro ao buscar efetividade:', error);
      setEffectiveness(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600 bg-green-100';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (usage.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">
          Nenhum protocolo foi utilizado ainda. Crie evoluções com protocolos para visualizar analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics de Protocolos</h2>
        <p className="text-gray-600 mt-1">
          Análise de uso e efetividade dos protocolos terapêuticos
        </p>
      </div>

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usage.map((protocol) => (
          <button
            key={protocol.code}
            onClick={() => setSelectedProtocol(protocol.code)}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              selectedProtocol === protocol.code
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{protocol.code}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{protocol.protocolName}</p>
              </div>
              {selectedProtocol === protocol.code && (
                <span className="text-green-600">✓</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-500">Uso Total</p>
                <p className="text-lg font-bold text-gray-900">{protocol.totalUsage}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pacientes</p>
                <p className="text-lg font-bold text-gray-900">{protocol.uniquePatients}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Taxa de Sucesso</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getSuccessColor(protocol.successRate)}`}>
                  {protocol.successRate}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Effectiveness Details */}
      {selectedProtocol && effectiveness && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">
              Detalhes de Efetividade: {effectiveness.protocol}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-blue-100 text-sm">Total de Pacientes</p>
                <p className="text-3xl font-bold">{effectiveness.stats.totalPatients}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Sessões Médias</p>
                <p className="text-3xl font-bold">{effectiveness.stats.avgSessions}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Progresso Médio</p>
                <p className="text-3xl font-bold">{effectiveness.stats.avgProgress}%</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Taxa de Sucesso</p>
                <p className="text-3xl font-bold">{effectiveness.stats.successRate}%</p>
              </div>
            </div>
          </div>

          {/* Patients Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">Pacientes em Tratamento</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessões
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Objetivos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {effectiveness.patients.map((patient, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.patient.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.sessionsCompleted}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(patient.startDate)}
                          <br />
                          <span className="text-gray-500 text-xs">até {formatDate(patient.lastDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(patient.avgProgress)}`}
                              style={{ width: `${patient.avgProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 min-w-[40px]">
                            {patient.avgProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.objectivesAchieved} / {patient.totalObjectives}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          patient.treatmentStatus === 'improving' ? 'bg-green-100 text-green-800' :
                          patient.treatmentStatus === 'stable' ? 'bg-blue-100 text-blue-800' :
                          patient.treatmentStatus === 'regressing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.treatmentStatus === 'improving' ? 'Melhorando' :
                           patient.treatmentStatus === 'stable' ? 'Estável' :
                           patient.treatmentStatus === 'regressing' ? 'Regredindo' :
                           'Em progresso'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Success Rate Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Critérios de Sucesso</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Pacientes com progresso ≥ 70%</span>
                <span className="text-sm font-semibold text-green-600">
                  {effectiveness.patients.filter(p => p.avgProgress >= 70).length} / {effectiveness.stats.totalPatients}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Sessões médias por paciente</span>
                <span className="text-sm font-semibold text-gray-900">
                  {effectiveness.stats.avgSessions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progresso médio geral</span>
                <span className="text-sm font-semibold text-gray-900">
                  {effectiveness.stats.avgProgress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolAnalytics;