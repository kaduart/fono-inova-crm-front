import { useState } from 'react';
import type { Video, Channel } from '../../hooks/useMarketing';
import { ChannelToggle } from './ChannelToggle';

interface VideoCardProps {
  video: Video;
  onPublish: (videoId: string, channels: Channel[]) => void;
  onDelete: (videoId: string) => void;
  onEditar?: (video: Video) => void;
  publishing?: boolean;
}

const statusConfig = {
  processing: {
    label: 'Processando',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  ready: {
    label: 'Pronto',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  failed: {
    label: 'Falhou',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
};

export function VideoCard({ video, onPublish, onDelete, onEditar, publishing }: VideoCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  const status = statusConfig[video.status];
  const isReady = video.status === 'ready';
  const isProcessing = video.status === 'processing';
  const posProducaoStatus = (video as any).posProducaoStatus;
  const videoEditadoUrl = (video as any).videoEditadoUrl;
  
  // Usar vídeo editado no player se disponível
  const videoUrlParaPlayer = videoEditadoUrl || video.videoUrl;

  const handlePublishClick = () => {
    if (selectedChannels.length === 0) return;
    onPublish(video._id, selectedChannels);
    setShowPublishModal(false);
    setSelectedChannels([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-gray-900">
        {video.thumbnailUrl && !showPlayer ? (
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : showPlayer && videoUrlParaPlayer ? (
          <video src={videoUrlParaPlayer} controls autoPlay className="w-full h-full" />
        ) : video.status === 'failed' ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900/20">
            <div className="text-center p-4">
              <svg className="w-12 h-12 mx-auto text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400 text-xs font-medium">Falha na geração</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <span className="text-gray-500">{isProcessing ? 'Gerando...' : 'Sem preview'}</span>
          </div>
        )}
        
        {isReady && !showPlayer && video.videoUrl && (
          <button onClick={() => setShowPlayer(true)} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </button>
        )}
        
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bgColor} ${status.textColor} text-xs font-medium`}>
          {status.icon}
          <span>{status.label}</span>
        </div>
        
        {videoEditadoUrl && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-lg">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Editado</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{video.title}</h3>
          <div className="flex gap-1 flex-shrink-0">
            {(video as any).provider === 'veo-3.1' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">Veo 3.1</span>
            )}
            {videoEditadoUrl && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Editado</span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{video.roteiro}</p>

        {posProducaoStatus === 'processing' && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 mb-3 bg-indigo-50 px-3 py-2 rounded-lg">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Aplicando edições...
          </div>
        )}

        <div className="flex gap-2">
          {isReady && (
            <>
              <button onClick={() => setShowPublishModal(true)} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                Publicar
              </button>
              {onEditar && (
                <button
                  onClick={() => onEditar(video)}
                  title="Editar vídeo"
                  className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}
            </>
          )}
          <button onClick={() => onDelete(video._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
        </div>

        {videoEditadoUrl && (
          <a
            href={videoEditadoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar vídeo com legendas, música e CTA
          </a>
        )}
      </div>
      
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPublishModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Publicar Vídeo</h3>
            <ChannelToggle channels={['instagram', 'facebook']} selected={selectedChannels} onChange={setSelectedChannels} />
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-gray-700">Cancelar</button>
              <button onClick={handlePublishClick} disabled={selectedChannels.length === 0} className="px-4 py-2 bg-red-600 text-white rounded-lg">Publicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoCard;
