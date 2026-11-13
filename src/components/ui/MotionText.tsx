import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionDistance, motionDuration, motionEase } from '../../design/motion';

/** Changes presentation only. The caller owns pending/success/error states. */
export function MotionText({ children }: { children: string }) {
  const reduce = useReducedMotion();
  return <span className="inline-grid overflow-hidden align-middle" aria-live="polite" aria-atomic="true">
    <span className="sr-only">{children}</span>
    <AnimatePresence initial={false} mode="sync">
      <motion.span key={children} aria-hidden="true" className="col-start-1 row-start-1"
        initial={reduce ? false : { opacity: 0, y: motionDistance.text }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduce ? 0 : -motionDistance.text }}
        transition={{ duration: reduce ? 0 : motionDuration.quick, ease: motionEase.inOut }}>
        {children}
      </motion.span>
    </AnimatePresence>
  </span>;
}
