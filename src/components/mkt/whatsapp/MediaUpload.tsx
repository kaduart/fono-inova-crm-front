import React, { useCallback, useState } from 'react';
import { FiPaperclip, FiX, FiFile, FiImage, FiMusic, FiVideo, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { MediaType, sendWhatsAppMedia } from '../../../services/whatsappService';

interface MediaUploadProps {
    phone: string;
    leadId?: string;
    onSend: (file: File, type: MediaType, caption?: string) => Promise<void>;
    disabled?: boolean;
}

interface SelectedFile {
    file: File;
    type: MediaType;
    preview?: string;
}

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

const ALLOWED_TYPES: Record<MediaType, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    audio: ['audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/webm'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
};

function detectFileType(file: File): MediaType | null {
    if (ALLOWED_TYPES.image.includes(file.type)) return 'image';
    if (ALLOWED_TYPES.audio.includes(file.type)) return 'audio';
    if (ALLOWED_TYPES.video.includes(file.type)) return 'video';
    if (ALLOWED_TYPES.document.includes(file.type)) return 'document';
    // Fallback por extensão
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'image';
    if (['ogg', 'mp3', 'wav', 'webm'].includes(ext || '')) return 'audio';
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'document';
    return null;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export const MediaUpload: React.FC<MediaUploadProps> = ({ phone, leadId, onSend, disabled }) => {
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);

    const handleFileSelect = useCallback((file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            toast.error('Arquivo muito grande. Máximo 16MB.');
            return;
        }

        const type = detectFileType(file);
        if (!type) {
            toast.error('Tipo de arquivo não suportado.');
            return;
        }

        const selected: SelectedFile = {
            file,
            type,
            preview: type === 'image' ? URL.createObjectURL(file) : undefined
        };

        setSelectedFile(selected);
        setCaption('');
        setShowModal(true);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleSend = async () => {
        if (!selectedFile) return;
        
        setIsUploading(true);
        setUploadProgress(0);

        try {
            await onSend(selectedFile.file, selectedFile.type, caption || undefined);
            
            // Limpar após envio bem-sucedido
            if (selectedFile.preview) {
                URL.revokeObjectURL(selectedFile.preview);
            }
            setSelectedFile(null);
            setCaption('');
            setShowModal(false);
            toast.success('Mídia enviada com sucesso!');
        } catch (error) {
            toast.error('Erro ao enviar mídia. Tente novamente.');
            console.error('Erro no envio:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        if (selectedFile?.preview) {
            URL.revokeObjectURL(selectedFile.preview);
        }
        setSelectedFile(null);
        setCaption('');
        setShowModal(false);
    };

    const getFileIcon = (type: MediaType) => {
        switch (type) {
            case 'image': return <FiImage className="w-8 h-8 text-emerald-500" />;
            case 'audio': return <FiMusic className="w-8 h-8 text-blue-500" />;
            case 'video': return <FiVideo className="w-8 h-8 text-purple-500" />;
            default: return <FiFile className="w-8 h-8 text-gray-500" />;
        }
    };

    return (
        <>
            <button
                onClick={() => document.getElementById('media-input')?.click()}
                disabled={disabled}
                className="p-3 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50"
                title="Anexar arquivo"
            >
                <FiPaperclip className="w-5 h-5" />
            </button>

            <input
                id="media-input"
                type="file"
                className="hidden"
                onChange={handleInputChange}
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
            />

            {/* Modal de Preview */}
            {showModal && selectedFile && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                {getFileIcon(selectedFile.type)}
                                Enviar {selectedFile.type === 'image' ? 'imagem' : 
                                        selectedFile.type === 'audio' ? 'áudio' : 
                                        selectedFile.type === 'video' ? 'vídeo' : 'documento'}
                            </h3>
                            <button 
                                onClick={handleCancel} 
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4">
                            {/* Preview */}
                            <div className="bg-gray-100 rounded-xl p-4 mb-4">
                                {selectedFile.type === 'image' && selectedFile.preview ? (
                                    <img 
                                        src={selectedFile.preview} 
                                        alt="Preview" 
                                        className="max-h-48 mx-auto rounded-lg object-contain"
                                    />
                                ) : selectedFile.type === 'video' ? (
                                    <video 
                                        src={URL.createObjectURL(selectedFile.file)} 
                                        className="max-h-48 mx-auto rounded-lg"
                                        controls
                                    />
                                ) : (
                                    <div className="flex items-center gap-3 text-gray-600">
                                        {getFileIcon(selectedFile.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{selectedFile.file.name}</p>
                                            <p className="text-sm text-gray-500">{formatFileSize(selectedFile.file.size)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Legenda */}
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Adicionar legenda (opcional)..."
                                className="w-full p-3 border rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                rows={2}
                                disabled={isUploading}
                            />

                            {/* Progresso */}
                            {isUploading && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Enviando...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Botões */}
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={handleCancel}
                                    disabled={isUploading}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={isUploading}
                                    className="flex-1 py-2.5 px-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <FiSend className="w-4 h-4" />
                                            Enviar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
