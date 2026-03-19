import { useState } from 'react';
import type { Video } from '../../hooks/useMarketing';

interface CTAConfig {
  texto: string;
  subtexto: string;
  cor: string;
}

interface EditOptions {
  legendas: boolean;
  musica: 'calma' | 'esperancosa' | 'emocional' | null;
  cta: CTAConfig | null;
}

interface VideoEditModalProps {
  video: Video;
  onClose: () => void;
  onApply: (videoId: string, options: EditOptions) => Promise<void>;
  applying?: boolean;
}

const MUSICAS = [
  { id: null,           label: 'Sem música',    icon: '🔇', desc: 'Apenas narração' },
  { id: 'calma',        label: 'Calma',          icon: '🎵', desc: 'Suave e tranquilizante' },
  { id: 'esperancosa',  label: 'Esperançosa',    icon: '🌟', desc: 'Positiva e motivadora' },
  { id: 'emocional',    label: 'Emocional',      icon: '💙', desc: 'Tocante e envolvente' },
] as const;

const CTA_CORES = [
  { cor: '#ef4444', label: 'Vermelho' },
  { cor: '#3b82f6', label: 'Azul' },
  { cor: '#10b981', label: 'Verde' },
  { cor: '#8b5cf6', label: 'Roxo' },
  { cor: '#f59e0b', label: 'Âmbar' },
  { cor: '#ec4899', label: 'Rosa' },
];

export function VideoEditModal({ video, onClose, onApply, applying }: VideoEditModalProps) {
  const [legendas, setLegendas] = useState(true);
  const [musica, setMusica]     = useState<EditOptions['musica']>(null);
  const [ctaAtivo, setCtaAtivo] = useState(false);
  const [ctaTexto, setCtaTexto]     = useState('Agende uma consulta');
  const [ctaSubtexto, setCtaSubtexto] = useState('Link na bio 💚');
  const [ctaCor, setCtaCor]     = useState('#ef4444');

  const handleApply = async () => {
    const options: EditOptions = {
      legendas,
      musica,
      cta: ctaAtivo ? { texto: ctaTexto, subtexto: ctaSubtexto, cor: ctaCor } : null
    };
    await onApply(video._id, options);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Editor de Vídeo</h2>
              <p className="text-gray-300 text-sm mt-0.5 line-clamp-1">{video.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* ── Legendas ─────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Legendas automáticas</h3>
                <p className="text-xs text-gray-500 mt-0.5">Texto queimado no vídeo (estilo Reels)</p>
              </div>
              <button
                onClick={() => setLegendas(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${legendas ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${legendas ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {legendas && (
              <div className="mt-2 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                ✨ Legendas geradas via Whisper AI com sincronização automática
              </div>
            )}
          </section>

          {/* ── Música de fundo ──────────────────────────────────────────── */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Música de fundo</h3>
            <div className="grid grid-cols-2 gap-2">
              {MUSICAS.map(m => (
                <button
                  key={String(m.id)}
                  onClick={() => setMusica(m.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    musica === m.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ── CTA Início e Final ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">CTA (Call-to-Action)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Aparece no início (0-5s) e no final (últimos 5s)</p>
              </div>
              <button
                onClick={() => setCtaAtivo(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${ctaAtivo ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ctaAtivo ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {ctaAtivo && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Texto principal</label>
                  <input
                    type="text"
                    value={ctaTexto}
                    onChange={e => setCtaTexto(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Agende sua consulta agora"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Subtexto</label>
                  <input
                    type="text"
                    value={ctaSubtexto}
                    onChange={e => setCtaSubtexto(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Clique no link da bio 💚"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Cor do banner</label>
                  <div className="flex gap-2 flex-wrap">
                    {CTA_CORES.map(c => (
                      <button
                        key={c.cor}
                        onClick={() => setCtaCor(c.cor)}
                        title={c.label}
                        style={{ backgroundColor: c.cor }}
                        className={`w-8 h-8 rounded-full transition-transform ${ctaCor === c.cor ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview CTA */}
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-gray-500">Preview:</p>
                  {/* Preview Início */}
                  <div
                    className="rounded-lg p-2 text-center"
                    style={{ backgroundColor: ctaCor }}
                  >
                    <span className="text-[10px] text-white/70 uppercase tracking-wide">Início do vídeo (0-5s)</span>
                    <p className="text-white font-bold text-sm">{ctaTexto || 'Texto CTA'}</p>
                    {ctaSubtexto && <p className="text-white/85 text-xs mt-0.5">{ctaSubtexto}</p>}
                  </div>
                  {/* Preview Final */}
                  <div
                    className="rounded-lg p-2 text-center"
                    style={{ backgroundColor: ctaCor }}
                  >
                    <span className="text-[10px] text-white/70 uppercase tracking-wide">Final do vídeo (últimos 5s)</span>
                    <p className="text-white font-bold text-sm">{ctaTexto || 'Texto CTA'}</p>
                    {ctaSubtexto && <p className="text-white/85 text-xs mt-0.5">{ctaSubtexto}</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {applying ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Aplicando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Aplicar Edições
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoEditModal;
