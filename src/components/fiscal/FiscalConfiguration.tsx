import { useEffect, useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { Save, Upload, CheckCircle, AlertCircle, Link2, RefreshCw, Building2, FileText, Shield, Settings, X } from 'lucide-react';
import { fiscalService } from '../../services/fiscalService';
import { toast } from 'react-toastify';

const REGIME_OPTIONS = [
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' }
];

const AMBIENTE_OPTIONS = [
  { value: 'producao_restrita', label: 'Homologação (Produção Restrita)' },
  { value: 'producao', label: 'Produção' }
];

// Ninguém precisa ver um ObjectId inteiro na tela — só o suficiente pra diferenciar dois
// certificados na lista, caso existam vários.
const shortId = (id: string) => (id ? `••••${id.slice(-6)}` : '');

export function FiscalConfiguration() {
  // ============================================================
  // TODOS OS HOOKS E ESTADOS PERMANECEM EXATAMENTE IGUAIS
  // ============================================================
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cnpj] = useState('12345678000199');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certModalOpen, setCertModalOpen] = useState(false);

  const [form, setForm] = useState({
    razaoSocial: '',
    cnpj: '',
    inscricaoMunicipal: '',
    municipioIBGE: '5201108',
    cnae: '8650-0/03',
    codigoServicoLC116: '040803',
    regimeTributario: 'LUCRO_PRESUMIDO',
    ambiente: 'producao_restrita'
  });

  const [certificate, setCertificate] = useState({
    type: 'A1',
    password: '',
    passwordReference: '',
    storageKey: '',
    expiresAt: '',
    status: 'active'
  });

  // ============================================================
  // TODAS AS FUNÇÕES PERMANECEM EXATAMENTE IGUAIS
  // ============================================================
  const load = async () => {
    setLoading(true);
    try {
      const [profileResponse, certificatesResponse] = await Promise.all([
        fiscalService.getProfile(cnpj),
        fiscalService.listCertificates('active')
      ]);
      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
        setForm({
          razaoSocial: profileResponse.data.razaoSocial || '',
          cnpj: profileResponse.data.cnpj || '',
          inscricaoMunicipal: profileResponse.data.inscricaoMunicipal || '',
          municipioIBGE: profileResponse.data.municipioIBGE || '5201108',
          cnae: profileResponse.data.cnae || '8650-0/03',
          codigoServicoLC116: profileResponse.data.codigoServicoLC116 || '040803',
          regimeTributario: profileResponse.data.regimeTributario || 'LUCRO_PRESUMIDO',
          ambiente: profileResponse.data.ambiente || 'producao_restrita'
        });
      }
      if (certificatesResponse.success && Array.isArray(certificatesResponse.data)) {
        setCertificates(certificatesResponse.data);
      }
    } catch (err: any) {
      console.log('Perfil fiscal não encontrado, será criado no primeiro save.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fiscalService.upsertProfile({
        ...form,
        cnpj: form.cnpj || cnpj
      });
      if (response.success) {
        setProfile(response.data);
        toast.success('Perfil fiscal salvo');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar perfil fiscal');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (!certificate.password || !certificate.expiresAt) {
      toast.error('Preencha senha e validade do certificado');
      return;
    }
    try {
      const certificateResponse = await fiscalService.createCertificate({
        type: certificate.type,
        passwordReference: `secret-manager://certificates/${form.cnpj || cnpj}`,
        storageKey: `certificates/${form.cnpj || cnpj}`,
        expiresAt: new Date(certificate.expiresAt).toISOString(),
        status: certificate.status
      });

      const profileResponse = await fiscalService.upsertProfile({
        ...form,
        cnpj: form.cnpj || cnpj,
        certificateRef: certificateResponse.data._id
      });

      if (profileResponse.success) {
        setProfile(profileResponse.data);
      }

      await load();
      toast.success('Certificado salvo e vinculado ao perfil fiscal');
      setCertificate((prev) => ({ ...prev, password: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar certificado');
    }
  };

  const handleLinkCertificate = async (certificateId: string) => {
    try {
      const response = await fiscalService.upsertProfile({
        ...form,
        cnpj: form.cnpj || cnpj,
        certificateRef: certificateId
      });
      if (response.success) {
        setProfile(response.data);
        toast.success('Certificado vinculado ao perfil fiscal');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao vincular certificado');
    }
  };

  const isProfileComplete = profile && profile.cnpj && profile.municipioIBGE && profile.regimeTributario;
  const isCertificateLinked = !!profile?.certificateRef;
  const linkedCertificate = certificates.find((c) => c._id === profile?.certificateRef);

  const formatDate = (value: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress className="text-indigo-500" />
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <Shield className="w-6 h-6 text-indigo-600" />
        </div>
        <Typography variant="h4" fontWeight="bold" className="text-gray-800">
          Configuração Fiscal
        </Typography>
      </div>

      {/* Alert de status */}
      <Alert
        severity={isProfileComplete && isCertificateLinked ? 'success' : 'info'}
        className="rounded-xl border-0 shadow-sm"
        icon={isProfileComplete && isCertificateLinked ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      >
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-base">
            {isProfileComplete && isCertificateLinked
              ? '✅ Pronto para emitir NFSe'
              : '⚙️ Configure os dados para habilitar a emissão de NFSe'}
          </span>
          <span className="text-sm text-gray-600">
            {isProfileComplete
              ? isCertificateLinked
                ? 'Perfil fiscal e certificado estão configurados e vinculados.'
                : 'Perfil fiscal salvo, mas ainda não foi vinculado a um certificado digital.'
              : 'Preencha e salve o Perfil Fiscal para depois vincular o certificado digital.'}
          </span>
        </div>
      </Alert>

      {/* ── Seção: Perfil Fiscal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <Typography variant="h6" fontWeight="700" className="text-gray-800 leading-tight">
              Perfil Fiscal
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Dados da clínica usados em toda NFSe emitida
            </Typography>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Grupo 1: Identificação */}
          <div>
            <Typography variant="overline" className="text-indigo-600 font-semibold tracking-wider text-xs">
              Identificação
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <TextField
                label="Razão Social"
                fullWidth
                value={form.razaoSocial}
                onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
                placeholder="Clínica Fono Inova LTDA"
                size="small"
              />
              <TextField
                label="CNPJ"
                fullWidth
                value={form.cnpj || cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="12.345.678/0001-99"
                size="small"
              />
              <TextField
                label="Inscrição Municipal"
                fullWidth
                value={form.inscricaoMunicipal}
                onChange={(e) => setForm({ ...form, inscricaoMunicipal: e.target.value })}
                placeholder="123456"
                size="small"
              />
              <TextField
                label="Código IBGE (Município)"
                fullWidth
                value={form.municipioIBGE}
                onChange={(e) => setForm({ ...form, municipioIBGE: e.target.value })}
                placeholder="5201108"
                size="small"
                helperText="Ex: 5201108 para Anápolis-GO"
              />
            </div>
          </div>

          <Divider />

          {/* Grupo 2: Configuração tributária */}
          <div>
            <Typography variant="overline" className="text-indigo-600 font-semibold tracking-wider text-xs">
              Configuração Tributária
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <TextField
                label="CNAE"
                fullWidth
                value={form.cnae}
                onChange={(e) => setForm({ ...form, cnae: e.target.value })}
                placeholder="8650-0/03"
                size="small"
              />
              <TextField
                label="Código Serviço (LC116)"
                fullWidth
                value={form.codigoServicoLC116}
                onChange={(e) => setForm({ ...form, codigoServicoLC116: e.target.value })}
                placeholder="040803"
                size="small"
                helperText="Ex: 040803 para Fonoaudiologia"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Regime Tributário</InputLabel>
                <Select
                  label="Regime Tributário"
                  value={form.regimeTributario}
                  onChange={(e) => setForm({ ...form, regimeTributario: e.target.value })}
                >
                  {REGIME_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Ambiente</InputLabel>
                <Select
                  label="Ambiente"
                  value={form.ambiente}
                  onChange={(e) => setForm({ ...form, ambiente: e.target.value })}
                >
                  {AMBIENTE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} className="text-white" /> : <Save size={18} />}
            onClick={handleSaveProfile}
            disabled={saving}
            fullWidth
            className="bg-indigo-600 hover:bg-indigo-700 normal-case py-3 rounded-xl shadow-sm"
          >
            Salvar Perfil Fiscal
          </Button>
        </div>
      </div>

      {/* ── Seção: Certificado digital — resumo compacto, gestão fica no modal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <Typography variant="h6" fontWeight="700" className="text-gray-800 leading-tight">
              Certificado Digital
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Assina digitalmente cada NFSe emitida
            </Typography>
          </div>
        </div>

        <div className="p-6">
          {isCertificateLinked && linkedCertificate ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar sx={{ bgcolor: '#10B981', width: 36, height: 36 }}>
                  <CheckCircle className="w-4 h-4 text-white" />
                </Avatar>
                <div className="min-w-0">
                  <Typography variant="subtitle2" fontWeight="600" className="text-gray-800">
                    Tipo {linkedCertificate.type} · válido até {formatDate(linkedCertificate.expiresAt)}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 font-mono">
                    {shortId(linkedCertificate._id)}
                  </Typography>
                </div>
              </div>
              <Chip label="Vinculado" size="small" color="success" className="shrink-0" />
            </div>
          ) : (
            <Alert severity="warning" icon={<AlertCircle size={20} />} className="rounded-xl border-0 shadow-sm mb-0">
              Nenhum certificado vinculado ainda.
            </Alert>
          )}

          <Button
            variant="outlined"
            startIcon={<Settings size={18} />}
            onClick={() => setCertModalOpen(true)}
            fullWidth
            className="mt-4 normal-case border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl py-3"
          >
            Gerenciar Certificados
          </Button>
        </div>
      </div>

      {/* ── Modal: Gerenciar Certificados ── */}
      <Dialog
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'rounded-2xl' }}
      >
        <DialogTitle className="!p-0">
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <Typography variant="h6" fontWeight="700" className="text-white leading-tight">
                  Certificados Digitais
                </Typography>
                <Typography variant="caption" className="text-indigo-100">
                  {certificates.length} certificado{certificates.length !== 1 ? 's' : ''} cadastrado{certificates.length !== 1 ? 's' : ''} · escolha qual assina as notas
                </Typography>
              </div>
            </div>
            <IconButton onClick={() => load()} size="small" title="Atualizar lista" className="text-white/80 hover:text-white hover:bg-white/10">
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </DialogTitle>

        <DialogContent dividers className="bg-gray-50/60">
          {certificates.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <Typography variant="body2">Nenhum certificado cadastrado.</Typography>
            </div>
          ) : (
            <div
              className="max-h-80 overflow-y-auto pr-1 space-y-2
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-gray-300
                [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {certificates.map((cert) => {
                const isLinked = profile?.certificateRef === cert._id;
                return (
                  <div
                    key={cert._id}
                    className={`flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 border transition-colors ${
                      isLinked ? 'border-emerald-300 ring-1 ring-emerald-100 shadow-sm' : 'border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isLinked ? '#10B981' : '#D1D5DB' }} />
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <Typography variant="body2" fontWeight="700" className="text-gray-800">
                            Válido até {formatDate(cert.expiresAt)}
                          </Typography>
                          {isLinked && <Chip label="Em uso" size="small" color="success" className="font-medium h-5" />}
                        </div>
                        <Typography variant="caption" className="text-gray-400">
                          Tipo {cert.type} · {shortId(cert._id)} · {cert.status}
                        </Typography>
                      </div>
                    </div>
                    {!isLinked && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Link2 size={14} />}
                        onClick={() => handleLinkCertificate(cert._id)}
                        className="normal-case text-xs border-indigo-300 text-indigo-600 hover:bg-indigo-50 shrink-0"
                      >
                        Usar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3.5">
            <Typography variant="subtitle2" fontWeight="700" className="text-indigo-900 mb-0.5">
              Adicionar novo certificado
            </Typography>
            <Typography variant="caption" className="text-gray-500 block mb-3">
              {isCertificateLinked
                ? 'Só preencha se for substituir o certificado que a clínica usa hoje.'
                : 'Importe o certificado A1 da clínica para liberar a emissão de NFSe.'}
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Senha do Certificado"
                type="password"
                fullWidth
                value={certificate.password}
                onChange={(e) => setCertificate({ ...certificate, password: e.target.value })}
                size="small"
                className="bg-white"
              />
              <TextField
                label="Validade"
                type="date"
                fullWidth
                value={certificate.expiresAt}
                onChange={(e) => setCertificate({ ...certificate, expiresAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
                className="bg-white"
              />
            </div>
            <Button
              variant="contained"
              startIcon={<Upload size={18} />}
              onClick={handleSaveCertificate}
              fullWidth
              className="mt-3 normal-case bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2.5 shadow-sm"
            >
              {isCertificateLinked ? 'Salvar e Vincular Novo Certificado' : 'Salvar Certificado'}
            </Button>
          </div>
        </DialogContent>

        <DialogActions sx={{ p: 2 }} className="bg-gray-50/60">
          <Button onClick={() => setCertModalOpen(false)} startIcon={<X size={16} />} className="normal-case text-gray-600">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
