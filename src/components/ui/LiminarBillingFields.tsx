import { InputCurrency } from './InputCurrency';

type Props = {
    value: number;
    onChange: (value: number) => void;
    creditBalance?: number | null;
    processNumber?: string | null;
};

/** Campos judiciais compartilhados pelas abas Editar e Finalizar. */
export default function LiminarBillingFields({
    value,
    onChange,
    creditBalance,
    processNumber,
}: Props) {
    const hasContractSummary = creditBalance != null || Boolean(processNumber);

    return (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] gap-3 items-end">
            <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                    Valor da sessão judicial *
                </label>
                <InputCurrency
                    name="paymentAmount"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="m-0 w-full border-gray-200 text-sm focus:ring-purple-400"
                />
            </div>

            {hasContractSummary && (
                <div className="min-h-[42px] rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700 flex items-center">
                    <span>
                        ⚖️ Saldo judicial: R$ {(creditBalance ?? 0).toFixed(2).replace('.', ',')}
                        {processNumber && <span className="text-purple-500"> — Processo: {processNumber}</span>}
                    </span>
                </div>
            )}
        </div>
    );
}
