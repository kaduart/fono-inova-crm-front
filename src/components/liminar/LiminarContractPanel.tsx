import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  Plus,
  RefreshCw,
  Scale,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useLiminarContract } from '../../hooks/useLiminarContract';
import liminarContractService from '../../services/liminarContractService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import CreateLiminarModal from './CreateLiminarModal';
import CreatePlanModal from './CreatePlanModal';
import PlanView from './PlanView';

interface Doctor {
  _id: string;
  fullName: string;
}

interface Props {
  patientId: string;
  doctors: Doctor[];
  createTrigger?: number;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estimateGeneration(plan: any, weeks: number) {
  let sessions = 0;
  let cost = 0;
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

  useEffect(() => {
    if (createTrigger && createTrigger > 0) setShowCreateContract(true);
  }, [createTrigger]);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [generating, setGenerating] = useState(false);

  // Recharge inline form
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeReason, setRechargeReason] = useState('');
  const [rechargingLoading, setRechargingLoading] = useState(false);

  // Specialty sessions modal
  const [specialtyModal, setSpecialtyModal] = useState<{ open: boolean; specialty: string; sessions: any[]; loading: boolean }>({
    open: false,
    specialty: '',
    sessions: [],
    loading: false,
  });

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
      toast.success(
        `✅ ${res.created} sessões criadas  |  ⏭ ${res.skipped} já existiam  |  💰 R$ ${fmt(res.totalCost)} consumidos`
      );
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
      <div className="bg-rose-50/90 backdrop-blur-sm border border-rose-200 rounded-2xl p-5 flex items-center gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
        <span className="text-sm text-rose-700 font-medium">{error}</span>
        <button onClick={fetchData} className="ml-auto text-xs text-rose-600 underline hover:no-underline font-medium transition">
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── SEM CONTRATO ────────────────────────────────────────────────
  if (!contract) {
    return (
      <>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 backdrop-blur-sm border border-amber-200/60 rounded-3xl p-10 text-center shadow-xl">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md">
            <Scale className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-slate-600 text-base mb-6 font-medium">Nenhum contrato liminar cadastrado.</p>
          <button
            onClick={() => setShowCreateContract(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Criar Liminar
          </button>
        </div>

        {showCreateContract && (
          <CreateLiminarModal
            patientId={patientId}
            doctors={doctors}
            onClose={() => setShowCreateContract(false)}
            onCreated={() => { setShowCreateContract(false); fetchData(); }}
          />
        )}
      </>
    );
  }

  // ── COM CONTRATO ────────────────────────────────────────────────
  const balancePct = contract.totalCredit > 0
    ? Math.max(0, Math.min(100, (contract.creditBalance / contract.totalCredit) * 100))
    : 0;

  const balanceColor = balancePct > 50
    ? 'bg-emerald-500'
    : balancePct > 20
    ? 'bg-amber-500'
    : 'bg-rose-500';

  return (
    <>
      <div className="space-y-6">
        {/* ── Cabeçalho do contrato ── */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Scale className="w-5 h-5 text-amber-600" />
              </div>
              <span className="font-bold text-slate-800 text-xl tracking-tight">Contrato Liminar</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                contract.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : contract.status === 'exhausted'
                  ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
              }`}>
                {contract.status === 'active' ? 'Ativo' : contract.status === 'exhausted' ? 'Esgotado' : 'Cancelado'}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="text-amber-500 hover:text-amber-700 p-1.5 rounded-full hover:bg-amber-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {contract.processNumber && (
            <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 mb-5 border border-slate-100">
              <span className="text-xs font-medium text-slate-500">Processo:</span>
              <span className="text-xs text-slate-700 font-medium">{contract.processNumber}</span>
              {contract.court && (
                <>
                  <span className="text-slate-300">—</span>
                  <span className="text-xs text-slate-600">{contract.court}</span>
                </>
              )}
            </div>
          )}

          {/* Barra de crédito */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Crédito total:</span>
              <span className="font-semibold text-slate-800">R$ {fmt(contract.totalCredit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Utilizado:</span>
              <span className="font-medium text-amber-700">R$ {fmt(contract.usedCredit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Comprometido:</span>
              <span className="font-medium text-amber-700">R$ {fmt(committed?.committed ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Disponível real:</span>
              <span className="font-bold text-emerald-700">R$ {fmt(committed?.available ?? contract.creditBalance)}</span>
            </div>
            <div className="w-full bg-slate-200/70 rounded-full h-2.5 mt-2 overflow-hidden shadow-inner">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${balanceColor} shadow-sm`}
                style={{ width: `${balancePct}%` }}
              />
            </div>
          </div>

          {/* Adicionar crédito */}
          {!showRecharge ? (
            <button
              onClick={() => setShowRecharge(true)}
              className="text-xs flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-semibold transition-colors bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Adicionar crédito
            </button>
          ) : (
            <form onSubmit={handleRecharge} className="mt-3 bg-white/90 backdrop-blur-sm border border-amber-200 rounded-xl p-4 space-y-3 shadow-md">
              <p className="text-xs font-semibold text-slate-700">Adicionar crédito</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor (R$)"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="flex-1 p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all bg-slate-50"
                  required
                />
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={rechargeReason}
                  onChange={(e) => setRechargeReason(e.target.value)}
                  className="flex-1 p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all bg-slate-50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecharge(false)}
                  className="flex-1 py-2 text-xs border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rechargingLoading}
                  className="flex-1 py-2 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-sm"
                >
                  {rechargingLoading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Plano terapêutico ── */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-bold text-slate-800 text-xl tracking-tight">
                {plan ? `Plano Ativo (v${plan.version})` : 'Plano Terapêutico'}
              </span>
            </div>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="text-xs flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 font-semibold border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {plan ? 'Nova versão' : 'Criar plano'}
            </button>
          </div>

          {plan ? (
            <PlanView plan={plan} onSpecialtyClick={openSpecialtyModal} />
          ) : (
            <div className="text-center py-8 bg-slate-50/70 rounded-xl">
              <p className="text-sm text-slate-500 italic">
                Nenhum plano ativo. Crie um plano para poder gerar sessões.
              </p>
            </div>
          )}
        </div>

        {/* ── Gerar sessões ── */}
        {plan && contract.status === 'active' && (
          <div className="bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-100 rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="font-bold text-slate-800 text-xl tracking-tight">Gerar Sessões</span>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Gera agendamentos futuros com base no plano ativo. Operação idempotente — não duplica sessões já existentes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => openConfirm(4)}
                disabled={generating}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {generating ? <LoadingSpinner size="small" color="border-white" /> : 'Gerar 4 semanas'}
              </button>
              <button
                onClick={() => openConfirm(8)}
                disabled={generating}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {generating ? <LoadingSpinner size="small" color="border-white" /> : 'Gerar 8 semanas'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal confirmação geração ── */}
      {confirm.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Confirmar geração</h3>
                <p className="text-sm text-slate-500">{confirm.weeks} semanas a partir de hoje</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-5 border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sessões estimadas:</span>
                <span className="font-semibold text-slate-800">{confirm.sessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custo estimado:</span>
                <span className="font-semibold text-amber-700">R$ {fmt(confirm.cost)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-500">Saldo após (est.):</span>
                <span className={`font-bold ${
                  contract.creditBalance - confirm.cost >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  R$ {fmt(contract.creditBalance - confirm.cost)}
                </span>
              </div>
            </div>

            {contract.creditBalance < confirm.cost && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Saldo pode ser insuficiente para todo o período. As sessões serão criadas mas o crédito será gerenciado conforme realização.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm({ open: false })}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmGenerate}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatePlan && contract && (
        <CreatePlanModal
          contractId={contract._id}
          onClose={() => setShowCreatePlan(false)}
          onCreated={() => { setShowCreatePlan(false); fetchData(); }}
        />
      )}

      {showCreateContract && (
        <CreateLiminarModal
          patientId={patientId}
          doctors={doctors}
          onClose={() => setShowCreateContract(false)}
          onCreated={() => { setShowCreateContract(false); fetchData(); }}
        />
      )}

      {/* ── Modal sessões por especialidade ── */}
      {specialtyModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xl">
                Sessões — {specialtyModal.specialty}
              </h3>
              <button
                onClick={() => setSpecialtyModal((p) => ({ ...p, open: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {specialtyModal.loading ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner size="medium" />
                </div>
              ) : specialtyModal.sessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">Nenhuma sessão agendada para esta especialidade.</p>
              ) : (
                <div className="space-y-2">
                  {specialtyModal.sessions.map((s: any) => (
                    <div
                      key={s._id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          s.operationalStatus === 'completed' ? 'bg-emerald-500 shadow-sm' :
                          s.operationalStatus === 'confirmed' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(s.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            {' '}às {s.time}
                          </p>
                          <p className="text-xs text-slate-500">
                            R$ {fmt(s.sessionValue)} — {s.operationalStatus === 'completed' ? 'Concluída' : s.operationalStatus === 'confirmed' ? 'Confirmada' : 'Agendada'}
                          </p>
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