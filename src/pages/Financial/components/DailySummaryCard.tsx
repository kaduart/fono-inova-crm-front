import { useEffect, useState } from 'react';
import { DollarSign, Calendar, RefreshCw, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import API from '../../../services/api';
import DailyCashModal from './DailyCashModal';

export const DailySummaryCard = () => {
    const [data, setData] = useState<any>(null);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchData = async () => {
        const res = await API.get(`/v2/cashflow?date=${date}`);
        setData(res.data.data);
    };

    useEffect(() => { fetchData(); }, [date]);

    if (!data) return <div>Carregando...</div>;

    const stats = data.estatisticas || {};
    const porTipo = data.porTipo || {};
    const variacao = stats.variacaoVsOntem || 0;

    return (
        <>
            <div className="bg-white rounded-xl border p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Caixa do Dia
                    </h3>
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)}
                            className="border rounded px-2 py-1"
                        />
                        <button onClick={fetchData}>
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Total + Comparação com ontem */}
                <div 
                    className="bg-emerald-50 rounded-xl p-6 mb-4 cursor-pointer hover:bg-emerald-100 transition-colors"
                    onClick={() => setModalOpen(true)}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-emerald-700">Total em Caixa</p>
                        {variacao !== 0 && (
                            <div className={`flex items-center gap-1 text-sm ${variacao >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {variacao >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span>{variacao > 0 ? '+' : ''}{variacao}% vs ontem</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-4xl font-bold text-emerald-700">
                            {formatCurrency(data.caixa.total)}
                        </p>
                        <Eye className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600 mt-2">
                        <span>{stats.quantidade || 0} pagamentos</span>
                        <span>Ticket médio: {formatCurrency(stats.ticketMedio || 0)}</span>
                    </div>
                </div>

                {/* Por método */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div 
                        className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-center"
                        onClick={() => setModalOpen(true)}
                    >
                        <p className="text-xs text-gray-500 mb-1">Pix</p>
                        <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(data.caixa.pix)}
                        </p>
                        <p className="text-xs text-gray-500">{data.caixa.qtdPix || 0}</p>
                    </div>
                    <div 
                        className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors text-center"
                        onClick={() => setModalOpen(true)}
                    >
                        <p className="text-xs text-gray-500 mb-1">Dinheiro</p>
                        <p className="text-lg font-bold text-green-700">
                            {formatCurrency(data.caixa.dinheiro)}
                        </p>
                        <p className="text-xs text-gray-500">{data.caixa.qtdDinheiro || 0}</p>
                    </div>
                    <div 
                        className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors text-center"
                        onClick={() => setModalOpen(true)}
                    >
                        <p className="text-xs text-gray-500 mb-1">Cartão</p>
                        <p className="text-lg font-bold text-purple-700">
                            {formatCurrency(data.caixa.cartao)}
                        </p>
                        <p className="text-xs text-gray-500">{data.caixa.qtdCartao || 0}</p>
                    </div>
                </div>

                {/* Por tipo */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-2">Por Tipo</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-xs text-gray-500">Particular</p>
                            <p className="font-bold text-gray-700">{formatCurrency(porTipo.particular || 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Pacotes</p>
                            <p className="font-bold text-gray-700">{formatCurrency(porTipo.pacote || 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Convênio</p>
                            <p className="font-bold text-gray-700">{formatCurrency(porTipo.convenio || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Botão Ver Detalhes */}
                <button
                    onClick={() => setModalOpen(true)}
                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                    <Eye className="w-5 h-5" />
                    Ver Detalhes do Caixa
                </button>
            </div>

            {/* Modal */}
            <DailyCashModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                date={date}
                data={{
                    total: data.caixa.total,
                    count: stats.quantidade,
                    ticketMedio: stats.ticketMedio,
                    porMetodo: data.caixa,
                    porTipo: porTipo,
                    variacao: variacao,
                    ontem: stats.ontem,
                    lista: data.transacoes
                }}
                loading={!data}
                onRefresh={fetchData}
            />
        </>
    );
};

export default DailySummaryCard;
