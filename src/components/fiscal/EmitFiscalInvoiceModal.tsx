// src/components/fiscal/EmitFiscalInvoiceModal.tsx
// Modal mínimo para emitir NFSe a partir de um pagamento (MVP).

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Divider
} from '@mui/material';
import { FileText, FileDown, CheckCircle2, Receipt } from 'lucide-react';
import { fiscalService } from '../../services/fiscalService';
import { toast } from 'react-toastify';
import API from '../../services/api';

interface PaymentData {
  id: string;
  paciente: string;
  valor: number;
  metodo?: string;
  data?: string;
}

interface EmitFiscalInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentData | null;
  onSuccess: () => void;
}

export function EmitFiscalInvoiceModal({ open, onClose, payment, onSuccess }: EmitFiscalInvoiceModalProps) {
  const [description, setDescription] = useState('Prestação de serviços de Fonoaudiologia');
  const [serviceCode, setServiceCode] = useState('040803');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const handleEmit = async () => {
    if (!payment) return;
    setLoading(true);
    try {
      const response = await fiscalService.emitFromPayment(payment.id, {
        serviceDescription: description,
        serviceCode
      });

      if (response.success) {
        setResult(response.data);
        toast.success('NFSe emitida com sucesso');
        onSuccess();
      } else {
        toast.error(response.data?.message || 'Erro ao emitir NFSe');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erro ao emitir NFSe';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  if (!payment) return null;

  const isAuthorized = result?.outcome === 'authorized';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ className: 'rounded-2xl' }}>
      <DialogTitle className="!p-0">
        <div
          className={`flex items-center gap-3 px-6 py-5 ${
            result
              ? isAuthorized
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                : 'bg-gradient-to-r from-amber-600 to-amber-500'
              : 'bg-gradient-to-r from-indigo-600 to-indigo-500'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            {result ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Receipt className="w-5 h-5 text-white" />}
          </div>
          <div>
            <Typography variant="h6" fontWeight="700" className="text-white leading-tight">
              {result ? (isAuthorized ? 'NFSe Autorizada' : 'Emissão Processada') : 'Emitir NFSe'}
            </Typography>
            <Typography variant="caption" className="text-white/80">
              {result ? payment.paciente : `Referente ao pagamento de ${payment.paciente}`}
            </Typography>
          </div>
        </div>
      </DialogTitle>

      <DialogContent dividers className="bg-gray-50/60 space-y-4 !pt-5">
        {!result ? (
          <>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <Typography variant="overline" className="text-indigo-600 font-semibold tracking-wider text-xs">
                Resumo do pagamento
              </Typography>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <Typography variant="body2" className="text-gray-400">Paciente</Typography>
                <Typography variant="body2" fontWeight="600" className="text-gray-800 text-right">{payment.paciente}</Typography>

                <Typography variant="body2" className="text-gray-400">Valor</Typography>
                <Typography variant="body2" fontWeight="700" className="text-emerald-700 text-right">{formatCurrency(payment.valor)}</Typography>

                <Typography variant="body2" className="text-gray-400">Método</Typography>
                <Typography variant="body2" className="text-gray-700 text-right">{payment.metodo || '-'}</Typography>

                <Typography variant="body2" className="text-gray-400">Data</Typography>
                <Typography variant="body2" className="text-gray-700 text-right">{payment.data || '-'}</Typography>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <Typography variant="overline" className="text-indigo-600 font-semibold tracking-wider text-xs">
                Dados da nota
              </Typography>
              <TextField
                label="Descrição do serviço"
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                size="small"
              />
              <TextField
                label="Código do serviço (LC116)"
                fullWidth
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                size="small"
                helperText="Ex: 040803 para Fonoaudiologia"
              />
            </div>
          </>
        ) : (
          <>
            <Alert severity={isAuthorized ? 'success' : 'warning'} className="rounded-xl border-0 shadow-sm">
              {isAuthorized
                ? 'A nota foi assinada e autorizada pela prefeitura.'
                : `Emissão finalizada com status: ${result.outcome}`}
            </Alert>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <Typography variant="overline" className="text-gray-500 font-semibold tracking-wider text-xs">
                  Comprovante
                </Typography>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Typography variant="body2" className="text-gray-400">Status</Typography>
                  <Typography variant="body2" fontWeight="700" className="text-gray-800 capitalize">{result.fiscalInvoice.status}</Typography>
                </div>
                <Divider />
                <div className="flex items-center justify-between">
                  <Typography variant="body2" className="text-gray-400">Número</Typography>
                  <Typography variant="body2" fontWeight="700" className="text-gray-800 font-mono">{result.fiscalInvoice.nNFSe || '-'}</Typography>
                </div>
                <Divider />
                <div className="flex items-center justify-between gap-4">
                  <Typography variant="body2" className="text-gray-400 shrink-0">Chave de acesso</Typography>
                  <Typography variant="body2" fontWeight="600" className="text-gray-700 font-mono text-xs text-right break-all">
                    {result.fiscalInvoice.chaveAcesso || '-'}
                  </Typography>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outlined"
                startIcon={<FileDown size={16} />}
                onClick={() => downloadFile(`/v2/fiscal/nfse/${result.fiscalInvoice._id}/xml`, `nfse-${result.fiscalInvoice.nNFSe || result.fiscalInvoice._id}.xml`, 'xml')}
                fullWidth
                className="normal-case rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Baixar XML
              </Button>
              <Button
                variant="contained"
                startIcon={<FileText size={16} />}
                onClick={() => downloadFile(`/v2/fiscal/nfse/${result.fiscalInvoice._id}/pdf`, `nfse-${result.fiscalInvoice.nNFSe || result.fiscalInvoice._id}.pdf`, 'pdf')}
                fullWidth
                className="normal-case rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Baixar PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }} className="bg-gray-50/60">
        <Button onClick={handleClose} className="normal-case text-gray-600">
          {result ? 'Fechar' : 'Cancelar'}
        </Button>
        {!result && (
          <Button
            onClick={handleEmit}
            variant="contained"
            disabled={loading}
            className="normal-case rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm px-5"
          >
            {loading ? <CircularProgress size={20} className="text-white" /> : 'Emitir NFSe'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
