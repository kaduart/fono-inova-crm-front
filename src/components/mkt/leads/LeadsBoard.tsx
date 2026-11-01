// Quadro de leads (dnd-kit) + gaveta do lead (Vaul).
// Só muda a etapa via onMove → mesmo PATCH que o select da lista já faz
// (operational.pipeline). Nenhum campo novo.
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors, closestCorners,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { ChevronRight, GripVertical, MessageCircle, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from 'vaul';

export type BoardLead = { _id: string; name?: string; operational?: { responsibleName?: string } };

export interface BoardLeadView {
  lead: BoardLead;
  phone: string | null;
  pipeline: string;
  badge: React.ReactNode;
  nextText: string;
  waHref: string | null;
  note: string;
  reasonLabel: string;
  nextActionAt: Date | null;
  late: boolean;
}

const ACTIVE_STAGES = [
  'novo_contato', 'em_atendimento', 'aguardando_clinica', 'aguardando_resposta',
  'interessado', 'aguardando_decisao', 'retornar_depois',
];
const EXIT_STAGES = ['agendado', 'virou_paciente', 'nao_fechou'];

const STAGE_DOT: Record<string, string> = {
  novo_contato: 'bg-blue-500', em_atendimento: 'bg-emerald-500', aguardando_clinica: 'bg-purple-500',
  aguardando_resposta: 'bg-yellow-500', interessado: 'bg-emerald-600', aguardando_decisao: 'bg-orange-500',
  retornar_depois: 'bg-purple-400', agendado: 'bg-teal-500', virou_paciente: 'bg-green-600', nao_fechou: 'bg-red-500',
};

const fmtPhone = (p: string | null) => {
  const d = (p || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
};

function useIsDesktop() {
  const q = '(min-width: 768px)';
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setD(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return d;
}

/* ───────── Card ───────── */
function CardBody({ v, dragging }: { v: BoardLeadView; dragging?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-left ${dragging ? 'shadow-2xl ring-2 ring-emerald-400 rotate-1' : 'shadow-sm'}`}>
      <div className="flex items-start gap-1.5">
        <GripVertical size={14} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{v.lead.name || 'Sem nome'}</div>
          {v.phone && <div className="text-[11px] text-slate-400">{fmtPhone(v.phone)}</div>}
        </div>
      </div>
      <div className="mt-2">{v.badge}</div>
      <div className="mt-2 line-clamp-2 text-xs text-emerald-800 dark:text-emerald-300">→ {v.nextText}</div>
    </div>
  );
}

function DraggableCard({ v, onOpen }: { v: BoardLeadView; onOpen: (v: BoardLeadView) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: v.lead._id, data: v });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(v)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(v); }}
      className={`cursor-grab touch-none active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl ${isDragging ? 'opacity-30' : ''}`}
      aria-label={`${v.lead.name || 'Lead'}: arraste para mudar a etapa ou Enter para abrir`}
    >
      <CardBody v={v} />
    </div>
  );
}

/* ───────── Coluna ───────── */
function Column({ id, label, items, onOpen }: { id: string; label: string; items: BoardLeadView[]; onOpen: (v: BoardLeadView) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const late = items.filter(i => i.late).length;
  return (
    <section
      ref={setNodeRef}
      className={`flex w-[260px] shrink-0 flex-col rounded-2xl border p-2 transition-colors ${isOver ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'}`}
    >
      <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
        <span className={`h-2 w-2 rounded-full ${STAGE_DOT[id] ?? 'bg-slate-400'}`} />
        <h3 className="flex-1 truncate text-left text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</h3>
        {late > 0 && <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700" title="Atrasados nesta etapa">{late}</span>}
        <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">{items.length}</span>
      </header>
      <div className="flex max-h-[60vh] min-h-[80px] flex-col gap-2 overflow-y-auto pr-0.5">
        {items.map(v => <DraggableCard key={v.lead._id} v={v} onOpen={onOpen} />)}
        {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-[11px] text-slate-400 dark:border-slate-700">Solte aqui</div>}
      </div>
    </section>
  );
}

function ExitZone({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const tone = id === 'nao_fechou' ? 'red' : 'teal';
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 rounded-xl border-2 border-dashed px-3 py-3 text-center text-xs font-semibold transition-colors ${
        isOver
          ? tone === 'red' ? 'border-red-400 bg-red-50 text-red-700' : 'border-teal-400 bg-teal-50 text-teal-700'
          : 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400'
      }`}
    >
      {label}
      <div className="text-[10px] font-normal opacity-70">sai da fila</div>
    </div>
  );
}

/* ───────── Gaveta do lead ───────── */
export function LeadSheet({
  v, onClose, labels, onMove, onOpenTimeline,
}: {
  v: BoardLeadView | null;
  onClose: () => void;
  labels: Record<string, string>;
  onMove: (lead: BoardLead, stage: string) => void;
  onOpenTimeline: (lead: BoardLead) => void;
}) {
  const desktop = useIsDesktop();
  return (
    <Drawer.Root open={!!v} onOpenChange={(o) => !o && onClose()} direction={desktop ? 'right' : 'bottom'}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1300] bg-slate-900/40" />
        <Drawer.Content
          className={`fixed z-[1301] flex flex-col bg-white outline-none dark:bg-slate-900 ${
            desktop ? 'bottom-0 right-0 top-0 w-[420px] border-l dark:border-slate-700' : 'bottom-0 left-0 right-0 max-h-[88vh] rounded-t-2xl'
          }`}
        >
          {!desktop && <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300" />}
          {v && (
            <div className="flex flex-col gap-4 overflow-y-auto p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Drawer.Title className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">{v.lead.name || 'Sem nome'}</Drawer.Title>
                  <Drawer.Description className="text-sm text-slate-500">{fmtPhone(v.phone) || 'Sem telefone'}</Drawer.Description>
                </div>
                <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar"><X size={18} /></button>
              </div>

              <div>{v.badge}</div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Próximo passo</div>
                {v.nextText}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[11px] text-slate-400">Retornar em</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{v.nextActionAt ? v.nextActionAt.toLocaleDateString('pt-BR') : '—'}</dd></div>
                <div><dt className="text-[11px] text-slate-400">Motivo</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{v.reasonLabel}</dd></div>
                <div className="col-span-2"><dt className="text-[11px] text-slate-400">Observações</dt><dd className="text-slate-700 dark:text-slate-200">{v.note || '—'}</dd></div>
                {v.lead.operational?.responsibleName && (
                  <div className="col-span-2"><dt className="text-[11px] text-slate-400">Responsável</dt><dd className="text-slate-700 dark:text-slate-200">{v.lead.operational.responsibleName}</dd></div>
                )}
              </dl>

              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-slate-400">Mudar etapa</div>
                <div className="flex flex-wrap gap-1.5">
                  {[...ACTIVE_STAGES, ...EXIT_STAGES].map(s => (
                    <button
                      key={s}
                      onClick={() => { if (s !== v.pipeline) { onMove(v.lead, s); onClose(); } }}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        s === v.pipeline
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >{labels[s] ?? s}</button>
                  ))}
                </div>
              </div>

              <div className="mt-1 flex gap-2">
                {v.waHref && (
                  <a href={v.waHref} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600">
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                )}
                <button onClick={() => { onOpenTimeline(v.lead); onClose(); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Timeline <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* ───────── Quadro ───────── */
export function LeadsBoard({
  items, labels, onMove, onOpen,
}: {
  items: BoardLeadView[];
  labels: Record<string, string>;
  onMove: (lead: BoardLead, stage: string) => void;
  onOpen: (v: BoardLeadView) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [active, setActive] = useState<BoardLeadView | null>(null);

  const byStage = useMemo(() => {
    const m: Record<string, BoardLeadView[]> = {};
    ACTIVE_STAGES.forEach(s => { m[s] = []; });
    items.forEach(v => { (m[v.pipeline] ??= []).push(v); });
    return m;
  }, [items]);

  const onStart = (e: DragStartEvent) => setActive((e.active.data.current as BoardLeadView) ?? null);
  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const v = e.active.data.current as BoardLeadView | undefined;
    const to = e.over?.id as string | undefined;
    if (v && to && to !== v.pipeline) onMove(v.lead, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {ACTIVE_STAGES.map(s => <Column key={s} id={s} label={labels[s] ?? s} items={byStage[s] ?? []} onOpen={onOpen} />)}
      </div>
      <div className={`mt-1 flex gap-2 transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}>
        {EXIT_STAGES.map(s => <ExitZone key={s} id={s} label={labels[s] ?? s} />)}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>{active ? <CardBody v={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
