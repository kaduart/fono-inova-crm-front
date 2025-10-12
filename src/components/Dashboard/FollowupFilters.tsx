import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';

export const FollowupFilters = ({ onFilter }: { onFilter: (f: any) => void }) => {
    const [filters, setFilters] = useState({ status: '', origin: '', startDate: '', endDate: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const apply = () => onFilter(filters);

    return (
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
            <div>
                <label className="block text-sm text-gray-600">Status</label>
                <select
                    name="status"
                    value={filters.status}
                    onChange={handleChange}
                    className="border rounded px-3 py-1"
                >
                    <option value="">Todos</option>
                    <option value="scheduled">Agendado</option>
                    <option value="sent">Enviado</option>
                    <option value="failed">Falhado</option>
                </select>
            </div>

            <div>
                <label className="block text-sm text-gray-600">Origem</label>
                <input
                    name="origin"
                    placeholder="Meta, Google..."
                    value={filters.origin}
                    onChange={handleChange}
                    className="border rounded px-3 py-1"
                />
            </div>

            <div className="flex items-center gap-2">
                <Calendar className="text-gray-500" size={16} />
                <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleChange}
                    className="border rounded px-3 py-1"
                />
                <span className="text-gray-500">–</span>
                <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleChange}
                    className="border rounded px-3 py-1"
                />
            </div>

            <button
                onClick={apply}
                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
                <Filter size={16} /> Aplicar
            </button>
        </div>
    );
};
