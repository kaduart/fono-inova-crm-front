import { Scale, X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5" />
            <h2 className="text-lg font-bold">Criar Contrato Liminar</h2>
          </div>
          <button onClick={onClose} className="hover:text-amber-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profissional responsável *
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-sm"
              required
            >
              <option value="">Selecione o profissional</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor total do crédito (R$) *
            </label>
            <InputCurrency
              value={totalCredit}
              onChange={(e) => setTotalCredit(Number(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
            />
            <p className="text-xs text-amber-600 mt-1">
              Valor total liberado pela decisão judicial.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do processo
            </label>
            <input
              type="text"
              value={processNumber}
              onChange={(e) => setProcessNumber(e.target.value)}
              placeholder="Ex: 1234567-89.2026.8.01.0000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vara / Cartório
            </label>
            <input
              type="text"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="Ex: 1ª Vara Cível de Anápolis"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-all ${
                isValid && !loading
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
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
