import { useEffect, useState } from 'react';
import { DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import API from '../../../services/api';

export const DailySummaryCard = () => {
    const [data, setData] = useState<any>(null);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        const res = await API.get(`/v2/cashflow?date=${date}`);
        setData(res.data.data);
    };

    useEffect(() => { fetchData(); }, [date]);

    if (!data) return <div>Carregando...</div>;

    return (
        <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
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

            <div className="text-3xl font-bold text-emerald-600 mb-4">
                {formatCurrency(data.caixa.total)}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                    <p className="text-gray-500">Pix</p>
                    <p className="font-bold">{formatCurrency(data.caixa.pix)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                    <p className="text-gray-500">Dinheiro</p>
                    <p className="font-bold">{formatCurrency(data.caixa.dinheiro)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                    <p className="text-gray-500">Cartão</p>
                    <p className="font-bold">{formatCurrency(data.caixa.cartao)}</p>
                </div>
            </div>

            <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Transações ({data.transacoes.length})</p>
                <div className="space-y-2 max-h-60 overflow-auto">
                    {data.transacoes.map((t: any) => (
                        <div key={t.id} className="flex justify-between p-2 bg-gray-50 rounded">
                            <div>
                                <p className="font-medium">{t.paciente}</p>
                                <p className="text-xs text-gray-500">{t.hora} • {t.tipo}</p>
                            </div>
                            <p className="font-bold">{formatCurrency(t.valor)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DailySummaryCard;
