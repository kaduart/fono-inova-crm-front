import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MotionText } from './MotionText';

/** Check que se desenha em 500ms (receita Success check). */
function DrawCheck() {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d="M3 8.5l3.2 3.2L13 4.8" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: 'easeOut' }} />
    </svg>
  );
}

export type SaveStatus = 'idle' | 'pending' | 'success' | 'error';

interface SaveButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** O chamador controla o estado: "success" só depois da confirmação do servidor. */
  status?: SaveStatus;
  idleLabel?: string;
  pendingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
}

const tone: Record<SaveStatus, string> = {
  idle: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
  pending: 'bg-emerald-600 focus:ring-emerald-500',
  success: 'bg-emerald-700 focus:ring-emerald-500',
  error: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
};

/** Botão de salvar com texto que troca suavemente e tremida curta no erro. */
export const SaveButton = React.forwardRef<HTMLButtonElement, SaveButtonProps>(function SaveButton(
  { status = 'idle', idleLabel = 'Salvar', pendingLabel = 'Salvando…', successLabel = 'Salvo',
    errorLabel = 'Tentar de novo', className = '', disabled, type = 'button', ...props }, ref) {
  const reduce = useReducedMotion();
  const label = { idle: idleLabel, pending: pendingLabel, success: successLabel, error: errorLabel }[status];
  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled || status === 'pending'}
      aria-busy={status === 'pending'}
      animate={status === 'error' && !reduce ? { x: [0, -6, 6, -6, 6, -3, 0] } : { x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`inline-flex min-h-10 items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-quick ease-smooth-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${tone[status]} ${className}`}
      {...(props as object)}
    >
      {status === 'success' && <DrawCheck />}<MotionText>{label}</MotionText>
    </motion.button>
  );
});
export default SaveButton;
