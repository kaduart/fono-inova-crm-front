import { useState, useEffect } from 'react';

export type RoteiroPreview = {
  titulo: string;
  texto_completo: string;
  hook_texto_overlay: string;
  cta_texto_overlay: string;
  hashtags?: string[];
  legenda_instagram?: string;
  profissional?: string;
  duracao_estimada?: number;
};

type Props = {
  roteiro: RoteiroPreview;
  onConfirm: (roteiro: RoteiroPreview) => void;
  onCancel: () => void;
};

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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Gerar video com este roteiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
