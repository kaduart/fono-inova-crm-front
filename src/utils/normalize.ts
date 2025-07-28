import { IPatient } from "./types/types";

export const normalizeIPatient = (IPatient: IPatient): IPatient => {
    const normalizeEmptyStrings = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;

        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => {
                // Trata campos de string
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    // Campos únicos (cpf, rg, email) convertem vazio para undefined
                    if (['cpf', 'rg', 'email'].includes(key)) {
                        return [key, trimmed === '' ? null : trimmed];
                    }
                    // Outros campos convertem vazio para null
                    return [key, trimmed === '' ? null : trimmed];
                }
                // Trata objetos aninhados (como address, healthPlan, etc)
                if (typeof value === 'object' && value !== null) {
                    return [key, normalizeEmptyStrings(value)];
                }
                return [key, value];
            })
        );
    };

    return normalizeEmptyStrings(IPatient) as IPatient;
};