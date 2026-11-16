import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '../design/motion';

// Pilha compartilhada: o mais novo fica na frente; os anteriores recuam, menores e mais apagados.
let stack: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => stack;

function register(id: string, on: boolean) {
  const has = stack.includes(id);
  if (on && !has) { stack = [...stack, id]; emit(); }
  if (!on && has) { stack = stack.filter((s) => s !== id); emit(); }
}

/** Preserve the outgoing message while AnimatePresence plays its exit. */
export function useNotificationMotion<T>(incoming: T | null | undefined) {
  const previous = useRef<T | null>(null);
  const reduce = useReducedMotion();
  const id = useId();
  const visible = incoming != null;
  useEffect(() => { if (incoming != null) previous.current = incoming; }, [incoming]);
  useEffect(() => { register(id, visible); return () => register(id, false); }, [id, visible]);
  const current = useSyncExternalStore(subscribe, getSnapshot);
  const pos = current.indexOf(id);
  const depth = pos < 0 ? 0 : current.length - 1 - pos; // 0 = mais novo
  const y = reduce ? 0 : -14 * depth;
  const scale = 1 - 0.04 * depth;
  return {
    notification: incoming ?? previous.current,
    visible,
    motionProps: {
      style: { zIndex: 50 - depth },
      initial: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97, filter: reduce ? 'blur(0px)' : 'blur(2px)' },
      animate: { opacity: Math.max(0.5, 1 - 0.2 * depth), y, scale, filter: 'blur(0px)' },
      exit: { opacity: 0, y: reduce ? 0 : y + 16, scale: reduce ? 1 : 0.97, filter: reduce ? 'blur(0px)' : 'blur(2px)', transition: { duration: reduce ? 0 : motionDuration.fast, ease: motionEase.smoothOut } },
      transition: { duration: reduce ? 0 : motionDuration.medium, ease: motionEase.smoothOut },
    },
  };
}
