// Mapa das cores fixas (paleta Tailwind usada nos `sx`/`style` do MUI) para
// tokens CSS que mudam no tema escuro. No claro o token vale exatamente o hex
// original: a tela clara fica idêntica. Usado por hexTokens.mjs (codemod) e
// para gerar src/styles/hex-tokens.css.
const N = { s2: 'var(--d-surface-2)', s3: 'var(--d-surface-3)', line: 'var(--d-line)', lineS: 'var(--d-line-strong)', dim: '#7d8b86', muted: 'var(--d-muted)', body: 'var(--d-body)', ink: 'var(--d-ink)', surface: 'var(--d-surface)' };
const neutral = (name, [c50, c100, c200, c300, c400, c500, c600, c700, c800, c900]) => [
  [c50, `${name}-50`, N.s2], [c100, `${name}-100`, N.s3], [c200, `${name}-200`, N.line], [c300, `${name}-300`, N.lineS],
  [c400, `${name}-400`, N.dim], [c500, `${name}-500`, N.muted], [c600, `${name}-600`, N.body], [c700, `${name}-700`, N.body],
  [c800, `${name}-800`, N.ink], [c900, `${name}-900`, N.ink],
].filter(([hex]) => hex);
// Tons de cor: fundos 50–100 viram véu translúcido; bordas 200–300 véu mais forte;
// 500–600 (preenchimento sólido com texto branco) ficam iguais; 700–900 (texto
// escuro sobre fundo claro) viram o tom 300, legível no escuro.
const hue = (name, rgb, light, shades) => Object.entries(shades).map(([k, hex]) => {
  const n = Number(k);
  const dark = n <= 50 ? `rgb(${rgb} / .12)` : n <= 100 ? `rgb(${rgb} / .2)` : n <= 200 ? `rgb(${rgb} / .32)` : n <= 300 ? `rgb(${rgb} / .5)` : light;
  return [hex, `${name}-${k}`, dark];
});
export const PALETTE = [
  ['#FFFFFF', 'white', N.surface],
  ...neutral('slate', ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A']),
  ...neutral('gray', ['#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827']),
  ['#FAFAFA', 'neutral-50', N.s2],
  ...hue('blue', '59 130 246', '#93c5fd', { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A' }),
  ...hue('sky', '14 165 233', '#7dd3fc', { 50: '#F0F9FF', 100: '#E0F2FE', 200: '#BAE6FD', 700: '#0369A1', 800: '#075985' }),
  ...hue('emerald', '16 185 129', '#6ee7b7', { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 700: '#047857', 800: '#065F46', 900: '#064E3B' }),
  ...hue('green', '34 197 94', '#86efac', { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 700: '#15803D', 800: '#166534' }),
  ...hue('teal', '20 184 166', '#5eead4', { 50: '#F0FDFA', 100: '#CCFBF1', 700: '#0F766E', 800: '#115E59' }),
  ...hue('amber', '245 158 11', '#fcd34d', { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 700: '#B45309', 800: '#92400E', 900: '#78350F' }),
  ...hue('yellow', '234 179 8', '#fde047', { 50: '#FEFCE8', 100: '#FEF9C3', 800: '#854D0E' }),
  ...hue('orange', '249 115 22', '#fdba74', { 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12' }),
  ...hue('red', '239 68 68', '#fca5a5', { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D' }),
  ...hue('rose', '244 63 94', '#fda4af', { 50: '#FFF1F2', 100: '#FFE4E6', 700: '#BE123C' }),
  ...hue('violet', '139 92 246', '#c4b5fd', { 50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 700: '#6D28D9', 800: '#5B21B6' }),
  ['#F3F0FF', 'violet-50b', 'rgb(139 92 246 / .12)'],
  ...hue('purple', '168 85 247', '#d8b4fe', { 50: '#FAF5FF', 100: '#F3E8FF', 700: '#7E22CE' }),
  ...hue('indigo', '99 102 241', '#a5b4fc', { 50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC', 700: '#4338CA', 800: '#3730A3' }),
];
// Tokens por nome (não entram no codemod): cor de destaque usada como TEXTO.
// 500–600 ficam iguais no mapa por hex porque também são fundo sólido de botão;
// quando a mesma cor é texto, use estes, que clareiam no escuro.
export const NAMED = [
  ['text-emerald', '#059669', '#34d399'], ['text-blue', '#2563EB', '#60a5fa'], ['text-amber', '#D97706', '#fbbf24'],
  ['text-violet', '#7C3AED', '#a78bfa'], ['text-red', '#DC2626', '#f87171'],
];
export const BY_HEX = new Map(PALETTE.map(([hex, name, dark]) => [hex.toUpperCase(), { name, dark }]));
BY_HEX.set('#FFF', BY_HEX.get('#FFFFFF'));
export const cssVar = hex => { const t = BY_HEX.get(hex.toUpperCase()); return t ? `var(--fx-${t.name})` : null; };
