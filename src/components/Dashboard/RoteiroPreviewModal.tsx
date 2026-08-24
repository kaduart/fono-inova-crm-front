import { useState, useEffect } from 'react';

export type StoryboardBloco = {
  bloco: number;
  ordem: number;
  fala: string;
  timing_range: string;
  timing_tipo: 'curto' | 'medio' | 'longo';
  visual: string;
  camera: string;
  emocao: string;
  iluminacao: string;
  transicao: string;
};

export type Storyboard = {
  blocos: StoryboardBloco[];
  meta: {
    total_blocos: number;
    duracao_estimada: number;
    estagio_jornada: string;
  };
};

export type RoteiroPreview = {
  titulo: string;
  texto_completo: string;
  hook_texto_overlay: string;
  cta_texto_overlay: string;
  hashtags?: string[];
  legenda_instagram?: string;
  profissional?: string;
  duracao_estimada?: number;
  storyboard?: Storyboard;
  veo_prompt?: {
    estilo_base: string;
    direcao_cinematografica: string;
    loop_hint: string;
    aspect_ratio: string;
    qualidade: string;
  };
};

type Props = {
  roteiro: RoteiroPreview;
  onConfirm: (roteiro: RoteiroPreview) => void;
  onCancel: () => void;
};

// Componente interno para edição do storyboard
function StoryboardEditor({ 
  storyboard, 
  onChange, 
  textoNarracao 
}: { 
  storyboard: Storyboard; 
  onChange: (s: Storyboard) => void;
  textoNarracao: string;
}) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [storyboardLocal, setStoryboardLocal] = useState(storyboard);

  // Regenerar storyboard baseado no texto atual
  const regenerarDoTexto = () => {
    const frases = textoNarracao
      .split(/(?<=[.…!?:])\s+/)
      .map(f => f.trim())
      .filter(f => f.length > 0);
    
    const novoStoryboard: Storyboard = {
      blocos: frases.map((fala, i) => {
        const blocoAntigo = storyboardLocal.blocos[i];
        return {
          bloco: i + 1,
          ordem: i + 1,
          fala,
          timing_range: blocoAntigo?.timing_range || '3-6s',
          timing_tipo: blocoAntigo?.timing_tipo || 'medio',
          visual: blocoAntigo?.visual || 'cena natural',
          camera: blocoAntigo?.camera || 'plano médio',
          emocao: blocoAntigo?.emocao || 'neutralidade',
          iluminacao: blocoAntigo?.iluminacao || 'luz natural',
          transicao: i === 0 ? 'abertura' : i === frases.length - 1 ? 'fade_loop' : 'corte suave',
        };
      }),
      meta: {
        total_blocos: frases.length,
        duracao_estimada: frases.length * 5,
        estagio_jornada: storyboard.meta.estagio_jornada,
      }
    };
    
    setStoryboardLocal(novoStoryboard);
    onChange(novoStoryboard);
  };

  const atualizarCampo = (blocoIndex: number, campo: keyof StoryboardBloco, valor: string) => {
    const novo = { ...storyboardLocal };
    novo.blocos = [...novo.blocos];
    novo.blocos[blocoIndex] = { ...novo.blocos[blocoIndex], [campo]: valor };
    setStoryboardLocal(novo);
    onChange(novo);
  };

  return (
    <details className="group border border-purple-200 rounded-lg overflow-hidden" open>
      <summary className="flex items-center gap-2 px-4 py-3 bg-purple-50 cursor-pointer select-none hover:bg-purple-100 transition-colors">
        <span className="text-lg">🎬</span>
        <span className="text-sm font-semibold text-purple-800">Storyboard & Direção de Cena</span>
        <span className="text-xs text-purple-600 ml-auto">{storyboardLocal.meta.total_blocos} cenas • ~{storyboardLocal.meta.duracao_estimada}s</span>
      </summary>
      
      <div className="p-4 bg-white space-y-3 max-h-[500px] overflow-y-auto">
        {/* Controles */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModoEdicao(!modoEdicao)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                modoEdicao 
                  ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {modoEdicao ? '✓ Concluir edição' : '✏️ Editar cenas'}
            </button>
            {modoEdicao && (
              <button
                onClick={regenerarDoTexto}
                className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors"
                title="Recria as cenas baseadas no texto atual da narração"
              >
                🔄 Regenerar do texto
              </button>
            )}
          </div>
          {modoEdicao && (
            <span className="text-xs text-gray-500">Clique nos campos para editar</span>
          )}
        </div>

        {/* Blocos */}
        {storyboardLocal.blocos.map((bloco, index) => (
          <div key={bloco.bloco} className="border-l-4 border-purple-400 pl-3 py-2 bg-gray-50/50 rounded-r-lg">
            {/* Header do bloco */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Cena {bloco.bloco}</span>
              {modoEdicao ? (
                <input
                  type="text"
                  value={bloco.timing_range}
                  onChange={(e) => atualizarCampo(index, 'timing_range', e.target.value)}
                  className="text-xs border border-purple-300 rounded px-2 py-0.5 w-20 text-center"
                  placeholder="3-5s"
                />
              ) : (
                <span className="text-xs text-gray-500">⏱️ {bloco.timing_range}</span>
              )}
              {modoEdicao ? (
                <select
                  value={bloco.transicao}
                  onChange={(e) => atualizarCampo(index, 'transicao', e.target.value)}
                  className="text-xs border border-purple-300 rounded px-2 py-0.5"
                >
                  <option value="abertura">abertura</option>
                  <option value="corte suave">corte suave</option>
                  <option value="fade leve">fade leve</option>
                  <option value="continuidade">continuidade</option>
                  <option value="fade_loop">fade_loop</option>
                </select>
              ) : (
                <span className="text-xs text-gray-400">• {bloco.transicao}</span>
              )}
            </div>
            
            {/* Fala (sempre visível, não editável aqui) */}
            <p className="text-sm text-gray-800 font-medium mb-2 italic">"{bloco.fala}"</p>
            
            {/* Campos de direção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded border border-gray-200">
                <span className="font-semibold text-purple-700">🎥 Câmera:</span>
                {modoEdicao ? (
                  <input
                    type="text"
                    value={bloco.camera}
                    onChange={(e) => atualizarCampo(index, 'camera', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                ) : (
                  <span className="text-gray-600 ml-1">{bloco.camera}</span>
                )}
              </div>
              <div className="bg-white p-2 rounded border border-gray-200">
                <span className="font-semibold text-purple-700">💡 Luz:</span>
                {modoEdicao ? (
                  <input
                    type="text"
                    value={bloco.iluminacao}
                    onChange={(e) => atualizarCampo(index, 'iluminacao', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                ) : (
                  <span className="text-gray-600 ml-1">{bloco.iluminacao}</span>
                )}
              </div>
              <div className="bg-white p-2 rounded border border-gray-200 md:col-span-2">
                <span className="font-semibold text-purple-700">🎨 Visual:</span>
                {modoEdicao ? (
                  <input
                    type="text"
                    value={bloco.visual}
                    onChange={(e) => atualizarCampo(index, 'visual', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                ) : (
                  <span className="text-gray-600 ml-1">{bloco.visual}</span>
                )}
              </div>
              <div className="bg-white p-2 rounded border border-gray-200 md:col-span-2">
                <span className="font-semibold text-purple-700">😊 Emoção:</span>
                {modoEdicao ? (
                  <input
                    type="text"
                    value={bloco.emocao}
                    onChange={(e) => atualizarCampo(index, 'emocao', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                ) : (
                  <span className="text-gray-600 ml-1">{bloco.emocao}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export function RoteiroPreviewModal({ roteiro, onConfirm, onCancel }: Props) {
  const [editado, setEditado] = useState<RoteiroPreview>({ ...roteiro });
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setEditado({ ...roteiro });
  }, [roteiro]);

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(editado.texto_completo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = editado.texto_completo;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Roteiro do Video</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revise e edite antes de gerar</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteudo scrollavel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Titulo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Titulo
            </label>
            <input
              type="text"
              value={editado.titulo}
              onChange={e => setEditado(prev => ({ ...prev, titulo: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Gancho overlay */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Texto do Gancho (overlay nos primeiros 3s)
            </label>
            <input
              type="text"
              value={editado.hook_texto_overlay}
              onChange={e => setEditado(prev => ({ ...prev, hook_texto_overlay: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={80}
            />
            <p className="text-xs text-gray-400 mt-1">{editado.hook_texto_overlay?.length || 0}/80 chars — aparece na tela do video</p>
          </div>

          {/* Narração principal */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Narracao (o que sera falado no video)
              </label>
              <button
                onClick={copiarTexto}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {copiado ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar texto
                  </>
                )}
              </button>
            </div>
            <textarea
              value={editado.texto_completo}
              onChange={e => setEditado(prev => ({ ...prev, texto_completo: e.target.value }))}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
              placeholder="Texto da narracao..."
            />
            <p className="text-xs text-gray-400 mt-1">{editado.texto_completo?.length || 0} caracteres</p>
          </div>

          {/* CTA */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              CTA Final
            </label>
            <input
              type="text"
              value={editado.cta_texto_overlay}
              onChange={e => setEditado(prev => ({ ...prev, cta_texto_overlay: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Legenda Instagram (read-only, collapsible) */}
          {editado.legenda_instagram && (
            <details className="group">
              <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                Legenda Instagram (clique para ver)
              </summary>
              <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                {editado.legenda_instagram}
              </div>
            </details>
          )}

          {/* Hashtags */}
          {editado.hashtags && editado.hashtags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Hashtags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {editado.hashtags.map((tag, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Storyboard Zeus v3.3 - Com Edição */}
          {editado.storyboard && (
            <StoryboardEditor 
              storyboard={editado.storyboard}
              onChange={(novoStoryboard) => setEditado(prev => ({ ...prev, storyboard: novoStoryboard }))}
              textoNarracao={editado.texto_completo}
            />
          )}

          {/* Prompt Veo */}
          {editado.veo_prompt && (
            <details className="group border border-blue-200 rounded-lg overflow-hidden">
              <summary className="flex items-center gap-2 px-4 py-3 bg-blue-50 cursor-pointer select-none hover:bg-blue-100 transition-colors">
                <span className="text-lg">🎞️</span>
                <span className="text-sm font-semibold text-blue-800">Prompt Veo (Cinematográfico)</span>
              </summary>
              <div className="p-4 bg-gray-900 text-gray-100 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                <div className="text-gray-400 mb-2">// Estilo: {editado.veo_prompt.estilo_base}</div>
                {editado.veo_prompt.direcao_cinematografica}
                <div className="text-gray-400 mt-3">// Loop: {editado.veo_prompt.loop_hint}</div>
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="text-xs text-gray-400">
            {editado.duracao_estimada ? `~${editado.duracao_estimada}s estimado` : ''}
            {editado.profissional ? ` • ${editado.profissional}` : ''}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(editado)}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Gerar video com este roteiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
