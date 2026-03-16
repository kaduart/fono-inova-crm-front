/**
 * 🎯 Landing Page Suggestion Component
 * Sugere landing pages relacionadas para incluir nos posts
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLandingPages, LandingPage } from '../../hooks/useLandingPages';
import { Link2, Copy, ExternalLink, Sparkles, Check } from 'lucide-react';

interface LandingPageSuggestionProps {
  especialidadeId: string;
  onSelect?: (page: LandingPage, suggestion: { title: string; content: string }) => void;
}

// Mapeamento de especialidades para categorias de LP
const ESPECIALIDADE_TO_CATEGORY: Record<string, string> = {
  fonoaudiologia: 'fonoaudiologia',
  psicologia: 'psicologia',
  terapia_ocupacional: 'terapia_ocupacional',
  fisioterapia: 'terapia_ocupacional',
  psicomotricidade: 'terapia_ocupacional',
  neuropsicologia: 'autismo',
  psicopedagogia: 'aprendizagem',
  musicoterapia: 'fonoaudiologia'
};

export default function LandingPageSuggestion({ especialidadeId, onSelect }: LandingPageSuggestionProps) {
  const { suggestForPost, getPostSuggestion, getCategoryLabel, loading } = useLandingPages();
  const [suggestions, setSuggestions] = useState<LandingPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [generatedContent, setGeneratedContent] = useState<{ title: string; content: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [especialidadeId]);

  const loadSuggestions = async () => {
    const category = ESPECIALIDADE_TO_CATEGORY[especialidadeId] || null;
    const pages = await suggestForPost(category);
    setSuggestions(pages);
  };

  const handleSelectPage = async (page: LandingPage) => {
    setSelectedPage(page);
    setGenerating(true);
    
    try {
      const suggestion = await getPostSuggestion(page.slug);
      setGeneratedContent({
        title: suggestion.title,
        content: suggestion.content
      });
      
      if (onSelect) {
        onSelect(page, { title: suggestion.title, content: suggestion.content });
      }
    } catch (err) {
      toast.error('Erro ao gerar sugestão');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    
    const fullText = `${generatedContent.title}\n\n${generatedContent.content}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Conteúdo copiado!');
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!selectedPage) return;
    
    const url = `https://clinicafonoinova.com.br/lp/${selectedPage.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  if (loading) {
    return (
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-cyan-700">
          <div className="animate-spin h-4 w-4 border-2 border-cyan-600 border-t-transparent rounded-full" />
          <span className="text-sm">Carregando sugestões...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-cyan-600" />
        <h4 className="font-medium text-gray-900">🔗 Linkar Landing Page</h4>
        <span className="text-xs text-gray-500 ml-auto">
          {suggestions.length} sugestões
        </span>
      </div>

      {/* Lista de sugestões */}
      {!selectedPage && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 mb-2">
            Selecione uma landing page para incluir no post:
          </p>
          {suggestions.slice(0, 3).map(page => (
            <button
              key={page.slug}
              onClick={() => handleSelectPage(page)}
              className="w-full text-left p-2 bg-white border border-cyan-200 rounded hover:bg-cyan-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{page.title}</p>
                  <p className="text-xs text-gray-500">/{page.slug}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {getCategoryLabel(page.category).split(' ')[0]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo gerado */}
      {selectedPage && generatedContent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm font-medium text-gray-900">
                LP selecionada: {selectedPage.title}
              </span>
            </div>
            <button
              onClick={() => { setSelectedPage(null); setGeneratedContent(null); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Trocar
            </button>
          </div>

          <div className="bg-white border border-cyan-200 rounded p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">{generatedContent.title}</p>
            <p className="text-xs text-gray-600 line-clamp-3">{generatedContent.content}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                copied 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar Post'}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
            >
              <Link2 className="w-4 h-4" />
              Link
            </button>
            <a
              href={`https://clinicafonoinova.com.br/lp/${selectedPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              Ver
            </a>
          </div>
        </div>
      )}

      {/* Loading ao gerar */}
      {generating && (
        <div className="mt-3 flex items-center gap-2 text-cyan-700">
          <div className="animate-spin h-4 w-4 border-2 border-cyan-600 border-t-transparent rounded-full" />
          <span className="text-sm">Gerando conteúdo...</span>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        💡 Dica: Incluir links para landing pages aumenta a conversão dos posts em até 40%
      </p>
    </div>
  );
}
