import { Check } from 'lucide-react';

interface WorkflowStepsProps {
  labels: string[];
  current: number;
  disabled?: boolean;
  onSelect: (step: number) => void;
}

/** Indicator inspired by React Bits Stepper; the form keeps ownership of its panels and validation. */
export function WorkflowSteps({ labels, current, disabled, onSelect }: WorkflowStepsProps) {
  return <nav aria-label="Etapas do pacote" className="relative mx-auto max-w-2xl py-1">
    <div aria-hidden="true" className="absolute top-5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      style={{ left: `${50 / labels.length}%`, right: `${50 / labels.length}%` }}>
      <div className="h-full origin-left rounded-full bg-emerald-600 transition-transform duration-fast ease-smooth-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${current / Math.max(1, labels.length - 1)})` }} />
    </div>
    <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((label, index) => <li key={label} className="flex min-w-0 justify-center">
        <button type="button" disabled={disabled} aria-current={current === index ? 'step' : undefined}
          aria-label={`${label}${current > index ? ', etapa concluída' : current === index ? ', etapa atual' : ''}`}
          onClick={() => onSelect(index)}
          className="flex min-h-11 w-full min-w-0 flex-col items-center gap-2 rounded-lg px-1 text-center text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-50 sm:text-sm">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-fast motion-reduce:transition-none ${current > index ? 'border-emerald-700 bg-emerald-700 text-white' : current === index ? 'border-emerald-700 bg-white text-emerald-800 ring-4 ring-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-950' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
            {current > index ? <Check size={18} aria-hidden="true" /> : <span aria-hidden="true">{index + 1}</span>}
          </span>
          <span className={`break-words ${current === index ? 'font-semibold text-emerald-900 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
        </button>
      </li>)}
    </ol>
  </nav>;
}
