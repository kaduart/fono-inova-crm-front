// Seletor "Ver painel de" para admin e secretária no painel do terapeuta
// (decisão do Kadu, 01/11/2026). O back só aceita o profissional escolhido
// para staff; terapeuta sempre vê o próprio painel.
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doctorService } from '../../services/doctorService';

type Doc = { _id: string; fullName?: string; specialty?: string };

export default function DoctorViewPicker({ value, onChange, prominent = false }: {
    value?: string | null;
    onChange: (doc: Doc | null) => void;
    prominent?: boolean;
}) {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        doctorService.list({ status: 'active', limit: 200 })
            .then((data) => {
                const d = data as unknown as Doc[] | { doctors?: Doc[] };
                const list: Doc[] = Array.isArray(d) ? d : d?.doctors || [];
                if (alive) setDocs(list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR')));
            })
            .catch(() => alive && setError(true));
        return () => { alive = false; };
    }, []);

    const select = (
        <select
            id="doctor-view-picker"
            value={value || ''}
            onChange={(e) => onChange(docs.find((d) => d._id === e.target.value) || null)}
            className="min-h-11 min-w-[16rem] rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
            <option value="">{error ? 'Erro ao carregar profissionais' : 'Escolha o profissional…'}</option>
            {docs.map((d) => <option key={d._id} value={d._id}>{d.fullName}{d.specialty ? ` · ${d.specialty}` : ''}</option>)}
        </select>
    );

    if (prominent) {
        return (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex items-center gap-2 text-emerald-700"><Eye className="h-5 w-5" aria-hidden /><h1 className="text-base font-bold text-gray-900 dark:text-gray-100">Ver painel de um profissional</h1></div>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Este painel mostra a agenda, os pacientes e as evoluções de um terapeuta. Escolha quem você quer acompanhar.</p>
                <label htmlFor="doctor-view-picker" className="sr-only">Profissional</label>
                {select}
            </div>
        );
    }

    return (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
            <Eye className="h-4 w-4" aria-hidden />
            <label htmlFor="doctor-view-picker" className="font-semibold">Ver painel de:</label>
            {select}
        </div>
    );
}
