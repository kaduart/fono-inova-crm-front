/**
 * DailySummaryCard - Resumo operacional diário (Daily Closing V2)
 * 
 * Usa endpoint /api/v2/daily-closing - Dados reais do backend
 * Caixa, atendimentos e receita do dia para conferência da secretária.
 */

import { useEffect, useState } from 'react';
import { DollarSign, Users, Calendar, TrendingUp, RefreshCw, Eye, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import API from '../../../services/api';
import { useDailyCash } from '../../../hooks/useDailyCash';
import DailyCashModal from './DailyCashModal';
import ProductionModal from './ProductionModal';
import ReceivablesModal from './ReceivablesModal';
import { socketManager } from '../../../utils/socketManager';

interface AppointmentTimeline {
    id: string;
    patient: string;
    phone?: string;
    service: string;
    doctor: string;
    sessionValue: number;
    operationalStatus: string;
    time: string;
    isPackage: boolean;
    isConvenio: boolean;
}

interface DailyClosing {
    date: string;
    summary: {
        appointments: {
            total: number;
            attended: number;
            canceled: number;
            pending: number;
            expectedValue: number;
        };
        financial: {
            totalReceived: number;
            totalExpected: number;
            totalRevenue: number;
            totalProduction?: number;  // 🆕 Produção total
            byMethod: {
                dinheiro: number;
                pix: number;
                cartão: number;
            };
        };
        insurance: {
            production: number;
            received: number;
            pending: number;
            sessionsCount: number;
        };
        cashFlow?: {  // 🆕 Separação clara do caixa
            cashInToday: number;
            advancePayments: number;
            realTodaySessions: number;
            packageConsumption: number;
            insuranceProduction: number;
        };
    };
    timelines?: {
        appointments?: AppointmentTimeline[];
    };
}

interface DailySummaryCardProps {
    enabled?: boolean;
}

export const DailySummaryCard = ({ enabled = true }: DailySummaryCardProps) => {
    const [data, setData] = useState<DailyClosing | null>(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    });
    
    const [modalOpen, setModalOpen] = useState(false);
    const [productionModalOpen, setProductionModalOpen] = useState(false);
    const [receivablesModalOpen, setReceivablesModalOpen] = useState(false);
    const dailyCash = useDailyCash();

    const fetchClosing = async (opts?: { silent?: boolean; delay?: number }) => {
        if (!opts?.silent) setLoading(true);
        
        // ⏳ Delay opcional para garantir que backend processou
        if (opts?.delay) {
            await new Promise(r => setTimeout(r, opts.delay));
        }
        
        try {
            // 🔥 Cache bust para garantir dados frescos
            const timestamp = Date.now();
            const res = await API.get(`/v2/daily-closing?date=${date}&_t=${timestamp}`);
            setData(res.data.data);
            console.log('[DailySummary] Dados carregados:', res.data.data);
        } catch (err) {
            console.error('Erro ao carregar fechamento:', err);
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) return;
        fetchClosing();
    }, [date, enabled]);

    useEffect(() => {
        const handleCashRefresh = (event: CustomEvent) => {
            console.log('💰 [DailySummary] Evento cash:refresh:', event.detail);
            // 🔄 Atualização sutil: pequeno delay + silent (não mostra loading)
            fetchClosing({ silent: true, delay: 300 });
        };

        window.addEventListener('cash:refresh', handleCashRefresh as EventListener);
        return () => {
            window.removeEventListener('cash:refresh', handleCashRefresh as EventListener);
        };
    }, [date]);

    // 🔄 Socket listener para atualização em tempo real (suave)
    useEffect(() => {
        const handleAppointmentCompleted = (data: any) => {
            console.log('💰 [DailySummary] Socket appointmentCompleted:', data);
            // 🔄 Atualização sutil após completar agendamento
            fetchClosing({ silent: true, delay: 500 });
        };

        const handleAppointmentUpdated = (data: any) => {
            console.log('💰 [DailySummary] Socket appointmentUpdated:', data);
            // 🔄 Atualização sutil após atualizar agendamento
            fetchClosing({ silent: true, delay: 300 });
        };

        const unsubCompleted = socketManager.on('appointmentCompleted', handleAppointmentCompleted);
        const unsubUpdated = socketManager.on('appointmentUpdated', handleAppointmentUpdated);

        return () => {
            unsubCompleted();
            unsubUpdated();
        };
    }, [date]);

    const handleOpenCashModal = async () => {
        console.log('[DailySummary] Abrindo modal de caixa para:', date);
        setModalOpen(true);
        await dailyCash.fetchDailyCash(date);
    };

    const handleOpenProductionModal = () => {
        console.log('[DailySummary] Abrindo modal de produção para:', date);
        setProductionModalOpen(true);
    };

    const handleOpenReceivablesModal = () => {
        console.log('[DailySummary] Abrindo modal de a receber para:', date);
        setReceivablesModalOpen(true);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || !data.summary) {
        return (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
                <p className="text-red-700">Erro ao carregar resumo</p>
                <button onClick={fetchClosing} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg">
                    Tentar novamente
                </button>
            </div>
        );
    }

    const { appointments, financial, insurance, cashFlow } = data.summary;

    // 🎯 SEPARAÇÃO CLARA DOS 3 CONCEITOS FINANCEIROS
    const caixaReal = cashFlow?.cashInToday || financial?.totalReceived || 0;
    const producaoTotal = financial?.totalProduction || financial?.totalExpected || 0;
    const aReceber = insurance?.pending || 0;
    const particularRecebido = cashFlow?.realTodaySessions || 0;

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Fechamento do Dia</h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                            onClick={fetchClosing}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 🎯 3 BLOCOS PRINCIPAIS - SEPARAÇÃO CLARA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* 💰 1. CAIXA - Dinheiro real que entrou */}
                    <div 
                        className="bg-emerald-50 rounded-xl p-5 border-2 border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors relative group"
                        onClick={handleOpenCashModal}
                    >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-emerald-200 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-700" />
                            </div>
                            <span className="text-sm font-medium text-emerald-800">CAIXA REAL</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-700">
                            {formatCurrency(caixaReal)}
                        </p>
                        <div className="mt-3 space-y-1">
                            <p className="text-xs text-emerald-600">
                                💵 Dinheiro, Pix, Cartão
                            </p>
                            <p className="text-xs text-emerald-700 font-medium">
                                👆 Clique para detalhes
                            </p>
                        </div>
                    </div>

                    {/* 📊 2. PRODUÇÃO - Tudo que foi feito */}
                    <div 
                        className="bg-blue-50 rounded-xl p-5 border-2 border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors relative group"
                        onClick={handleOpenProductionModal}
                    >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-blue-200 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-700" />
                            </div>
                            <span className="text-sm font-medium text-blue-800">PRODUÇÃO</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-700">
                            {formatCurrency(producaoTotal)}
                        </p>
                        <div className="mt-3 space-y-1">
                            <p className="text-xs text-blue-600">
                                Particular: {formatCurrency(particularRecebido)}
                            </p>
                            <p className="text-xs text-blue-600">
                                Convênio: {formatCurrency(insurance?.production || 0)}
                            </p>
                            <p className="text-xs text-blue-700 font-medium">
                                👆 Clique para detalhes
                            </p>
                        </div>
                    </div>

                    {/* 🧾 3. A RECEBER - Convênio pendente */}
                    <div 
                        className="bg-amber-50 rounded-xl p-5 border-2 border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors relative group"
                        onClick={handleOpenReceivablesModal}
                    >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-amber-200 rounded-lg">
                                <CreditCard className="w-5 h-5 text-amber-700" />
                            </div>
                            <span className="text-sm font-medium text-amber-800">A RECEBER</span>
                        </div>
                        <p className="text-3xl font-bold text-amber-700">
                            {formatCurrency(aReceber)}
                        </p>
                        <div className="mt-3 space-y-1">
                            <p className="text-xs text-amber-600">
                                🏥 Convênios pendentes
                            </p>
                            <p className="text-xs text-amber-700">
                                {insurance?.sessionsCount || 0} sessões a faturar
                            </p>
                            <p className="text-xs text-amber-800 font-medium">
                                👆 Clique para detalhes
                            </p>
                        </div>
                    </div>
                </div>

                {/* 📋 Resumo Operacional Secundário */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {/* Atendimentos */}
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Atendimentos</p>
                        <p className="text-xl font-bold text-gray-800">{appointments?.total || 0}</p>
                        <p className="text-xs text-gray-400">
                            {appointments?.attended || 0} realizados
                        </p>
                    </div>
                    
                    {/* Taxa de Comparecimento */}
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Comparecimento</p>
                        <p className="text-xl font-bold text-gray-800">
                            {appointments?.total > 0 
                                ? Math.round((appointments?.attended || 0) / appointments?.total * 100) 
                                : 0}%
                        </p>
                        <p className="text-xs text-gray-400">
                            {appointments?.canceled || 0} faltas
                        </p>
                    </div>

                    {/* Por método de pagamento */}
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Pix</p>
                        <p className="text-lg font-bold text-gray-800">
                            {formatCurrency(financial?.byMethod?.pix || 0)}
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Dinheiro</p>
                        <p className="text-lg font-bold text-gray-800">
                            {formatCurrency(financial?.byMethod?.dinheiro || 0)}
                        </p>
                    </div>
                </div>

                {/* Lista de Agendamentos do Dia */}
                {data?.timelines?.appointments && data.timelines.appointments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Atendimentos do Dia ({data.timelines.appointments.length})
                        </h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {data.timelines.appointments.map((apt) => (
                                <div 
                                    key={apt.id} 
                                    className={`flex items-center justify-between p-3 rounded-lg ${
                                        apt.operationalStatus === 'completed' 
                                            ? 'bg-emerald-50 border border-emerald-100' 
                                            : apt.operationalStatus === 'canceled'
                                            ? 'bg-red-50 border border-red-100'
                                            : 'bg-gray-50'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{apt.patient}</p>
                                            {apt.isConvenio && (
                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                    Convênio
                                                </span>
                                            )}
                                            {apt.isPackage && (
                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                                    Pacote
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {apt.time} • {apt.doctor} • {apt.service}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">
                                            {formatCurrency(apt.sessionValue)}
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                            apt.operationalStatus === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : apt.operationalStatus === 'canceled'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {apt.operationalStatus === 'completed' ? 'Realizado' 
                                                : apt.operationalStatus === 'canceled' ? 'Cancelado' 
                                                : 'Agendado'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Botão Fechamento */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleOpenCashModal}
                        className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                    >
                        <Eye className="w-5 h-5" />
                        📋 Ver Detalhes do Caixa e Fechar
                    </button>
                </div>
            </div>

            {/* Modais */}
            <DailyCashModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    dailyCash.reset();
                }}
                date={date}
                data={{
                    total: dailyCash.total,
                    count: dailyCash.count,
                    porMetodo: dailyCash.porMetodo,
                    porTipo: dailyCash.porTipo,
                    lista: dailyCash.lista
                }}
                loading={dailyCash.loading}
                onRefresh={dailyCash.refresh}
            />

            <ProductionModal
                open={productionModalOpen}
                onClose={() => setProductionModalOpen(false)}
                date={date}
                data={{
                    total: producaoTotal,
                    particular: particularRecebido,
                    convenio: insurance?.production || 0,
                    pacote: cashFlow?.packageConsumption || 0,
                    count: appointments?.attended || 0,
                    items: (data?.timelines?.appointments || [])
                        .filter(apt => apt.operationalStatus === 'completed')
                        .map(apt => ({
                            id: apt.id,
                            patient: apt.patient,
                            doctor: apt.doctor,
                            service: apt.service,
                            value: apt.sessionValue,
                            type: apt.isConvenio ? 'convenio' : (apt.isPackage ? 'pacote' : 'particular'),
                            time: apt.time,
                            status: apt.operationalStatus
                        }))
                }}
            />

            <ReceivablesModal
                open={receivablesModalOpen}
                onClose={() => setReceivablesModalOpen(false)}
                date={date}
                data={{
                    total: aReceber,
                    pending: insurance?.pending || 0,
                    billed: 0,
                    received: insurance?.received || 0,
                    count: insurance?.sessionsCount || 0,
                    items: (data?.timelines?.appointments || [])
                        .filter(apt => apt.isConvenio && apt.operationalStatus === 'completed')
                        .map(apt => ({
                            id: apt.id,
                            patient: apt.patient,
                            doctor: apt.doctor,
                            service: apt.service,
                            value: apt.sessionValue,
                            insuranceProvider: 'Convênio',
                            date: date,
                            time: apt.time,
                            status: 'pending' as const
                        }))
                }}
            />
        </>
    );
};

export default DailySummaryCard;
