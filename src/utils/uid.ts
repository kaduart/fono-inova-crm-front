export function uid(prefix = "m") {
    // tenta usar UUID nativo; fallback para timestamp + rand
    const u = (globalThis.crypto as any)?.randomUUID?.();
    if (u) return `${prefix}-${u}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
