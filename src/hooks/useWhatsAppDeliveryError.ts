/**
 * Hook para escutar falhas de entrega de mensagens WhatsApp
 * Mostra alerta em tempo real quando uma mensagem não chega ao destinatário
 */

import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { socketManager } from '../utils/socketManager';

interface MessageFailedPayload {
  messageId: string;
  leadId: string;
  phone: string;
  error: {
    code: string;
    message: string;
  };
  content?: string;
  timestamp: string;
}

export function useWhatsAppDeliveryError() {
  useEffect(() => {
    // 🆕 Escuta falhas de entrega
    const unsubscribe = socketManager.on('whatsapp:message:failed', (data: MessageFailedPayload) => {
      console.error('❌ Falha na entrega WhatsApp:', data);
      
      // Formatar número para exibição
      const formattedPhone = data.phone?.replace(/\D/g, '').replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 $2 $3-$4') || data.phone;
      
      const errorMessage = data.error?.message || 'Número não possui WhatsApp ou está indisponível';
      
      // Mostrar toast de erro
      toast.error(
        `⚠️ Mensagem não entregue!\n\nPara: ${formattedPhone}\n${errorMessage}\n\nVerifique se o número está correto e tente novamente.`,
        {
          position: 'top-center',
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: 'colored',
          style: {
            background: '#dc2626',
            color: '#fff',
            fontSize: '14px',
            maxWidth: '400px',
            whiteSpace: 'pre-line',
          },
        }
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);
}

export default useWhatsAppDeliveryError;
