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
import { Save, Upload, CheckCircle, AlertCircle, Link2, RefreshCw, Building2, FileText, Shield, Settings, X, Pencil, MapPin } from 'lucide-react';
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

const formatCnpj = (value?: string) => {
  const d = (value || '').replace(/\D/g, '');
  if (d.length !== 14) return value || '-';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const formatCep = (value?: string) => {
  const d = (value || '').replace(/\D/g, '');
  if (d.length !== 8) return value || '-';
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const REGIME_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real'
};

const AMBIENTE_LABELS: Record<string, string> = {
  producao_restrita: 'Homologação',
  producao: 'Produção'
};

export function FiscalConfiguration() {
  // ============================================================
  // TODOS OS HOOKS E ESTADOS PERMANECEM EXATAMENTE IGUAIS
  // ============================================================
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cnpj] = useState('60359243000142');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certModalOpen, setCertModalOpen] = useState(false);
  // Perfil completo entra em modo de visualização (resumo) por padrão; formulário só aparece
  // ao editar ou quando ainda não existe perfil salvo — evita a tela ficar "do mesmo jeito"
  // depois de salvar, sem feedback visual de que funcionou.
  const [editingProfile, setEditingProfile] = useState(false);

  const [form, setForm] = useState({
    razaoSocial: '',
    cnpj: '',
    inscricaoMunicipal: '',
    municipioIBGE: '5201108',
    cnae: '8650-0/06',
    codigoServicoLC116: '040803',
    regimeTributario: 'SIMPLES_NACIONAL',
    ambiente: 'producao_restrita',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: ''
  });

  const [certificate, setCertificate] = useState({
    type: 'A1',
    password: '',
    status: 'active',
    file: null as File | null
  });

  const profileToForm = (data: any) => ({
    razaoSocial: data.razaoSocial || '',
    cnpj: data.cnpj || '',
    inscricaoMunicipal: data.inscricaoMunicipal || '',
    municipioIBGE: data.municipioIBGE || '5201108',
    cnae: data.cnae || '8650-0/06',
    codigoServicoLC116: data.codigoServicoLC116 || '040803',
    regimeTributario: data.regimeTributario || 'SIMPLES_NACIONAL',
    ambiente: data.ambiente || 'producao_restrita',
    logradouro: data.endereco?.logradouro || '',
    numero: data.endereco?.numero || '',
    complemento: data.endereco?.complemento || '',
    bairro: data.endereco?.bairro || '',
    cep: data.endereco?.cep || ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [profileResponse, certificatesResponse] = await Promise.all([
        fiscalService.getProfile(cnpj),
        fiscalService.listCertificates('active')
      ]);
      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
        setForm(profileToForm(profileResponse.data));
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

  const handleCancelEdit = () => {
    if (profile) setForm(profileToForm(profile));
    setEditingProfile(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { logradouro, numero, complemento, bairro, cep, ...rest } = form;
      const response = await fiscalService.upsertProfile({
        ...rest,
        cnpj: form.cnpj || cnpj,
        endereco: { logradouro, numero, complemento, bairro, cep }
      });
      if (response.success) {
        setProfile(response.data);
        setEditingProfile(false); // feedback visual: sai do formulário, mostra o resumo salvo
        toast.success('Perfil fiscal salvo');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar perfil fiscal');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (!certificate.file || !certificate.password) {
      toast.error('Selecione o arquivo (.pfx/.p12) e a senha do certificado');
      return;
    }
    try {
      // Validade não é mais digitada — o backend abre o certificado de verdade e extrai a data
      // real (evita cadastro manual incorreto). Se a senha estiver errada, o erro aparece aqui.
      const certificateResponse = await fiscalService.createCertificate({
        file: certificate.file,
        type: certificate.type,
        password: certificate.password,
        status: certificate.status
      });

      const { logradouro, numero, complemento, bairro, cep, ...rest } = form;
      const profileResponse = await fiscalService.upsertProfile({
        ...rest,
        cnpj: form.cnpj || cnpj,
        endereco: { logradouro, numero, complemento, bairro, cep },
        certificateRef: certificateResponse.data._id
      });

      if (profileResponse.success) {
        setProfile(profileResponse.data);
      }

      await load();

      // Conferência visual: o CNPJ detectado no certificado bate com o CNPJ do perfil fiscal?
      const subjectInfo = certificateResponse.data.subjectInfo;
      const profileCnpjDigits = (form.cnpj || cnpj).replace(/\D/g, '');
      if (subjectInfo?.detectedCnpj && subjectInfo.detectedCnpj !== profileCnpjDigits) {
        toast.warning(
          `Atenção: o certificado foi emitido para "${subjectInfo.commonName}" (CNPJ ${formatCnpj(subjectInfo.detectedCnpj)}), diferente do CNPJ do perfil fiscal (${formatCnpj(profileCnpjDigits)}). Confirme se é o certificado certo.`,
          { autoClose: 12000 }
        );
      } else if (subjectInfo?.commonName) {
        toast.success(`Certificado salvo e vinculado — titular: ${subjectInfo.commonName}`);
      } else {
        toast.success('Certificado salvo e vinculado ao perfil fiscal');
      }

      // Avisos que não bloquearam o cadastro (ex: vencimento próximo, Key Usage ausente).
      const warnings: string[] = certificateResponse.data.warnings || [];
      warnings.forEach((w) => toast.warning(w, { autoClose: 12000 }));

      // Senha e arquivo nunca ficam em memória depois do envio — foram criptografados no servidor.
      setCertificate((prev) => ({ ...prev, password: '', file: null }));
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
  // Sem perfil ainda, ou editando de propósito: mostra o formulário. Perfil completo e "quieto":
  // mostra o resumo (evita a tela ficar idêntica depois de salvar, sem feedback visual).
  const showProfileForm = editingProfile || !isProfileComplete;
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

        {!showProfileForm ? (
          <div className="p-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar sx={{ bgcolor: '#10B981', width: 40, height: 40 }}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </Avatar>
                  <div className="min-w-0">
                    <Typography variant="subtitle1" fontWeight="700" className="text-gray-800 truncate">
                      {profile.razaoSocial}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 font-mono">
                      {formatCnpj(profile.cnpj)}
                    </Typography>
                  </div>
                </div>
                <Chip label="Completo" size="small" color="success" className="shrink-0" />
              </div>

              {profile.endereco?.logradouro && (
                <div className="flex items-start gap-2 text-sm text-gray-600 pl-1">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>
                    {profile.endereco.logradouro}, {profile.endereco.numero}
                    {profile.endereco.complemento ? ` - ${profile.endereco.complemento}` : ''}
                    {profile.endereco.bairro ? `, ${profile.endereco.bairro}` : ''}
                    {profile.endereco.cep ? ` — CEP ${formatCep(profile.endereco.cep)}` : ''}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Chip label={REGIME_LABELS[profile.regimeTributario] || profile.regimeTributario} size="small" variant="outlined" />
                <Chip label={AMBIENTE_LABELS[profile.ambiente] || profile.ambiente} size="small" variant="outlined" />
                {profile.inscricaoMunicipal && <Chip label={`IM ${profile.inscricaoMunicipal}`} size="small" variant="outlined" />}
                {profile.cnae && <Chip label={`CNAE ${profile.cnae}`} size="small" variant="outlined" />}
              </div>

              <Typography variant="caption" className="text-gray-400 block pt-1">
                Atualizado em {formatDate(profile.updatedAt)}
              </Typography>

              <Button
                variant="outlined"
                startIcon={<Pencil size={16} />}
                onClick={() => setEditingProfile(true)}
                className="mt-1 normal-case border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl"
              >
                Editar Perfil Fiscal
              </Button>
            </div>
          </div>
        ) : (
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

          {/* Grupo 1.5: Endereço — Anexo I confirma como obrigatório para o prestador */}
          <div>
            <Typography variant="overline" className="text-indigo-600 font-semibold tracking-wider text-xs">
              Endereço
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <TextField
                label="Logradouro"
                fullWidth
                value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                placeholder="Avenida Minas Gerais"
                size="small"
              />
              <TextField
                label="Número"
                fullWidth
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder="405"
                size="small"
              />
              <TextField
                label="Complemento"
                fullWidth
                value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                placeholder="Sala 2 (opcional)"
                size="small"
              />
              <TextField
                label="Bairro"
                fullWidth
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                placeholder="Jundiaí"
                size="small"
              />
              <TextField
                label="CEP"
                fullWidth
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
                placeholder="75110-770"
                size="small"
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
                placeholder="8650-0/06"
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

          <div className="flex gap-3">
            {profile && (
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                disabled={saving}
                className="normal-case py-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
            )}
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
        )}
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
        maxWidth="sm"
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
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white pl-3 pr-1.5 h-10">
                <FileText size={16} className="text-gray-400 shrink-0" />
                <span className={`flex-1 text-sm truncate ${certificate.file ? 'text-gray-800' : 'text-gray-400'}`}>
                  {certificate.file ? certificate.file.name : 'Nenhum arquivo selecionado (.pfx ou .p12)'}
                </span>
                <Button
                  component="label"
                  size="small"
                  className="normal-case text-xs text-indigo-600 shrink-0 px-2 min-w-0"
                >
                  Procurar
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    hidden
                    onChange={(e) => setCertificate({ ...certificate, file: e.target.files?.[0] || null })}
                  />
                </Button>
              </div>
              <TextField
                label="Senha do Certificado"
                type="password"
                fullWidth
                value={certificate.password}
                onChange={(e) => setCertificate({ ...certificate, password: e.target.value })}
                size="small"
                className="bg-white"
              />
            </div>
            <Typography variant="caption" className="text-gray-400 block mt-2">
              O arquivo e a senha são criptografados (AES-256) antes de salvar — nunca ficam em texto puro.
            </Typography>
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
