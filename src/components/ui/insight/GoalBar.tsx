// Barra de meta no estilo Tremor: quanto já foi feito e um traço de "onde deveria estar hoje".
import type { ReactNode } from 'react';

export default function GoalBar({ label, done, goal, pace, right, tone = 'emerald' }: {
  label: ReactNode; done: number; goal: number; pace?: number | null; right?: ReactNode; tone?: 'emerald' | 'amber' | 'red';
}) {
  const pct = goal > 0 ? Math.min(100, Math.max(0, (done / goal) * 100)) : 0;
  const pacePct = goal > 0 && pace != null ? Math.min(100, Math.max(0, (pace / goal) * 100)) : null;
  const bar = tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-600 dark:bg-emerald-500';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#161d1b]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
        {right && <span className="tabular-nums text-gray-500 dark:text-gray-400">{right}</span>}
      </div>
      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className={`h-full rounded-full transition-[width] duration-700 ${bar}`} style={{ width: `${pct}%` }} />
        {pacePct != null && <span className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-gray-900/60 dark:bg-white/70" style={{ left: `${pacePct}%` }} title="Onde deveria estar hoje" />}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="tabular-nums">{Math.round(pct)}% da meta</span>
        {pacePct != null && <span>traço = onde deveria estar hoje</span>}
      </div>
    </div>
  );
}
