// src/components/patient/tabs/InsuranceGuideForm.jsx
import React, { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Shield, AlertTriangle, Info } from 'lucide-react';

import { Modal } from '../../ui/Modal';
import { ModalHeader, ModalFooter } from '../../../pages/Financial/components/formKit';

import { SPECIALTY_OPTIONS } from '../../../constants/specialties';
import { useConvenios } from '../../../hooks/useConvenios';
import { guideExpiryDateString } from '../../../utils/dateUtils';

const VALID_SPECIALTIES = SPECIALTY_OPTIONS;

const inputClass = (hasError) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-colors placeholder-gray-400 ${
    hasError
      ? 'border-red-300 focus:ring-red-200'
      : 'border-gray-200 focus:ring-teal-200 focus:border-teal-400'
  }`;

const InsuranceGuideForm = ({ open, onClose, onSave, guide = null, doctors = [], isRenewal = false }) => {
  const isEditing = Boolean(guide) && !isRenewal;
  const hasExistingEvaluation = isEditing && Boolean(guide?.evaluationSessionId);
  const hasUsedSessions = isEditing && guide?.usedSessions > 0;
  const isInactiveStatus = isEditing && guide?.status && !['active', 'linked'].includes(guide.status);
  // Guia já usada ou inativa (esgotada/vencida/cancelada/substituída): trava campos
  // que afetam consumo/identificação da guia, mas sempre libera a data de vencimento
  // e demais campos administrativos para correção.
  const isLocked = hasUsedSessions || isInactiveStatus;
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
      notes:            '',
      isAba:            false
    }
  });

  const watchedSessions = useWatch({ control, name: 'totalSessions' });
  const watchedValue    = useWatch({ control, name: 'sessionValue' });
  const watchedInsurance = useWatch({ control, name: 'insurance' });
  const watchedSpecialty = useWatch({ control, name: 'specialty' });
  const watchedExpiresAt = useWatch({ control, name: 'expiresAt' });
  // true quando o usuário digitou o valor à mão — aí não sobrescrevemos com o cálculo automático
  const valueManualRef = React.useRef(false);

  // Valor sugerido: tabela do convênio pela especialidade (senão valor padrão) + adicional ABA
  const computeSuggestedValue = (insuranceCode, specialty, isAba) => {
    const conv = convenios.find(c => c.code === insuranceCode);
    if (!conv || conv.code !== 'base') return null;
    const row = (conv.specialtyValues || []).find(r => r.specialty === specialty && r.sessionValue > 0);
    const base = row ? row.sessionValue : conv.sessionValue;
    if (!(base > 0)) return null;
    const pct = 50;
    return isAba ? Math.round(base * (1 + pct / 100) * 100) / 100 : base;
  };
  const evalManualRef = React.useRef(false);
  // Avaliação: valor nominal da terapia na tabela do Base (+50% se ABA). Só em guia nova.
  const computeSuggestedEvaluation = (insuranceCode, specialty, isAba) => {
    const conv = convenios.find(c => c.code === insuranceCode);
    if (!conv || conv.code !== 'base') return null;
    const row = (conv.specialtyValues || []).find(r => r.specialty === specialty && r.evaluationValue > 0);
    if (!row) return null;
    return isAba ? Math.round(row.evaluationValue * 1.5 * 100) / 100 : row.evaluationValue;
  };
  const applySuggestedValue = (insuranceCode, specialty, isAba) => {
    if (!valueManualRef.current) {
      const v = computeSuggestedValue(insuranceCode, specialty, isAba);
      if (v != null) setValue('sessionValue', v, { shouldValidate: false });
    }
    if (!evalManualRef.current && !guide && !isRenewal) {
      const ev = computeSuggestedEvaluation(insuranceCode, specialty, isAba);
      if (ev != null) setValue('evaluationAmount', ev, { shouldValidate: false });
    }
  };
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
          evaluationDate:   !isRenewal && guide.evaluationAppointment?.date ? guide.evaluationAppointment.date.substring(0, 10) : '',
          evaluationTime:   !isRenewal ? guide.evaluationAppointment?.time || '' : '',
          doctorId:         guide.doctor?._id || guide.doctorId || '',
          issuedAt:         guide.issuedAt ? new Date(guide.issuedAt).toISOString().substring(0, 10) : '',
          expiresAt:        guideExpiryDateString(guide.expiresAt),
          notes:            guide.notes || '',
          isAba:            Boolean(guide.isAba)
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
          notes:            '',
          isAba:            false
        });
      }
      valueManualRef.current = false;
      evalManualRef.current = false;
    }
  }, [open, guide, reset]);

  const onSubmit = async (data) => {
    try {
      const hasEval = hasExistingEvaluation || (Number(data.evaluationAmount) > 0 && data.generateEvaluationBilling !== false);
      await onSave({
        number:        data.number.trim(),
        specialty:     data.specialty.toLowerCase().trim(),
        insurance:     data.insurance.toLowerCase().trim(),
        totalSessions: parseInt(data.totalSessions, 10),
        sessionValue:     data.sessionValue !== '' ? parseFloat(data.sessionValue) : undefined,
        isAba:            Boolean(data.isAba),
        evaluationAmount: data.evaluationAmount !== '' ? parseFloat(data.evaluationAmount) : undefined,
        generateEvaluationBilling: data.generateEvaluationBilling !== false,
        evaluationDate: hasEval && data.evaluationDate ? data.evaluationDate : undefined,
        evaluationTime: hasEval && data.evaluationTime ? data.evaluationTime : undefined,
        doctorId:         data.doctorId || undefined,
        issuedAt:      data.issuedAt ? new Date(data.issuedAt).toISOString() : undefined,
        // Só a data (YYYY-MM-DD): o backend converte para o fim do dia em Brasília.
        // new Date('YYYY-MM-DD').toISOString() virava 00:00 UTC e a tela mostrava o dia anterior.
        expiresAt:     data.expiresAt,
        notes:         data.notes?.trim() || undefined
      });
    } catch (error) {
      console.error('Erro ao salvar guia:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) { reset(); onClose(); }
  };

  const title = isRenewal ? 'Renovar guia de convênio' : (isEditing ? 'Editar guia de convênio' : 'Nova guia de convênio');
  const submitLabel = isRenewal ? 'Renovar guia' : (isEditing ? 'Atualizar' : 'Criar guia');
  const specialtyLabel = VALID_SPECIALTIES.find(x => x.value === watchedSpecialty)?.label;
  const insuranceName = convenios.find(c => c.code === watchedInsurance)?.name;
  const expiresLabel = watchedExpiresAt && /^\d{4}-\d{2}-\d{2}/.test(watchedExpiresAt) ? `vence ${watchedExpiresAt.slice(8, 10)}/${watchedExpiresAt.slice(5, 7)}` : null;
  const summaryText = [
    Number(watchedSessions) > 0 ? `${watchedSessions} ${Number(watchedSessions) === 1 ? 'sessão' : 'sessões'}` : null,
    specialtyLabel, insuranceName, expiresLabel,
  ].filter(Boolean).join(' · ');

  return (
    <Modal
      open={open}
      onClose={handleClose}
      labelledBy="guide-form-title"
      zIndexClass="z-[100]"
      panelClassName={`flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px] ${isSubmitting ? 'pointer-events-none opacity-80' : ''}`}
    >
      <>
        <ModalHeader
          icon={<Shield className="h-6 w-6" />}
          color="#059669"
          title={title}
          subtitle="Autorização do convênio"
          onClose={handleClose}
          titleId="guide-form-title"
        />

        <form id="guide-form" onSubmit={handleSubmit(onSubmit)} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5 sm:px-6">

            {isLocked && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  {hasUsedSessions
                    ? <>Esta guia já possui <strong>{guide.usedSessions}</strong> sessão(ões) utilizada(s). </>
                    : <>Esta guia está inativa (<strong>{guide.status}</strong>). </>}
                  Apenas a data de vencimento e campos administrativos podem ser editados.
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

            {/* Total de sessões (destaque) + Número da guia */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[11rem_1fr]">
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
                      disabled={isLocked}
                      className={inputClass(!!errors.totalSessions) + ' !h-12 text-2xl font-bold tabular-nums' + (isLocked ? ' opacity-50 cursor-not-allowed' : '')}
                    />
                  )}
                />
                {errors.totalSessions && <p className="text-xs text-red-500 mt-1">{errors.totalSessions.message}</p>}
              </div>
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
                      disabled={isLocked}
                      className={inputClass(!!errors.number) + ' !h-12' + (isLocked ? ' opacity-50 cursor-not-allowed' : '')}
                      autoFocus={isRenewal}
                    />
                  )}
                />
                {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number.message}</p>}
              </div>
            </div>

            {/* Especialidade + Convênio */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Especialidade <span className="text-red-400">*</span>
                </label>
                <Controller
                  name="specialty"
                  control={control}
                  rules={{ required: 'Especialidade é obrigatória' }}
                  render={({ field }) => (
                    <select {...field} onChange={(e) => { field.onChange(e.target.value); applySuggestedValue(getValues('insurance'), e.target.value, getValues('isAba')); }} className={inputClass(!!errors.specialty) + ((isRenewal || isLocked) ? ' opacity-50 cursor-not-allowed' : '')} disabled={isRenewal || isLocked}>
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
                      className={inputClass(!!errors.insurance) + ((isRenewal || isLocked) ? ' opacity-50 cursor-not-allowed' : '')}
                      disabled={loadingConvenios || isRenewal || isLocked}
                      onChange={(e) => {
                        const selectedCode = e.target.value;
                        field.onChange(selectedCode);
                        const currentValue = getValues('sessionValue');
                        if (currentValue === '' || currentValue == null) valueManualRef.current = false;
                        applySuggestedValue(selectedCode, getValues('specialty'), getValues('isAba'));
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            {/* Atendimento ABA — adicional definido no convênio */}
            <Controller
              name="isAba"
              control={control}
              render={({ field }) => {
                const conv = convenios.find(c => c.code === watchedInsurance);
                const pct = conv?.code === 'base' ? 50 : 0;
                // Só convênios que pagam adicional ABA oferecem o switch (ou guia já marcada como ABA)
                if (!(pct > 0)) return null;
                return (
                  <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${field.value ? 'border-teal-300 bg-teal-50/60' : 'border-gray-200 bg-white'}`}>
                    <div>
                      <span className="block text-sm font-semibold text-gray-700">Atendimento ABA</span>
                      <span className="block text-xs text-gray-500">
                        {field.value ? `Valor da especialidade + ${pct}% (adicional ABA do convênio)` : 'Desligado: valor convencional da especialidade'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!field.value}
                      aria-label="Atendimento ABA"
                      onClick={() => {
                        valueManualRef.current = false;
                        const next = !field.value;
                        field.onChange(next);
                        applySuggestedValue(getValues('insurance'), getValues('specialty'), next);
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${field.value ? 'bg-teal-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                );
              }}
            />

            {/* Valor da sessão + Valor da avaliação */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        onChange={(e) => { valueManualRef.current = true; field.onChange(e); }}
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
                        onChange={(e) => { evalManualRef.current = true; field.onChange(e); }}
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
              <div className={`space-y-3 rounded-xl border p-4 transition-colors ${watchedGenerateEvalBilling !== false ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Agendamento da avaliação</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${watchedGenerateEvalBilling !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                    {watchedGenerateEvalBilling !== false ? 'Ativado' : 'Desativado'}
                  </span>
                </div>

                {!hasExistingEvaluation && <Controller
                  name="generateEvaluationBilling"
                  control={control}
                  render={({ field }) => (
                    <div role="radiogroup" aria-label="Agendar avaliação" className="flex flex-col gap-1">
                      <label className="flex min-h-11 items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          checked={field.value === true}
                          onChange={() => field.onChange(true)}
                          className="w-4 h-4 accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        />
                        <span className="text-sm font-medium text-gray-800">Agendar avaliação</span>
                      </label>
                      <label className="flex min-h-11 items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          checked={field.value === false}
                          onChange={() => field.onChange(false)}
                          className="w-4 h-4 accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        />
                        <span className="text-sm font-medium text-gray-800">Não agendar avaliação</span>
                      </label>
                    </div>
                  )}
                />}

                <p className={`text-xs ${watchedGenerateEvalBilling !== false ? 'text-blue-800' : 'text-gray-600'}`}>
                  {hasExistingEvaluation
                    ? 'A avaliação já está na agenda. Ao salvar, a data e o horário serão atualizados.'
                    : watchedGenerateEvalBilling !== false
                    ? 'Informe a data e o horário para criar o agendamento ao salvar a guia.'
                    : 'Ao salvar a guia, nenhum agendamento de avaliação será criado.'}
                </p>

                {(hasExistingEvaluation || watchedGenerateEvalBilling !== false) && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </form>

        <ModalFooter
          accent="emerald"
          onCancel={handleClose}
          onSubmit={handleSubmit(onSubmit)}
          submitting={isSubmitting}
          submitLabel={submitLabel}
          submittingLabel="Salvando..."
          summary={summaryText}
        />
      </>
    </Modal>
  );
};

export default InsuranceGuideForm;
