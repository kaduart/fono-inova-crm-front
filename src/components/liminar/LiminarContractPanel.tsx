import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  Plus,
  RefreshCw,
  Scale,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
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

export default function LiminarContractPanel({ patientId, doctors }: Props) {
  const { contract, plan, loading, error, fetchData, generateSessions, recharge } =
    useLiminarContract(patientId);

  const [showCreateContract, setShowCreateContract] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [generating, setGenerating] = useState(false);

  // Recharge inline form
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeReason, setRechargeReason] = useState('');
  const [rechargingLoading, setRechargingLoading] = useState(false);

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
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="medium" />
        <span className="ml-3 text-gray-500 text-sm">Carregando liminar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-700">{error}</span>
        <button onClick={fetchData} className="ml-auto text-xs text-red-600 underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── SEM CONTRATO ────────────────────────────────────────────────
  if (!contract) {
    return (
      <>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
          <Scale className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm mb-4">Nenhum contrato liminar cadastrado.</p>
          <button
            onClick={() => setShowCreateContract(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium text-sm transition-colors"
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
    : 'bg-red-500';

  return (
    <>
      <div className="space-y-4">
        {/* ── Cabeçalho do contrato ── */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-gray-800">Contrato Liminar</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                contract.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : contract.status === 'exhausted'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {contract.status === 'active' ? 'Ativo' : contract.status === 'exhausted' ? 'Esgotado' : 'Cancelado'}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="text-amber-600 hover:text-amber-800 p-1 rounded"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {contract.processNumber && (
            <p className="text-xs text-gray-500 mb-3">
              Processo: <span className="font-medium text-gray-700">{contract.processNumber}</span>
              {contract.court && <> — {contract.court}</>}
            </p>
          )}

          {/* Barra de crédito */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Crédito total:</span>
              <span className="font-semibold text-gray-800">R$ {fmt(contract.totalCredit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Utilizado:</span>
              <span className="font-medium text-orange-700">R$ {fmt(contract.usedCredit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Restante:</span>
              <span className="font-bold text-emerald-700">R$ {fmt(contract.creditBalance)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all ${balanceColor}`}
                style={{ width: `${balancePct}%` }}
              />
            </div>
          </div>

          {/* Adicionar crédito */}
          {!showRecharge ? (
            <button
              onClick={() => setShowRecharge(true)}
              className="text-xs flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Adicionar crédito
            </button>
          ) : (
            <form onSubmit={handleRecharge} className="mt-3 bg-white border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Adicionar crédito</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor (R$)"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={rechargeReason}
                  onChange={(e) => setRechargeReason(e.target.value)}
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecharge(false)}
                  className="flex-1 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rechargingLoading}
                  className="flex-1 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {rechargingLoading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Plano terapêutico ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-800">
                {plan ? `Plano Ativo (v${plan.version})` : 'Plano Terapêutico'}
              </span>
            </div>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {plan ? 'Nova versão' : 'Criar plano'}
            </button>
          </div>

          {plan ? (
            <PlanView plan={plan} />
          ) : (
            <p className="text-sm text-gray-500 italic text-center py-3">
              Nenhum plano ativo. Crie um plano para poder gerar sessões.
            </p>
          )}
        </div>

        {/* ── Gerar sessões ── */}
        {plan && contract.status === 'active' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-800">Gerar Sessões</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Gera agendamentos futuros com base no plano ativo. Operação idempotente — não duplica sessões já existentes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => openConfirm(4)}
                disabled={generating}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {generating ? <LoadingSpinner size="small" color="border-white" /> : 'Gerar 4 semanas'}
              </button>
              <button
                onClick={() => openConfirm(8)}
                disabled={generating}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {generating ? <LoadingSpinner size="small" color="border-white" /> : 'Gerar 8 semanas'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal confirmação geração ── */}
      {confirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Confirmar geração</h3>
                <p className="text-sm text-gray-500">{confirm.weeks} semanas a partir de hoje</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sessões estimadas:</span>
                <span className="font-semibold text-gray-800">{confirm.sessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Custo estimado:</span>
                <span className="font-semibold text-orange-700">R$ {fmt(confirm.cost)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-600">Saldo após (est.):</span>
                <span className={`font-bold ${
                  contract.creditBalance - confirm.cost >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  R$ {fmt(contract.creditBalance - confirm.cost)}
                </span>
              </div>
            </div>

            {contract.creditBalance < confirm.cost && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Saldo pode ser insuficiente para todo o período. As sessões serão criadas mas o crédito será gerenciado conforme realização.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm({ open: false })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmGenerate}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
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
    </>
  );
}
