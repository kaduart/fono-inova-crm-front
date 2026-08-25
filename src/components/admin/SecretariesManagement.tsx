import { Mail, Plus, Search, UserRound, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { adminService } from '../../services/adminService';
import AddAdminContent from './AddAdminContent';

type Secretary = { _id: string; fullName: string; email: string; role: 'secretary' };

type Props = {
  addNewAdmin: (data: { fullName: string; email: string; password: string; role?: string }) => Promise<void>;
};

export default function SecretariesManagement({ addNewAdmin }: Props) {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadSecretaries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.fetchSecretaries();
      setSecretaries(response.data?.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Não foi possível carregar as secretárias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSecretaries(); }, [loadSecretaries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return secretaries;
    return secretaries.filter(item => `${item.fullName} ${item.email}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [search, secretaries]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Users size={21} /></div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Secretárias</h1>
              <p className="text-sm text-slate-500">Gerencie os acessos da equipe administrativa.</p>
            </div>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
            <Plus size={17} /> Nova secretária
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <span className="text-xs font-semibold text-slate-500">{secretaries.length} {secretaries.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}</span>
        </div>

        {loading ? (
          <div className="px-5 py-14 text-center text-sm text-slate-500">Carregando equipe...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-700">Nenhuma secretária encontrada</p>
            <p className="mt-1 text-sm text-slate-500">Cadastre uma nova pessoa ou ajuste a busca.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {filtered.map(secretary => (
              <article key={secretary._id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50/70">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-extrabold text-emerald-700">{secretary.fullName?.charAt(0).toUpperCase() || 'S'}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{secretary.fullName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500"><Mail size={13} /> {secretary.email}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-700">Secretária</span>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={() => setModalOpen(false)}>
          <div className="relative w-full max-w-xl" onMouseDown={event => event.stopPropagation()}>
            <button type="button" onClick={() => setModalOpen(false)} className="absolute right-4 top-4 z-10 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar"><X size={18} /></button>
            <AddAdminContent addNewAdmin={addNewAdmin} role="secretary" modal onCancel={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); void loadSecretaries(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
