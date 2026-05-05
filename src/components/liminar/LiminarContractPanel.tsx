import { AlertTriangle, Plus, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLiminarContracts } from '../../hooks/useLiminarContracts';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import ContractCard from './ContractCard';
import CreateLiminarModal from './CreateLiminarModal';

interface Doctor { _id: string; fullName: string; }
interface Props { patientId: string; doctors: Doctor[]; createTrigger?: number; }

export default function LiminarContractPanel({ patientId, doctors, createTrigger }: Props) {
  const { items, loading, error, fetchData } = useLiminarContracts(patientId);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (createTrigger && createTrigger > 0) setShowCreate(true);
  }, [createTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="medium" />
        <span className="ml-3 text-slate-500 text-sm font-medium">Carregando liminares...</span>
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', color: '#1A2C3E' }}>
          CONTRATOS LIMINARES
          {items.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-semibold" style={{ background: '#FFF7ED', color: '#92400E' }}>
              {items.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Nova Liminar
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/60 rounded-3xl p-10 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-7 h-7 text-amber-600" />
          </div>
          <p className="text-slate-600 text-sm mb-5 font-medium">Nenhum contrato liminar cadastrado.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Criar Liminar
          </button>
        </div>
      ) : (
        /* Grid de cards — 2 por linha, plano dentro de cada um */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ contract, plan, planError, committed }, i) => (
            <ContractCard
              key={contract._id}
              data={{ contract, plan, planError, committed }}
              colorIndex={i}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateLiminarModal
          patientId={patientId}
          doctors={doctors}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}
    </>
  );
}
