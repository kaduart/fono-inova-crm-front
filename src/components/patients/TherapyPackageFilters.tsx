import { THERAPY_TYPES } from "../../utils/types/types";
import { Select } from "../ui/Select";

type Props = {
    filters: {
        type: string;
        status: string;
        page: number;
        limit: number;
    };
    setFilters: (filters: any) => void;
};

// Crie um novo componente TherapyPackageFilters.tsx
export const TherapyPackageFilters = ({ filters, setFilters }) => {
    const handleFilterChange = (name: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [name]: value,
            page: 1 // Resetar para primeira página ao mudar filtros
        }));
    };

    <div className="flex gap-4 mb-4">
        <Select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
        >
            <option value="">Todos os Tipos</option>
            {THERAPY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
            ))}
        </Select>

        <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
        >
            <option value="">Todos Status</option>
            <option value="ativo">Ativo</option>
            <option value="finalizado">Finalizado</option>
        </Select>
    </div>
};