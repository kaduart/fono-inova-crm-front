// src/components/patients/PatientFormV2.tsx
/**
 * PatientForm V2 - Exemplo de uso do CQRS
 * 
 * Features:
 * - UI Otimista (aparece na lista antes de confirmar)
 * - Estados de loading granulares
 * - Feedback visual de progresso
 * - Fallback automático para V1
 */

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useCreatePatient, useUpdatePatient } from '../../hooks/usePatientV2';
import { IPatient } from '../../utils/types/types';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface PatientFormV2Props {
  patient?: IPatient; // se fornecido, modo edição
  onSuccess?: (patient: IPatient) => void;
  onCancel?: () => void;
}

export const PatientFormV2: React.FC<PatientFormV2Props> = ({
  patient,
  onSuccess,
  onCancel
}) => {
  const isEditing = !!patient;
  
  const [formData, setFormData] = useState<Partial<IPatient>>({
    fullName: patient?.fullName || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    dateOfBirth: patient?.dateOfBirth || '',
    cpf: patient?.cpf || '',
    gender: patient?.gender || '',
    mainComplaint: patient?.mainComplaint || ''
  });
  
  const createMutation = useCreatePatient({
    onSuccess: (newPatient) => {
      toast.success(`Paciente ${newPatient.fullName} criado!`);
      onSuccess?.(newPatient);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });
  
  const updateMutation = useUpdatePatient({
    onSuccess: (updatedPatient) => {
      toast.success(`Paciente ${updatedPatient.fullName} atualizado!`);
      onSuccess?.(updatedPatient);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });
  
  const isLoading = createMutation.isCreating || updateMutation.isUpdating;
  const progress = createMutation.progress;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.dateOfBirth) {
      toast.error('Nome e data de nascimento são obrigatórios');
      return;
    }
    
    if (isEditing && patient) {
      await updateMutation.updatePatientAsync({
        id: patient._id,
        data: formData
      });
    } else {
      await createMutation.createPatientAsync(formData as IPatient);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Renderiza indicador de progresso do polling
  const renderProgress = () => {
    if (!progress) return null;
    
    const statusMessages: Record<string, string> = {
      'pending': 'Enfileirado...',
      'processing': 'Processando...',
      'completed': 'Concluído!',
      'failed': 'Falhou'
    };
    
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{statusMessages[progress.status] || progress.status}</span>
        <span className="text-xs text-gray-500">(tentativa {progress.attempt})</span>
      </div>
    );
  };
  
  // Renderiza preview do paciente sendo criado (UI Otimista)
  const renderOptimisticPreview = () => {
    if (!createMutation.creatingPatient) return null;
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium">Criando paciente...</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          {createMutation.creatingPatient.fullName}
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          O paciente já aparece na lista. Aguardando confirmação do servidor.
        </p>
      </div>
    );
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preview UI Otimista */}
      {renderOptimisticPreview()}
      
      {/* Progresso do Polling */}
      {renderProgress()}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nome do paciente"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Nascimento *
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="(11) 99999-9999"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="email@exemplo.com"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF
          </label>
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="123.456.789-00"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gênero
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">Selecione</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="O">Outro</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Queixa Principal
        </label>
        <textarea
          name="mainComplaint"
          value={formData.mainComplaint}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Descreva a queixa principal do paciente"
          disabled={isLoading}
        />
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isEditing ? 'Atualizando...' : 'Criando...'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {isEditing ? 'Atualizar' : 'Criar Paciente'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PatientFormV2;
