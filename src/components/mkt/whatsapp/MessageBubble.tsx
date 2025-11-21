// components/whatsapp/MessageBubble.tsx
import { useState } from 'react';
import { formatMessageTimestamp } from '../../../utils/dateHelper';

interface MessageProps {
  text?: string;
  isMine: boolean;
  type?: "text" | "audio" | "image" | "video" | "document";
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  timestamp?: Date | string | number;
}

export default function MessageBubble({
  text,
  isMine,
  type = "text",
  mediaUrl,
  mediaId,
  caption,
  timestamp,
}: MessageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isDev = import.meta.env.DEV;

  // esconder captions de placeholder tipo [AUDIO], [IMAGE], [VIDEO], ...
  const sanitizeCaption = (c?: string) =>
    c && !/^\s*\[(?:AUDIO|IMAGE|VIDEO|DOCUMENT|STICKER)\]\s*$/i.test(c) ? c : "";

  const safeCaption = sanitizeCaption(caption);

  const getMediaSrc = (opts: { url?: string; mediaId?: string }): string => {
    const { url, mediaId } = opts;

    const backendBase =
      import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com";
    const base = backendBase.replace(/^http:\/\//, "https://").replace(/\/+$/, "");

    // 1) Se tiver mediaId, SEMPRE usa o novo fluxo do back
    if (mediaId && mediaId.trim().length > 0) {
      return `${base}/api/proxy-media?mediaId=${encodeURIComponent(mediaId.trim())}`;
    }

    // 2) Legado: se só tiver URL e for do Meta, usa ?url=
    if (!url) return "";
    const isMetaUrl = url.includes("fbsbx.com") || url.includes("facebook.com");
    if (!isMetaUrl) return url;

    const encoded = encodeURIComponent(url);
    return `${base}/api/proxy-media?url=${encoded}`;
  };

  const fixedMediaUrl = getMediaSrc({ url: mediaUrl, mediaId });

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    if (isDev) {
      console.warn('🎧 Áudio indisponível:', mediaUrl);
    }
    setHasError(true);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (isDev) {
      console.warn('🖼️ Imagem indisponível:', mediaUrl);
    }
    setHasError(true);
  };

  const handleVideoError = () => {
    if (isDev) {
      console.warn('🎬 Vídeo indisponível:', mediaUrl);
    }
    setHasError(true);
  };

  return (
    <div
      className={`relative max-w-[85%] p-4 my-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${isMine
        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white self-end rounded-br-none ml-12"
        : "bg-white text-gray-800 self-start rounded-bl-none mr-12 border border-gray-100"
        }`}
    >
      {/* Indicador visual sutil */}
      <div
        className={`absolute top-0 w-3 h-3 ${isMine
          ? '-right-3 bg-gradient-to-r from-emerald-500 to-emerald-600'
          : '-left-3 bg-white border-l border-t border-gray-100'
          }`}
        style={{
          clipPath: isMine ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)'
        }}
      />

      {/* TEXTO SIMPLES */}
      {type === "text" && (
        <div className="relative z-10">
          <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
          {safeCaption && safeCaption.trim() !== (text || "").trim() && (
            <p className="text-sm opacity-80 mt-2 pt-2 border-t border-opacity-20 border-current">
              {safeCaption}
            </p>
          )}
        </div>
      )}

      {/* ÁUDIO COM PROXY - DESIGN MELHORADO */}
      {type === "audio" && fixedMediaUrl && (
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <div className="w-6 h-6 bg-current rounded-full flex items-center justify-center opacity-80">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            Áudio de voz
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 text-sm opacity-80 bg-black bg-opacity-10 rounded-lg p-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
              Carregando áudio...
            </div>
          )}

          {!hasError && (
            <div className={`p-2 rounded-xl ${isMine ? 'bg-emerald-400 bg-opacity-30' : 'bg-gray-100'}`}>
              <audio
                controls
                preload="metadata"
                className="w-full max-w-xs h-8 [&::-webkit-media-controls-panel]:bg-transparent"
                onError={handleAudioError}
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={() => setIsLoading(false)}
                onCanPlay={() => setIsLoading(false)}
              >
                <source src={fixedMediaUrl} type="audio/ogg; codecs=opus" />
                <source src={fixedMediaUrl} type="audio/mpeg" />
                <source src={fixedMediaUrl} type="audio/webm" />
                Seu navegador não suporta áudio.
              </audio>
            </div>
          )}

          {/* MENSAGEM DE ERRO ELEGANTE */}
          {hasError && (
            <div className={`p-3 rounded-lg text-sm ${isMine
              ? 'bg-yellow-500 bg-opacity-20 text-yellow-100'
              : 'bg-yellow-100 text-yellow-800'
              }`}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                Áudio temporariamente indisponível
              </div>
              <button
                onClick={() => window.open(mediaUrl, '_blank')}
                className={`mt-2 text-xs underline opacity-80 hover:opacity-100 transition-opacity ${isMine ? 'text-yellow-200' : 'text-yellow-600'
                  }`}
              >
                Tentar abrir em nova aba
              </button>
            </div>
          )}

          {safeCaption && (
            <p className={`text-sm opacity-80 mt-2 pt-2 ${isMine ? 'border-emerald-400' : 'border-gray-200'
              } border-t`}>
              {safeCaption}
            </p>
          )}
        </div>
      )}

      {/* IMAGEM COM PROXY - DESIGN MELHORADO */}
      {type === "image" && fixedMediaUrl && (
        <div className="space-y-3 relative z-10">
          {isLoading && (
            <div className="flex items-center justify-center h-32 rounded-xl bg-black bg-opacity-5">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent opacity-50"></div>
            </div>
          )}

          {!hasError && (
            <div className={`overflow-hidden rounded-xl shadow-sm ${isLoading ? 'hidden' : 'block'}`}>
              <img
                src={fixedMediaUrl}
                alt={safeCaption || "Imagem recebida"}
                className="w-full h-auto max-h-80 object-cover transition-transform duration-300 hover:scale-105 cursor-zoom-in"
                onError={handleImageError}
                onLoad={() => setIsLoading(false)}
                onLoadStart={() => setIsLoading(true)}
                onClick={() => window.open(fixedMediaUrl, '_blank')}
              />
            </div>
          )}

          {/* FALLBACK VISUAL QUANDO A IMAGEM FALHA */}
          {hasError && (
            <div className={`p-8 rounded-xl text-center ${isMine ? 'bg-emerald-400 bg-opacity-20' : 'bg-gray-100'
              }`}>
              <svg
                className={`w-16 h-16 mx-auto mb-3 ${isMine ? 'text-emerald-200' : 'text-gray-400'
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className={`text-sm mb-2 ${isMine ? 'text-emerald-100' : 'text-gray-600'}`}>
                Imagem indisponível
              </p>
              <button
                onClick={() => window.open(mediaUrl, '_blank')}
                className={`text-xs underline opacity-80 hover:opacity-100 transition-opacity ${isMine ? 'text-emerald-200' : 'text-gray-500'
                  }`}
              >
                Tentar abrir em nova aba
              </button>
            </div>
          )}

          {safeCaption && (
            <p className={`text-sm opacity-80 mt-2 pt-2 ${isMine ? 'border-emerald-400' : 'border-gray-200'
              } border-t`}>
              {safeCaption}
            </p>
          )}
        </div>
      )}

      {/* VIDEO */}
      {type === "video" && fixedMediaUrl && (
        <div className="space-y-3 relative z-10">
          {isLoading && (
            <div className="flex items-center justify-center h-48 rounded-xl bg-black bg-opacity-5">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent opacity-50"></div>
            </div>
          )}

          {!hasError && (
            <div className={`overflow-hidden rounded-xl shadow-sm ${isLoading ? 'hidden' : 'block'}`}>
              <video
                controls
                className="w-full rounded-xl max-h-80"
                onError={handleVideoError}
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={() => setIsLoading(false)}
              >
                <source src={fixedMediaUrl} type="video/mp4" />
                Seu navegador não suporta vídeo.
              </video>
            </div>
          )}

          {hasError && (
            <div className={`p-8 rounded-xl text-center ${isMine ? 'bg-emerald-400 bg-opacity-20' : 'bg-gray-100'
              }`}>
              <svg
                className={`w-16 h-16 mx-auto mb-3 ${isMine ? 'text-emerald-200' : 'text-gray-400'
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className={`text-sm mb-2 ${isMine ? 'text-emerald-100' : 'text-gray-600'}`}>
                Vídeo indisponível
              </p>
              <button
                onClick={() => window.open(mediaUrl, '_blank')}
                className={`text-xs underline opacity-80 hover:opacity-100 transition-opacity ${isMine ? 'text-emerald-200' : 'text-gray-500'
                  }`}
              >
                Tentar abrir em nova aba
              </button>
            </div>
          )}

          {safeCaption && (
            <p className={`text-sm opacity-80 mt-2 pt-2 ${isMine ? 'border-emerald-400' : 'border-gray-200'
              } border-t`}>
              {safeCaption}
            </p>
          )}
        </div>
      )}

      {/* DOCUMENT */}
      {type === "document" && fixedMediaUrl && (
        <div className="space-y-3 relative z-10">
          <a
            href={fixedMediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-4 rounded-xl ${isMine ? 'bg-emerald-400 bg-opacity-20 hover:bg-opacity-30' : 'bg-gray-100 hover:bg-gray-200'
              } transition-colors`}
          >
            <svg className="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">Documento</p>
              <p className="text-xs opacity-70">Clique para abrir</p>
            </div>
            <svg className="w-5 h-5 flex-shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {safeCaption && (
            <p className={`text-sm opacity-80 mt-2 pt-2 ${isMine ? 'border-emerald-400' : 'border-gray-200'
              } border-t`}>
              {safeCaption}
            </p>
          )}
        </div>
      )}

      {/* TIMESTAMP ELEGANTE */}
      <div className={`text-xs mt-3 pt-2 ${isMine
        ? 'text-emerald-200 border-emerald-400'
        : 'text-gray-500 border-gray-200'
        } border-t border-opacity-30 text-right opacity-80`}>
        {timestamp ? formatMessageTimestamp(timestamp) : 'Agora'}
      </div>
    </div>
  );
}