// src/components/fiscal/EmitFiscalInvoiceModal.tsx
// Modal mínimo para emitir NFSe a partir de um pagamento (MVP).

import { useEffect, useState } from 'react';
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
  ,FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Building2, Check, CheckCircle2, FileDown, FileText, Receipt, UserRound, UsersRound } from 'lucide-react';
import { fiscalService, FiscalServiceOption, FiscalTakerPayload } from '../../services/fiscalService';
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
  const [services, setServices] = useState<FiscalServiceOption[]>([]);
  const [selectedServiceKey, setSelectedServiceKey] = useState('fonoaudiologia');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [patientContext, setPatientContext] = useState<any | null>(null);
  const [taker, setTaker] = useState<FiscalTakerPayload>({
    type: 'patient',
    name: '',
    cpf: '',
    cnpj: '',
    address: { street: '', number: '', complement: '', district: '', municipioIBGE: '', zipCode: '' }
  });

  const takerFromPatient = (patient: any, type: FiscalTakerPayload['type'] = 'patient'): FiscalTakerPayload => ({
    type,
    name: type === 'responsible' ? patient.legalGuardian || '' : patient.name || '',
    cpf: type === 'patient' ? patient.cpf || '' : '',
    cnpj: type === 'company' ? patient.cnpj || '' : '',
    address: { ...patient.address }
  });

  useEffect(() => {
    if (!open || !payment) return;
    setPatientContext(null);
    setContextLoading(true);
    fiscalService.getPaymentContext(payment.id)
      .then((response) => {
        const patient = response.data.patient;
        const fiscalServices: FiscalServiceOption[] = response.data.services || [];
        const suggestedKey = response.data.suggestedServiceKey || fiscalServices[0]?.key || 'fonoaudiologia';
        const suggested = fiscalServices.find((service) => service.key === suggestedKey) || fiscalServices[0];
        setPatientContext(patient);
        setTaker(takerFromPatient(patient));
        setServices(fiscalServices);
        if (suggested) {
          setSelectedServiceKey(suggested.key);
          setDescription(suggested.description);
          setServiceCode(suggested.serviceCode);
        }
      })
      .catch((err: any) => toast.error(err.response?.data?.message || 'Não foi possível carregar os dados fiscais do paciente'))
      .finally(() => setContextLoading(false));
  }, [open, payment?.id]);

  const updateTaker = (field: keyof FiscalTakerPayload, value: any) =>
    setTaker((current) => ({ ...current, [field]: value }));

  const updateAddress = (field: keyof FiscalTakerPayload['address'], value: string) =>
    setTaker((current) => ({ ...current, address: { ...current.address, [field]: value } }));

  const handleTakerType = (type: FiscalTakerPayload['type']) => {
    if (type === 'patient' && patientContext) {
      setTaker(takerFromPatient(patientContext));
    } else if (type === 'responsible' && patientContext) {
      setTaker(takerFromPatient(patientContext, 'responsible'));
    } else {
      setTaker({
        type,
        name: '', cpf: '', cnpj: '',
        address: { street: '', number: '', complement: '', district: '', municipioIBGE: '', zipCode: '' }
      });
    }
  };

  const handleClose = () => {
    setResult(null);
    setSubmissionError(null);
    onClose();
  };

  const handleServiceChange = (key: string) => {
    const selected = services.find((service) => service.key === key);
    if (!selected) return;
    setSelectedServiceKey(selected.key);
    setDescription(selected.description);
    setServiceCode(selected.serviceCode);
    setSubmissionError(null);
  };

  const rejectionMessage = (fiscalInvoice: any) => {
    try {
      const parsed = JSON.parse(fiscalInvoice?.rejectionReason || '{}');
      const firstError = parsed?.body?.erros?.[0];
      if (firstError) {
        return [firstError.Codigo, firstError.Descricao, firstError.Complemento].filter(Boolean).join(' — ');
      }
    } catch {
      // Mantém a mensagem genérica se o provedor retornar um formato inesperado.
    }
    return 'A NFS-e foi rejeitada pelo provedor fiscal. Confira os dados e tente novamente.';
  };

  const handleEmit = async () => {
    if (!payment) return;
    setSubmissionError(null);
    setLoading(true);
    try {
      const response = await fiscalService.emitFromPayment(payment.id, {
        serviceDescription: description,
        serviceCode,
        fiscalTaker: taker
      });

      if (response.success) {
        if (response.data.outcome === 'authorized') {
          setResult(response.data);
          toast.success('NFSe emitida com sucesso');
          onSuccess();
        } else if (response.data.outcome === 'rejected') {
          const message = rejectionMessage(response.data.fiscalInvoice);
          setSubmissionError(message);
          toast.error('A NFS-e foi rejeitada. Os dados foram mantidos para correção.');
        } else {
          setSubmissionError('Não foi possível concluir a comunicação com o provedor fiscal. Os dados foram mantidos; tente novamente.');
          toast.warning('A NFS-e não foi autorizada. A tentativa ficou pendente para reenvio.');
        }
      } else {
        const message = response.data?.message || 'Erro ao emitir NFS-e';
        setSubmissionError(message);
        toast.error(message);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erro ao emitir NFSe';
      setSubmissionError(message);
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ className: 'rounded-2xl' }}>
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

      <DialogContent dividers className="!p-0 !overflow-hidden bg-slate-50">
        {!result ? (
          <div className="grid md:grid-cols-[230px_minmax(0,1fr)] min-h-[520px]">
            <aside className="border-r border-slate-200 bg-slate-50 px-5 py-6 text-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Pagamento</p>
              <p className="mt-5 text-xs text-slate-500">Valor da nota</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-emerald-700">{formatCurrency(payment.valor)}</p>

              <div className="my-6 h-px bg-slate-200" />

              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Paciente</p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{payment.paciente}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Data</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{payment.data || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Método</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{payment.metodo || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
                <div className="flex gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check size={12} /></div>
                  <p className="text-[11px] leading-relaxed text-slate-600">Confira o tomador antes de emitir. Depois da autorização, a correção exige substituição da nota.</p>
                </div>
              </div>
            </aside>

            <section className="max-h-[68vh] overflow-y-auto bg-white px-6 py-5">
              {contextLoading ? (
                <div className="flex h-full min-h-80 items-center justify-center gap-3 text-sm text-slate-500">
                  <CircularProgress size={20} /> Carregando dados fiscais...
                </div>
              ) : (
                <div className="space-y-6">
                  {submissionError && (
                    <Alert severity="error" className="rounded-xl" onClose={() => setSubmissionError(null)}>
                      <strong>Não foi possível emitir a NFS-e.</strong><br />
                      {submissionError}
                    </Alert>
                  )}
                  <div>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Quem receberá a nota?</p>
                        <p className="mt-0.5 text-xs text-slate-500">Selecione o tomador do serviço</p>
                      </div>
                      {taker.type !== 'patient' && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">Paciente será citado na descrição</span>}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {([
                        { type: 'patient', label: 'Paciente', icon: UserRound },
                        { type: 'responsible', label: 'Responsável', icon: UsersRound },
                        { type: 'company', label: 'Empresa', icon: Building2 }
                      ] as const).map(({ type, label, icon: Icon }) => {
                        const selected = taker.type === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTakerType(type)}
                            className={`relative flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                          >
                            <Icon size={17} className={selected ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className="text-xs font-semibold">{label}</span>
                            {selected && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white"><Check size={10} /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Identificação</p>
                    <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)] gap-3">
                      <TextField label={taker.type === 'company' ? 'Razão social' : 'Nome completo'} value={taker.name} onChange={(event) => updateTaker('name', event.target.value)} required fullWidth size="small" />
                      {taker.type === 'company'
                        ? <TextField label="CNPJ" value={taker.cnpj || ''} onChange={(event) => updateTaker('cnpj', event.target.value)} required fullWidth size="small" inputProps={{ maxLength: 18 }} />
                        : <TextField label="CPF" value={taker.cpf || ''} onChange={(event) => updateTaker('cpf', event.target.value)} required fullWidth size="small" inputProps={{ maxLength: 14 }} />}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Endereço do tomador</p>
                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-2"><TextField label="CEP" value={taker.address.zipCode} onChange={(event) => updateAddress('zipCode', event.target.value)} required fullWidth size="small" inputProps={{ maxLength: 9 }} /></div>
                      <div className="col-span-4"><TextField label="Logradouro" value={taker.address.street} onChange={(event) => updateAddress('street', event.target.value)} required fullWidth size="small" /></div>
                      <div className="col-span-2"><TextField label="Número" value={taker.address.number} onChange={(event) => updateAddress('number', event.target.value)} required fullWidth size="small" /></div>
                      <div className="col-span-4"><TextField label="Complemento" value={taker.address.complement || ''} onChange={(event) => updateAddress('complement', event.target.value)} fullWidth size="small" /></div>
                      <div className="col-span-3"><TextField label="Bairro" value={taker.address.district} onChange={(event) => updateAddress('district', event.target.value)} required fullWidth size="small" /></div>
                      <div className="col-span-3"><TextField label="Código IBGE do município" value={taker.address.municipioIBGE} onChange={(event) => updateAddress('municipioIBGE', event.target.value)} required fullWidth size="small" inputProps={{ maxLength: 7 }} /></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Serviço</p>
                      <span className="text-[10px] text-slate-400">Padrão da clínica</span>
                    </div>
                    <div className="grid grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)_140px] gap-3">
                      <FormControl fullWidth size="small">
                        <InputLabel id="fiscal-service-label">Especialidade</InputLabel>
                        <Select
                          labelId="fiscal-service-label"
                          label="Especialidade"
                          value={selectedServiceKey}
                          onChange={(event) => handleServiceChange(String(event.target.value))}
                        >
                          {services.map((service) => (
                            <MenuItem key={service.key} value={service.key}>{service.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField label="Descrição do serviço" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} size="small" />
                      <TextField label="Código nacional" fullWidth value={serviceCode} size="small" InputProps={{ readOnly: true }} />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-4 p-5">
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

            {isAuthorized && <div className="flex gap-3">
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
            </div>}
          </div>
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
            disabled={loading || contextLoading || !patientContext}
            className="normal-case rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm px-5"
          >
            {loading ? <CircularProgress size={20} className="text-white" /> : 'Emitir NFSe'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
