import { Search, X } from 'lucide-react';

interface PillProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}

function FilterPill({ value, onChange, placeholder }: PillProps) {
    return (
        <div className="group relative">
            <Search size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
            <input
                type="text"
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-8 w-44 rounded-full border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal focus:w-56 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                    aria-label="Limpar filtro"
                >
                    <X size={11} />
                </button>
            )}
        </div>
    );
}

interface Props {
    nfValue: string;
    onNfChange: (value: string) => void;
    patientValue: string;
    onPatientChange: (value: string) => void;
    showNfFilter?: boolean;
    nfPlaceholder?: string;
}

// Barra de filtro compartilhada por todas as sub-abas do painel de Convênios
// (A Faturar, Faturados, Notas Fiscais, Recebidos, Histórico, etc). O estado
// vive no componente pai (InsuranceTab) para que trocar de aba não perca o
// filtro que a pessoa já digitou. Pills compactas (não inputs full-width) para
// combinar com o resto dos badges/controles da tela.
export default function InsuranceFilterBar({
    nfValue,
    onNfChange,
    patientValue,
    onPatientChange,
    showNfFilter = true,
    nfPlaceholder = 'NF/guia',
}: Props) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {showNfFilter && <FilterPill value={nfValue} onChange={onNfChange} placeholder={nfPlaceholder} />}
            <FilterPill value={patientValue} onChange={onPatientChange} placeholder="Paciente" />
        </div>
    );
}
