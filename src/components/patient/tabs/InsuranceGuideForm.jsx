// src/components/patient/tabs/InsuranceGuideForm.jsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Save, X, FileText, Shield, AlertTriangle, Info } from 'lucide-react';
import { format, addMonths } from 'date-fns';

const VALID_SPECIALTIES = [
  { value: 'fonoaudiologia',      label: 'Fonoaudiologia' },
  { value: 'psicologia',          label: 'Psicologia' },
  { value: 'fisioterapia',        label: 'Fisioterapia' },
  { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
  { value: 'psicopedagogia',      label: 'Psicopedagogia' },
  { value: 'psicomotricidade',    label: 'Psicomotricidade' },
  { value: 'musicoterapia',       label: 'Musicoterapia' },
  { value: 'neuropsicologia',     label: 'Neuropsicologia' },
];

const VALID_INSURANCES = [
  { value: 'unimed-anapolis', label: 'Unimed Anápolis' },
  { value: 'unimed-goiania',  label: 'Unimed Goiânia' },
  { value: 'unimed-campinas', label: 'Unimed Campinas' },
  { value: 'hapvida',         label: 'Hapvida' },
  { value: 'amil',            label: 'Amil' },
  { value: 'bradesco-saude',  label: 'Bradesco Saúde' },
  { value: 'sulamerica',      label: 'SulAmérica' },
  { value: 'outro',           label: 'Outro' },
];

const inputClass = (hasError) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-colors placeholder-gray-400 ${
    hasError
      ? 'border-red-300 focus:ring-red-200'
      : 'border-gray-200 focus:ring-teal-200 focus:border-teal-400'
  }`;

const InsuranceGuideForm = ({ open, onClose, onSave, guide = null }) => {
  const isEditing = Boolean(guide);
  const hasUsedSessions = isEditing && guide?.usedSessions > 0;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      number:        '',
      specialty:     '',
      insurance:     '',
      totalSessions: '',
      expiresAt:     format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      notes:         ''
    }
  });

  useEffect(() => {
    if (open) {
      if (guide) {
        reset({
          number:        guide.number || '',
          specialty:     guide.specialty || '',
          insurance:     guide.insurance || '',
          totalSessions: guide.totalSessions || '',
          expiresAt:     guide.expiresAt ? format(new Date(guide.expiresAt), 'yyyy-MM-dd') : '',
          notes:         guide.notes || ''
        });
      } else {
        reset({
          number:        '',
          specialty:     '',
          insurance:     '',
          totalSessions: '',
          expiresAt:     format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
          notes:         ''
        });
      }
    }
  }, [open, guide, reset]);

  const onSubmit = async (data) => {
    try {
      await onSave({
        number:        data.number.trim(),
        specialty:     data.specialty.toLowerCase().trim(),
        insurance:     data.insurance.toLowerCase().trim(),
        totalSessions: parseInt(data.totalSessions, 10),
        expiresAt:     new Date(data.expiresAt).toISOString(),
        notes:         data.notes?.trim() || undefined
      });
    } catch (error) {
      console.error('Erro ao salvar guia:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) { reset(); onClose(); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg transition-all ${isSubmitting ? 'opacity-80 pointer-events-none' : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-xl">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {isEditing ? 'Editar guia de convênio' : 'Nova guia de convênio'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Autorização do convênio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* Alert: sessões usadas */}
            {hasUsedSessions && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  Esta guia já possui <strong>{guide.usedSessions}</strong> sessão(ões) utilizada(s).
                  Apenas alguns campos podem ser editados.
                </p>
              </div>
            )}

            {/* Alert: instrução de preenchimento */}
            {!isEditing && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">Preencha os dados da guia conforme autorização do convênio.</p>
              </div>
            )}

            {/* Grid 2 cols: número + total sessões */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Número da guia <span className="text-red-400">*</span>
                </label>
                <Controller
                  name="number"
                  control={control}
                  rules={{ required: 'Obrigatório', minLength: { value: 3, message: 'Mínimo 3 caracteres' } }}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: 123456789"
                      disabled={hasUsedSessions}
                      className={inputClass(!!errors.number) + (hasUsedSessions ? ' opacity-50 cursor-not-allowed' : '')}
                    />
                  )}
                />
                {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Total de sessões <span className="text-red-400">*</span>
                </label>
                <Controller
                  name="totalSessions"
                  control={control}
                  rules={{ required: 'Obrigatório', min: { value: 1, message: 'Mínimo 1' }, max: { value: 999, message: 'Máximo 999' } }}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min={1}
                      max={999}
                      placeholder="Ex: 10"
                      className={inputClass(!!errors.totalSessions)}
                    />
                  )}
                />
                {errors.totalSessions && <p className="text-xs text-red-500 mt-1">{errors.totalSessions.message}</p>}
              </div>
            </div>

            {/* Especialidade */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Especialidade <span className="text-red-400">*</span>
              </label>
              <Controller
                name="specialty"
                control={control}
                rules={{ required: 'Especialidade é obrigatória' }}
                render={({ field }) => (
                  <select {...field} className={inputClass(!!errors.specialty)}>
                    <option value="">Selecione a especialidade</option>
                    {VALID_SPECIALTIES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                )}
              />
              {errors.specialty && <p className="text-xs text-red-500 mt-1">{errors.specialty.message}</p>}
            </div>

            {/* Convênio */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Convênio <span className="text-red-400">*</span>
              </label>
              <Controller
                name="insurance"
                control={control}
                rules={{ required: 'Convênio é obrigatório' }}
                render={({ field }) => (
                  <select {...field} className={inputClass(!!errors.insurance)}>
                    <option value="">Selecione o convênio</option>
                    {VALID_INSURANCES.map(ins => (
                      <option key={ins.value} value={ins.value}>{ins.label}</option>
                    ))}
                  </select>
                )}
              />
              {errors.insurance && <p className="text-xs text-red-500 mt-1">{errors.insurance.message}</p>}
            </div>

            {/* Data de validade */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Data de validade <span className="text-red-400">*</span>
              </label>
              <Controller
                name="expiresAt"
                control={control}
                rules={{
                  required: 'Data de validade é obrigatória',
                  validate: (v) => {
                    const d = new Date(v);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    return d >= today || 'Data não pode ser anterior a hoje';
                  }
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="date"
                    className={inputClass(!!errors.expiresAt)}
                  />
                )}
              />
              {errors.expiresAt && <p className="text-xs text-red-500 mt-1">{errors.expiresAt.message}</p>}
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
              <Controller
                name="notes"
                control={control}
                rules={{ maxLength: { value: 500, message: 'Máximo 500 caracteres' } }}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={2}
                    placeholder="Ex: Autorização condicionada a avaliação inicial"
                    className={inputClass(!!errors.notes) + ' resize-none'}
                  />
                )}
              />
              {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes.message}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Salvando...
                </>
              ) : (
                <><Save className="w-4 h-4" /> {isEditing ? 'Atualizar' : 'Criar guia'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsuranceGuideForm;
