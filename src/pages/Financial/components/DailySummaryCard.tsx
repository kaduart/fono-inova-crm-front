/**
 * DailySummaryCard - Resumo operacional diário (V2)
 * 
 * Caixa, atendimentos e receita do dia para conferência da secretária.
 * 💰 AO CLICAR NO CARD "CAIXA" → abre modal de fechamento completo
 */

import { useEffect, useState } from 'react';
import { DollarSign, Users, Calendar, TrendingUp, RefreshCw, Eye } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import API from '../../../services/api';
import { useDailyCash } from '../../../hooks/useDailyCash';
import DailyCashModal from './DailyCashModal';

interface DailySummary {
    date: string;
    cash: {
        received: number;
        count: number;
        byMethod: {
            pix: number;
            cash: number;
            card: number;
            transfer: number;
        };
    };
    appointments: {
        scheduled: number;
        completed: number;
        noShow: number;
        canceled: number;
    };
    revenue: {
        production: number;
        received: number;
        insurance: number;
        pending: number;
    };
}

interface DailySummaryCardProps {
    enabled?: boolean;
}

export const DailySummaryCard = ({ enabled = true }: DailySummaryCardProps) => {
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    // 🆕 Estado para o modal de caixa
    const [modalOpen, setModalOpen] = useState(false);
    
    // 🆕 Hook do caixa diário detalhado (só carrega ao abrir modal)
    const dailyCash = useDailyCash();

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/v2/daily-summary?date=${date}`);
            setSummary(res.data.data);
        } catch (err) {
            console.error('Erro ao carregar resumo diário:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) return;
        fetchSummary();
    }, [date, enabled]);

    // 🆕 Handler para abrir modal (carrega dados só agora)
    const handleOpenCashModal = async () => {
        setModalOpen(true);
        await dailyCash.fetchDailyCash(date);
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

    if (!summary) {
        return (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
                <p className="text-red-700">Erro ao carregar resumo do dia</p>
                <button 
                    onClick={fetchSummary}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const { cash, appointments, revenue } = summary;

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Resumo do Dia</h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                            onClick={fetchSummary}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* 🆕 Caixa - AGORA CLICÁVEL */}
                    <div 
                        className="bg-emerald-50 rounded-lg p-4 cursor-pointer hover:bg-emerald-100 transition-colors relative group"
                        onClick={handleOpenCashModal}
                    >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm text-gray-600">Caixa</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-700">
                            {formatCurrency(cash.received)}
                        </p>
                        <p className="text-xs text-gray-500">{cash.count} pagamentos</p>
                        <p className="text-xs text-emerald-600 mt-1 font-medium">👆 Clique para detalhes</p>
                    </div>

                    {/* Produção */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-600">Produção</span>
                        </div>
                        <p className="text-xl font-bold text-blue-700">
                            {formatCurrency(revenue.production)}
                        </p>
                        <p className="text-xs text-gray-500">
                            {formatCurrency(revenue.insurance)} convênio
                        </p>
                    </div>

                    {/* Atendimentos */}
                    <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-600">Realizados</span>
                        </div>
                        <p className="text-xl font-bold text-purple-700">
                            {appointments.completed}
                        </p>
                        <p className="text-xs text-gray-500">
                            {appointments.noShow} faltas
                        </p>
                    </div>

                    {/* Pendente */}
                    <div className="bg-amber-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-amber-600" />
                            <span className="text-sm text-gray-600">Pendente</span>
                        </div>
                        <p className="text-xl font-bold text-amber-700">
                            {formatCurrency(revenue.pending)}
                        </p>
                        <p className="text-xs text-gray-500">a receber</p>
                    </div>
                </div>

                {/* Detalhe por método */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">Formas de pagamento:</p>
                    <div className="flex flex-wrap gap-3">
                        {cash.byMethod.pix > 0 && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                PIX: {formatCurrency(cash.byMethod.pix)}
                            </span>
                        )}
                        {cash.byMethod.cash > 0 && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                Dinheiro: {formatCurrency(cash.byMethod.cash)}
                            </span>
                        )}
                        {cash.byMethod.card > 0 && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                Cartão: {formatCurrency(cash.byMethod.card)}
                            </span>
                        )}
                        {cash.byMethod.transfer > 0 && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                Transferência: {formatCurrency(cash.byMethod.transfer)}
                            </span>
                        )}
                    </div>
                </div>

                {/* 🆕 Botão de Fechamento de Caixa */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleOpenCashModal}
                        className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Eye className="w-5 h-5" />
                        📋 Ver Detalhes do Caixa e Fechar
                    </button>
                </div>
            </div>

            {/* 🆕 Modal de Fechamento de Caixa */}
            <DailyCashModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
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
        </>
    );
};

export default DailySummaryCard;
