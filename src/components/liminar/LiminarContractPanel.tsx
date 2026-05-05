import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  MoreVertical,
  Plus,
  RefreshCw,
  Scale,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useLiminarContract } from '../../hooks/useLiminarContract';
import liminarContractService from '../../services/liminarContractService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import CreateLiminarModal from './CreateLiminarModal';
import CreatePlanModal from './CreatePlanModal';
import PlanView from './PlanView';

interface Doctor { _id: string; fullName: string; }
interface Props { patientId: string; doctors: Doctor[]; createTrigger?: number; }

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estimateGeneration(plan: any, weeks: number) {
  let sessions = 0, cost = 0;
  for (const config of Object.values(plan.therapies ?? {}) as any[]) {
    const slotsPerWeek = (config.slots ?? []).length;
    sessions += slotsPerWeek * weeks;
    cost += slotsPerWeek * weeks * (config.sessionValue ?? 0);
  }
  return { sessions, cost };
}

type ConfirmState = { open: true; weeks: 4 | 8; sessions: number; cost: number } | { open: false };

export default function LiminarContractPanel({ patientId, doctors, createTrigger }: Props) {
  const { contract, plan, committed, loading, error, fetchData, generateSessions, recharge } =
    useLiminarContract(patientId);

  const [showCreateContract, setShowCreateContract] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [generating, setGenerating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Recharge modal
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeReason, setRechargeReason] = useState('');
  const [rechargingLoading, setRechargingLoading] = useState(false);

  // Plan expanded
  const [planExpanded, setPlanExpanded] = useState(false);

  // Specialty sessions modal
  const [specialtyModal, setSpecialtyModal] = useState<{ open: boolean; specialty: string; sessions: any[]; loading: boolean }>({
    open: false, specialty: '', sessions: [], loading: false,
  });

  useEffect(() => {
    if (createTrigger && createTrigger > 0) setShowCreateContract(true);
  }, [createTrigger]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function openSpecialtyModal(specialty: string) {
    if (!contract) return;
    setSpecialtyModal({ open: true, specialty, sessions: [], loading: true });
    try {
      const sessions = await liminarContractService.getSessions(contract._id, { specialty, status: 'scheduled' });
      setSpecialtyModal((prev) => ({ ...prev, sessions, loading: false }));
    } catch {
      toast.error('Erro ao carregar sessões');
      setSpecialtyModal((prev) => ({ ...prev, loading: false }));
    }
  }

  function openConfirm(weeks: 4 | 8) {
    if (!plan) return;
    const { sessions, cost } = estimateGeneration(plan, weeks);
    setConfirm({ open: true, weeks, sessions, cost });
  }

  async function handleConfirmGenerate() {
    if (!confirm.open) return;
    setGenerating(true);
    setConfirm({ open: false });
    try {
      const res = await generateSessions(confirm.weeks);
      toast.success(`✅ ${res.created} sessões criadas  |  ⏭ ${res.skipped} já existiam  |  💰 R$ ${fmt(res.totalCost)} consumidos`);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? err?.message ?? 'Erro ao gerar sessões');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    setRechargingLoading(true);
    try {
      await recharge(amount, rechargeReason || undefined);
      toast.success(`Crédito de R$ ${fmt(amount)} adicionado!`);
      setShowRecharge(false);
      setRechargeAmount('');
      setRechargeReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao adicionar crédito');
    } finally {
      setRechargingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="medium" />
        <span className="ml-3 text-slate-500 text-sm font-medium">Carregando liminar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-5 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
        <span className="text-sm text-rose-700 font-medium">{error}</span>
        <button onClick={fetchData} className="ml-auto text-xs text-rose-600 underline font-medium">
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── SEM CONTRATO ──────────────────────────────────────────────
  if (!contract) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCreateContract(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Nova Liminar
          </button>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/60 rounded-3xl p-10 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-7 h-7 text-amber-600" />
          </div>
          <p className="text-slate-600 text-sm mb-5 font-medium">Nenhum contrato liminar cadastrado.</p>
          <button
            onClick={() => setShowCreateContract(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Criar Liminar
          </button>
        </div>
        {showCreateContract && (
          <CreateLiminarModal patientId={patientId} doctors={doctors}
            onClose={() => setShowCreateContract(false)}
            onCreated={() => { setShowCreateContract(false); fetchData(); }} />
        )}
      </>
    );
  }

  // ── COM CONTRATO ──────────────────────────────────────────────
  const available = committed?.available ?? contract.creditBalance;
  const balancePct = contract.totalCredit > 0
    ? Math.max(0, Math.min(100, (available / contract.totalCredit) * 100))
    : 0;
  const barColor = balancePct > 50 ? '#2E7A5E' : balancePct > 20 ? '#ED6C02' : '#C75146';
  const statusLabel = contract.status === 'active' ? 'Ativo' : contract.status === 'exhausted' ? 'Esgotado' : 'Cancelado';
  const statusColor = contract.status === 'active'
    ? { text: '#2E7A5E', bg: '#EFF9F6', border: '#C6E6DA' }
    : contract.status === 'exhausted'
      ? { text: '#C75146', bg: '#FDECEA', border: '#F5C6C2' }
      : { text: '#8A99B0', bg: '#F1F5F9', border: '#DDE4EE' };

  return (
    <>
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-700 text-slate-700 uppercase tracking-wider" style={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', color: '#1A2C3E' }}>
          Contratos Liminares
        </h2>
        <button
          onClick={() => setShowCreateContract(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Nova Liminar
        </button>
      </div>

      {/* Grid de cards — mesmo estilo do convênio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">

        {/* ── Card do Contrato ── */}
        <div
          className="relative rounded-3xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
          style={{
            background: '#FFFFFF',
            border: '1px solid #EDF2F7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {/* Barra superior gradiente âmbar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #D97706aa, #D97706)' }} />

          <div className="p-5 pt-6">
            {/* Header do card */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" style={{ color: '#D97706' }} />
                <span className="font-bold text-sm" style={{ color: '#1A2C3E' }}>Contrato Liminar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg border"
                  style={{ color: statusColor.text, background: statusColor.bg, borderColor: statusColor.border }}
                >
                  {statusLabel}
                </span>
                {/* Menu três pontos */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="p-1 rounded-full transition-all"
                    style={{ color: '#A0AABF' }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-0 z-20 rounded-2xl shadow-xl py-1 min-w-max"
                      style={{ top: '110%', background: '#fff', border: '1px solid #EDF2F7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    >
                      <button
                        onClick={() => { setMenuOpen(false); setShowRecharge(true); }}
                        className="flex items-center gap-2 w-full text-left text-xs font-medium px-4 py-2 hover:bg-slate-50 transition-colors"
                        style={{ color: '#1A2C3E' }}
                      >
                        <DollarSign className="w-3.5 h-3.5" style={{ color: '#D97706' }} /> Adicionar crédito
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); fetchData(); }}
                        className="flex items-center gap-2 w-full text-left text-xs font-medium px-4 py-2 hover:bg-slate-50 transition-colors"
                        style={{ color: '#1A2C3E' }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" style={{ color: '#5B6E8C' }} /> Atualizar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Processo / Vara */}
            {contract.processNumber && (
              <div className="text-xs mb-3 px-3 py-1.5 rounded-xl" style={{ background: '#F8FAFE', border: '1px solid #EDF2F7', color: '#5B6E8C' }}>
                <span className="font-semibold">Proc.:</span> {contract.processNumber}
                {contract.court && <span> — {contract.court}</span>}
              </div>
            )}

            {/* Grid créditos */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-2xl p-3" style={{ background: '#F8FAFE' }}>
                <span className="block text-xs font-medium mb-1" style={{ color: '#5B6E8C' }}>Disponível</span>
                <span className="font-bold text-base" style={{ color: available >= 0 ? '#2E7A5E' : '#C75146' }}>
                  R$ {fmt(available)}
                </span>
              </div>
              <div className="rounded-2xl p-3" style={{ background: '#F8FAFE' }}>
                <span className="block text-xs font-medium mb-1" style={{ color: '#5B6E8C' }}>Total</span>
                <span className="font-bold text-base" style={{ color: '#1A2C3E' }}>R$ {fmt(contract.totalCredit)}</span>
              </div>
            </div>

            {/* Linha Utilizado + Comprometido */}
            <div className="flex justify-between text-xs mb-3" style={{ color: '#8A99B0' }}>
              <span>Utilizado: <b style={{ color: '#1A2C3E' }}>R$ {fmt(contract.usedCredit)}</b></span>
              <span>Comprom.: <b style={{ color: '#ED6C02' }}>R$ {fmt(committed?.committed ?? 0)}</b></span>
            </div>

            {/* Barra de progresso */}
            <div className="w-full rounded-full overflow-hidden mb-1" style={{ height: 6, background: '#E9EEF2' }}>
              <div style={{ width: `${balancePct}%`, height: '100%', background: barColor, borderRadius: 9999, transition: 'width 0.5s' }} />
            </div>
            <div className="text-right text-xs" style={{ color: '#8A99B0' }}>{balancePct.toFixed(0)}% disponível</div>
          </div>
        </div>

        {/* ── Card do Plano Terapêutico ── */}
        <div
          className="relative rounded-3xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
          style={{ background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #2E7A5Eaa, #2E7A5E)' }} />

          <div className="p-5 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: '#2E7A5E' }} />
                <span className="font-bold text-sm" style={{ color: '#1A2C3E' }}>
                  {plan ? `Plano Ativo (v${plan.version})` : 'Plano Terapêutico'}
                </span>
              </div>
              <button
                onClick={() => setShowCreatePlan(true)}
                className="text-xs font-semibold px-3 py-1 rounded-full border transition-all"
                style={{ color: '#2E7A5E', borderColor: '#C6E6DA', background: '#EFF9F6' }}
              >
                <Plus className="w-3 h-3 inline mr-1" />
                {plan ? 'Nova versão' : 'Criar plano'}
              </button>
            </div>

            {plan ? (
              <>
                <div
                  className="cursor-pointer"
                  onClick={() => setPlanExpanded(v => !v)}
                >
                  {/* Resumo das terapias do plano */}
                  <div className="space-y-1.5 mb-3">
                    {Object.entries(plan.therapies ?? {}).map(([specialty, config]: [string, any]) => (
                      <div key={specialty} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl" style={{ background: '#F8FAFE' }}>
                        <span className="font-medium capitalize" style={{ color: '#1A2C3E' }}>
                          {specialty.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: '#5B6E8C' }}>
                          {(config.slots ?? []).length}×/sem · R$ {fmt(config.sessionValue ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-center" style={{ color: '#A0AABF' }}>
                    {planExpanded ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
                  </div>
                </div>

                {planExpanded && (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: '#EDF2F7' }}>
                    <PlanView plan={plan} onSpecialtyClick={openSpecialtyModal} />
                  </div>
                )}

                {/* Gerar sessões inline */}
                {contract.status === 'active' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openConfirm(4)}
                      disabled={generating}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1B4D6E 0%, #2563EB 100%)' }}
                    >
                      {generating ? '...' : <><Zap className="w-3 h-3 inline mr-1" />4 semanas</>}
                    </button>
                    <button
                      onClick={() => openConfirm(8)}
                      disabled={generating}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)' }}
                    >
                      {generating ? '...' : <><Zap className="w-3 h-3 inline mr-1" />8 semanas</>}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 rounded-xl" style={{ background: '#F8FAFE' }}>
                <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: '#A0AABF' }} />
                <p className="text-xs italic" style={{ color: '#8A99B0' }}>
                  Nenhum plano ativo. Crie um plano para gerar sessões.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Adicionar Crédito ── */}
      {showRecharge && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Adicionar crédito</h3>
              <button onClick={() => setShowRecharge(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecharge} className="space-y-3">
              <input
                type="text" inputMode="decimal" placeholder="Valor (R$)"
                value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-slate-50"
                required
              />
              <input
                type="text" placeholder="Motivo (opcional)"
                value={rechargeReason} onChange={(e) => setRechargeReason(e.target.value)}
                className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-slate-50"
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowRecharge(false)}
                  className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={rechargingLoading}
                  className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
                  {rechargingLoading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmação geração ── */}
      {confirm.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Confirmar geração</h3>
                <p className="text-xs text-slate-500">{confirm.weeks} semanas a partir de hoje</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-4 border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sessões estimadas:</span>
                <span className="font-semibold text-slate-800">{confirm.sessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custo estimado:</span>
                <span className="font-semibold text-amber-700">R$ {fmt(confirm.cost)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-500">Saldo após (est.):</span>
                <span className={`font-bold ${contract.creditBalance - confirm.cost >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  R$ {fmt(contract.creditBalance - confirm.cost)}
                </span>
              </div>
            </div>
            {contract.creditBalance < confirm.cost && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Saldo pode ser insuficiente. As sessões serão criadas e o crédito gerenciado conforme realização.</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirm({ open: false })}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleConfirmGenerate}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1B4D6E 0%, #2563EB 100%)' }}>
                <CheckCircle className="w-4 h-4" /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatePlan && contract && (
        <CreatePlanModal contractId={contract._id}
          onClose={() => setShowCreatePlan(false)}
          onCreated={() => { setShowCreatePlan(false); fetchData(); }} />
      )}

      {showCreateContract && (
        <CreateLiminarModal patientId={patientId} doctors={doctors}
          onClose={() => setShowCreateContract(false)}
          onCreated={() => { setShowCreateContract(false); fetchData(); }} />
      )}

      {/* ── Modal sessões por especialidade ── */}
      {specialtyModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Sessões — {specialtyModal.specialty}</h3>
              <button onClick={() => setSpecialtyModal((p) => ({ ...p, open: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {specialtyModal.loading ? (
                <div className="flex justify-center py-10"><LoadingSpinner size="medium" /></div>
              ) : specialtyModal.sessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">Nenhuma sessão agendada.</p>
              ) : (
                <div className="space-y-2">
                  {specialtyModal.sessions.map((s: any) => (
                    <div key={s._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.operationalStatus === 'completed' ? 'bg-emerald-500' : s.operationalStatus === 'confirmed' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(s.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {s.time}
                          </p>
                          <p className="text-xs text-slate-500">R$ {fmt(s.sessionValue)} — {s.operationalStatus === 'completed' ? 'Concluída' : s.operationalStatus === 'confirmed' ? 'Confirmada' : 'Agendada'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
