import React, { useState } from 'react';

interface Objective {
  area: string;
  description: string;
  targetScore: number;
  currentScore: number;
  targetDate: string;
  notes?: string;
}

interface Intervention {
  description: string;
  frequency: string;
  responsible: 'therapist' | 'family' | 'school' | 'combined';
  notes?: string;
}

interface TherapeuticPlan {
  protocol?: {
    code: string;
    name: string;
    customNotes?: string;
  };
  objectives: Objective[];
  interventions: Intervention[];
  reviewDate?: string;
}

interface TherapeuticPlanFormProps {
  protocolCode?: string;
  protocolName?: string;
  availableAreas: Array<{ id: string; name: string; score: number }>;
  onSubmit: (plan: TherapeuticPlan) => void;
  initialData?: TherapeuticPlan;
  disabled?: boolean;
}

const TherapeuticPlanForm: React.FC<TherapeuticPlanFormProps> = ({
  protocolCode,
  protocolName,
  availableAreas,
  onSubmit,
  initialData,
  disabled = false
}) => {
  const [customNotes, setCustomNotes] = useState(initialData?.protocol?.customNotes || '');
  const [objectives, setObjectives] = useState<Objective[]>(initialData?.objectives || []);
  const [interventions, setInterventions] = useState<Intervention[]>(initialData?.interventions || []);
  const [reviewDate, setReviewDate] = useState(
    initialData?.reviewDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Estados para novo objetivo
  const [newObjective, setNewObjective] = useState<Partial<Objective>>({
    area: '',
    description: '',
    targetScore: 8,
    currentScore: 0,
    targetDate: '',
    notes: ''
  });

  // Estados para nova intervenção
  const [newIntervention, setNewIntervention] = useState<Partial<Intervention>>({
    description: '',
    frequency: '',
    responsible: 'therapist',
    notes: ''
  });

  const areaLabels: Record<string, string> = {
    language: 'Linguagem',
    motor: 'Motor',
    cognitive: 'Cognitivo',
    behavior: 'Comportamento',
    social: 'Social'
  };

  const addObjective = () => {
    if (!newObjective.area || !newObjective.description || !newObjective.targetDate) {
      alert('Preencha área, descrição e data alvo');
      return;
    }

    const areaData = availableAreas.find(a => a.id === newObjective.area);
    const currentScore = areaData?.score || newObjective.currentScore || 0;

    setObjectives([
      ...objectives,
      {
        ...newObjective,
        currentScore,
        targetScore: newObjective.targetScore || 8,
        targetDate: newObjective.targetDate || ''
      } as Objective
    ]);

    // Reset form
    setNewObjective({
      area: '',
      description: '',
      targetScore: 8,
      currentScore: 0,
      targetDate: '',
      notes: ''
    });
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const addIntervention = () => {
    if (!newIntervention.description || !newIntervention.frequency) {
      alert('Preencha descrição e frequência');
      return;
    }

    setInterventions([
      ...interventions,
      newIntervention as Intervention
    ]);

    // Reset form
    setNewIntervention({
      description: '',
      frequency: '',
      responsible: 'therapist',
      notes: ''
    });
  };

  const removeIntervention = (index: number) => {
    setInterventions(interventions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (objectives.length === 0) {
      alert('Adicione pelo menos um objetivo');
      return;
    }

    const plan: TherapeuticPlan = {
      protocol: protocolCode ? {
        code: protocolCode,
        name: protocolName || '',
        customNotes
      } : undefined,
      objectives,
      interventions,
      reviewDate
    };

    onSubmit(plan);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.round((current / target) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Protocol Custom Notes */}
      {protocolCode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas de Adaptação do Protocolo
          </label>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Ex: Adaptado para rotina familiar, foco em ansiedade social..."
            disabled={disabled}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>
      )}

      {/* Objectives Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Objetivos Terapêuticos
        </h3>

        {/* Existing Objectives */}
        {objectives.length > 0 && (
          <div className="space-y-3 mb-4">
            {objectives.map((obj, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                      {areaLabels[obj.area] || obj.area}
                    </span>
                    <p className="font-medium text-gray-900 mt-1">{obj.description}</p>
                  </div>
                  <button
                    onClick={() => removeObjective(idx)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Atual: {obj.currentScore}</span>
                    <span>Meta: {obj.targetScore}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${calculateProgress(obj.currentScore, obj.targetScore)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Prazo: {new Date(obj.targetDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Objective Form */}
        <div className="space-y-3 bg-blue-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700">Adicionar Objetivo</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Área *</label>
              <select
                value={newObjective.area || ''}
                onChange={(e) => setNewObjective({ ...newObjective, area: e.target.value })}
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione...</option>
                {availableAreas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.name} (atual: {area.score})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Data Alvo *</label>
              <input
                type="date"
                value={newObjective.targetDate || ''}
                onChange={(e) => setNewObjective({ ...newObjective, targetDate: e.target.value })}
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Descrição do Objetivo *</label>
            <input
              type="text"
              value={newObjective.description || ''}
              onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
              placeholder="Ex: Identificar e nomear 5 emoções básicas"
              disabled={disabled}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Score Atual</label>
              <input
                type="number"
                min="0"
                max="10"
                value={newObjective.currentScore || 0}
                onChange={(e) => setNewObjective({ ...newObjective, currentScore: Number(e.target.value) })}
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Score Alvo *</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newObjective.targetScore || 8}
                onChange={(e) => setNewObjective({ ...newObjective, targetScore: Number(e.target.value) })}
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <button
            onClick={addObjective}
            disabled={disabled}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            + Adicionar Objetivo
          </button>
        </div>
      </div>

      {/* Interventions Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Intervenções
        </h3>

        {/* Existing Interventions */}
        {interventions.length > 0 && (
          <div className="space-y-2 mb-4">
            {interventions.map((int, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{int.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {int.frequency} • {int.responsible === 'therapist' ? 'Terapeuta' : 
                     int.responsible === 'family' ? 'Família' :
                     int.responsible === 'school' ? 'Escola' : 'Combinado'}
                  </p>
                </div>
                <button
                  onClick={() => removeIntervention(idx)}
                  disabled={disabled}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Intervention Form */}
        <div className="space-y-3 bg-blue-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700">Adicionar Intervenção</h4>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Descrição *</label>
            <input
              type="text"
              value={newIntervention.description || ''}
              onChange={(e) => setNewIntervention({ ...newIntervention, description: e.target.value })}
              placeholder="Ex: Exercícios de respiração diafragmática"
              disabled={disabled}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Frequência *</label>
              <input
                type="text"
                value={newIntervention.frequency || ''}
                onChange={(e) => setNewIntervention({ ...newIntervention, frequency: e.target.value })}
                placeholder="Ex: 2x/dia"
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Responsável *</label>
              <select
                value={newIntervention.responsible || 'therapist'}
                onChange={(e) => setNewIntervention({ ...newIntervention, responsible: e.target.value as any })}
                disabled={disabled}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              >
                <option value="therapist">Terapeuta</option>
                <option value="family">Família</option>
                <option value="school">Escola</option>
                <option value="combined">Combinado</option>
              </select>
            </div>
          </div>

          <button
            onClick={addIntervention}
            disabled={disabled}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            + Adicionar Intervenção
          </button>
        </div>
      </div>

      {/* Review Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data de Revisão do Plano
        </label>
        <input
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || objectives.length === 0}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
      >
        Salvar Plano Terapêutico
      </button>
    </div>
  );
};

export default TherapeuticPlanForm;