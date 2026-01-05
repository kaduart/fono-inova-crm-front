// src/utils/validators.ts
export type Errors<T> = Partial<Record<keyof T | string, string>>;

export const isEmpty = (v: any) =>
    v === null || v === undefined || v === "" || (typeof v === "string" && v.trim() === "");

export const required = (label: string) => (v: any) =>
    isEmpty(v) ? `${label} é obrigatório` : "";

export const minNumber = (label: string, min: number) => (v: any) =>
    Number(v) < min ? `${label} deve ser ≥ ${min}` : "";

export const betweenNumber = (label: string, min: number, max: number) => (v: any) => {
    const n = Number(v);
    if (Number.isNaN(n)) return `${label} inválido`;
    if (n < min || n > max) return `${label} deve estar entre ${min} e ${max}`;
    return "";
};

export function validateObject<T extends Record<string, any>>(
    values: T,
    rules: Partial<Record<keyof T, Array<(v: any, all: T) => string>>>
): Errors<T> {
    const errs: Errors<T> = {};
    (Object.keys(rules) as Array<keyof T>).forEach((key) => {
        const validators = rules[key] || [];
        for (const fn of validators) {
            const msg = fn(values[key], values);
            if (msg) {
                errs[key] = msg;
                break;
            }
        }
    });
    return errs;
}
