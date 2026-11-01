// Confirmação no estilo do app (no lugar do window.confirm cinza do navegador).
// Uso: `if (!(await confirmDialog('Excluir este relatório?', { confirmText: 'Excluir' }))) return;`
// O <ConfirmHost /> fica montado uma vez no App.
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  /** red = ação destrutiva (padrão), green/teal = segura, blue = informativa */
  confirmColor?: 'red' | 'green' | 'blue' | 'teal';
}
interface Req extends ConfirmOptions { message: string; resolve: (ok: boolean) => void }

let push: ((r: Req) => void) | null = null;
const queue: Req[] = [];

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const req = { message, resolve, ...options };
    if (push) push(req); else queue.push(req);
  });
}

const TONE = {
  red: { Icon: AlertTriangle, ring: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300', btn: 'bg-red-600 hover:bg-red-700' },
  teal: { Icon: AlertTriangle, ring: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  green: { Icon: CheckCircle2, ring: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  blue: { Icon: Info, ring: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300', btn: 'bg-blue-600 hover:bg-blue-700' },
};

export default function ConfirmHost() {
  const [cur, setCur] = useState<Req | null>(null);
  const pending = useRef<Req[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    push = (r) => setCur((c) => { if (c) { pending.current.push(r); return c; } return r; });
    while (queue.length) push(queue.shift()!);
    return () => { push = null; };
  }, []);
  useEffect(() => { if (cur) setTimeout(() => okRef.current?.focus(), 0); }, [cur]);

  if (!cur) return null;
  const tone = TONE[cur.confirmColor || 'red'];
  const close = (ok: boolean) => { cur.resolve(ok); setCur(pending.current.shift() || null); };
  // A 1ª linha vira título quando a tela não passou um (mensagens antigas vinham com \n).
  const [first, ...rest] = cur.message.split('\n');
  const title = cur.title || first;
  const body = cur.title ? cur.message : rest.join('\n').trim();

  return (
    <div className="fixed inset-0 z-[100001] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={() => close(false)} onKeyDown={(e) => { if (e.key === 'Escape') close(false); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#161d1b]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.ring}`}><tone.Icon size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            {body && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">{body}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => close(false)}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15">
            {cur.cancelText || 'Cancelar'}
          </button>
          <button ref={okRef} type="button" onClick={() => close(true)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${tone.btn}`}>
            {cur.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
