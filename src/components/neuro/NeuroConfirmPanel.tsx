// Painel da terapeuta: pacientes dela com sugestão automática de consulta neuro aguardando confirmação.
// Some quando não há nada a confirmar.
import { Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import neuroReferralApi, { type NeuroReferral } from '../../services/neuroReferralService';
import { patientOf } from '../../utils/neuroReferral';

export default function NeuroConfirmPanel({ onOpenPatient }: { onOpenPatient: (p: { _id: string; fullName: string }) => void }) {
    const [items, setItems] = useState<NeuroReferral[]>([]);

    useEffect(() => {
        let alive = true;
        neuroReferralApi.list('a_confirmar')
            .then(list => { if (alive) setItems(list); })
            .catch(() => { /* painel opcional */ });
        return () => { alive = false; };
    }, []);

    if (!items.length) return null;

    return (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-500/10" aria-label="Indicações de neuro para confirmar">
            <div className="mb-2 flex items-center gap-2">
                <Brain size={18} className="text-violet-700 dark:text-violet-300" aria-hidden />
                <h2 className="text-sm font-semibold text-gray-900">
                    {items.length === 1 ? '1 paciente pode precisar' : `${items.length} pacientes podem precisar`} de consulta com neuropediatra
                </h2>
            </div>
            <p className="mb-3 text-xs text-gray-600">O sistema achou sinais de TEA/TDAH na queixa ou anamnese. Abra a ficha e confirme ou descarte.</p>
            <ul className="flex flex-wrap gap-2">
                {items.map(r => {
                    const p = patientOf(r);
                    if (!p) return null;
                    return (
                        <li key={r._id}>
                            <button type="button" onClick={() => onOpenPatient({ _id: p._id, fullName: p.fullName })}
                                className="inline-flex min-h-9 items-center rounded-lg border border-violet-300 bg-white px-3 text-sm font-medium text-violet-800 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-transparent dark:text-violet-200">
                                {p.fullName}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
