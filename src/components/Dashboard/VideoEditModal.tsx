import { useState } from 'react';
import type { Video, EditOptions } from '../../hooks/useMarketing';

interface VideoEditModalProps {
  video: Video;
  onClose: () => void;
  onApply: (videoId: string, options: EditOptions) => Promise<void>;
  applying?: boolean;
}

const MUSICAS = [
  { id: null,          label: 'Sem música',  icon: '🔇', desc: 'Apenas narração' },
  { id: 'calma',       label: 'Calma',       icon: '🎵', desc: 'Suave e tranquilizante' },
  { id: 'esperancosa', label: 'Esperançosa', icon: '🌟', desc: 'Positiva e motivadora' },
  { id: 'emocional',   label: 'Emocional',   icon: '💙', desc: 'Tocante e envolvente' },
] as const;

const CTA_CORES = [
  { cor: '#ef4444', label: 'Vermelho' },
  { cor: '#3b82f6', label: 'Azul' },
  { cor: '#10b981', label: 'Verde' },
  { cor: '#8b5cf6', label: 'Roxo' },
  { cor: '#f59e0b', label: 'Ambar' },
  { cor: '#ec4899', label: 'Rosa' },
];

const LOGO_POSITIONS = [
  { id: 'top-left',     label: 'Topo esq.' },
  { id: 'top-right',    label: 'Topo dir.' },
  { id: 'bottom-left',  label: 'Base esq.' },
  { id: 'bottom-right', label: 'Base dir.' },
  { id: 'center',       label: 'Centro' },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : ''}`} />
    </button>
  );
}

export function VideoEditModal({ video, onClose, onApply, applying }: VideoEditModalProps) {
  // Legendas
  const [legendas, setLegendas] = useState(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState(88);
  const [subtitleFontColor, setSubtitleFontColor] = useState('&H0000FFFF');

  // Musica
  const [musica, setMusica]           = useState<EditOptions['musica']>(null);
  const [musicVolume, setMusicVolume] = useState(0.05);  // ← Era 0.20, agora 5% padrão

  // CTA
  const [ctaAtivo, setCtaAtivo]         = useState(false);
  const [ctaTexto, setCtaTexto]         = useState('Agende uma consulta');
  const [ctaSubtexto, setCtaSubtexto]   = useState('Link na bio');
  const [ctaCor, setCtaCor]             = useState('#ef4444');

  // Logo
  const [logoAtivo, setLogoAtivo]           = useState(false);
  const [logoUsarPadrao, setLogoUsarPadrao] = useState(true);
  const [logoUrl, setLogoUrl]               = useState('');
  const [logoPosition, setLogoPosition]     = useState('bottom-right');

  // Watermark
  const [watermarkAtivo, setWatermarkAtivo] = useState(false);
  const [watermarkText, setWatermarkText]   = useState('@fonoinova');

  // Trim
  const [trimAtivo, setTrimAtivo] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd]     = useState(0);

  const handleApply = async () => {
    const options: EditOptions = {
      legendas,
      subtitleFontSize,
      subtitleFontColor,
      musica,
      musicVolume,
      cta: ctaAtivo ? { texto: ctaTexto, subtexto: ctaSubtexto, cor: ctaCor } : null,
      logo: logoAtivo ? (logoUsarPadrao ? { usarPadrao: true } : { url: logoUrl }) : null,
      logoPosition,
      watermarkText: watermarkAtivo ? watermarkText : null,
      trimStart: trimAtivo ? trimStart : 0,
      trimEnd:   trimAtivo ? trimEnd   : 0,
    };
    await onApply(video._id, options);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 p-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Editor de Video</h2>
              <p className="text-gray-300 text-sm mt-0.5 line-clamp-1">{video.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* LEGENDAS */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Legendas automaticas</h3>
                <p className="text-xs text-gray-500 mt-0.5">Estilo Reels — via Whisper AI</p>
              </div>
              <Toggle value={legendas} onChange={setLegendas} />
            </div>
            {legendas && (
              <div className="mt-3 space-y-3 p-3 bg-indigo-50 rounded-xl">
                {/* Tamanho da fonte */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-indigo-800">Tamanho da fonte</label>
                    <span className="text-xs text-indigo-600 font-semibold">{subtitleFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={40} max={130} step={4}
                    value={subtitleFontSize}
                    onChange={e => setSubtitleFontSize(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-indigo-400 mt-0.5">
                    <span>Pequena</span>
                    <span>Grande</span>
                  </div>
                </div>
                {/* Cor da fonte */}
                <div>
                  <label className="text-xs font-medium text-indigo-800 block mb-2">Cor da legenda</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Amarelo', ass: '&H0000FFFF', bg: '#FFFF00' },
                      { label: 'Branco',  ass: '&H00FFFFFF', bg: '#FFFFFF' },
                      { label: 'Ciano',   ass: '&H00FFFF00', bg: '#00FFFF' },
                      { label: 'Verde',   ass: '&H0000FF00', bg: '#00FF00' },
                      { label: 'Rosa',    ass: '&H00FF00FF', bg: '#FF00FF' },
                    ].map(c => (
                      <button
                        key={c.ass}
                        type="button"
                        onClick={() => setSubtitleFontColor(c.ass)}
                        title={c.label}
                        className={`w-8 h-8 rounded-full border-4 transition-all ${subtitleFontColor === c.ass ? 'border-indigo-600 scale-110' : 'border-transparent'}`}
                        style={{ background: c.bg }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-gray-100" />

          {/* MUSICA */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Musica de fundo</h3>
            <div className="grid grid-cols-2 gap-2">
              {MUSICAS.map(m => (
                <button
                  key={String(m.id)}
                  type="button"
                  onClick={() => setMusica(m.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    musica === m.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </button>
              ))}
            </div>

            {musica && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Volume da musica</label>
                  <span className="text-xs text-gray-500">{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0} max={100} step={1}  // ← Era 1-80, agora 0-100 (permite silenciar)
                  value={Math.round(musicVolume * 100)}
                  onChange={e => setMusicVolume(Number(e.target.value) / 100)}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Suave</span>
                  <span>Forte</span>
                </div>
              </div>
            )}
          </section>

          <hr className="border-gray-100" />

          {/* LOGO */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Logo</h3>
                <p className="text-xs text-gray-500 mt-0.5">Sobreposicao de imagem no video</p>
              </div>
              <Toggle value={logoAtivo} onChange={setLogoAtivo} />
            </div>

            {logoAtivo && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoUsarPadrao(true)}
                    className={`flex-1 py-2 text-sm rounded-lg border-2 font-medium transition-all ${logoUsarPadrao ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    Logo padrao
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoUsarPadrao(false)}
                    className={`flex-1 py-2 text-sm rounded-lg border-2 font-medium transition-all ${!logoUsarPadrao ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    URL customizada
                  </button>
                </div>

                {!logoUsarPadrao && (
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://... (PNG ou JPG)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                )}

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Posicao</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LOGO_POSITIONS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLogoPosition(p.id)}
                        className={`py-1.5 text-xs rounded-lg border-2 transition-all ${logoPosition === p.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-gray-100" />

          {/* WATERMARK */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Watermark (texto fixo)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Aparece no canto superior esquerdo</p>
              </div>
              <Toggle value={watermarkAtivo} onChange={setWatermarkAtivo} />
            </div>

            {watermarkAtivo && (
              <input
                type="text"
                value={watermarkText}
                onChange={e => setWatermarkText(e.target.value)}
                maxLength={40}
                placeholder="@seuarrouba ou nome da clinica"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </section>

          <hr className="border-gray-100" />

          {/* TRIM */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Cortar video (Trim)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Remove segundos do inicio ou final</p>
              </div>
              <Toggle value={trimAtivo} onChange={setTrimAtivo} />
            </div>

            {trimAtivo && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Cortar inicio (s)</label>
                  <input
                    type="number"
                    min={0} max={30} step={0.5}
                    value={trimStart}
                    onChange={e => setTrimStart(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Cortar final (s)</label>
                  <input
                    type="number"
                    min={0} max={30} step={0.5}
                    value={trimEnd}
                    onChange={e => setTrimEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                {(trimStart > 0 || trimEnd > 0) && (
                  <p className="col-span-2 text-xs text-indigo-600">
                    Remover {trimStart}s do inicio + {trimEnd}s do final
                  </p>
                )}
              </div>
            )}
          </section>

          <hr className="border-gray-100" />

          {/* CTA */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">CTA (Call-to-Action)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Aparece no inicio (0-5s) e final (ultimos 5s)</p>
              </div>
              <button
                type="button"
                onClick={() => setCtaAtivo(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${ctaAtivo ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ctaAtivo ? 'translate-x-6' : ''}`} />
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
                    placeholder="Clique no link da bio"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Cor do banner</label>
                  <div className="flex gap-2 flex-wrap">
                    {CTA_CORES.map(c => (
                      <button
                        key={c.cor}
                        type="button"
                        onClick={() => setCtaCor(c.cor)}
                        title={c.label}
                        style={{ backgroundColor: c.cor }}
                        className={`w-8 h-8 rounded-full transition-transform ${ctaCor === c.cor ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="rounded-lg p-2 text-center"
                  style={{ backgroundColor: ctaCor }}
                >
                  <p className="text-white font-bold text-sm">{ctaTexto || 'Texto CTA'}</p>
                  {ctaSubtexto && <p className="text-white/85 text-xs mt-0.5">{ctaSubtexto}</p>}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            Cancelar
          </button>
          <button
            type="button"
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
                Renderizar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoEditModal;
