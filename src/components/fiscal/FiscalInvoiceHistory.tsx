// src/components/fiscal/FiscalInvoiceHistory.tsx
// Notas fiscais (NFS-e) do mês: resumo do back, chips por situação com contagem, busca,
// paginação no servidor e ações (reenviar, XML, DANFSe, cancelar com motivo).
// A configuração fiscal abre pela engrenagem (deixou de ser aba própria).

import { useCallback, useEffect, useState } from 'react';
import {
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
} from '@mui/material';
import { FileText, FileCode, RefreshCw, Ban, RotateCcw, Settings, X } from 'lucide-react';
import { fiscalService } from '../../services/fiscalService';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Chip, KpiStrip, Pager, Pill, Tone, brl, fmtDay } from '../../pages/Financial/components/finUi';
import { FiscalConfiguration } from './FiscalConfiguration';

interface FiscalInvoice {
  _id: string;
  patient?: { fullName?: string } | string;
  status: string;
  nNFSe?: number;
  chaveAcesso?: string;
  valorServico?: number;
  dhEmi?: string;
  dCompet?: string;
  createdAt: string;
}

// Todas as situações do back (constants/fiscalEnums.js), inclusive as que antes apareciam com o código cru.
const STATUS: Record<string, { label: string; tone: Tone }> = {
  authorized: { label: 'Autorizada', tone: 'green' },
  pending_submission: { label: 'Falha no envio, reenviar', tone: 'amber' },
  pending_fiscal_analysis: { label: 'Em análise na prefeitura', tone: 'blue' },
  rejected: { label: 'Rejeitada', tone: 'red' },
  cancelled: { label: 'Cancelada', tone: 'gray' },
  cancelled_substituted: { label: 'Cancelada por substituição', tone: 'gray' },
  draft: { label: 'Rascunho', tone: 'gray' },
};
const CHIPS: Array<{ key: string; label: string; warn?: boolean }> = [
  { key: '', label: 'Todas' },
  { key: 'authorized', label: 'Autorizadas' },
  { key: 'pending_submission', label: 'Falha no envio', warn: true },
  { key: 'pending_fiscal_analysis', label: 'Em análise' },
  { key: 'rejected', label: 'Rejeitadas', warn: true },
  { key: 'cancelled', label: 'Canceladas' },
];
const LIMIT = 50;

interface Props { month?: number; year?: number }

