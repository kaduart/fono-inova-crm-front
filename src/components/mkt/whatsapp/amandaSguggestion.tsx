import { amandaService } from "@/services/amandaService";
import { followupService } from "@/services/followupService";
import { useState } from "react";

interface AmandaSuggestionProps {
    leadId: string;
    leadData?: any;
    onSuccess?: () => void;
}

export const AmandaSuggestion = ({
    leadId,
    leadData,
    onSuccess
}: AmandaSuggestionProps) => {
    const [suggestion, setSuggestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [tone, setTone] = useState<'casual' | 'formal' | 'friendly'>('friendly');

    const handleGenerate = async () => {
        setLoading(true);
        const result = await amandaService.generateFollowup({
            leadId,
            context: leadData?.notes,
            tone,
            stage: leadData?.stage
        });

        if (result.success) {
            setSuggestion(result.data.message);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        setLoading(true);
        const result = await followupService.create({
            lead: leadId,
            message: suggestion
        });

        if (result.success) {
            setSuggestion("");
            onSuccess?.();
        }
        setLoading(false);
    };

    return (
        <div className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h3 className="font-bold">Amanda AI</h3>
            </div>

            {!suggestion ? (
                <>
                    <p className="text-sm text-gray-600 mb-3">
                        Deixe a Amanda criar uma mensagem personalizada para este lead
                    </p>

                    <div className="flex gap-2 mb-3">
                        {['casual', 'friendly', 'formal'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTone(t as any)}
                                className={`px-3 py-1 rounded text-sm ${tone === t
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white border hover:bg-gray-50'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? "Gerando..." : "✨ Gerar Mensagem"}
                    </button>
                </>
            ) : (
                <>
                    <div className="bg-white p-3 rounded-lg mb-3 border">
                        <p className="text-sm">{suggestion}</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex-1 py-2 border rounded hover:bg-gray-50"
                        >
                            🔄 Regenerar
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={loading}
                            className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            {loading ? "Enviando..." : "📤 Enviar"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};