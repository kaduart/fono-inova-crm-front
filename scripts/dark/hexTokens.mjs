#!/usr/bin/env node
// Codemod do tema escuro: troca cores fixas ('#F8FAFC', '1px solid #E2E8F0',
// bgcolor: 'white'...) em arquivos .tsx/.jsx por var(--fx-*) (ver palette.mjs).
//   node scripts/dark/hexTokens.mjs --css            regera src/styles/hex-tokens.css
//   node scripts/dark/hexTokens.mjs arq1.tsx arq2.tsx aplica nos arquivos
// Branco só é trocado quando é FUNDO (bgcolor/background); texto branco em botão fica.
// Hex seguido de alpha em template (`${c}20`) não é tocado.
import fs from 'node:fs';
import path from 'node:path';
import { PALETTE, NAMED, cssVar } from './palette.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
if (process.argv.includes('--css')) {
  const all = [...PALETTE, ...NAMED.map(([name, l, d]) => [l, name, d])];
  const light = all.map(([hex, name]) => `--fx-${name}:${hex}`).join(';');
  const dark = all.map(([, name, d]) => `--fx-${name}:${d}`).join(';');
  fs.writeFileSync(path.join(root, 'src/styles/hex-tokens.css'),
    `/* Gerado por scripts/dark/hexTokens.mjs --css. Não editar à mão: ajuste scripts/dark/palette.mjs. */\n:root{${light}}\nhtml.dark{${dark}}\n`);
  console.log('hex-tokens.css gerado');
  process.exit(0);
}
const CSSISH = /(color|bg|background|border|shadow|fill|stroke)/i;
const pct = aa => Math.round(parseInt(aa, 16) / 255 * 100);
const BG_KEY = /\b(bgcolor|background|backgroundColor)\s*:/;
let total = 0;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let n = 0;
  const out = src.split('\n').map(line => {
    let l = line;
    // Alpha colado no fim da cor (`${cor}20`, cor + '20') só funciona com hex.
    // color-mix funciona com hex E com var(--fx-*), então converte antes.
    if (CSSISH.test(l)) {
      l = l.replace(/\$\{([^{}`]+)\}([0-9A-Fa-f]{2})(?=[`\s,)])/g, (m, expr, aa) => { n++; return `color-mix(in srgb, \${${expr}} ${pct(aa)}%, transparent)`; });
      l = l.replace(/([A-Za-z_$][\w$.]*(?:\([^()]*\))?)\s*\+\s*'([0-9A-Fa-f]{2})'/g, (m, expr, aa) => { n++; return `\`color-mix(in srgb, \${${expr}} ${pct(aa)}%, transparent)\``; });
    }
    l = l.replace(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b(?![0-9A-Fa-f])/g, (m, _h, off, str) => {
      if (m.length === 4 && m.toUpperCase() === '#FFF') return m; // texto branco curto: decide abaixo
      const v = cssVar(m);
      if (!v || m.toUpperCase() === '#FFFFFF') return m;
      const prev = str[off - 1];
      if (!["'", '"', ' ', '`', '('].includes(prev)) return m;
      n++; return v;
    });
    if (BG_KEY.test(l)) {
      l = l.replace(/'(white|#fff|#FFF|#ffffff|#FFFFFF)'/g, (m, _w, off, str) => {
        if (/(?<![A-Za-z])color\s*:\s*$/.test(str.slice(Math.max(0, off - 12), off))) return m;
        n++; return "'var(--fx-white)'";
      });
    }
    return l;
  }).join('\n');
  if (n) { fs.writeFileSync(file, out); total += n; console.log(`${n}\t${file}`); }
}
console.log('total', total);
