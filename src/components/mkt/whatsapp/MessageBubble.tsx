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

// 🔧 Cria URL passando pelo proxy do back (/api/proxy-media)
const getProxiedUrl = (url?: string): string => {
  if (!url) return "";

  // só proxia URLs do WhatsApp/Meta
  const isMetaUrl = url.includes("fbsbx.com") || url.includes("facebook.com");
  if (!isMetaUrl) return url;

  // base do backend (env em prod, fallback pro seu domínio do Render)
  const backendBase =
    import.meta.env.VITE_BACKEND_URL || "https://fono-inova-crm-back.onrender.com";

  // garante https e monta a rota correta do back
  const base = backendBase.replace(/^http:\/\//, "https://").replace(/\/+$/, "");
  const encoded = encodeURIComponent(url);

  const proxiedUrl = `${base}/api/proxy-media?url=${encoded}`;
  console.log("🔄 Usando proxy WhatsApp:", proxiedUrl);

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
      className={`max-w-[75%] p-3 my-2 rounded-2xl shadow-sm ${
        isMine
          ? "bg-emerald-500 text-white self-end rounded-br-none"
          : "bg-gray-100 text-gray-800 self-start rounded-bl-none"
      }`}
    >
      {/* TEXTO SIMPLES */}
      {type === "text" && (
        <div>
          <p className="whitespace-pre-wrap break-words">{text}</p>
          {caption && caption !== text && (
            <p className="text-sm italic mt-1 text-gray-600">{caption}</p>
          )}
        </div>
      )}

      {/* ÁUDIO COM PROXY */}
      {type === "audio" && fixedMediaUrl && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-1">🎤 Áudio de voz</div>
          
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
              Carregando áudio...
            </div>
          )}

          {!hasError && (
            <audio
              controls
              preload="metadata"
              className="w-full max-w-xs"
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
          )}

          {/* MENSAGEM DE ERRO */}
          {hasError && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-sm">
              🎧 Áudio não disponível
              <div className="mt-1 text-xs">
                <button 
                  onClick={() => window.open(mediaUrl, '_blank')}
                  className="underline"
                >
                  Tentar abrir diretamente
                </button>
              </div>
            </div>
          )}

          {caption && (
            <p className="text-sm italic text-gray-600 mt-1">{caption}</p>
          )}
        </div>
      )}

      {/* IMAGEM COM PROXY */}
      {type === "image" && fixedMediaUrl && (
        <div className="space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          )}
          
          <img
            src={fixedMediaUrl}
            alt={caption || "Imagem recebida"}
            className={`rounded-lg max-h-64 object-cover w-full ${isLoading ? 'hidden' : 'block'}`}
            onError={handleImageError}
            onLoad={() => setIsLoading(false)}
            onLoadStart={() => setIsLoading(true)}
          />
          
          {caption && (
            <p className="text-sm italic border-t pt-2 text-gray-600">{caption}</p>
          )}
        </div>
      )}

      {/* TIMESTAMP */}
      <div className={`text-xs mt-2 ${isMine ? 'text-emerald-200' : 'text-gray-500'} text-right`}>
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}