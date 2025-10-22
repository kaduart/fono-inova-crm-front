// components/whatsapp/MessageBubble.tsx
import { useState } from 'react';

interface MessageProps {
  text?: string;
  isMine: boolean;
  type?: "text" | "audio" | "image" | "video" | "document";
  mediaUrl?: string;
  caption?: string;
}

export default function MessageBubble({
  text,
  isMine,
  type = "text",
  mediaUrl,
  caption,
}: MessageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // esconder captions de placeholder tipo [AUDIO], [IMAGE], [VIDEO], ...
  const sanitizeCaption = (c?: string) =>
    c && !/^\s*\[(?:AUDIO|IMAGE|VIDEO|DOCUMENT|STICKER)\]\s*$/i.test(c) ? c : "";

  const safeCaption = sanitizeCaption(caption);

  // 🔧 Cria URL passando pelo proxy do back (/api/proxy-media)
  const getProxiedUrl = (url?: string): string => {
    if (!url) return "";

    const isMetaUrl = url.includes("fbsbx.com") || url.includes("facebook.com");
    if (!isMetaUrl) return url;

    const backendBase =
      import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com";

    const base = backendBase.replace(/^http:\/\//, "https://").replace(/\/+$/, "");
    const encoded = encodeURIComponent(url);

    const proxiedUrl = `${base}/api/proxy-media?url=${encoded}`;

    return proxiedUrl;
  };

  const fixedMediaUrl = getProxiedUrl(mediaUrl);

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error('🎧 ERRO no áudio:', {
      originalUrl: mediaUrl,
      proxiedUrl: fixedMediaUrl,
      error: e
    });
    setHasError(true);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('🖼️ Erro na imagem:', mediaUrl);
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
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
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

          <div className={`overflow-hidden rounded-xl shadow-sm ${isLoading ? 'hidden' : 'block'
            }`}>
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
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}