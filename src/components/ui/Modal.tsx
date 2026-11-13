import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import { motionDuration, motionEase, motionScale } from '../../design/motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id do título, para leitores de tela */
  labelledBy?: string;
  role?: 'dialog' | 'alertdialog';
  /** classes do painel (largura, padding etc.) */
  panelClassName?: string;
  /** fechar ao clicar fora (padrão: sim) */
  closeOnBackdrop?: boolean;
  zIndexClass?: string;
}

/** Modal padrão: abre em 250ms com escala 0,96, fecha em 150ms, Esc fecha, foco preso. */
export function Modal({ open, onClose, children, labelledBy, role = 'dialog', panelClassName = 'w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#161d1b]', closeOnBackdrop = true, zIndexClass = 'z-[100001]' }: ModalProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="overlay" className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-slate-900/40 p-0 sm:p-4 sm:items-center`}
          initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : motionDuration.quick } }}
          transition={{ duration: reduce ? 0 : motionDuration.fast, ease: motionEase.smoothOut }}
          onMouseDown={() => { if (closeOnBackdrop) onClose(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
          <FocusTrap open isEnabled={() => true} disableAutoFocus={false}>
            <motion.div role={role} aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} className={`${panelClassName} outline-none`}
              initial={reduce ? false : { opacity: 0, scale: motionScale.modal ?? 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: motionScale.modal ?? 0.96, transition: { duration: motionDuration.quick, ease: motionEase.smoothOut } }}
              transition={{ duration: reduce ? 0 : motionDuration.fast, ease: motionEase.smoothOut }}
              onMouseDown={(e) => e.stopPropagation()}>
              {children}
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default Modal;
