import { AlertTriangle, KeyRound, Mail, Plus, Power, RotateCw, Search, UserRound, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import AddAdminContent from './AddAdminContent';
import { confirmDialog } from '../ui/ConfirmHost';

const apiErro = (e: unknown): string | undefined =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error;

type Secretary = { _id: string; fullName: string; email: string; role: 'secretary'; active?: boolean };

const initialsOf = (name?: string) =>
  (name || 'S').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'S';

type Props = {
  addNewAdmin: (data: { fullName: string; email: string; password: string; role?: string }) => Promise<void>;
};

export default function SecretariesManagement({ addNewAdmin }: Props) {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<Secretary | null>(null);

  const loadSecretaries = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await adminService.fetchSecretaries();
      setSecretaries(response.data?.data || []);
    } catch (error) {
      setLoadError(apiErro(error) || 'Verifique a conexão e tente de novo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSecretaries(); }, [loadSecretaries]);

  const toggleActive = useCallback(async (secretary: Secretary) => {
    const willDeactivate = secretary.active !== false;
    if (willDeactivate && !await confirmDialog(`Desativar o acesso de ${secretary.fullName}? Ela não entra mais no ERP nem na agenda.`)) return;
    setBusyId(secretary._id);
    try {
      await adminService.setSecretaryActive(secretary._id, !willDeactivate);
      setSecretaries(prev => prev.map(s => (s._id === secretary._id ? { ...s, active: !willDeactivate } : s)));
      toast.success(willDeactivate ? 'Acesso desativado' : 'Acesso reativado');
    } catch (error) {
      toast.error(apiErro(error) || 'Não foi possível mudar o acesso.');
    } finally {
      setBusyId(null);
    }
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return secretaries;
    return secretaries.filter(item => `${item.fullName} ${item.email}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [search, secretaries]);

  return (
    <div className="w-full p-4 text-left sm:p-6">
      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Users size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-50">Secretárias</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Acessos da equipe administrativa.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden />
          Nova secretária
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">Buscar secretária</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Nome ou e-mail"
            className="min-h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        {!loading && !loadError && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {search.trim() ? `${filtered.length} de ${secretaries.length}` : secretaries.length} {secretaries.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}
          </span>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" aria-busy={loading}>
        {loading ? (
          <ul aria-label="Carregando equipe">
            {[0, 1, 2].map(i => (
              <li key={i} className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0 dark:border-gray-800">
                <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <span className="block h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </span>
              </li>
            ))}
          </ul>
        ) : loadError ? (
          <div className="px-4 py-12 text-center" role="alert">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
            <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">Não foi possível carregar as secretárias</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadSecretaries()}
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <RotateCw size={15} aria-hidden /> Tentar de novo
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <UserRound className="mx-auto h-9 w-9 text-gray-400" aria-hidden />
            <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
              {search.trim() ? 'Ninguém com esse nome ou e-mail' : 'Nenhuma secretária cadastrada'}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {search.trim() ? 'Confira a grafia ou limpe a busca.' : 'Use "Nova secretária" para dar acesso a alguém da equipe.'}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map(secretary => (
              <li key={secretary._id} className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0 dark:border-gray-800">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${secretary.active === false ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>
                  {initialsOf(secretary.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${secretary.active === false ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {secretary.fullName}
                    {secretary.active === false && (
                      <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">Desativada</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <Mail size={13} className="shrink-0" aria-hidden />
                    <span className="truncate">{secretary.email}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setResetFor(secretary)}
                    disabled={busyId === secretary._id}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    title="Redefinir senha"
                  >
                    <KeyRound size={15} aria-hidden />
                    <span className="hidden sm:inline">Senha</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(secretary)}
                    disabled={busyId === secretary._id}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${secretary.active === false ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10' : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10'}`}
                    title={secretary.active === false ? 'Reativar acesso' : 'Desativar acesso'}
                  >
                    <Power size={15} aria-hidden />
                    <span className="hidden sm:inline">{secretary.active === false ? 'Reativar' : 'Desativar'}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={() => setModalOpen(false)}>
          <div className="relative w-full max-w-xl" onMouseDown={event => event.stopPropagation()}>
            <button type="button" onClick={() => setModalOpen(false)} className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100" aria-label="Fechar"><X size={18} /></button>
            <AddAdminContent addNewAdmin={addNewAdmin} role="secretary" modal onCancel={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); void loadSecretaries(); }} />
          </div>
        </div>
      )}

      {resetFor && (
        <ResetPasswordModal
          secretary={resetFor}
          onClose={() => setResetFor(null)}
          onDone={() => setResetFor(null)}
        />
      )}
    </div>
  );
}

function ResetPasswordModal({ secretary, onClose, onDone }: { secretary: Secretary; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) { toast.error('A senha precisa ter ao menos 6 caracteres.'); return; }
    if (password !== confirm) { toast.error('As senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await adminService.resetSecretaryPassword(secretary._id, password);
      toast.success(`Senha de ${secretary.fullName} redefinida.`);
      onDone();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Não foi possível redefinir a senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900" onMouseDown={event => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100" aria-label="Fechar"><X size={18} /></button>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><KeyRound size={18} aria-hidden /></span>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight text-gray-900 dark:text-gray-50">Redefinir senha</h2>
            <p className="truncate text-sm text-gray-600 dark:text-gray-400">{secretary.fullName}</p>
          </div>
        </div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
          Nova senha
          <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </label>
        <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-200">
          Confirmar senha
          <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">Cancelar</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-3.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? 'Salvando…' : 'Redefinir'}</button>
        </div>
      </form>
    </div>
  );
}
