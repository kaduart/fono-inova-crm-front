/**
 * Centralized phone normalization utilities.
 *
 * Policy:
 * - normalizePhone: digits only, strips leading + and non-digits.
 * - normalizeE164BR: returns digits-only E164-ish for BR: ensures country 55, removes leading 0s.
 *   Useful for matching socket payloads that may come as +55..., 55..., or local 62....
 */

export function normalizePhone(value: string): string {
    return (value || "").toString().replace(/\D/g, "");
}

/** Returns digits-only; if BR number without country code, prefixes 55. */
export function normalizeE164BR(value: string): string {
    const digits = normalizePhone(value);

    if (!digits) return "";

    // remove leading zeros
    const d = digits.replace(/^0+/, "");

    // Already has BR code
    if (d.startsWith("55")) return d;

    // If looks like local BR (10-11 digits), prefix 55
    if (d.length === 10 || d.length === 11) return `55${d}`;

    // Fallback: return digits-only
    return d;
}

/** For legacy matching that used to strip 55 and keep local digits. */
export function normalizeLocalBR(value: string): string {
    const d = normalizePhone(value);
    return d.replace(/^55/, "");
}
