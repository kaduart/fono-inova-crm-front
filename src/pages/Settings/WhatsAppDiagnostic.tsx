// src/pages/Settings/WhatsAppDiagnostic.tsx
import { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import API from '../../services/api';

interface DiagnosticData {
    mongoLeads: number;
    whatsappContacts: number;
    missingInMongo: Array<{ phone: string; name: string }>;
    missingInWhatsApp: string[];
    realLeads: number;
    historicLeads: number;
}

export function WhatsAppDiagnostic() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DiagnosticData | null>(null);
    const [recommendations, setRecommendations] = useState<string[]>([]);

    const runDiagnostic = async () => {
        setLoading(true);
        try {
            const res = await API.get('/diagnostic/sync');
            setData(res.data.data);
            setRecommendations(res.data.recommendations);
        } catch (error) {
            console.error('Erro ao executar diagnóstico:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncMissing = async () => {
        setLoading(true);
        try {
            const res = await api.post('/whatsapp/diagnostic/sync-missing');
            alert(`✅ ${res.data.imported} contatos importados!`);
            runDiagnostic(); // Atualiza dados
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Diagnóstico WhatsApp</h2>
                <button
                    onClick={runDiagnostic}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    Executar Diagnóstico
                </button>
            </div>

            {data && (
                <>
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-sm text-gray-600">Leads no Banco</div>
                            <div className="text-2xl font-bold">{data.mongoLeads}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-sm text-gray-600">Contatos WhatsApp</div>
                            <div className="text-2xl font-bold">{data.whatsappContacts}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-sm text-gray-600">Leads Reais</div>
                            <div className="text-2xl font-bold text-green-600">{data.realLeads}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-sm text-gray-600">Leads Históricos</div>
                            <div className="text-2xl font-bold text-gray-400">{data.historicLeads}</div>
                        </div>
                    </div>

                    {/* Alertas */}
                    {data.missingInMongo.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <FiAlertTriangle className="text-yellow-600 mt-1" size={20} />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-yellow-800 mb-2">
                                        {data.missingInMongo.length} contatos não sincronizados
                                    </h3>
                                    <ul className="space-y-1 text-sm text-yellow-700 mb-3">
                                        {data.missingInMongo.slice(0, 5).map((c, i) => (
                                            <li key={i}>• {c.name} ({c.phone})</li>
                                        ))}
                                        {data.missingInMongo.length > 5 && (
                                            <li>... e mais {data.missingInMongo.length - 5}</li>
                                        )}
                                    </ul>
                                    <button
                                        onClick={syncMissing}
                                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                                    >
                                        Importar Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {data.missingInMongo.length === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                            <FiCheckCircle className="text-green-600" size={24} />
                            <div>
                                <h3 className="font-semibold text-green-800">Tudo sincronizado!</h3>
                                <p className="text-sm text-green-700">Todos os contatos estão alinhados.</p>
                            </div>
                        </div>
                    )}

                    {/* Recomendações */}
                    {recommendations.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">💡 Recomendações</h3>
                            <ul className="space-y-2 text-sm text-blue-700">
                                {recommendations.map((rec, i) => (
                                    <li key={i}>• {rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
