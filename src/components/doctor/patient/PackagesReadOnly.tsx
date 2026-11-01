// Pacotes do paciente em modo só leitura para o terapeuta. Criar, gerenciar,
// receber e quitar são da recepção (decisão do Kadu, 01/11/2026).
import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import packageService from '../../../services/packageService';
import { toPackageList, type PackageLike } from '../../patients/PatientSituation';

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Terapia');
const STATUS: Record<string, string> = { active: 'Ativo', completed: 'Concluído', finished: 'Concluído', canceled: 'Cancelado', cancelled: 'Cancelado', pending: 'Aguardando', superseded: 'Substituído' };

export default function PackagesReadOnly({ patientId }: { patientId?: string }) {
    const [pkgs, setPkgs] = useState<PackageLike[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!patientId) return;
        let alive = true;
        setError(false);
        packageService.listPackages({ page: 1, limit: 50, patientId })
            .then((raw) => {
                const list = toPackageList(raw as Parameters<typeof toPackageList>[0]);
                if (alive) setPkgs(list.filter((p) => p.type !== 'liminar'));
            })
            .catch(() => alive && setError(true));
        return () => { alive = false; };
    }, [patientId]);

    if (error) return <p className="text-left text-sm text-red-700">Não foi possível carregar os pacotes.</p>;
    if (!pkgs) return <p className="text-left text-sm text-gray-500">Carregando pacotes…</p>;
    if (pkgs.length === 0) return <p className="text-left text-sm text-gray-500">Este paciente não tem pacote.</p>;

    return (
        <ul className="space-y-2 text-left">
            {pkgs.map((p) => {
                const total = Number(p.totalSessions) || 0;
                const done = Number(p.sessionsDone) || 0;
                const left = typeof p.remaining === 'number' ? p.remaining : Math.max(0, total - done);
                const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                const ending = p.status === 'active' && total > 0 && left <= 2;
                return (
                    <li key={p._id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between gap-3">
                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                <Package className="h-4 w-4 text-emerald-600" aria-hidden />
                                Pacote de {cap(p.specialty || p.sessionType)}
                            </p>
                            <span className="text-xs text-gray-500">{STATUS[p.status || ''] || p.status}</span>
                        </div>
                        {total > 0 && (
                            <>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                </div>
                                <p className={`mt-1.5 text-xs ${ending ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>
                                    {done} de {total} sessões · {left === 1 ? 'resta 1' : `restam ${left}`}{ending ? ' · avise a recepção sobre renovação' : ''}
                                </p>
                            </>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
