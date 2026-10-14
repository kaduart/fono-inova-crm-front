/**
 * Data de nascimento no formulário de paciente.
 *
 * dateOfBirth não tem semântica de horário: é gravado como meia-noite UTC do dia pretendido
 * (mesma convenção do backend e do BirthdayCard, que leem dia/mês com getUTC*). Por isso:
 *  - ao SALVAR, o dia escolhido vira meia-noite UTC desse dia (nunca "agora" — escolher a data
 *    depois das 21h em Brasília, UTC-3, empurrava o aniversário para o dia seguinte em UTC);
 *  - ao EXIBIR, o dia UTC vira uma data local sem horário (senão 00:00Z aparecia como o dia anterior).
 */

/** Máscara de digitação dd/mm/aaaa: só dígitos, barras inseridas sozinhas, máx. 8 dígitos. */
export function maskDateBR(value: string): string {
    const digits = (value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
}

/** Valor salvo (ISO/Date) → Date local à meia-noite do MESMO dia (para o DatePicker). */
export function storedBirthToPickerDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Date escolhido no DatePicker → meia-noite UTC do dia escolhido (valor a salvar). */
export function pickerDateToStoredBirth(date: Date | null): Date | null {
    if (!date || Number.isNaN(date.getTime())) return null;
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
