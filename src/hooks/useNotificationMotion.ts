import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '../design/motion';

/** Preserve the outgoing message while AnimatePresence plays its exit. */
export function useNotificationMotion<T>(incoming: T | null | undefined) {
  const previous = useRef<T | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => { if (incoming != null) previous.current = incoming; }, [incoming]);
  return {
    notification: incoming ?? previous.current,
    visible: incoming != null,
    motionProps: {
      initial: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97, transition: { duration: reduce ? 0 : motionDuration.fast, ease: motionEase.smoothOut } },
      transition: { duration: reduce ? 0 : motionDuration.medium, ease: motionEase.smoothOut },
    },
  };
}
