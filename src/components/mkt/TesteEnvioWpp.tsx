import { useState } from 'react';
import { toast } from 'react-toastify';
import { sendTemplateMessage } from '../../services/whatsappService';

export function TesteEnvioWpp() {
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        setLoading(true);
        try {
            await sendTemplateMessage({
                phone: '55XXXXXXXXXXX',
                template: 'Agendamento',
                parameters: [{
                    nome: 'Ricardo',
                    servico: 'Psicologia',
                }],
            });
            toast.success('Mensagem enviada com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar mensagem');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button onClick={handleSend} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar WhatsApp'}
        </button>
    );
}
