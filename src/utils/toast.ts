/**
 * Toast único da aplicação (react-toastify).
 *
 * Existiam duas bibliotecas (react-toastify e react-hot-toast). Este módulo é o ponto de entrada
 * oficial e aceita a API que as telas do hot-toast já usavam, para não reescrever cada chamada:
 *
 *   toast('msg')                     toast.success / error / info / warn / loading
 *   { id, duration, icon }           id → toastId, duration → autoClose (Infinity = não fecha)
 *   toast((t) => <JSX/>)             render por função; t.id e t.dismiss() disponíveis
 *   toast.dismiss(id?)
 *
 * Reusar um `id` ATUALIZA o aviso em vez de empilhar outro (comportamento do hot-toast).
 * Para erro de API use `notifyApiError` (utils/notifyApiError), que lê o envelope do backend.
 */
import type { ReactNode } from 'react';
import { toast as base, type Id, type ToastContentProps, type ToastOptions } from 'react-toastify';

type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning';

export interface ToastHandle {
  id: Id;
  dismiss: () => void;
}

export type ToastMessage = ReactNode | ((t: ToastHandle) => ReactNode);

export type AppToastOptions = Omit<ToastOptions, 'toastId' | 'autoClose' | 'icon'> & {
  /** Emoji/texto ou elemento (como no hot-toast). */
  icon?: ReactNode;
  /** Reusar o mesmo id atualiza o aviso existente. */
  id?: Id;
  /** Milissegundos; Infinity mantém aberto. */
  duration?: number;
  autoClose?: number | false;
};

function mapOptions(options?: AppToastOptions, isRender = false): ToastOptions {
  const { id, duration, autoClose, icon, ...rest } = options ?? {};
  const mapped: ToastOptions = { ...rest };
  if (icon !== undefined) mapped.icon = icon as ToastOptions['icon'];
  if (id !== undefined) mapped.toastId = id;
  if (duration !== undefined) mapped.autoClose = Number.isFinite(duration) ? duration : false;
  else if (autoClose !== undefined) mapped.autoClose = autoClose;
  // Aviso com botões não pode fechar ao clicar no corpo.
  if (isRender && mapped.closeOnClick === undefined) mapped.closeOnClick = false;
  return mapped;
}

function mapContent(message: ToastMessage): ReactNode | ((props: ToastContentProps) => ReactNode) {
  if (typeof message !== 'function') return message;
  return (props: ToastContentProps) =>
    message({ id: props.toastProps.toastId as Id, dismiss: () => props.closeToast?.() });
}

function show(type: ToastType, message: ToastMessage, options?: AppToastOptions): Id {
  const opts = mapOptions(options, typeof message === 'function');
  const content = mapContent(message);

  if (opts.toastId !== undefined && base.isActive(opts.toastId)) {
    base.update(opts.toastId, { ...opts, render: content as never, type });
    return opts.toastId;
  }
  return type === 'default' ? base(content as never, opts) : base[type](content as never, opts);
}

type ShowFn = (message: ToastMessage, options?: AppToastOptions) => Id;

const toastFn = ((message: ToastMessage, options?: AppToastOptions) => show('default', message, options)) as ShowFn;

export const toast = Object.assign(toastFn, {
  success: ((message, options) => show('success', message, options)) as ShowFn,
  error: ((message, options) => show('error', message, options)) as ShowFn,
  info: ((message, options) => show('info', message, options)) as ShowFn,
  warn: ((message, options) => show('warning', message, options)) as ShowFn,
  warning: ((message, options) => show('warning', message, options)) as ShowFn,
  loading: ((message, options) => base.loading(mapContent(message) as never, mapOptions(options))) as ShowFn,
  dismiss: (id?: Id) => base.dismiss(id),
  isActive: (id: Id) => base.isActive(id),
});

export default toast;
