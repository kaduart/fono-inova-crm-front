import {
    Tooltip,
    TooltipArrow,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@radix-ui/react-tooltip';
import { format } from 'date-fns';
import { useState } from 'react';
import { whatsappService } from '../../../../services/whatsappService';
import { Button } from '../../../ui/Button';

interface WhatsAppActionButtonsProps {
    phone: string;
    nome: string;
    profissional?: string;
    data?: Date;
    hora?: string;
    servico?: string;
    restantes?: string;
}

export function WhatsAppActionButtons({
    phone,
    nome,
    profissional = '-',
    data,
    hora,
    servico = 'Serviço',
    restantes = '0',
}: WhatsAppActionButtonsProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const cleanParameters = (params: Record<string, string | undefined>): Record<string, string> => {
        const clean: Record<string, string> = {};
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string') {
                clean[key] = value;
            }
        }
        return clean;
    };

    const handleSend = async (type: 'lembrete' | 'followup' | 'pacote') => {
        try {
            setLoading(type);
            const payload =
                type === 'lembrete'
                    ? {
                        template: 'lembrete_sessao',
                        phone,
                        parameters: {
                            nome,
                            profissional: profissional || '',
                            data: data ? format(data, 'dd/MM/yyyy') : '',
                            hora: hora || (data ? format(data, 'HH:mm') : ''),
                        },
                    }
                    : type === 'followup'
                        ? {
                            template: 'follow_up_ausente',
                            phone,
                            parameters: {
                                nome,
                                servico: servico || '',
                            },
                        }
                        : {
                            template: 'fim_pacote',
                            phone,
                            parameters: {
                                nome,
                                servico: servico || '',
                                restantes: restantes || '',
                            },
                        };

            await whatsappService.sendTemplateMessage({
                phone,
                template: payload.template,
                parameters: cleanParameters(payload.parameters),
            });

            alert('Mensagem enviada com sucesso!');
        } catch (err) {
            alert('Erro ao enviar mensagem.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-2">
                {/* Botão Lembrete */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-1.5 flex items-center gap-1 hover:bg-gray-50"
                            onClick={() => handleSend('lembrete')}
                            disabled={loading === 'lembrete'}
                        >
                            {loading === 'lembrete' ? (
                                <span className="animate-spin inline-block">↻</span>
                            ) : (
                                <span>📆</span>
                            )}
                            <span>Lembrete</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent
                        className="bg-gray-800 text-white text-xs px-2 py-1 rounded-md shadow-lg"
                        sideOffset={5}
                    >
                        Enviar lembrete da próxima sessão
                        <TooltipArrow className="fill-gray-800" />
                    </TooltipContent>
                </Tooltip>

                {/* Botão Follow-up */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-1.5 flex items-center gap-1 hover:bg-gray-50"
                            onClick={() => handleSend('followup')}
                            disabled={loading === 'followup'}
                        >
                            {loading === 'followup' ? (
                                <span className="animate-spin inline-block">↻</span>
                            ) : (
                                <span>👋</span>
                            )}
                            <span>Follow-up</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent
                        className="bg-gray-800 text-white text-xs px-2 py-1 rounded-md shadow-lg"
                        sideOffset={5}
                    >
                        Enviar mensagem para ausente
                        <TooltipArrow className="fill-gray-800" />
                    </TooltipContent>
                </Tooltip>

                {/* Botão Fim de Pacote */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-1.5 flex items-center gap-1 hover:bg-gray-50"
                            onClick={() => handleSend('pacote')}
                            disabled={loading === 'pacote'}
                        >
                            {loading === 'pacote' ? (
                                <span className="animate-spin inline-block">↻</span>
                            ) : (
                                <span>📦</span>
                            )}
                            <span>Fim de Pacote</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent
                        className="bg-gray-800 text-white text-xs px-2 py-1 rounded-md shadow-lg"
                        sideOffset={5}
                    >
                        Alertar sobre sessões restantes
                        <TooltipArrow className="fill-gray-800" />
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}