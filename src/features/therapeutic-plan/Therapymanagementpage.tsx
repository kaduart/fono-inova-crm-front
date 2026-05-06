import React, { useState } from 'react';
import ProgressDashboard from '../components/ProgressDashboard';
import ProtocolAnalytics from '../components/ProtocolAnalytics';
import ProtocolSelector from '../components/ProtocolSelector';
import TherapeuticPlanForm from '../components/TherapeuticPlanForm';
import API from '../services/api';
import { extractData } from '../utils/dtoHelper';

/**
 * Exemplo de página completa integrando todos os componentes
 * de plano terapêutico
 */
const TherapyManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'create' | 'progress' | 'analytics'>('create');
    const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');

    // Exemplo: dados de avaliação (normalmente viriam de um form anterior)
    const evaluationData = {
        patientId: '6897dc360683ca3788ae815d',
        doctorId: '689815f43e7468e2d7faa2ef',
        specialty: 'Psicologia',
        date: '2025-11-21',
        time: '14:00',
        evaluationAreas: [
            { id: 'cognitive', name: 'Cognitivo', score: 4 },
            { id: 'behavior', name: 'Comportamento', score: 5 }
        ]
    };

    const handleProtocolChange = (protocol: any) => {
        setSelectedProtocol(protocol);
        console.log('Protocolo selecionado:', protocol);
    };

    const handlePlanSubmit = async (plan: any) => {
        try {
            // Montar payload completo para criar evolução
            const evolutionData = {
                patient: evaluationData.patientId,
                doctor: evaluationData.doctorId,
                specialty: evaluationData.specialty,
                date: evaluationData.date,
                time: evaluationData.time,
                evaluationAreas: evaluationData.evaluationAreas,
                protocolCode: selectedProtocol?.code,
                therapeuticPlan: plan
            };

            console.log('Criando evolução:', evolutionData);

            const response = await API.post('/v2/evolutions', evolutionData);

            console.log('Evolução criada:', extractData(response));
            alert('Plano terapêutico salvo com sucesso!');

            // Mudar para aba de progresso
            setSelectedPatientId(evaluationData.patientId);
            setActiveTab('progress');
        } catch (error) {
            console.error('Erro ao salvar plano:', error);
            alert('Erro ao salvar plano terapêutico');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Gestão de Terapia</h1>
                    <p className="text-gray-600 mt-2">
                        Sistema de planos terapêuticos, acompanhamento de progresso e analytics
                    </p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'create'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Criar Plano
                            </button>
                            <button
                                onClick={() => setActiveTab('progress')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'progress'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Progresso
                            </button>
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'analytics'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Analytics
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Create Plan Tab */}
                        {activeTab === 'create' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-blue-900 mb-1">
                                        Criar Plano Terapêutico
                                    </h3>
                                    <p className="text-sm text-blue-700">
                                        Selecione um protocolo e defina objetivos mensuráveis e intervenções para o paciente.
                                    </p>
                                </div>

                                {/* Protocol Selector */}
                                <ProtocolSelector
                                    specialty={evaluationData.specialty}
                                    value={selectedProtocol?.code}
                                    onChange={handleProtocolChange}
                                />

                                {/* Therapeutic Plan Form */}
                                {selectedProtocol && (
                                    <TherapeuticPlanForm
                                        protocolCode={selectedProtocol.code}
                                        protocolName={selectedProtocol.name}
                                        availableAreas={evaluationData.evaluationAreas}
                                        onSubmit={handlePlanSubmit}
                                    />
                                )}

                                {!selectedProtocol && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                                        Selecione um protocolo acima para começar
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Progress Tab */}
                        {activeTab === 'progress' && (
                            <div>
                                {selectedPatientId ? (
                                    <ProgressDashboard patientId={selectedPatientId} />
                                ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                        <p className="text-gray-500 mb-4">
                                            Selecione um paciente para visualizar o progresso
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="ID do paciente"
                                            value={selectedPatientId}
                                            onChange={(e) => setSelectedPatientId(e.target.value)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <div>
                                <ProtocolAnalytics specialty={evaluationData.specialty} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Protocolos Disponíveis</h4>
                        <p className="text-3xl font-bold text-gray-900">13</p>
                        <p className="text-sm text-gray-500 mt-1">4 especialidades</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Em Tratamento</h4>
                        <p className="text-3xl font-bold text-gray-900">--</p>
                        <p className="text-sm text-gray-500 mt-1">Pacientes ativos</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Taxa de Sucesso</h4>
                        <p className="text-3xl font-bold text-green-600">--</p>
                        <p className="text-sm text-gray-500 mt-1">Média geral</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TherapyManagementPage;