export function FiscalInvoiceHistory({ month, year }: Props) {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<{ emitido: { count: number; valor: number }; cancelado: { count: number; valor: number } } | null>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; invoice: FiscalInvoice | null }>({ open: false, invoice: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setQ(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  useEffect(() => { setPage(1); }, [status, q, m, y]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fiscalService.listInvoices({ month: m, year: y, status: status || undefined, q: q || undefined, page, limit: LIMIT });
      if (!response.success) throw new Error('falha');
      setInvoices(response.data || []);
      setStatusCounts(response.statusCounts || {});
      setTotals(response.totals || null);
      setPagination({ total: response.pagination?.total ?? (response.data || []).length, pages: response.pagination?.pages ?? 1 });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [m, y, status, q, page]);

  useEffect(() => { void load(); }, [load]);

  const downloadFile = async (url: string, filename: string, type: 'xml' | 'pdf') => {
    try {
      const response = await API.get(url, {
        responseType: 'blob',
        headers: { Accept: type === 'pdf' ? 'application/pdf' : 'application/xml' }
      });
      const blob = new Blob([response.data], { type: type === 'pdf' ? 'application/pdf' : 'application/xml' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Erro ao baixar ${type.toUpperCase()}`);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal.invoice) return;
    setCancelling(true);
    try {
      const response = await fiscalService.cancelInvoice(cancelModal.invoice._id, cancelReason.trim());
      if (response.success) {
        toast.success('NFS-e cancelada no ERP');
        setCancelModal({ open: false, invoice: null });
        setCancelReason('');
        void load();
      } else {
        toast.error(response.data?.message || 'Erro ao cancelar NFS-e');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao cancelar NFS-e');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const response = await fiscalService.retryInvoice(id);
      if (response.success) {
        if (response.data?.outcome === 'authorized') toast.success('NFS-e autorizada');
        else if (response.data?.outcome === 'rejected') toast.error('A NFS-e foi rejeitada pelo provedor fiscal');
        else toast.warning('A tentativa continua pendente; a NFS-e ainda não foi autorizada');
        void load();
      } else {
        toast.error(response.data?.message || 'Erro ao reenviar NFS-e');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao reenviar NFS-e');
    } finally {
      setRetryingId(null);
    }
  };

  const patientName = (patient?: FiscalInvoice['patient']) => {
    if (!patient) return '—';
    if (typeof patient === 'string') return patient;
    return patient.fullName || '—';
  };
  const problemas = (statusCounts.pending_submission || 0) + (statusCounts.rejected || 0);
  const monthLabel = new Date(y, m - 1, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const btn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notas fiscais · {monthLabel}</h2>
          <p className="text-sm text-gray-500">Pela data de emissão. A emissão é feita no Caixa, a partir do pagamento.</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void load()} className={btn} aria-label="Atualizar"><RefreshCw size={16} /></button>
          {isAdmin && (
            <button type="button" onClick={() => setConfigOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Settings size={15} /> Configuração fiscal
            </button>
          )}
        </div>
      </div>

      <KpiStrip cols={3} loading={loading && !totals} items={[
        { label: 'Emitidas', value: totals ? brl(totals.emitido.valor) : '—', sub: totals ? `${totals.emitido.count} notas autorizadas` : undefined, hero: true, onClick: () => setStatus('authorized') },
        { label: 'Canceladas', value: totals ? brl(totals.cancelado.valor) : '—', sub: totals ? `${totals.cancelado.count} notas` : undefined, onClick: () => setStatus('cancelled') },
        { label: 'Com problema', value: String(problemas), sub: 'falha no envio ou rejeitada', danger: problemas > 0, onClick: () => setStatus(statusCounts.pending_submission ? 'pending_submission' : 'rejected') },
      ]} />

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {CHIPS.map(c => (
              <Chip key={c.key || 'todas'} on={status === c.key} onClick={() => setStatus(c.key)} label={c.label}
                count={c.key ? (statusCounts[c.key] ?? 0) : (statusCounts.todos ?? 0)}
                warn={!!c.warn && (statusCounts[c.key] || 0) > 0 && status !== c.key} />
            ))}
          </div>
          <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Paciente, nº ou chave"
            aria-label="Buscar nota" className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm lg:w-64" />
        </div>

        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 px-4 py-6 text-sm text-red-700">
            Não foi possível carregar as notas.
            <button type="button" onClick={() => void load()} className="font-semibold underline">Tentar de novo</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2">Nº</th>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Emitida em</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Situação</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && invoices.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td></tr>
                ))}
                {!loading && invoices.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    {status || q ? 'Nenhuma nota neste filtro.' : 'Nenhuma nota fiscal neste mês.'}
                  </td></tr>
                )}
                {invoices.map(invoice => {
                  const st = STATUS[invoice.status] || { label: invoice.status, tone: 'gray' as Tone };
                  return (
                    <tr key={invoice._id}>
                      <td className="px-4 py-2.5 tabular-nums">{invoice.nNFSe || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{patientName(invoice.patient)}</td>
                      <td className="hidden px-3 py-2.5 tabular-nums sm:table-cell">{fmtDay(invoice.dhEmi || invoice.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{invoice.valorServico != null ? brl(invoice.valorServico) : '—'}</td>
                      <td className="px-3 py-2.5"><Pill tone={st.tone}>{st.label}</Pill></td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-0.5">
                          {invoice.status === 'pending_submission' && (
                            <button type="button" className={btn} title="Reenviar" aria-label="Reenviar NFS-e"
                              onClick={() => handleRetry(invoice._id)} disabled={retryingId === invoice._id}>
                              {retryingId === invoice._id ? <CircularProgress size={14} /> : <RotateCcw size={16} />}
                            </button>
                          )}
                          {invoice.status === 'authorized' && (
                            <>
                              <button type="button" className={btn} title="Baixar XML" aria-label="Baixar XML"
                                onClick={() => downloadFile(`/v2/fiscal/nfse/${invoice._id}/xml`, `nfse-${invoice.nNFSe || invoice._id}.xml`, 'xml')}><FileCode size={16} /></button>
                              <button type="button" className={btn} title="Baixar DANFSe (PDF)" aria-label="Baixar DANFSe"
                                onClick={() => downloadFile(`/v2/fiscal/nfse/${invoice._id}/pdf`, `nfse-${invoice.nNFSe || invoice._id}.pdf`, 'pdf')}><FileText size={16} /></button>
                              <button type="button" className={`${btn} text-red-700 hover:bg-red-50`} title="Cancelar" aria-label="Cancelar NFS-e"
                                onClick={() => setCancelModal({ open: true, invoice })}><Ban size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end border-t border-gray-100 px-4 py-2.5 text-sm text-gray-600">
          <Pager page={page} pages={pagination.pages} total={pagination.total} limit={LIMIT} onPage={setPage} busy={loading} />
        </div>
      </section>

      <Dialog open={cancelModal.open} onClose={() => setCancelModal({ open: false, invoice: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Cancelar NFS-e</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="mb-2">
            Número: <strong>{cancelModal.invoice?.nNFSe || '-'}</strong>
          </Typography>
          <TextField
            label="Motivo do cancelamento"
            fullWidth
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            helperText={`Obrigatório, mínimo de 15 caracteres (${cancelReason.trim().length}/15)`}
            error={cancelReason.length > 0 && cancelReason.trim().length < 15}
          />
          <Typography variant="body2" color="warning.main" sx={{ mt: 1.5 }}>
            O cancelamento fica registrado no ERP. O envio do cancelamento para a prefeitura ainda não foi testado,
            então confirme também no portal da NFS-e.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelModal({ open: false, invoice: null })} color="inherit">Voltar</Button>
          <Button onClick={handleCancel} variant="contained" color="error" disabled={cancelling || cancelReason.trim().length < 15}>
            {cancelling ? <CircularProgress size={18} /> : 'Confirmar cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Configuração fiscal
          <IconButton onClick={() => setConfigOpen(false)} aria-label="Fechar"><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <FiscalConfiguration />
        </DialogContent>
      </Dialog>
    </div>
  );
}
