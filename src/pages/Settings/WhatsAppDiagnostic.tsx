// src/pages/Settings/WhatsAppDiagnostic.tsx
import { useState } from 'react';
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiRefreshCw,
    FiTrash2,
    FiHardDrive,
    FiMessageSquare,
    FiInfo,
    FiSmartphone,
} from 'react-icons/fi';
import API from '../../services/api';
import { useWhatsAppWebHealth } from '../../hooks/useWhatsAppWebHealth';
import { cleanupWhatsAppWebCache } from '../../services/whatsappService';

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
    const [cleaningCache, setCleaningCache] = useState(false);
    const [cacheResult, setCacheResult] = useState<string | null>(null);
    const { data: health, loading: healthLoading, refresh: refreshHealth } = useWhatsAppWebHealth();

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
            const res = await API.post('/whatsapp/diagnostic/sync-missing');
            alert(`✅ ${res.data.imported} contatos importados!`);
            runDiagnostic(); // Atualiza dados
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCleanupCache = async () => {
        setCleaningCache(true);
        setCacheResult(null);
        try {
            const result = await cleanupWhatsAppWebCache();
            setCacheResult(`${result.message} (${result.removed.length} itens removidos)`);
            refreshHealth();
        } catch (err: any) {
            setCacheResult(err?.response?.data?.error || err?.message || 'Falha ao limpar cache');
        } finally {
            setCleaningCache(false);
        }
    };

    const statusLabel = health?.whatsapp?.ready ? 'Conectado' : health?.whatsapp?.authenticated ? 'Autenticado' : 'Desconectado';

    return (
        <div className="p-6 space-y-6">
            {/* Card de saúde da sessão */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        📱 Saúde do WhatsApp Web
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshHealth}
                            disabled={healthLoading}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                            <FiRefreshCw className={healthLoading ? 'animate-spin' : ''} size={14} />
                            Atualizar
                        </button>
                        <button
                            onClick={handleCleanupCache}
                            disabled={cleaningCache}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                        >
                            <FiTrash2 size={14} />
                            {cleaningCache ? 'Limpando...' : 'Limpar cache'}
                        </button>
                    </div>
                </div>

                {healthLoading && !health ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                ) : health ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            <div className="p-4 rounded-lg bg-gray-50 text-center">
                                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                                    <FiSmartphone size={14} /> Status
                                </div>
                                <div className={`text-lg font-bold ${health.whatsapp.ready ? 'text-green-600' : health.whatsapp.authenticated ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {statusLabel}
                                </div>
                            </div>
                            <div className={`p-4 rounded-lg text-center ${health.whatsapp.storageAlert ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                                    <FiHardDrive size={14} /> Sessão
                                </div>
                                <div className={`text-lg font-bold ${health.whatsapp.storageAlert ? 'text-red-700' : 'text-gray-800'}`}>
                                    {health.whatsapp.sessionSizeMB != null ? `${health.whatsapp.sessionSizeMB.toFixed(1)} MB` : '—'}
                                </div>
                            </div>
                            <div className={`p-4 rounded-lg text-center ${health.whatsapp.storageAlert ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className="text-sm text-gray-500">Disco</div>
                                <div className={`text-lg font-bold ${health.whatsapp.storageAlert ? 'text-red-700' : 'text-gray-800'}`}>
                                    {health.whatsapp.diskUsagePercent != null ? `${health.whatsapp.diskUsagePercent}%` : '—'}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-gray-50 text-center">
                                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                                    <FiMessageSquare size={14} /> Fila
                                </div>
                                <div className="text-lg font-bold text-gray-800">
                                    {health.queue ? `${health.queue.waiting} / ${health.queue.active}` : '—'}
                                </div>
                                <div className="text-xs text-gray-400">waiting / active</div>
                            </div>
                            <div className="p-4 rounded-lg bg-gray-50 text-center">
                                <div className="text-sm text-gray-500">Falhas</div>
                                <div className={`text-lg font-bold ${health.queue?.failed ? 'text-red-600' : 'text-gray-800'}`}>
                                    {health.queue?.failed ?? '—'}
                                </div>
                            </div>
                        </div>

                        {health.whatsapp.storageAlert && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                <FiAlertTriangle className="text-yellow-600 mt-1 flex-shrink-0" size={18} />
                                <div className="text-sm text-yellow-700">
                                    <strong>Sessão elevada.</strong> Clique em <strong>Limpar cache</strong>.
                                    Se persistir, será necessário limpar a sessão completa (novo QR).
                                </div>
                            </div>
                        )}

                        {cacheResult && (
                            <div className={`mb-4 p-3 rounded-lg text-sm ${cacheResult.includes('Falha') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {cacheResult}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                                <FiInfo size={12} />
                                <span>
                                    Limpeza automática no startup quando sessão &gt; <strong>400 MB</strong>.
                                    Autenticação preservada.
                                </span>
                            </div>
                            {health.whatsapp.lastReady && (
                                <span>Último ready: {new Date(health.whatsapp.lastReady).toLocaleString('pt-BR')}</span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-gray-500 text-sm">Não foi possível carregar a saúde do WhatsApp.</div>
                )}
            </div>

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
