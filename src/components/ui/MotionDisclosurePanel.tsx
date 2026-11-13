import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '../../design/motion';

/** Use inside AnimatePresence. Exiting controls immediately leave the tab order. */
export function MotionDisclosurePanel({ children, className }: { children: ReactNode; className?: string }) {
  const present = useIsPresent();
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.toggleAttribute('inert', !present); }, [present]);
  return <motion.div ref={root} className={className} aria-hidden={!present ? true : undefined}
    initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: reduce ? 0 : motionDuration.fast, ease: motionEase.smoothOut }}>
    {children}
  </motion.div>;
}
