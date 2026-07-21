// src/components/fiscal/FiscalInvoiceHistory.tsx
// Histórico simples de NFSe (MVP) — lista por paciente, status e ações de download.

import { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import { FileText, FileDown, RefreshCw, Ban, RotateCcw } from 'lucide-react';
import { fiscalService } from '../../services/fiscalService';
import { toast } from 'react-toastify';
import API from '../../services/api';

interface FiscalInvoice {
  _id: string;
  patient?: { fullName?: string } | string;
  status: string;
  nNFSe?: number;
  chaveAcesso?: string;
  valorServico?: number;
  createdAt: string;
}

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  authorized: 'success',
  cancelled: 'error',
  rejected: 'error',
  pending_submission: 'warning',
  draft: 'default'
};

const statusLabel: Record<string, string> = {
  authorized: 'Autorizada',
  cancelled: 'Cancelada',
  rejected: 'Rejeitada',
  pending_submission: 'Pendente',
  draft: 'Rascunho'
};

export function FiscalInvoiceHistory() {
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; invoice: FiscalInvoice | null }>({ open: false, invoice: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fiscalService.listInvoices({ limit: 50 });
      if (response.success) {
        setInvoices(response.data);
      } else {
        toast.error('Erro ao carregar notas fiscais');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const formatCurrency = (v?: number) =>
    v === undefined ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCancel = async () => {
    if (!cancelModal.invoice) return;
    setCancelling(true);
    try {
      const response = await fiscalService.cancelInvoice(cancelModal.invoice._id);
      if (response.success) {
        toast.success('NFSe cancelada com sucesso');
        setCancelModal({ open: false, invoice: null });
        setCancelReason('');
        load();
      } else {
        toast.error(response.data?.message || 'Erro ao cancelar NFSe');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao cancelar NFSe');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const response = await fiscalService.retryInvoice(id);
      if (response.success) {
        toast.success('NFSe reenviada com sucesso');
        load();
      } else {
        toast.error(response.data?.message || 'Erro ao reenviar NFSe');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao reenviar NFSe');
    } finally {
      setRetryingId(null);
    }
  };

  const patientName = (patient?: FiscalInvoice['patient']) => {
    if (!patient) return '-';
    if (typeof patient === 'string') return patient;
    return patient.fullName || '-';
  };

  if (loading) {
    return (
      <Box className="flex justify-center py-12">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={1} className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h6" className="font-semibold">NFSe Emitidas</Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={load} size="small">
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </div>

      {invoices.length === 0 ? (
        <Typography color="textSecondary" className="text-center py-8">
          Nenhuma NFSe emitida ainda.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Paciente</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice._id}>
                  <TableCell>{patientName(invoice.patient)}</TableCell>
                  <TableCell>{invoice.nNFSe || '-'}</TableCell>
                  <TableCell>{formatCurrency(invoice.valorServico)}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabel[invoice.status] || invoice.status}
                      color={statusColor[invoice.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(invoice.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell align="right">
                    {invoice.status === 'pending_submission' && (
                      <Tooltip title="Reenviar NFSe">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleRetry(invoice._id)}
                          disabled={retryingId === invoice._id}
                        >
                          {retryingId === invoice._id ? <CircularProgress size={18} /> : <RotateCcw size={18} />}
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Baixar XML">
                      <IconButton
                        size="small"
                        onClick={() => downloadFile(`/v2/fiscal/nfse/${invoice._id}/xml`, `nfse-${invoice.nNFSe || invoice._id}.xml`, 'xml')}
                      >
                        <FileDown size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Baixar PDF">
                      <IconButton
                        size="small"
                        onClick={() => downloadFile(`/v2/fiscal/nfse/${invoice._id}/pdf`, `nfse-${invoice.nNFSe || invoice._id}.pdf`, 'pdf')}
                      >
                        <FileText size={18} />
                      </IconButton>
                    </Tooltip>
                    {invoice.status === 'authorized' && (
                      <Tooltip title="Cancelar NFSe">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setCancelModal({ open: true, invoice })}
                        >
                          <Ban size={18} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={cancelModal.open} onClose={() => setCancelModal({ open: false, invoice: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Cancelar NFSe</DialogTitle>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelModal({ open: false, invoice: null })} color="inherit">
            Voltar
          </Button>
          <Button onClick={handleCancel} variant="contained" color="error" disabled={cancelling}>
            {cancelling ? <CircularProgress size={18} /> : 'Confirmar cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
