import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '../../design/motion';

interface RevealProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Troca skeleton por conteúdo com fade curto. Só anima a primeira carga; refresh automático não pisca. */
export function Reveal({ loading, skeleton, children, className }: RevealProps) {
  const reduce = useReducedMotion();
  const first = React.useRef(true);
  React.useEffect(() => { if (!loading) first.current = false; }, [loading]);
  if (!loading && !first.current) return <div className={className}>{children}</div>;
  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={loading ? 'sk' : 'ct'}
          initial={reduce ? false : { opacity: 0, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : loading ? motionDuration.quick : motionDuration.slow, ease: motionEase.inOut }}>
          {loading ? skeleton : children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
export default Reveal;
