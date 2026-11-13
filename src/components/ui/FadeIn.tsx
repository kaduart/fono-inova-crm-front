import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '../../design/motion';

/** Conteúdo que acabou de carregar entra com fade curto (receita Skeleton → conteúdo). Monta uma vez, não pisca em refresh. */
export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : motionDuration.slow, ease: motionEase.smoothOut }}>
      {children}
    </motion.div>
  );
}
export default FadeIn;
