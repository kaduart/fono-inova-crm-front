/**
 * 🤖 Modal de Publicação Assistida - GMB
 * Sistema gera, humano publica no Google
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../services/api';

// 🧠 Score de qualidade do post
function calculatePostScore(post: any): number {
  let score = 70; // Base
  
  if (post.mediaUrl) score += 15;
  if (post.content?.length > 200) score += 5;
  if (post.content?.includes('💚')) score += 5;
  if (post.content?.includes('👉') || post.content?.includes('👇')) score += 5;
  
  return Math.min(score, 100);
}

interface Props {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  onPublished: () => void;
}

export default function GmbAssistedPublishModal({ post, isOpen, onClose, onPublished }: Props) {
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const postScore = calculatePostScore(post);
  const scoreColor = postScore >= 90 ? 'text-green-600' : postScore >= 70 ? 'text-yellow-600' : 'text-red-600';

  if (!isOpen || !post) return null;

  const copyText = post.assistData?.copyText || post.content;
  const gmbUrl = post.assistData?.gmbUrl || 'https://business.google.com/posts';

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      
      // Marca como copiado no backend
      await API.post(`/gmb/assisted/${post._id}/copy`);
      
      setCopied(true);
      toast.success('✅ Texto copiado! Cole no Google Meu Negócio');
      
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar texto');
    }
  };

  const handleOpenGMB = () => {
    window.open(gmbUrl, '_blank', 'noopener,noreferrer');
    toast.info('🌐 Google Meu Negócio aberto em nova aba');
  };

  const handleMarkPublished = async () => {
    if (!confirm('Confirma que publicou este post no Google Meu Negócio?')) return;
    
    setMarking(true);
    try {
      await API.post(`/gmb/assisted/${post._id}/mark-published`);
      toast.success('✅ Post marcado como publicado!');
      onPublished();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao marcar como publicado');
    } finally {
      setMarking(false);
    }
  };

  const handleRegenerate = async (what: 'text' | 'image' | 'both') => {
    setRegenerating(true);
    try {
      // Aqui você chamaria um endpoint de regeneração
      // Por enquanto, só mostra toast
      toast.info(`♻️ Regenerando ${what === 'both' ? 'texto e imagem' : what}... (em desenvolvimento)`);
    } catch (err) {
      toast.error('Erro ao regenerar');
    } finally {
      setRegenerating(false);
    }
  };

  const steps = [
    { num: 1, text: 'Copie o texto abaixo', done: copied },
    { num: 2, text: 'Abra o Google Meu Negócio', done: false },
    { num: 3, text: 'Cole e adicione a imagem', done: false },
    { num: 4, text: 'Publique e confirme aqui', done: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🚀 Publicar no Google Meu Negócio</h3>
            <p className="text-sm text-gray-600">Sistema gerou, você publica em 30 segundos</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Progresso */}
          <div className="flex justify-between">
            {steps.map((step, i) => (
              <div key={i} className={`flex flex-col items-center ${step.done ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step.done ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                }`}>
                  {step.done ? '✓' : step.num}
                </div>
                <span className="text-xs mt-1 text-center max-w-[80px]">{step.text}</span>
              </div>
            ))}
          </div>

          {/* Score de Qualidade */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">🧠 Score do Post:</span>
              <span className={`ml-2 text-2xl font-bold ${scoreColor}`}>{postScore}/100</span>
            </div>
            <div className="flex gap-2">
              {postScore >= 90 && <span className="text-green-600 text-sm">⭐ Excelente!</span>}
              {postScore >= 70 && postScore < 90 && <span className="text-yellow-600 text-sm">👍 Bom</span>}
              {postScore < 70 && <span className="text-red-600 text-sm">⚠️ Pode melhorar</span>}
            </div>
          </div>

          {/* Botões de Regeneração */}
          <div className="flex gap-2">
            <button
              onClick={() => handleRegenerate('text')}
              disabled={regenerating}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              🔄 Regenerar Texto
            </button>
            <button
              onClick={() => handleRegenerate('image')}
              disabled={regenerating}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              🎨 Nova Imagem
            </button>
            <button
              onClick={() => handleRegenerate('both')}
              disabled={regenerating}
              className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50"
            >
              ♻️ Tudo Novo
            </button>
          </div>

          {/* Preview da imagem */}
          {post.mediaUrl && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b text-sm text-gray-600 flex justify-between">
                <span>🖼️ Imagem gerada automaticamente</span>
                <span className="text-xs text-gray-400">1080x1080px</span>
              </div>
              <img src={post.mediaUrl} alt="Post" className="w-full max-h-64 object-contain bg-gray-100" />
              <div className="p-3 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(post.mediaUrl);
                    toast.success('Link da imagem copiado!');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  📋 Copiar link da imagem
                </button>
              </div>
            </div>
          )}

          {/* Texto para copiar */}
          <div>
            <label className="form-label">
              📝 Texto do post (clique para copiar)
            </label>
            <div className="relative">
              <textarea
                readOnly
                value={copyText}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none"
                onClick={handleCopyText}
              />
              <button
                onClick={handleCopyText}
                className={`absolute top-2 right-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {copied ? '✓ Copiado!' : '📋 Copiar'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Dica: Clique no texto ou no botão para copiar automaticamente
            </p>
          </div>

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📋 Instruções rápidas:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Copie o texto acima</li>
              <li>Clique em "Abrir Google Meu Negócio"</li>
              <li>Cole o texto no campo de descrição</li>
              <li>Baixe e adicione a imagem acima</li>
              <li>Clique em "Publicar" no Google</li>
              <li>Volte aqui e confirme ✓</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={handleOpenGMB}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Abrir Google Meu Negócio
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Fechar
            </button>
            <button
              onClick={handleMarkPublished}
              disabled={marking}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {marking ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Já publiquei ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
