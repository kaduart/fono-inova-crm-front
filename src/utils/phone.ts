export const normalizeE164BR = (p?: string) => {
    if (!p) return "";
    let s = String(p).replace(/\D/g, "");
    s = s.replace(/^0+/, "");
    if (!s.startsWith("55")) s = "55" + s;
    return "+" + s;
};