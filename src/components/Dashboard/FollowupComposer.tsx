// src/components/Dashboard/FollowupComposer.tsx
import { motion } from "framer-motion";
import { Loader2, Send, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-toastify";

// ✅ IMPORTS DOS SERVICES
import { amandaService } from "../../services/amandaService";
import { followupService } from "../../services/followupService";

import { Button } from "../ui/Button";

interface FollowupComposerProps {
  lead: any;
  onCreated?: () => void;
  reason?: string;
  campaign?: string;
  therapist?: string;
}

const FollowupComposer: React.FC<FollowupComposerProps> = ({
  lead,
  onCreated,
  reason,
  campaign,
  therapist,
}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // ✅ ESTADO PARA METADADOS DA AMANDA (estava faltando!)
  const [amandaMeta, setAmandaMeta] = useState<any>(null);

  // ✅ GERAR MENSAGEM COM AMANDA
  const handleGenerate = async () => {
    if (!lead?._id) {
      toast.error("Selecione um lead válido.");
      return;
    }

    setGenerating(true);
    try {
      // ✅ USA amandaService.generateFollowup
      const result = await amandaService.generateFollowupMessage({
        leadId: lead._id,
        context: reason || lead.notes,
        tone: 'friendly',
        stage: lead.stage
      });

      if (result.success && result.data?.message) {
        setMessage(result.data.message);

        // Mostrar feedback com metadados (se disponíveis)
        const confidence = result.data.confidence
          ? ` (${Math.round(result.data.confidence * 100)}% confiança)`
          : '';
        toast.success(`✨ Mensagem gerada com Amanda 2.0${confidence}`);

        // Armazenar metadados
        setAmandaMeta({
          confidence: result.data.confidence,
          suggestions: result.data.suggestions,
          metadata: result.data.metadata
        });
      }
    } catch (e) {
      console.error("Erro ao gerar:", e);
      // Toast de erro já vem do service
    } finally {
      setGenerating(false);
    }
  };

  // ✅ ENVIAR OU AGENDAR FOLLOW-UP
  const handleSubmit = async () => {
    if (!lead?._id) {
      toast.error("Lead inválido.");
      return;
    }
    if (!message.trim()) {
      toast.warn("Escreva ou gere uma mensagem.");
      return;
    }

    setLoading(true);
    try {
      if (scheduledAt) {
        // ✅ AGENDAR para data futura
        const result = await followupService.schedule({
          leadId: lead._id,
          message,
          scheduledAt: new Date(scheduledAt).toISOString(),
          aiOptimized: !!amandaMeta // Marca se foi gerado com IA
        });

        if (result.success) {
          // Toast já vem do service
          setMessage("");
          setScheduledAt("");
          setAmandaMeta(null);
          onCreated?.();
        }
      } else {
        // ✅ ENVIAR imediatamente
        const result = await followupService.create({
          lead: lead._id,
          message,
          stage: lead.stage
        });

        if (result.success) {
          // Toast já vem do service
          setMessage("");
          setAmandaMeta(null);
          onCreated?.();
        }
      }
    } catch (e) {
      console.error("Erro ao enviar:", e);
      // Toast de erro já vem do service
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow p-4"
    >
      <h3 className="font-semibold text-lg mb-3 text-gray-800">
        ✉️ Novo Follow-up para {lead?.name || "—"}
      </h3>

      {/* TEXTAREA PARA MENSAGEM */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Digite ou gere uma mensagem..."
        className="w-full border rounded p-2 text-sm mb-3 h-28 focus:ring-2 focus:ring-emerald-400"
        disabled={loading || generating}
      />

      {/* CAMPO DE AGENDAMENTO OPCIONAL */}
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        className="border rounded p-2 w-full mb-3 text-sm"
        placeholder="Deixe vazio para enviar agora"
        disabled={loading || generating}
      />

      {/* MOSTRAR METADADOS DA AMANDA (se houver) */}
      {amandaMeta && (
        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
          <p className="font-medium text-purple-800">✨ Gerado com IA</p>
          {amandaMeta.confidence && (
            <p className="text-purple-600">
              Confiança: {Math.round(amandaMeta.confidence * 100)}%
            </p>
          )}
          {amandaMeta.suggestions && amandaMeta.suggestions.length > 0 && (
            <p className="text-purple-600">
              {amandaMeta.suggestions.length} variações disponíveis
            </p>
          )}
        </div>
      )}

      {/* BOTÕES DE AÇÃO */}
      <div className="flex gap-2 justify-end">
        <Button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="bg-purple-500 hover:bg-purple-600 text-white text-sm flex items-center gap-1 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <Sparkles size={16} />
          )}
          Gerar com Amanda
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading || generating || !message.trim()}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <Send size={16} />
          )}
          {scheduledAt ? "Agendar" : "Enviar Agora"}
        </Button>
      </div>

      {/* DICA SOBRE AGENDAMENTO */}
      {scheduledAt && (
        <p className="text-xs text-slate-500 mt-2">
          📅 Será enviado em: {new Date(scheduledAt).toLocaleString('pt-BR')}
        </p>
      )}
    </motion.div>
  );
};

export default FollowupComposer;
