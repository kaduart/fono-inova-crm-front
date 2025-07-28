import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import { useState } from "react";
import { sendTemplateMessage } from "../../../../services/whatsappService";
import { Button } from "../../../ui/Button";

interface Props {
    phone: string;
    nome: string;
    restantes: string;
    servico: string;
    tooltip: string;
}

export function SendPackageAlertButton({ phone, nome, restantes, servico, tooltip }: Props) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await sendTemplateMessage({
                phone,
                template: 'fim_pacote',
                parameters: { nome, restantes, servico },
            });
            alert('Alerta enviado!');
        } catch {
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
                        {loading ? 'Enviando...' : '⚠️ Fim do pacote'}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

    );
}
