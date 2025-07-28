import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import { useState } from "react";
import { sendTemplateMessage } from "../../../../services/whatsappService";
import { Button } from "../../../ui/Button";

interface Props {
    phone: string;
    nome: string;
    servico: string;
    tooltip: string;

}

export function SendFollowUpButton({ phone, nome, servico, tooltip }: Props) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await sendTemplateMessage({
                phone,
                template: 'followup_ausencia',
                parameters: { nome, servico },
            });
            alert('Follow-up enviado!');
        } catch (e) {
            alert('Erro no envio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleClick} disabled={loading}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition disabled:opacity-50">
                        {loading ? 'Enviando...' : '📞 Follow-up'}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

    );
}
