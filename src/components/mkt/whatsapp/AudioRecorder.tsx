import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiMic, FiSend, FiTrash2, FiStopCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface AudioRecorderProps {
    onSend: (blob: Blob, duration: number) => Promise<void>;
    disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Visualizador de ondas
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = isRecording ? '#EF4444' : '#10B981';

        const bars = 30;
        const barWidth = width / bars;

        for (let i = 0; i < bars; i++) {
            const barHeight = Math.random() * height * 0.8 + height * 0.2;
            const x = i * barWidth;
            const y = (height - barHeight) / 2;

            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
        }

        if (isRecording) {
            animationRef.current = requestAnimationFrame(drawWaveform);
        }
    }, [isRecording]);

    useEffect(() => {
        if (isRecording) {
            drawWaveform();
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isRecording, drawWaveform]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            startTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // ✅ FIX: Usar audio/webm;codecs=opus para garantir o tipo correto
                const blob = new Blob(audioChunksRef.current, { 
                    type: 'audio/webm;codecs=opus' 
                });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setShowPreview(true);
                
                // Parar todas as tracks do stream
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

        } catch (error) {
            console.error('Erro ao acessar microfone:', error);
            toast.error('Não foi possível acessar o microfone. Verifique as permissões.');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        
        setIsRecording(false);
        setAudioBlob(null);
        setAudioUrl(null);
        setShowPreview(false);
        setRecordingTime(0);
    }, [isRecording, audioUrl]);

    const handleSend = async () => {
        if (!audioBlob) return;

        setIsSending(true);

        try {
            await onSend(audioBlob, recordingTime);
            
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            
            setAudioBlob(null);
            setAudioUrl(null);
            setShowPreview(false);
            setRecordingTime(0);
            toast.success('Áudio enviado com sucesso!');
        } catch (error) {
            toast.error('Erro ao enviar áudio');
        } finally {
            setIsSending(false);
        }
    };

    // Renderização condicional baseada no estado
    if (showPreview && audioBlob) {
        return (
            <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                {audioUrl && (
                    <audio src={audioUrl} controls className="h-8 w-48" />
                )}
                <span className="text-sm text-gray-600 font-mono">{formatTime(recordingTime)}</span>
                <button
                    onClick={cancelRecording}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Descartar"
                >
                    <FiTrash2 className="w-4 h-4" />
                </button>
                <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="p-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
                    title="Enviar"
                >
                    {isSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <FiSend className="w-4 h-4" />
                    )}
                </button>
            </div>
        );
    }

    if (isRecording) {
        return (
            <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full border border-red-200">
                {/* Visualizador de ondas */}
                <canvas 
                    ref={canvasRef}
                    width={60}
                    height={24}
                    className="rounded"
                />
                
                <span className="font-mono text-red-600 font-semibold">{formatTime(recordingTime)}</span>
                
                <button
                    onClick={stopRecording}
                    className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-full transition-colors"
                    title="Parar gravação"
                >
                    <FiStopCircle className="w-4 h-4" />
                </button>
                
                <button
                    onClick={cancelRecording}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    title="Cancelar"
                >
                    <FiTrash2 className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={isRecording ? stopRecording : undefined}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={disabled}
            className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 active:scale-95 select-none"
            title="Segure para gravar áudio"
        >
            <FiMic className="w-5 h-5" />
        </button>
    );
};
