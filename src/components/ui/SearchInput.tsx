interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchInput = ({
    value,
    onChange,
    placeholder = 'Buscar...'
}: SearchInputProps) => (
    <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="p-2 border border-gray-300 rounded w-full text-gray-500 focus:ring-emerald-500 focus:border-emerald-500"
    />
);