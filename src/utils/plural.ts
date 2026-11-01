/**
 * Plural em pt-BR sem gambiarra de sufixo ("sessão" + "ões" virava "sessãoões").
 * plural(1, 'sessão', 'sessões') → "1 sessão"; plural(3, 'guia', 'guias') → "3 guias".
 */
export const plural = (n: number | null | undefined, one: string, many: string, withNumber = true) => {
    const v = Number(n || 0);
    const word = v === 1 ? one : many;
    return withNumber ? `${v.toLocaleString('pt-BR')} ${word}` : word;
};
/** Só a palavra: sessoes(1) → "sessão". */
export const sessoes = (n: number | null | undefined) => plural(n, 'sessão', 'sessões', false);
