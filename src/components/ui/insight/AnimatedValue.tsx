// Número que "rola" até o valor novo (NumberFlow). Aceita número ou o texto já formatado
// que as telas usam ("R$ 1.234,56", "12,5%", "−R$ 300,00", "8 de 12"): se não reconhecer, mostra o texto como está.
import NumberFlow from '@number-flow/react';
import type { ReactNode } from 'react';

const BRL = /^([+\-−]?)\s*R\$\s?([\d.]+(?:,\d+)?)$/;
const PCT = /^([+\-−]?)([\d.]+(?:,\d+)?)\s?%$/;
const INT = /^([+\-−]?)([\d.]+(?:,\d+)?)$/;
const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const sign = (s: string) => (s === '-' || s === '−' ? -1 : 1);

export default function AnimatedValue({ value }: { value: ReactNode }) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return <NumberFlow value={value} locales="pt-BR" />;
  }
  if (typeof value !== 'string') return <>{value}</>;
  const v = value.trim();
  let m = v.match(BRL);
  if (m) {
    const n = num(m[2]) * sign(m[1]);
    const explicitPlus = m[1] === '+';
    return <NumberFlow value={n} locales="pt-BR" format={{ style: 'currency', currency: 'BRL', signDisplay: explicitPlus ? 'always' : 'auto' }} />;
  }
  m = v.match(PCT);
  if (m) {
    const n = num(m[2]) * sign(m[1]);
    const dec = (m[2].split(',')[1] || '').length;
    return <NumberFlow value={n / 100} locales="pt-BR" format={{ style: 'percent', minimumFractionDigits: dec, maximumFractionDigits: dec }} />;
  }
  m = v.match(INT);
  if (m && !/^0\d/.test(m[2])) {
    const n = num(m[2]) * sign(m[1]);
    const dec = (m[2].split(',')[1] || '').length;
    return <NumberFlow value={n} locales="pt-BR" format={{ minimumFractionDigits: dec, maximumFractionDigits: dec }} />;
  }
  return <>{value}</>;
}
