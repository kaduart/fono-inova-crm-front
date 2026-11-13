import { useId, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '../../design/motion';

export function SegmentedTabs<T extends string>({ label, value, options, onValueChange }: {
  label: string; value: T; options: { id: T; label: string; icon?: ReactNode }[];
  onValueChange: (value: T) => void;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return <div role="tablist" aria-label={label} className="isolate flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5">
    {options.map((option, index) => <button key={option.id} type="button" role="tab" aria-selected={value === option.id}
      tabIndex={value === option.id ? 0 : -1} onClick={() => onValueChange(option.id)}
      onKeyDown={e => {
        const next = e.key === 'ArrowRight' ? (index + 1) % options.length : e.key === 'ArrowLeft' ? (index + options.length - 1) % options.length
          : e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : null;
        if (next !== null) {
          e.preventDefault(); onValueChange(options[next].id);
          (e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
        }
      }}
      className={`relative flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${value === option.id ? 'font-semibold text-emerald-900 dark:text-emerald-200' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}>
      {value === option.id && <motion.span aria-hidden="true" layoutId={`${id}-indicator`} className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm dark:bg-slate-700"
        transition={{ duration: reduce ? 0 : motionDuration.fast, ease: motionEase.smoothOut }} />}
      {option.icon && <span aria-hidden="true">{option.icon}</span>}{option.label}
    </button>)}
  </div>;
}
