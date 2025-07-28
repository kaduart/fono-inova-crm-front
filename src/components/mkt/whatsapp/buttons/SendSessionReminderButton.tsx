import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { format } from 'date-fns';
import { useState } from 'react';
import { sendTemplateMessage } from '../../../../services/whatsappService';
import { Button } from '../../../ui/Button';

interface Props {
    phone: string;
    nome: string;
    profissional: string;
    data: Date;
    tooltip: string;
}

export function SendSessionReminderButton({ phone, nome, profissional, data, tooltip }: Props) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        try {
            setLoading(true);
            await sendTemplateMessage({
                phone,
                template: 'lembrete_sessao',
                parameters: {
                    nome,
                    profissional,
                    data: format(data, 'dd/MM/yyyy'),
                    hora: format(data, 'HH:mm'),
                },
            });
            alert('Lembrete enviado!');
        } catch (err) {
            alert('Erro ao enviar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleClick}
                        disabled={loading}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : '📆 Lembrete'}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
