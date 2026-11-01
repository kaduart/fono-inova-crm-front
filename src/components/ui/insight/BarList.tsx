// Lista de barras horizontais no estilo Tremor (ranking: por profissional, convênio, canal…).
import type { ReactNode } from 'react';

export interface BarListItem { key: string; label: ReactNode; value: number; display?: ReactNode; onClick?: () => void }

export default function BarList({ items, color = 'bg-emerald-500/80 dark:bg-emerald-500/60' }: { items: BarListItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((i) => {
        const Tag = i.onClick ? 'button' : 'div';
        return (
          <li key={i.key}>
            <Tag type={i.onClick ? 'button' : undefined} onClick={i.onClick}
              className={`relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-sm ${i.onClick ? 'hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500' : ''}`}>
              <span className={`absolute inset-y-0 left-0 rounded-lg ${color} opacity-25 transition-[width] duration-700`} style={{ width: `${(i.value / max) * 100}%` }} aria-hidden="true" />
              <span className="relative min-w-0 truncate text-gray-800 dark:text-gray-100">{i.label}</span>
              <span className="relative shrink-0 font-semibold tabular-nums text-gray-900 dark:text-gray-50">{i.display ?? i.value.toLocaleString('pt-BR')}</span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
