// Primitivos de formulário/modal das despesas — mesma linguagem visual das telas financeiras
// (rótulo acima, campos arredondados, cabeçalho com ícone). Substitui o `Grid item xs` do MUI,
// que no MUI v7 não aplica mais (o layout colapsava).
import { MotionText } from '../../../components/ui/MotionText';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export type Accent = 'indigo' | 'red' | 'emerald';

// Classes completas (não montadas por string) para o Tailwind enxergar todas.
const INPUT_BY_ACCENT: Record<Accent, string> = {
  indigo: 'focus:ring-indigo-500/40 focus:border-indigo-500',
  red: 'focus:ring-red-500/40 focus:border-red-500',
  emerald: 'focus:ring-emerald-500/40 focus:border-emerald-500',
};

export const inputClass = (accent: Accent = 'indigo') =>
  `w-full min-h-11 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 hover:border-gray-300 ` +
  `focus:outline-none focus:ring-2 transition-[box-shadow,border-color] duration-quick disabled:bg-gray-50 ${INPUT_BY_ACCENT[accent]}`;

export const PRIMARY_BTN: Record<Accent, string> = {
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  red: 'bg-red-600 hover:bg-red-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
};

export const Field = ({
  label,
  hint,
  required,
  className = '',
  children,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold text-gray-600 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1.5 leading-snug">{hint}</span>}
  </label>
);

export const ModalHeader = ({
  icon,
  color,
  title,
  subtitle,
  onClose,
  titleId,
  closeLabel = 'Fechar',
  closeDisabled = false,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  titleId?: string;
  closeLabel?: string;
  closeDisabled?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1A`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <h2 id={titleId} className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
    </div>
    <IconButton onClick={onClose} disabled={closeDisabled} aria-label={closeLabel} className="shrink-0" sx={{ width: 44, height: 44 }}>
      <X size={18} />
    </IconButton>
  </div>
);

/** Check que se desenha em 500ms (receita Success check). */
const DrawCheck = () => {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d="M3 8.5l3.2 3.2L13 4.8" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: 'easeOut' }} />
    </svg>
  );
};

export type SubmitStatus = 'idle' | 'success' | 'error';

/** Mostra o check por 650ms depois de o servidor confirmar (antes de fechar) e a tremida no erro. */
export const useSubmitStatus = () => {
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const succeed = useCallback((then: () => void) => {
    setStatus('success');
    timer.current = setTimeout(() => { setStatus('idle'); then(); }, 650);
  }, []);
  const fail = useCallback(() => {
    setStatus('error');
    timer.current = setTimeout(() => setStatus('idle'), 1200);
  }, []);
  return { status, succeed, fail };
};

export const ModalFooter = ({
  accent,
  status = 'idle',
  successLabel = 'Salvo',
  cancelLabel = 'Cancelar',
  submitTitle,
  onCancel,
  onSubmit,
  submitting,
  submitDisabled = false,
  submitLabel,
  submittingLabel,
  summary,
}: {
  accent: Accent;
  /** 'success' (só depois de o servidor confirmar) mostra o check; 'error' faz a tremida curta. */
  status?: SubmitStatus;
  successLabel?: string;
  cancelLabel?: string;
  /** Dica ao passar o mouse no botão (ex.: o que falta preencher). */
  submitTitle?: string;
  /** Resumo vivo do que será salvo (aparece à esquerda no desktop). */
  summary?: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  submittingLabel: string;
}) => {
  const reduce = useReducedMotion();
  return (
  <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 bg-white">
    {summary && <p className="mr-auto hidden min-w-0 truncate text-sm text-gray-600 sm:block" aria-live="polite">{summary}</p>}
    <button
      type="button"
      onClick={onCancel}
      disabled={submitting}
      className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60 transition-colors duration-quick focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {cancelLabel}
    </button>
    <span title={submitTitle || undefined} className="inline-flex">
    <motion.button
      type="button"
      onClick={onSubmit}
      disabled={submitting || submitDisabled || status === 'success'}
      animate={status === 'error' && !reduce ? { x: [0, -6, 6, -6, 6, -3, 0] } : { x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`min-h-11 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-quick flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${status === 'error' ? 'bg-red-600 hover:bg-red-700' : PRIMARY_BTN[accent]}`}
    >
      {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
      {status === 'success' && <DrawCheck />}
      <MotionText>{status === 'success' ? successLabel : status === 'error' ? 'Tentar de novo' : submitting ? submittingLabel : submitLabel}</MotionText>
    </motion.button>
    </span>
  </div>
  );
};

/** Interruptor acessível (role="switch"). */
export const Switch = ({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
        checked ? 'bg-emerald-500' : 'bg-gray-300'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

// ─── Campo de valor em R$ com máscara ───────────────────────────────────────
// Digitação estilo app de banco: cada dígito entra pela direita (7 → 0,07 → 0,75 → 7,50 → 75,00).
// O estado do formulário continua um decimal em string ('7500.00' ou ''), então quem consome
// (parseFloat) não muda. Só a exibição é "7.500,00".

const MAX_DIGITS = 11; // até R$ 999.999.999,99

/** Texto colado → decimal ('1234.50') ou '' se não houver número. Aceita "1.234,56", "1234,5", "1234.56", "1234". */
export const parseMoneyText = (text: string): string => {
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return '';
  let normalized: string;
  if (cleaned.includes(',')) normalized = cleaned.replace(/\./g, '').replace(',', '.'); // formato BR
  else if (/\.\d{1,2}$/.test(cleaned)) normalized = cleaned.replace(/\.(?=.*\.)/g, ''); // decimal com ponto
  else normalized = cleaned.replace(/\./g, ''); // só milhar/inteiro
  const n = Number(normalized);
  return Number.isFinite(n) ? n.toFixed(2) : '';
};

const formatMoney = (value: string): string => {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const MoneyInput = ({
  value,
  onChange,
  accent = 'indigo',
  placeholder = '0,00',
  large = false,
}: {
  value: string;
  onChange: (decimal: string) => void;
  accent?: Accent;
  placeholder?: string;
  /** Valor em destaque (lançamentos): número grande, só com linha embaixo. */
  large?: boolean;
}) => (
  <div className="relative">
    <span className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 ${large ? 'left-0 text-lg' : 'left-3 text-sm'}`}>R$</span>
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatMoney(value)}
      placeholder={placeholder}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
        onChange(digits === '' ? '' : (parseInt(digits, 10) / 100).toFixed(2));
      }}
      onPaste={(e) => {
        e.preventDefault();
        onChange(parseMoneyText(e.clipboardData.getData('text')));
      }}
      className={large
        ? `w-full min-h-14 border-0 border-b-2 border-gray-200 bg-transparent pl-9 pr-1 text-3xl font-bold tabular-nums text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-emerald-600 transition-colors duration-quick`
        : `${inputClass(accent)} pl-9`}
    />
  </div>
);

/** Escolha rápida (um toque): no lugar de listas com poucas opções. Teclado: setas movem a seleção. */
export function ChoiceChips<T extends string>({ label, value, options, onChange, fill = false }: {
  label: string;
  /** Uma linha só: colunas iguais no desktop (3 por linha no celular). Use com até 6 opções curtas. */
  fill?: boolean;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={fill ? 'grid grid-cols-3 gap-2 sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]' : 'flex flex-wrap gap-2'}
      style={fill ? ({ '--n': options.length } as React.CSSProperties) : undefined}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (!options.some((x) => x.value === value) && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
              if (!step) return;
              e.preventDefault();
              const next = options[(i + step + options.length) % options.length];
              onChange(next.value);
              (e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[(i + step + options.length) % options.length])?.focus();
            }}
            className={`min-h-11 rounded-xl border ${fill ? 'px-1.5 text-[13px]' : 'px-3.5 text-sm'} transition-colors duration-quick ease-smooth-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
