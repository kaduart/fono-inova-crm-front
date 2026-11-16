import { Check } from 'lucide-react';

interface WorkflowStepsProps {
  labels: string[];
  current: number;
  disabled?: boolean;
  onSelect: (step: number) => void;
}

/** Passos em barra fina com nome: o formulário continua dono dos painéis e da validação. */
export function WorkflowSteps({ labels, current, disabled, onSelect }: WorkflowStepsProps) {
  return <nav aria-label="Etapas do pacote">
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((label, index) => {
        const done = current > index;
        const on = current === index;
        return <li key={label} className="min-w-0">
          <button type="button" disabled={disabled} aria-current={on ? 'step' : undefined}
            aria-label={`${label}${done ? ', etapa concluída' : on ? ', etapa atual' : ''}`}
            onClick={() => onSelect(index)}
            className="group flex min-h-11 w-full min-w-0 flex-col items-stretch justify-center gap-1.5 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-50">
            <span aria-hidden="true" className={`block h-1 rounded-full transition-colors duration-fast ease-smooth-out motion-reduce:transition-none ${done || on ? 'bg-emerald-600' : 'bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-700'}`} />
            <span className={`flex min-w-0 items-center gap-1 truncate text-xs ${on ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
              {done ? <Check size={12} aria-hidden="true" className="shrink-0 text-emerald-600" /> : <span aria-hidden="true" className="tabular-nums">{index + 1}</span>}
              <span className="truncate">{label}</span>
            </span>
          </button>
        </li>;
      })}
    </ol>
  </nav>;
}
