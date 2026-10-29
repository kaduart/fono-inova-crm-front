// src/components/doctor/overview/PatientQuickSearch.tsx
// Busca rápida de paciente no Dashboard do terapeuta. Filtra primeiro os pacientes do próprio
// terapeuta (já carregados) e completa com a busca global /v2/patients. Atalho: tecla "/".
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import patientService from '../../../services/patientService';
import type { IPatient } from '../../../utils/types/types';

interface Props {
    patients: IPatient[];
    onPick: (patient: IPatient) => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PatientQuickSearch({ patients, onPick }: Props) {
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [remote, setRemote] = useState<IPatient[]>([]);
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement)?.isContentEditable) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        const onClick = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
    }, []);

    useEffect(() => {
        const t = term.trim();
        setRemote([]);
        if (t.length < 2) return;
        const timer = setTimeout(async () => {
            setSearching(true);
            try { setRemote(await patientService.search(t)); } catch { /* busca local continua valendo */ }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [term]);

    const results = useMemo(() => {
        const t = norm(term.trim());
        if (t.length < 2) return [];
        const digits = term.replace(/\D/g, '');
        const own = (patients || []).filter(p =>
            norm(p.fullName || '').includes(t) || (digits.length >= 4 && String((p as any).phone || '').replace(/\D/g, '').includes(digits))
        );
        const seen = new Set(own.map(p => p._id));
        return [...own, ...remote.filter(p => !seen.has(p._id))].slice(0, 8);
    }, [term, patients, remote]);

    const pick = (p: IPatient) => {
        setTerm('');
        setOpen(false);
        onPick(p);
    };

    return (
        <div ref={boxRef} className="relative min-w-0 flex-[1_1_280px]">
            <label htmlFor="doctor-patient-search" className="sr-only">Buscar paciente</label>
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500">
                <Search className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                <input
                    ref={inputRef}
                    id="doctor-patient-search"
                    type="search"
                    value={term}
                    autoComplete="off"
                    onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) pick(results[0]); if (e.key === 'Escape') setOpen(false); }}
                    placeholder="Buscar paciente pelo nome ou telefone"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:ring-0"
                />
                <kbd className="hidden rounded border border-gray-300 px-1.5 text-xs text-gray-600 sm:inline" aria-hidden>/</kbd>
            </div>
            {open && term.trim().length >= 2 && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {results.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-600">{searching ? 'Buscando…' : 'Nenhum paciente encontrado'}</p>
                    ) : (
                        <ul className="max-h-72 overflow-auto">
                            {results.map(p => (
                                <li key={p._id}>
                                    <button type="button" onClick={() => pick(p)} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-emerald-50 hover:text-emerald-900 focus:bg-emerald-50 focus:text-emerald-900 focus:outline-none">
                                        {p.fullName}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
