// components/whatsapp/MessageBubble.tsx
import { useState } from 'react';
import { formatMessageTimestamp } from '../../../utils/dateHelper';
import { FiAlertCircle, FiExternalLink } from 'react-icons/fi';

interface MessageProps {
  text?: string;
  isMine: boolean;
  type?: "text" | "audio" | "image" | "video" | "document" | "sticker";
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  timestamp?: Date | string | number;
  senderName?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'received';
}

export default function MessageBubble({
  text,
  isMine,
  type = "text",
  mediaUrl,
  mediaId,
  caption,
  timestamp,
  senderName,
  status
}: MessageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const isDev = import.meta.env.DEV;

  const isSticker = type === "sticker";

  // esconder captions de placeholder tipo [AUDIO], [IMAGE], [VIDEO], ...
  const sanitizeCaption = (c?: string) =>
    c && !/^\s*\[(?:AUDIO|IMAGE|VIDEO|DOCUMENT|STICKER)\]\s*$/i.test(c) ? c : "";

  const safeCaption = sanitizeCaption(caption);
  
  const getMediaSrc = (opts: { url?: string; mediaId?: string }): string => {
    const { url, mediaId } = opts;

    const backendBase =
      import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com";
    const base = backendBase.replace(/^http:\/\//, "https://").replace(/\/+$/, "");

    if (mediaId && mediaId.trim().length > 0) {
      return `${base}/api/proxy-media?mediaId=${encodeURIComponent(mediaId.trim())}`;
    }

    if (!url) return "";
    const isMetaUrl = url.includes("fbsbx.com") || url.includes("facebook.com");
    if (!isMetaUrl) return url;

    const encoded = encodeURIComponent(url);
    return `${base}/api/proxy-media?url=${encoded}`;
  };

  const fixedMediaUrl = getMediaSrc({ url: mediaUrl, mediaId });

  const handleMediaError = (mediaType: string) => {
    if (isDev) console.warn(`❌ ${mediaType} indisponível:`, mediaUrl);
    setHasError(true);
  };

  // Cores mais suaves para as bolhas
  const bubbleClasses = isMine
    ? "bg-emerald-500 text-white rounded-br-sm"
    : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm";

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${bubbleClasses}`}
      >
        {/* Nome do remetente (para mensagens recebidas em grupo) */}
        {!isMine && senderName && type === "text" && (
          <div className="text-xs font-medium text-emerald-600 mb-1">
            {senderName}
          </div>
        )}

        {/* TEXTO */}
        {type === "text" && (
          <div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {text}
            </p>
            {safeCaption && safeCaption.trim() !== (text || "").trim() && (
              <p className={`text-xs mt-1.5 pt-1.5 border-t ${isMine ? 'border-emerald-400/50 text-emerald-100' : 'border-gray-200 text-gray-500'}`}>
                {safeCaption}
              </p>
            )}
          </div>
        )}

        {/* ÁUDIO */}
        {type === "audio" && fixedMediaUrl && (
          <div className="space-y-2 min-w-[200px]">
            <div className={`flex items-center gap-2 text-xs ${isMine ? 'text-emerald-100' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isMine ? 'bg-emerald-400/30' : 'bg-gray-200'}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <span>Áudio</span>
            </div>

            {isLoading && (
              <div className={`flex items-center gap-2 text-xs ${isMine ? 'text-emerald-100' : 'text-gray-500'}`}>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Carregando...
              </div>
            )}

            {!hasError ? (
              <audio
                controls
                preload="metadata"
                className={`w-full h-8 ${isMine ? '[&::-webkit-media-controls-panel]:bg-transparent' : ''}`}
                onError={() => handleMediaError('Áudio')}
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={() => setIsLoading(false)}
                onCanPlay={() => setIsLoading(false)}
              >
                <source src={fixedMediaUrl} type="audio/ogg; codecs=opus" />
                <source src={fixedMediaUrl} type="audio/mpeg" />
                <source src={fixedMediaUrl} type="audio/webm" />
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${isMine ? 'bg-emerald-400/20' : 'bg-gray-100'}`}>
                <FiAlertCircle className="w-4 h-4" />
                <span>Áudio indisponível</span>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto hover:underline flex items-center gap-1"
                >
                  <FiExternalLink className="w-3 h-3" />
                  Abrir
                </a>
              </div>
            )}
          </div>
        )}

        {/* IMAGEM / STICKER */}
        {(type === "image" || type === "sticker") && fixedMediaUrl && (
          <div className="space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center h-32 rounded-lg bg-gray-100">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent" />
              </div>
            )}

            {!hasError ? (
              <div className={`overflow-hidden rounded-lg ${isLoading ? 'hidden' : 'block'}`}>
                <img
                  src={fixedMediaUrl}
                  alt={safeCaption || (isSticker ? "Figurinha" : "Imagem")}
                  className="max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onError={() => handleMediaError('Imagem')}
                  onLoad={() => setIsLoading(false)}
                  onLoadStart={() => setIsLoading(true)}
                  onClick={() => setImageExpanded(true)}
                />
              </div>
            ) : (
              <div className={`p-4 rounded-lg text-center ${isMine ? 'bg-emerald-400/20' : 'bg-gray-100'}`}>
                <FiAlertCircle className={`w-8 h-8 mx-auto mb-2 ${isMine ? 'text-emerald-200' : 'text-gray-400'}`} />
                <p className="text-sm">{isSticker ? 'Figurinha indisponível' : 'Imagem indisponível'}</p>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs hover:underline mt-1 inline-flex items-center gap-1"
                >
                  <FiExternalLink className="w-3 h-3" />
                  Tentar abrir
                </a>
              </div>
            )}

            {safeCaption && (
              <p className={`text-sm ${isMine ? 'text-emerald-100' : 'text-gray-600'}`}>
                {safeCaption}
              </p>
            )}
          </div>
        )}

        {/* VIDEO */}
        {type === "video" && fixedMediaUrl && (
          <div className="space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center h-32 rounded-lg bg-gray-100">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent" />
              </div>
            )}

            {!hasError ? (
              <div className={`overflow-hidden rounded-lg ${isLoading ? 'hidden' : 'block'}`}>
                <video
                  controls
                  className="max-w-full max-h-64 rounded-lg"
                  onError={() => handleMediaError('Vídeo')}
                  onLoadStart={() => setIsLoading(true)}
                  onLoadedData={() => setIsLoading(false)}
                >
                  <source src={fixedMediaUrl} type="video/mp4" />
                  Seu navegador não suporta vídeo.
                </video>
              </div>
            ) : (
              <div className={`p-4 rounded-lg text-center ${isMine ? 'bg-emerald-400/20' : 'bg-gray-100'}`}>
                <FiAlertCircle className={`w-8 h-8 mx-auto mb-2 ${isMine ? 'text-emerald-200' : 'text-gray-400'}`} />
                <p className="text-sm">Vídeo indisponível</p>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs hover:underline mt-1 inline-flex items-center gap-1"
                >
                  <FiExternalLink className="w-3 h-3" />
                  Tentar abrir
                </a>
              </div>
            )}

            {safeCaption && (
              <p className={`text-sm ${isMine ? 'text-emerald-100' : 'text-gray-600'}`}>
                {safeCaption}
              </p>
            )}
          </div>
        )}

        {/* DOCUMENT */}
        {type === "document" && fixedMediaUrl && (
          <div className="space-y-2">
            <a
              href={fixedMediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isMine 
                  ? 'bg-emerald-400/20 hover:bg-emerald-400/30 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              <svg className="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{caption || 'Documento'}</p>
                <p className={`text-xs ${isMine ? 'text-emerald-200' : 'text-gray-500'}`}>Clique para abrir</p>
              </div>
              <FiExternalLink className="w-4 h-4 flex-shrink-0 opacity-50" />
            </a>
          </div>
        )}

        {/* TIMESTAMP e STATUS */}
        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMine ? 'text-emerald-200' : 'text-gray-400'}`}>
          <span>{timestamp ? formatMessageTimestamp(timestamp) : 'Agora'}</span>
          {isMine && status && (
            <span className="ml-0.5">
              {status === 'sending' && '◌'}
              {status === 'sent' && '✓'}
              {status === 'delivered' && '✓✓'}
              {status === 'read' && <span className="text-blue-300">✓✓</span>}
              {status === 'error' && <span className="text-red-300">!</span>}
            </span>
          )}
        </div>
      </div>

      {/* Modal de imagem expandida */}
      {imageExpanded && fixedMediaUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageExpanded(false)}
        >
          <img 
            src={fixedMediaUrl} 
            alt="Imagem ampliada"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
            onClick={() => setImageExpanded(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
