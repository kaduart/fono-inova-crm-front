import React, { useState } from 'react';
import { Appointment } from '../../../hooks/useTempAppointments';
import API from '../../../services/api';

interface NeuropedFormData {
  seizureFrequency: number;
  sensoryProfile: {
    auditory: 'normal' | 'hypersensitive' | 'hyposensitive';
    visual: 'normal' | 'hypersensitive' | 'hyposensitive';
  };
  developmentalMilestones: Array<{
    domain: string;
    milestone: string;
    status: 'achieved' | 'delayed' | 'regressed';
  }>;
}

interface NeuropedEvolutionFormProps {
  appointment: Appointment;
}

const NeuropedEvolutionForm: React.FC<NeuropedEvolutionFormProps> = ({ appointment }) => {
  const [formData, setFormData] = useState<NeuropedFormData>({
    seizureFrequency: 0,
    sensoryProfile: {
      auditory: 'normal',
      visual: 'normal'
    },
    developmentalMilestones: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Primeiro cria a evolução base
      const evolutionRes = await API.post<{ id: string }>('/evolutions', {
        appointmentId: appointment.id,
        specialty: 'neuroped',
        content: formData
      });
      
      // Depois cria a avaliação neuropediátrica detalhada
      await API.post(`/evolutions/${evolutionRes.data.id}/neuroped-assessment`, formData);
      
      alert('Avaliação neuropediátrica salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      alert('Ocorreu um erro ao salvar a avaliação. Tente novamente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('sensoryProfile.')) {
      const field = name.split('.')[1] as keyof NeuropedFormData['sensoryProfile'];
      setFormData(prev => ({
        ...prev,
        sensoryProfile: {
          ...prev.sensoryProfile,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'seizureFrequency' ? parseInt(value) || 0 : value
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-blue-700 border-b pb-2">Avaliação Neuropediátrica</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Frequência de crises (última semana)
          </label>
          <input
            type="number"
            name="seizureFrequency"
            value={formData.seizureFrequency}
            onChange={handleInputChange}
            min="0"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Perfil Sensorial - Auditivo
          </label>
          <select
            name="sensoryProfile.auditory"
            value={formData.sensoryProfile.auditory}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="hypersensitive">Hipersensível</option>
            <option value="hyposensitive">Hiposensível</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Perfil Sensorial - Visual
          </label>
          <select
            name="sensoryProfile.visual"
            value={formData.sensoryProfile.visual}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="hypersensitive">Hipersensível</option>
            <option value="hyposensitive">Hiposensível</option>
          </select>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">Marcos do Desenvolvimento</h3>
        {/* Implementar campos para marcos do desenvolvimento aqui */}
        <p className="text-gray-500 italic">Funcionalidade em desenvolvimento</p>
      </div>
      
      <div className="mt-8">
        <button 
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          Salvar Avaliação
        </button>
      </div>
    </form>
  );
};

export default NeuropedEvolutionForm;