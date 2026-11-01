// Peças de UI em Tailwind que substituem o MUI (Dialog, Menu, LinearProgress, CircularProgress). Modal com pilha: Esc fecha só o de cima.
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export const Spinner = ({ size = 24, light = false }) => (
  <span role="status" aria-label="Carregando"
    className={`inline-block animate-spin rounded-full border-2 ${light ? 'border-white/40 border-t-white' : 'border-emerald-200 border-t-emerald-700 dark:border-emerald-900 dark:border-t-emerald-400'}`}
    style={{ width: size, height: size }} />
);

export const ProgressBar = ({ value, className = 'bg-emerald-600' }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
    <div className={`h-full rounded-full transition-[width] duration-500 ${className}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

/** Modal com portal, Esc e clique fora. z-index 1300 (mesmo nível do Dialog antigo). */
// Pilha de modais abertos: Esc fecha só o de cima.
const modalStack = [];

export const ModalShell = ({ open, onClose, labelledBy, className = '', children }) => {
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    modalStack.push(token);
    const onKey = (e) => { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === token) closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      modalStack.splice(modalStack.indexOf(token), 1);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/50 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current?.(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className={`flex flex-col overflow-hidden bg-white text-left shadow-2xl dark:bg-slate-900 ${className}`}>
        {children}
      </div>
    </div>,
    document.body
  );
};

/** Menu ancorado no botão que o abriu (anchorEl), com Esc e clique fora. */
export const AnchorMenu = ({ anchorEl, onClose, children }) => {
  const ref = React.useRef(null);
  useEffect(() => {
    if (!anchorEl) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !anchorEl.contains(e.target)) onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [anchorEl, onClose]);
  if (!anchorEl) return null;
  const r = anchorEl.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.right - 176, window.innerWidth - 184));
  return createPortal(
    <div ref={ref} role="menu" style={{ top: r.bottom + 6, left }}
      className="fixed z-[1300] w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      {children}
    </div>,
    document.body
  );
};

export const MenuAction = ({ onClick, disabled, className = 'text-slate-700 dark:text-slate-200', children }) => (
  <button type="button" role="menuitem" onClick={onClick} disabled={disabled}
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 ${className}`}>
    {children}
  </button>
);

