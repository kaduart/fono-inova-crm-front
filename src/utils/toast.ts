/**
 * Toast único da aplicação — agora com Sonner (avisos empilhados, discretos, com ação).
 *
 * Mantém a MESMA API que as telas já usavam (antes era react-toastify + chamadas no estilo hot-toast):
 *
 *   toast('msg')                     toast.success / error / info / warn / warning / loading
 *   { id, duration, icon }           id reaproveitado ATUALIZA o aviso (não empilha)
 *   { toastId, autoClose }           aliases do react-toastify, aceitos para não reescrever chamadas
 *   toast((t) => <JSX/>)             render por função; t.id e t.dismiss() disponíveis
 *   toast.dismiss(id?)  toast.isActive(id)
 *
 * Para erro de API use `notifyApiError` (utils/notifyApiError), que lê o envelope do backend.
 */
import { createElement, type ReactNode } from 'react';
import { toast as sonner, type ExternalToast } from 'sonner';

export type Id = string | number;

export interface ToastHandle {
  id: Id;
  dismiss: () => void;
}

export type ToastMessage = ReactNode | ((t: ToastHandle) => ReactNode);

export interface AppToastOptions {
  icon?: ReactNode;
  id?: Id;
  /** Milissegundos; Infinity mantém aberto. */
  duration?: number;
  /** Aliases react-toastify. */
  toastId?: Id;
  autoClose?: number | false;
  description?: ReactNode;
  action?: ExternalToast['action'];
  [k: string]: unknown;
}

type Kind = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading';

const active = new Set<Id>();
let seq = 0;

function mapOptions(o?: AppToastOptions): ExternalToast & { id: Id } {
  const id = o?.id ?? o?.toastId ?? `t${++seq}`;
  const out: ExternalToast & { id: Id } = { id };
  const dur = o?.duration ?? (o?.autoClose === false ? Infinity : o?.autoClose);
  if (dur !== undefined) out.duration = dur;
  if (o?.icon !== undefined) out.icon = o.icon;
  if (o?.description !== undefined) out.description = o.description;
  if (o?.action !== undefined) out.action = o.action;
  out.onDismiss = () => active.delete(id);
  out.onAutoClose = () => active.delete(id);
  return out;
}

function show(kind: Kind, message: ToastMessage, options?: AppToastOptions): Id {
  const opts = mapOptions(options);
  active.add(opts.id);
  if (typeof message === 'function') {
    const render = message as (t: ToastHandle) => ReactNode;
    // Aviso com botões: não fecha sozinho a não ser que a tela peça.
    sonner.custom(
      (sid) => createElement('div', { className: 'fono-toast-custom' }, render({ id: sid, dismiss: () => sonner.dismiss(sid) })),
      { duration: Infinity, ...opts },
    );
    return opts.id;
  }
  if (kind === 'default') sonner(message as ReactNode, opts);
  else sonner[kind](message as ReactNode, opts);
  return opts.id;
}

type ShowFn = (message: ToastMessage, options?: AppToastOptions) => Id;
const toastFn = ((message: ToastMessage, options?: AppToastOptions) => show('default', message, options)) as ShowFn;

export const toast = Object.assign(toastFn, {
  success: ((m, o) => show('success', m, o)) as ShowFn,
  error: ((m, o) => show('error', m, o)) as ShowFn,
  info: ((m, o) => show('info', m, o)) as ShowFn,
  warn: ((m, o) => show('warning', m, o)) as ShowFn,
  warning: ((m, o) => show('warning', m, o)) as ShowFn,
  loading: ((m, o) => show('loading', m, o)) as ShowFn,
  dismiss: (id?: Id) => { if (id === undefined) active.clear(); else active.delete(id); sonner.dismiss(id); },
  isActive: (id: Id) => active.has(id),
});

export default toast;
