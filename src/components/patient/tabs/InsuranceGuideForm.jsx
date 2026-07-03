// src/components/patient/tabs/InsuranceGuideForm.jsx
import React, { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Save, X, FileText, Shield, AlertTriangle, Info } from 'lucide-react';
import { format, addMonths } from 'date-fns';

import { SPECIALTY_OPTIONS } from '../../../constants/specialties';
import { useConvenios } from '../../../hooks/useConvenios';

const VALID_SPECIALTIES = SPECIALTY_OPTIONS;

const inputClass = (hasError) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-colors placeholder-gray-400 ${
    hasError
      ? 'border-red-300 focus:ring-red-200'
      : 'border-gray-200 focus:ring-teal-200 focus:border-teal-400'
  }`;

const InsuranceGuideForm = ({ open, onClose, onSave, guide = null, doctors = [], isRenewal = false }) => {
  const isEditing = Boolean(guide) && !isRenewal;
  const hasUsedSessions = isEditing && guide?.usedSessions > 0;
  const { convenios, isLoading: loadingConvenios } = useConvenios({ includeInactive: false });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      number:           '',
      specialty:        '',
      insurance:        '',
      totalSessions:    '',
      sessionValue:     '',
      evaluationAmount: '',
      generateEvaluationBilling: true,
      evaluationDate:   '',
      evaluationTime:   '',
      doctorId:         '',
      issuedAt:         '',
      expiresAt:        '',
      notes:            ''
    }
  });

  const watchedSessions = useWatch({ control, name: 'totalSessions' });
  const watchedValue    = useWatch({ control, name: 'sessionValue' });
  const watchedEvaluationAmount = useWatch({ control, name: 'evaluationAmount' });
  const watchedGenerateEvalBilling = useWatch({ control, name: 'generateEvaluationBilling' });
  const totalValue = (Number(watchedSessions) > 0 && Number(watchedValue) > 0)
    ? (Number(watchedSessions) * Number(watchedValue)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  useEffect(() => {
    if (open) {
      if (guide) {
        reset({
          number:           isRenewal ? '' : (guide.number || ''),
          specialty:        guide.specialty || '',
          insurance:        guide.insurance || '',
          totalSessions:    guide.totalSessions || '',
          sessionValue:     guide.sessionValue != null ? guide.sessionValue : '',
          evaluationAmount: guide.evaluationAmount != null ? guide.evaluationAmount : '',
          generateEvaluationBilling: guide.generateEvaluationBilling !== false,
          evaluationDate:   '',
          evaluationTime:   '',
          doctorId:         guide.doctor?._id || guide.doctorId || '',
          issuedAt:         guide.issuedAt ? format(new Date(guide.issuedAt), 'yyyy-MM-dd') : '',
          expiresAt:        guide.expiresAt ? format(new Date(guide.expiresAt), 'yyyy-MM-dd') : '',
          notes:            guide.notes || ''
        });
      } else {
        reset({
          number:           '',
          specialty:        '',
          insurance:        '',
          totalSessions:    '',
          sessionValue:     '',
          evaluationAmount: '',
          generateEvaluationBilling: true,
          evaluationDate:   '',
          evaluationTime:   '',
          doctorId:         '',
          issuedAt:         '',
          expiresAt:        '',
          notes:            ''
        });
      }
    }
  }, [open, guide, reset]);

  const onSubmit = async (data) => {
    try {
      const hasEval = Number(data.evaluationAmount) > 0 && data.generateEvaluationBilling !== false;
      await onSave({
        number:        data.number.trim(),
        specialty:     data.specialty.toLowerCase().trim(),
        insurance:     data.insurance.toLowerCase().trim(),
        totalSessions: parseInt(data.totalSessions, 10),
        sessionValue:     data.sessionValue !== '' ? parseFloat(data.sessionValue) : undefined,
        evaluationAmount: data.evaluationAmount !== '' ? parseFloat(data.evaluationAmount) : undefined,
        generateEvaluationBilling: data.generateEvaluationBilling !== false,
        evaluationDate: hasEval && data.evaluationDate ? data.evaluationDate : undefined,
        evaluationTime: hasEval && data.evaluationTime ? data.evaluationTime : undefined,
        doctorId:         data.doctorId || undefined,
        issuedAt:      data.issuedAt ? new Date(data.issuedAt).toISOString() : undefined,
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
                {isRenewal ? 'Renovar guia de convênio' : (isEditing ? 'Editar guia de convênio' : 'Nova guia de convênio')}
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

            {hasUsedSessions && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  Esta guia já possui <strong>{guide.usedSessions}</strong> sessão(ões) utilizada(s).
                  Apenas alguns campos podem ser editados.
                </p>
              </div>
            )}

            {isRenewal && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">
                  Renovação da guia <strong>#{guide.number}</strong>. A nova guia será criada e a guia atual será arquivada.
                  O plano terapêutico será clonado e <strong>os agendamentos futuros serão gerados automaticamente</strong> —
                  não é necessário clicar em "Gerar" novamente no card.
                </p>
              </div>
            )}

            {!isEditing && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">Preencha os dados da guia conforme autorização do convênio.</p>
              </div>
            )}

            {/* Número da guia + Total de sessões */}
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
                      autoFocus={isRenewal}
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

            {/* Especialidade + Convênio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Especialidade <span className="text-red-400">*</span>
                </label>
                <Controller
                  name="specialty"
                  control={control}
                  rules={{ required: 'Especialidade é obrigatória' }}
                  render={({ field }) => (
                    <select {...field} className={inputClass(!!errors.specialty) + (isRenewal ? ' opacity-50 cursor-not-allowed' : '')} disabled={isRenewal}>
                      <option value="">Selecione</option>
                      {VALID_SPECIALTIES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.specialty && <p className="text-xs text-red-500 mt-1">{errors.specialty.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Convênio <span className="text-red-400">*</span>
                </label>
                <Controller
                  name="insurance"
                  control={control}
                  rules={{ required: 'Convênio é obrigatório' }}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={inputClass(!!errors.insurance) + (isRenewal ? ' opacity-50 cursor-not-allowed' : '')}
                      disabled={loadingConvenios || isRenewal}
                      onChange={(e) => {
                        const selectedCode = e.target.value;
                        field.onChange(selectedCode);
                        const selected = convenios.find(c => c.code === selectedCode);
                        if (selected && selected.sessionValue > 0) {
                          const currentValue = getValues('sessionValue');
                          if (currentValue === '' || currentValue == null) {
                            setValue('sessionValue', selected.sessionValue, { shouldValidate: false });
                          }
                        }
                      }}
                    >
                      <option value="">{loadingConvenios ? 'Carregando...' : 'Selecione'}</option>
                      {convenios.map(ins => (
                        <option key={ins._id} value={ins.code}>{ins.name}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.insurance && <p className="text-xs text-red-500 mt-1">{errors.insurance.message}</p>}
              </div>
            </div>

            {/* Data de validade + Data de emissão */}
            <div className="grid grid-cols-2 gap-3">
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
                    <input {...field} type="date" className={inputClass(!!errors.expiresAt)} />
                  )}
                />
                {errors.expiresAt && <p className="text-xs text-red-500 mt-1">{errors.expiresAt.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de emissão</label>
                <Controller
                  name="issuedAt"
                  control={control}
                  render={({ field }) => (
                    <input {...field} type="date" className={inputClass(false)} />
                  )}
                />
              </div>
            </div>

            {/* Valor da sessão + Valor da avaliação */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor da sessão</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">R$</span>
                  <Controller
                    name="sessionValue"
                    control={control}
                    rules={{ min: { value: 0, message: 'Valor não pode ser negativo' } }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0,00"
                        className={inputClass(!!errors.sessionValue) + ' pl-8'}
                      />
                    )}
                  />
                </div>
                {errors.sessionValue && <p className="text-xs text-red-500 mt-1">{errors.sessionValue.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Valor da avaliação
                  <span className="ml-1.5 text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">R$</span>
                  <Controller
                    name="evaluationAmount"
                    control={control}
                    rules={{ min: { value: 0, message: 'Valor não pode ser negativo' } }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0,00"
                        className={inputClass(!!errors.evaluationAmount) + ' pl-8'}
                      />
                    )}
                  />
                </div>
                {errors.evaluationAmount && <p className="text-xs text-red-500 mt-1">{errors.evaluationAmount.message}</p>}
              </div>
            </div>

            {/* Profissional */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Profissional</label>
              <Controller
                name="doctorId"
                control={control}
                render={({ field }) => (
                  <select {...field} className={inputClass(false)}>
                    <option value="">Sem vínculo</option>
                    {doctors.map(d => (
                      <option key={d._id} value={d._id}>{d.fullName}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Avaliação: opções de agendamento */}
            {Number(watchedEvaluationAmount) > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400">Agendamento da avaliação</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <Controller
                  name="generateEvaluationBilling"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={field.value === true}
                          onChange={() => field.onChange(true)}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Criar agendamento na agenda</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={field.value === false}
                          onChange={() => field.onChange(false)}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Não criar agendamento</span>
                      </label>
                    </div>
                  )}
                />

                {watchedGenerateEvalBilling !== false && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Data da avaliação <span className="text-red-400">*</span>
                      </label>
                      <Controller
                        name="evaluationDate"
                        control={control}
                        rules={{ required: 'Informe a data' }}
                        render={({ field, fieldState }) => (
                          <>
                            <input {...field} type="date" className={inputClass(!!fieldState.error)} />
                            {fieldState.error && <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>}
                          </>
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Horário <span className="text-red-400">*</span>
                      </label>
                      <Controller
                        name="evaluationTime"
                        control={control}
                        rules={{ required: 'Informe o horário' }}
                        render={({ field, fieldState }) => (
                          <>
                            <input {...field} type="time" className={inputClass(!!fieldState.error)} />
                            {fieldState.error && <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>}
                          </>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Valor total calculado */}
            {totalValue && (
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-100 rounded-lg">
                <span className="text-xs text-teal-700 font-medium">Valor total da guia:</span>
                <span className="text-sm font-bold text-teal-800">{totalValue}</span>
                <span className="text-xs text-teal-500">({watchedSessions} sessões × R$ {Number(watchedValue).toFixed(2).replace('.', ',')})</span>
              </div>
            )}

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
                <><Save className="w-4 h-4" /> {isRenewal ? 'Renovar guia' : (isEditing ? 'Atualizar' : 'Criar guia')}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsuranceGuideForm;
