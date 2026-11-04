#!/usr/bin/env node
// Gera src/styles/tw-dark-extras.css: regras do tema escuro para as classes
// Tailwind claras que o dark.css não cobre (hover:, disabled:, opacidade /40,
// gradientes from/to, divide/ring...). Varre o src e só gera o que é usado.
//   node scripts/dark/twExtras.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const darkCss = fs.readFileSync(path.join(root, 'src/styles/dark.css'), 'utf8');
const files = execSync('git ls-files src', { cwd: root }).toString().trim().split('\n').filter(f => /\.(tsx|jsx|ts|js)$/.test(f));
const RGB = { red: '239 68 68', orange: '249 115 22', amber: '245 158 11', yellow: '234 179 8', lime: '132 204 22', green: '34 197 94', emerald: '16 185 129', teal: '20 184 166', cyan: '6 182 212', sky: '14 165 233', blue: '59 130 246', indigo: '99 102 241', violet: '139 92 246', purple: '168 85 247', fuchsia: '217 70 239', pink: '236 72 153', rose: '244 63 94' };
const LIGHT_TEXT = { red: '#fca5a5', orange: '#fdba74', amber: '#fcd34d', yellow: '#fde047', lime: '#bef264', green: '#86efac', emerald: '#6ee7b7', teal: '#5eead4', cyan: '#67e8f9', sky: '#7dd3fc', blue: '#93c5fd', indigo: '#a5b4fc', violet: '#c4b5fd', purple: '#d8b4fe', fuchsia: '#f0abfc', pink: '#f9a8d4', rose: '#fda4af' };
const NEUTRAL = /^(slate|gray|zinc|neutral|stone)$/;
const re = /(?<![\w-])((?:(?:hover|focus|focus-visible|focus-within|disabled|group-hover|active|after|before|odd|even|first|last|placeholder):)*)(bg|from|via|to|border|divide|ring|text)-(white|([a-z]+)-(50|100|200|300|400|500|600|700|800|900|950))(?:\/(\d+))?(?![\w-])/g;
const found = new Map();
for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of s.matchAll(re)) {
    const full = m[0];
    if (/(^|:)dark:/.test(full)) continue;
    found.set(full, m);
  }
}
const esc = c => c.replace(/([:/.\[\]])/g, '\\$1');
const pseudo = variants => {
  let pre = '', post = '';
  for (const v of variants.split(':').filter(Boolean)) {
    if (v === 'group-hover') pre = '.group:hover ';
    else if (v === 'after' || v === 'before') post += `::${v}`;
    else if (v === 'placeholder') post += '::placeholder';
    else if (v === 'odd') post += ':nth-child(odd)';
    else if (v === 'even') post += ':nth-child(even)';
    else if (v === 'first') post += ':first-child';
    else if (v === 'last') post += ':last-child';
    else post += `:${v}`;
  }
  return { pre, post };
};
const a = (rgb, x) => `rgb(${rgb} / ${x})`;
function value(prop, color, hue, shade, op) {
  const n = Number(shade);
  const o = op ? Number(op) / 100 : 1;
  const surf = { 50: 'var(--d-surface-2)', 100: 'var(--d-surface-3)', 200: 'var(--d-surface-4)', 300: 'var(--d-line-strong)' };
  if (prop === 'text') {
    if (color === 'white' || NEUTRAL.test(hue) || n < 600) return null;
    return LIGHT_TEXT[hue] || null;
  }
  if (color === 'white') {
    if (prop === 'bg') return o < 0.5 ? null : `rgb(22 29 27 / ${o})`; // véu branco sobre cor (cabeçalhos) fica
    if (prop === 'border' || prop === 'divide' || prop === 'ring') return op ? null : 'var(--d-surface)';
    return 'var(--d-surface)';
  }
  if (n > 300) return null;
  if (NEUTRAL.test(hue)) {
    if (prop === 'bg') return surf[n];
    if (prop === 'border' || prop === 'divide' || prop === 'ring') return n >= 300 ? 'var(--d-line-strong)' : 'var(--d-line)';
    return surf[n];
  }
  const rgb = RGB[hue]; if (!rgb) return null;
  if (prop === 'bg' || prop === 'from' || prop === 'via' || prop === 'to') return a(rgb, ({ 50: .12, 100: .2, 200: .28, 300: .36 })[n] * Math.min(1, o + 0.2));
  return a(rgb, n >= 300 ? .45 : .35);
}
const rules = [];
for (const [full, m] of found) {
  const [, variants, prop, color, hue, shade, op] = m;
  const sel = `.${esc(full)}`;
  if (darkCss.includes(`html.dark ${sel.replace(/\\\//g, '\\/')}`) || darkCss.includes(`html.dark ${sel}`)) continue;
  const v = value(prop, color, hue, shade, op);
  if (!v) continue;
  const { pre, post } = pseudo(variants);
  const s = `html.dark ${pre}${sel}${post}`;
  const decl = prop === 'bg' ? `background-color:${v}`
    : prop === 'text' ? `color:${v}`
    : prop === 'border' ? `border-color:${v}`
    : prop === 'divide' ? null
    : prop === 'ring' ? `--tw-ring-color:${v}`
    : prop === 'from' ? `--tw-gradient-from:${v} var(--tw-gradient-from-position);--tw-gradient-to:transparent var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)`
    : prop === 'via' ? `--tw-gradient-to:transparent var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),${v} var(--tw-gradient-via-position),var(--tw-gradient-to)`
    : `--tw-gradient-to:${v} var(--tw-gradient-to-position)`;
  if (prop === 'divide') rules.push(`html.dark ${pre}${sel}${post}>:not([hidden])~:not([hidden]){border-color:${v}}`);
  else rules.push(`${s}{${decl}}`);
}
rules.sort();
fs.writeFileSync(path.join(root, 'src/styles/tw-dark-extras.css'),
  `/* Gerado por scripts/dark/twExtras.mjs — não editar à mão. Rode de novo ao criar telas. */\n${rules.join('\n')}\n`);
console.log(rules.length, 'regras');
