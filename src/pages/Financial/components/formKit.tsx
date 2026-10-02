// Primitivos de formulário/modal das despesas — mesma linguagem visual das telas financeiras
// (rótulo acima, campos arredondados, cabeçalho com ícone). Substitui o `Grid item xs` do MUI,
// que no MUI v7 não aplica mais (o layout colapsava).
import type { ReactNode } from 'react';
import { IconButton } from '@mui/material';
import { X } from 'lucide-react';

export type Accent = 'indigo' | 'red' | 'emerald';

// Classes completas (não montadas por string) para o Tailwind enxergar todas.
const INPUT_BY_ACCENT: Record<Accent, string> = {
  indigo: 'focus:ring-indigo-500/40 focus:border-indigo-500',
  red: 'focus:ring-red-500/40 focus:border-red-500',
  emerald: 'focus:ring-emerald-500/40 focus:border-emerald-500',
};

export const inputClass = (accent: Accent = 'indigo') =>
  `w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 ` +
  `focus:outline-none focus:ring-2 transition-shadow disabled:bg-gray-50 ${INPUT_BY_ACCENT[accent]}`;

export const PRIMARY_BTN: Record<Accent, string> = {
  indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
  red: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
  emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
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
}: {
  icon: ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  titleId?: string;
}) => (
  <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <h2 id={titleId} className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
    </div>
    <IconButton size="small" onClick={onClose} aria-label="Fechar" className="shrink-0">
      <X size={18} />
    </IconButton>
  </div>
);

export const ModalFooter = ({
  accent,
  onCancel,
  onSubmit,
  submitting,
  submitDisabled = false,
  submitLabel,
  submittingLabel,
}: {
  accent: Accent;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  submittingLabel: string;
}) => (
  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70">
    <button
      type="button"
      onClick={onCancel}
      disabled={submitting}
      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60 transition-colors"
    >
      Cancelar
    </button>
    <button
      type="button"
      onClick={onSubmit}
      disabled={submitting || submitDisabled}
      className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${PRIMARY_BTN[accent]}`}
    >
      {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
      {submitting ? submittingLabel : submitLabel}
    </button>
  </div>
);

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
}: {
  value: string;
  onChange: (decimal: string) => void;
  accent?: Accent;
  placeholder?: string;
}) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">R$</span>
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
      className={`${inputClass(accent)} pl-9`}
    />
  </div>
);
