import { Calendar, Filter } from 'lucide-react';
import { useState } from 'react';

export const FollowupFilters = ({ onFilter }: { onFilter: (f: any) => void }) => {
    const [filters, setFilters] = useState({ status: '', origin: '', startDate: '', endDate: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const apply = () => onFilter(filters);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
                <label className="block text-sm text-slate-700 font-medium mb-1">Status</label>
                <select
                    name="status"
                    value={filters.status}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-colors"
                >
                    <option value="">Todos</option>
                    <option value="scheduled">Agendado</option>
                    <option value="sent">Enviado</option>
                    <option value="failed">Falhado</option>
                </select>
            </div>

            <div className="flex-1 min-w-[150px]">
                <label className="block text-sm text-slate-700 font-medium mb-1">Origem</label>
                <input
                    name="origin"
                    placeholder="Meta, Google..."
                    value={filters.origin}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-colors"
                />
            </div>

            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-slate-700 font-medium mb-1">Período</label>
                <div className="flex items-center gap-2">
                    <Calendar className="text-slate-400" size={16} />
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleChange}
                        className="flex-1 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleChange}
                        className="flex-1 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            <button
                onClick={apply}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
                <Filter size={16} /> Aplicar
            </button>
        </div>
    );
};