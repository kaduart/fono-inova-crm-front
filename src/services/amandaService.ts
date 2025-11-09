import toast from "react-hot-toast";
import API from "./api";
export interface AIFollowupPayload {
  leadId: string;
  context?: string;
  tone?: 'casual' | 'formal' | 'friendly' | 'professional';
  stage?: string;
  previousMessages?: string[];
}

export interface AIFollowupResponse {
  message: string;
  confidence: number;
  suggestions?: string[];
  metadata?: {
    tone: string;
    length: number;
    keywords: string[];
  };
}

export interface AIAnalysisPayload {
  leadId: string;
  conversationHistory?: any[];
}

export interface AIAnalysisResponse {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  recommendedAction: string;
  confidence: number;
  insights: string[];
}

export const amandaService = {
  /**
   * Gera um follow-up personalizado usando IA (Amanda 2.0)
   */
  async generateFollowup(payload: AIFollowupPayload) {
    try {
      const response = await API.post<{ data: AIFollowupResponse }>(
        "/ai/generate-followup",
        payload
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Erro ao gerar follow-up com IA:", error);
      toast.error(
        error?.response?.data?.error || "Erro ao gerar follow-up com Amanda."
      );
      return {
        success: false,
        error,
      };
    }
  },

  /**
   * Analisa uma conversa e sugere próximas ações
   */
  async analyzeConversation(payload: AIAnalysisPayload) {
    try {
      const response = await API.post<{ data: AIAnalysisResponse }>(
        "/ai/analyze-conversation",
        payload
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Erro ao analisar conversa:", error);
      toast.error(
        error?.response?.data?.error || "Erro ao analisar conversa."
      );
      return {
        success: false,
        error,
      };
    }
  },

  /**
   * ✅ MANTIDO: Sugere respostas rápidas (pode implementar depois)
   */
  async suggestQuickReplies(leadId: string) {
    try {
      // Fallback com respostas padrão por enquanto
      const defaultReplies = [
        "Olá! Gostaria de agendar uma avaliação?",
        "Temos horários disponíveis esta semana!",
        "Posso te explicar nossos valores?",
        "Qual especialidade tem interesse?"
      ];

      return {
        success: true,
        data: defaultReplies,
      };
    } catch (error: any) {
      console.error("Erro ao buscar respostas rápidas:", error);
      return {
        success: false,
        error,
      };
    }
  },

  /**
   * ✅ MANTIDO: Otimiza mensagem (pode implementar depois)
   */
  async optimizeMessage(message: string, tone?: string) {
    try {
      // Fallback - retorna a mesma mensagem por enquanto
      return {
        success: true,
        data: {
          optimized: message
        },
      };
    } catch (error: any) {
      console.error("Erro ao otimizar mensagem:", error);
      return {
        success: false,
        error,
      };
    }
  },

  /**
   * ✅ NOVO: Envia follow-up via Amanda (rota REAL)
   */
  async sendFollowup(payload: {
    leadId: string;
    message: string;
    scheduledAt?: Date;
    context?: string;
  }) {
    try {
      const response = await API.post("/amanda/send", {
        leadId: payload.leadId,
        message: payload.message,
        scheduledAt: payload.scheduledAt,
        reason: payload.context,
        aiOptimized: true
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("Erro ao enviar follow-up:", error);
      toast.error(
        error?.response?.data?.message || "Erro ao enviar follow-up."
      );
      return {
        success: false,
        error,
      };
    }
  },

  // 🔄 FUNÇÕES PARA IMPLEMENTAR FUTURAMENTE (mantidas da sua versão)
  async predictBestTime(leadId: string) {
    // Implementar depois
    return {
      success: true,
      data: {
        bestTime: "manhã",
        confidence: 0.7,
        reasoning: "Baseado em horários de maior resposta"
      }
    };
  },

  async generateVariations(message: string, count: number = 3) {
    // Implementar depois  
    return {
      success: true,
      data: [message] // Retorna a mesma mensagem por enquanto
    };
  },

  async evaluateMessage(message: string) {
    // Implementar depois
    return {
      success: true,
      data: {
        score: 0.8,
        feedback: ["Mensagem clara e objetiva"],
        improvements: []
      }
    };
  },

  async detectSentiment(text: string) {
    // Implementar depois
    return {
      success: true,
      data: {
        sentiment: 'neutral' as const,
        confidence: 0.7
      }
    };
  },

  async suggestNextSteps(leadId: string) {
    // Implementar depois
    return {
      success: true,
      data: {
        steps: [
          {
            action: "Enviar follow-up em 24h",
            priority: 'high' as const,
            reasoning: "Lead demonstrou interesse recente"
          }
        ]
      }
    };
  }
};
