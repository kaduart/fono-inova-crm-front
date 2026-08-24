/**
 * 📲 PublishModal — Aprovar + Publicar post Instagram/Facebook
 * - Upload de mídia externa (arrasta ou clica)
 * - Seletor: Orgânico / Pago / Ambos
 * - Config básica de campanha (nome, verba, cidade, faixa etária)
 */

import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import type { Post, PublishTarget, CampaignConfig } from '../../hooks/useMarketing';

interface PublishModalProps {
  post: Post;
  channel: 'instagram' | 'facebook';
  onApprove: () => Promise<void>;
  onPublish: (target: PublishTarget, campaign?: CampaignConfig) => Promise<void>;
  onUploadMedia: (file: File) => Promise<string>;
  onClose: () => void;
}

const TARGET_OPTIONS: { value: PublishTarget; label: string; desc: string; color: string }[] = [
  { value: 'organic', label: 'Orgânico', desc: 'Publica no feed sem impulsionar', color: 'green' },
  { value: 'paid',    label: 'Tráfego Pago', desc: 'Só cria campanha (sem post no feed)', color: 'blue' },
  { value: 'both',    label: 'Orgânico + Pago', desc: 'Publica no feed e cria campanha', color: 'purple' },
];

export function PublishModal({ post, channel, onApprove, onPublish, onUploadMedia, onClose }: PublishModalProps) {
  const [step, setStep] = useState<'review' | 'publish'>(
    post.status === 'approved' ? 'publish' : 'review'
  );
  const [target, setTarget] = useState<PublishTarget>('organic');
  const [campaignName, setCampaignName] = useState(`${post.theme || 'Clínica'} - ${new Date().toLocaleDateString('pt-BR')}`);
  const [city, setCity] = useState('');
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(55);
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(post.mediaUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUploadMedia(file);
      setMediaPreview(url);
      toast.success('Arquivo enviado!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove();
      toast.success('Post aprovado!');
      setStep('publish');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao aprovar');
    } finally {
      setApproving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const campaign: CampaignConfig | undefined = (target === 'paid' || target === 'both')
        ? { name: campaignName, targeting: { city: city || undefined, age_min: ageMin, age_max: ageMax } }
        : undefined;

      await onPublish(target, campaign);

      const msgs: Record<PublishTarget, string> = {
        organic: `📸 Publicado no ${channel === 'instagram' ? 'Instagram' : 'Facebook'}!`,
        paid: '📢 Campanha criada na Meta Ads!',
        both: '🚀 Publicado + campanha criada!'
      };
      toast.success(msgs[target]);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao publicar');
    } finally {
      setPublishing(false);
    }
  };

  const channelLabel = channel === 'instagram' ? 'Instagram' : 'Facebook';
  const showCampaignConfig = target === 'paid' || target === 'both';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'review' ? 'Revisar e Aprovar' : `Publicar no ${channelLabel}`}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === 'review' ? 'Confira o conteúdo antes de aprovar' : 'Escolha como publicar'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Preview do conteúdo */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {/* Mídia */}
            <div
              className={`relative rounded-lg overflow-hidden border-2 border-dashed transition-colors cursor-pointer
                ${isDragging ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              {mediaPreview ? (
                <div className="relative">
                  <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 bg-black/50 px-3 py-1 rounded-full">
                      Trocar imagem
                    </span>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="text-sm text-gray-600">Enviando...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">{uploading ? 'Enviando...' : 'Arraste ou clique para adicionar imagem/vídeo'}</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP, MP4 — até 100MB</p>
                </div>
              )}
            </div>

            {/* Headline */}
            {post.headline && (
              <p className="font-semibold text-gray-800 text-sm">{post.headline}</p>
            )}

            {/* Caption / Content */}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
              {post.caption || post.content}
            </p>
          </div>

          {/* STEP 1: Aprovar */}
          {step === 'review' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {approving ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Aprovando...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Aprovar post</>
              )}
            </button>
          )}

          {/* STEP 2: Target + Publicar */}
          {step === 'publish' && (
            <>
              {/* Seletor de destino */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Onde publicar?</p>
                <div className="grid grid-cols-3 gap-2">
                  {TARGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTarget(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        target === opt.value
                          ? `border-${opt.color}-500 bg-${opt.color}-50`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${target === opt.value ? `text-${opt.color}-700` : 'text-gray-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Config campanha */}
              {showCampaignConfig && (
                <div className="space-y-3 bg-blue-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-blue-800">Configuração da campanha</p>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Nome da campanha</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Cidade (opcional)</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="ex: Goiânia"
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 font-medium">Idade mín.</label>
                      <input
                        type="number"
                        value={ageMin}
                        onChange={(e) => setAgeMin(Number(e.target.value))}
                        min={18} max={65}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 font-medium">Idade máx.</label>
                      <input
                        type="number"
                        value={ageMax}
                        onChange={(e) => setAgeMax(Number(e.target.value))}
                        min={18} max={65}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {publishing ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publicando...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {target === 'organic' ? `Publicar no ${channelLabel}` : target === 'paid' ? 'Criar campanha' : 'Publicar + Criar campanha'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
