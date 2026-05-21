// src/components/mkt/leads/OperationalView.tsx
import { Calendar, ChevronRight, MessageCircle, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import Skeleton from '../../ui/Skeleton';

export interface NewFollowupPayload {
  name: string;
  phone: string;
  origin: string;
  pipeline: string;
  nextActionAt: string;
  followupReason: string;
  nextActionNote: string;
}

function NewFollowupModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (p: NewFollowupPayload) => Promise<void>;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<NewFollowupPayload>({
    name: '',
    phone: '',
    origin: 'WhatsApp',
    pipeline: 'novo_contato',
    nextActionAt: todayStr,
    followupReason: 'nenhuma',
    nextActionNote: '',
  });
  const [loading, setLoading] = useState(false);

  const canSubmit = form.name.trim() && form.phone.replace(/\D/g, '').length >= 10;

  const set = (k: keyof NewFollowupPayload, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit({ ...form, phone: form.phone.replace(/\D/g, '') });
      onClose();
    } catch {
      // erro já tratado pelo caller (toast) — modal permanece aberto
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 rounded-t-2xl text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Novo acompanhamento</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Adicionar à fila operacional</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-slate-600">Nome*</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-slate-600">Telefone* (com DDD)</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="62 9XXXX-XXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Origem</label>
              <select
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                value={form.origin}
                onChange={e => set('origin', e.target.value)}
              >
                <option>WhatsApp</option>
                <option>Indicação</option>
                <option>Ligação</option>
                <option>Site</option>
                <option>Instagram</option>
                <option>Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Pipeline</label>
              <select
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                value={form.pipeline}
                onChange={e => set('pipeline', e.target.value)}
              >
                {Object.entries(PIPELINE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Retornar em</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                value={form.nextActionAt}
                onChange={e => set('nextActionAt', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Motivo</label>
              <select
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                value={form.followupReason}
                onChange={e => set('followupReason', e.target.value)}
              >
                {Object.entries(FOLLOWUP_REASON_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Observação</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              value={form.nextActionNote}
              onChange={e => set('nextActionNote', e.target.value)}
              placeholder="Ex: vai falar com o marido, ligar quinta"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Adicionar à fila'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PIPELINE_LABELS: Record<string, string> = {
  novo_contato: 'Novo contato',
  aguardando_resposta: 'Aguardando resposta',
  interessado: 'Interessado',
  aguardando_decisao: 'Aguardando decisão',
  retornar_depois: 'Retornar depois',
  agendado: 'Agendado',
  nao_fechou: 'Não fechou',
  virou_paciente: 'Virou paciente',
};

const PIPELINE_COLORS: Record<string, string> = {
  novo_contato: 'bg-blue-100 text-blue-800',
  aguardando_resposta: 'bg-yellow-100 text-yellow-800',
  interessado: 'bg-emerald-100 text-emerald-800',
  aguardando_decisao: 'bg-orange-100 text-orange-800',
  retornar_depois: 'bg-purple-100 text-purple-800',
  agendado: 'bg-teal-100 text-teal-800',
  nao_fechou: 'bg-red-100 text-red-800',
  virou_paciente: 'bg-green-100 text-green-800',
};

const FOLLOWUP_REASON_LABELS: Record<string, string> = {
  retornar_whatsapp: 'Retornar WhatsApp',
  retornar_telefone: 'Retornar telefone',
  aguardar_resposta_paciente: 'Aguardar resposta',
  aguardando_decisao_familia: 'Dec. família',
  aguardando_documentacao: 'Aguardando docs',
  enviar_proposta: 'Enviar proposta',
  confirmar_agendamento: 'Confirmar agend.',
  nenhuma: '—',
};

function normalizeLeadOperational(lead: any) {
  const op = lead?.operational ?? {};
  const raw = op.nextActionAt;
  const parsed = raw ? new Date(raw) : null;
  const nextActionAt = parsed && !isNaN(parsed.getTime()) ? parsed : null;
  // phone: operational.phone (leads manuais) com fallback para contact.phone (leads Amanda)
  const phone = op.phone || lead?.contact?.phone || lead?.phone || null;
  return {
    pipeline: op.pipeline || 'novo_contato',
    nextActionAt,
    followupReason: op.followupReason || 'nenhuma',
    nextActionNote: op.nextActionNote ?? '',
    lastHumanContactAt: op.lastHumanContactAt ? new Date(op.lastHumanContactAt) : null,
    phone,
  };
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function getOverdueDays(lead: any): number {
  const { nextActionAt } = normalizeLeadOperational(lead);
  if (!nextActionAt) return 0;
  const target = toDateOnly(nextActionAt);
  const today = toDateOnly(new Date());
  if (target >= today) return 0;
  return Math.floor((today - target) / (1000 * 60 * 60 * 24));
}

type Urgency = 'atrasado' | 'hoje' | 'proximo' | 'sem_acao';

function classifyLead(lead: any): Urgency {
  const { nextActionAt } = normalizeLeadOperational(lead);
  if (!nextActionAt) return 'sem_acao';
  const target = toDateOnly(nextActionAt);
  const today = toDateOnly(new Date());
  if (target < today) return 'atrasado';
  if (target === today) return 'hoje';
  return 'proximo';
}

// Severity 0 = mais urgente
function getSeverity(lead: any): number {
  const days = getOverdueDays(lead);
  if (days >= 7) return 0;
  if (days >= 3) return 1;
  if (days >= 1) return 2;
  const c = classifyLead(lead);
  if (c === 'hoje') return 3;
  if (c === 'proximo') return 4;
  return 5; // sem_acao
}

interface OperationalViewProps {
  leads: any[];
  loading: boolean;
  onUpdateLead: (leadId: string, fields: Record<string, any>) => Promise<void>;
  onOpenTimeline: (lead: any) => void;
  onCreateNew: (payload: NewFollowupPayload) => Promise<void>;
}

export const OperationalView: React.FC<OperationalViewProps> = ({
  leads,
  loading,
  onUpdateLead,
  onOpenTimeline,
  onCreateNew,
}) => {
  const [editingNote, setEditingNote] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'atrasado' | '7d' | 'hoje' | 'sem_acao'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const safeleads = leads || [];

  const sorted = [...safeleads].sort((a, b) => {
    const sa = getSeverity(a);
    const sb = getSeverity(b);
    if (sa !== sb) return sa - sb;
    const da = normalizeLeadOperational(a).nextActionAt?.getTime() ?? Infinity;
    const db = normalizeLeadOperational(b).nextActionAt?.getTime() ?? Infinity;
    return da - db;
  });

  const overdueCount  = safeleads.filter(l => classifyLead(l) === 'atrasado').length;
  const plus3Count    = safeleads.filter(l => getOverdueDays(l) >= 3).length;
  const plus7Count    = safeleads.filter(l => getOverdueDays(l) >= 7).length;
  const noActionCount = safeleads.filter(l => normalizeLeadOperational(l).nextActionAt === null).length;
  const todayCount    = safeleads.filter(l => classifyLead(l) === 'hoje').length;

  const filtered = sorted.filter(lead => {
    if (urgencyFilter !== 'all') {
      const c = classifyLead(lead);
      const days = getOverdueDays(lead);
      if (urgencyFilter === 'atrasado' && c !== 'atrasado') return false;
      if (urgencyFilter === '7d' && days < 7) return false;
      if (urgencyFilter === 'hoje' && c !== 'hoje') return false;
      if (urgencyFilter === 'sem_acao' && c !== 'sem_acao') return false;
    }
    if (reasonFilter !== 'all' && lead.operational?.followupReason !== reasonFilter) return false;
    return true;
  });

  const saveNote = async (lead: any) => {
    const note = editingNote[lead._id];
    if (note === undefined) return;
    if (note === (lead.operational?.nextActionNote ?? '')) return;
    setSavingId(lead._id);
    try {
      await onUpdateLead(lead._id, { nextActionNote: note });
    } finally {
      setSavingId(null);
    }
  };

  const handleFieldUpdate = async (lead: any, field: string, value: any) => {
    await onUpdateLead(lead._id, { [field]: value });
  };

  const urgencyBadge = (lead: any) => {
    const c = classifyLead(lead);
    const days = getOverdueDays(lead);
    const { nextActionAt } = normalizeLeadOperational(lead);
    const dateStr = nextActionAt
      ? nextActionAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : null;

    if (days >= 7)
      return <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-full">🚨 {days}d atrasado</span>;
    if (days >= 3)
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">⚠️ {days}d atrasado</span>;
    if (days >= 1)
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">🔴 {days}d atrasado</span>;
    if (c === 'hoje')
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">🟡 Hoje</span>;
    if (c === 'proximo')
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">🟢 {dateStr}</span>;
    return <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">👻 Sem ação</span>;
  };

  return (
    <div className="space-y-5">
      {/* HEADER COM BOTÃO */}
      <div className="flex items-center justify-between">
        <div /> {/* spacer */}
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={16} />
          Novo acompanhamento
        </button>
      </div>

      {/* HEALTH CARDS — diagnóstico de saúde comercial */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🟡</span>
          <div>
            <div className="text-2xl font-bold text-amber-700">{todayCount}</div>
            <div className="text-xs font-medium text-amber-600">Contatar hoje</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
            <div className="text-xs font-medium text-red-600">Atrasados</div>
          </div>
        </div>
        <div className={`border rounded-2xl p-4 flex items-center gap-3 ${plus3Count > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-2xl">⚠️</span>
          <div>
            <div className={`text-2xl font-bold ${plus3Count > 0 ? 'text-orange-700' : 'text-slate-500'}`}>{plus3Count}</div>
            <div className={`text-xs font-medium ${plus3Count > 0 ? 'text-orange-600' : 'text-slate-400'}`}>Há 3+ dias</div>
          </div>
        </div>
        <div className={`border rounded-2xl p-4 flex items-center gap-3 ${plus7Count > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-2xl">🚨</span>
          <div>
            <div className={`text-2xl font-bold ${plus7Count > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{plus7Count}</div>
            <div className={`text-xs font-medium ${plus7Count > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Há 7+ dias</div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">👻</span>
          <div>
            <div className="text-2xl font-bold text-slate-500">{noActionCount}</div>
            <div className="text-xs font-medium text-slate-400">Sem ação</div>
          </div>
        </div>
      </div>

      {/* FILTROS SEMÂNTICOS */}
      <div className="space-y-2">
        {/* Linha 1 — urgência */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all',      label: 'Todos',      count: leads.length },
            { key: 'atrasado', label: '🔴 Atrasados', count: overdueCount },
            { key: '7d',       label: '🚨 7+ dias',  count: plus7Count },
            { key: 'hoje',     label: '🟡 Hoje',     count: todayCount },
            { key: 'sem_acao', label: '👻 Sem ação', count: noActionCount },
          ] as { key: typeof urgencyFilter; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setUrgencyFilter(prev => prev === key ? 'all' : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                urgencyFilter === key
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  urgencyFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Linha 2 — motivo */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'aguardando_decisao_familia', label: '👨‍👩‍👧 Dec. família' },
            { key: 'aguardando_documentacao',    label: '📄 Documentação' },
            { key: 'enviar_proposta',            label: '💬 Proposta' },
            { key: 'confirmar_agendamento',      label: '📅 Agendamento' },
            { key: 'retornar_whatsapp',          label: '📱 Retorno WA' },
          ]).map(({ key, label }) => {
            const c = leads.filter(l => l.operational?.followupReason === key).length;
            if (c === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setReasonFilter(prev => prev === key ? 'all' : key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  reasonFilter === key
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  reasonFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>

        {/* Indicador de filtros ativos */}
        {(urgencyFilter !== 'all' || reasonFilter !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Mostrando <strong className="text-slate-700">{filtered.length}</strong> de {safeleads.length} leads</span>
            <button
              onClick={() => { setUrgencyFilter('all'); setReasonFilter('all'); }}
              className="text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* TABELA OPERACIONAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Lead</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Pipeline</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Retornar em</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Motivo</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Observações</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">
                      {urgencyFilter !== 'all' || reasonFilter !== 'all'
                        ? 'Nenhum lead para esse filtro'
                        : 'Nenhum lead para exibir'}
                    </p>
                    {(urgencyFilter !== 'all' || reasonFilter !== 'all') && (
                      <button
                        onClick={() => { setUrgencyFilter('all'); setReasonFilter('all'); }}
                        className="mt-2 text-xs text-emerald-600 hover:underline"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const op = normalizeLeadOperational(lead);
                  const phone = op.phone;
                  const noteVal = editingNote[lead._id] !== undefined
                    ? editingNote[lead._id]
                    : op.nextActionNote;
                  const urgency = classifyLead(lead);

                  return (
                    <tr
                      key={lead._id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        urgency === 'atrasado' ? 'bg-red-50/40' :
                        urgency === 'hoje' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* NOME */}
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="font-medium text-slate-800 truncate max-w-[160px]">
                          {lead.name || 'Sem nome'}
                        </div>
                        {phone && (
                          <div className="text-xs text-slate-400 mt-0.5">{phone}</div>
                        )}
                        <div className="mt-1.5">{urgencyBadge(lead)}</div>
                      </td>

                      {/* PIPELINE */}
                      <td className="px-4 py-3">
                        <select
                          value={op.pipeline}
                          onChange={(e) => handleFieldUpdate(lead, 'pipeline', e.target.value)}
                          className={`text-xs px-2 py-1.5 rounded-lg border-0 font-medium focus:ring-2 focus:ring-emerald-400 cursor-pointer ${PIPELINE_COLORS[op.pipeline] ?? 'bg-slate-100 text-slate-700'}`}
                        >
                          {Object.entries(PIPELINE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>

                      {/* RETORNAR EM */}
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={op.nextActionAt ? op.nextActionAt.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            // "2026-05-21" sem hora = UTC midnight → off-by-one no Brasil
                            const date = v ? new Date(v + 'T12:00:00') : null;
                            handleFieldUpdate(lead, 'nextActionAt', date);
                          }}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none w-[130px]"
                        />
                      </td>

                      {/* MOTIVO */}
                      <td className="px-4 py-3">
                        <select
                          value={op.followupReason}
                          onChange={(e) => handleFieldUpdate(lead, 'followupReason', e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none max-w-[175px]"
                        >
                          {Object.entries(FOLLOWUP_REASON_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>

                      {/* OBSERVAÇÕES — inline edit */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={noteVal}
                          onChange={(e) => setEditingNote(prev => ({ ...prev, [lead._id]: e.target.value }))}
                          onBlur={() => saveNote(lead)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          placeholder="Anotar observação..."
                          disabled={savingId === lead._id}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none w-full min-w-[190px] placeholder-slate-300 disabled:opacity-50"
                        />
                      </td>

                      {/* AÇÕES */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {phone && (
                            <a
                              href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => onOpenTimeline(lead)}
                            className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center transition-colors"
                            title="Timeline"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNewModal && (
        <NewFollowupModal
          onClose={() => setShowNewModal(false)}
          onSubmit={onCreateNew}
        />
      )}
    </div>
  );
};
