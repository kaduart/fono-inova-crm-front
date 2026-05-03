import { Scale, X, User, FileText, Building2, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import liminarContractService from '../../services/liminarContractService';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Doctor {
  _id: string;
  fullName: string;
}

interface Props {
  patientId: string;
  doctors: Doctor[];
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateLiminarModal({ patientId, doctors, onClose, onCreated }: Props) {
  const [doctorId, setDoctorId] = useState('');
  const [totalCredit, setTotalCredit] = useState(0);
  const [processNumber, setProcessNumber] = useState('');
  const [court, setCourt] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = !!doctorId && totalCredit > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await liminarContractService.create({
        patientId,
        doctorId,
        totalCredit,
        processNumber: processNumber || undefined,
        court: court || undefined,
      });
      toast.success('Contrato liminar criado com sucesso!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Header gradiente refinado */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Criar Contrato Liminar</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Profissional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-amber-500" />
              Profissional responsável *
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50/50 text-gray-800 text-sm transition-all hover:bg-white"
              required
            >
              <option value="">Selecione o profissional</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Valor total do crédito */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <DollarSign size={14} className="text-amber-500" />
              Valor total do crédito (R$) *
            </label>
            <InputCurrency
              value={totalCredit}
              onChange={(e) => setTotalCredit(Number(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50/50 text-gray-800 text-sm"
              placeholder="0,00"
            />
            <p className="text-xs text-amber-600/80 mt-1.5 flex items-center gap-1">
              <span>✨</span> Valor total liberado pela decisão judicial.
            </p>
          </div>

          {/* Número do processo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-amber-500" />
              Número do processo
            </label>
            <input
              type="text"
              value={processNumber}
              onChange={(e) => setProcessNumber(e.target.value)}
              placeholder="Ex: 1234567-89.2026.8.01.0000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50/50 text-gray-800 text-sm transition-all"
            />
          </div>

          {/* Vara / Cartório */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Building2 size={14} className="text-amber-500" />
              Vara / Cartório
            </label>
            <input
              type="text"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="Ex: 1ª Vara Cível de Anápolis"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50/50 text-gray-800 text-sm transition-all"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-medium"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 ${
                isValid && !loading
                  ? 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="small" color="border-white" />
                  Salvando...
                </span>
              ) : (
                'Criar Contrato'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}