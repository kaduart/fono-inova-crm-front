import { ptBR } from 'date-fns/locale';
import { ChevronDown, ClipboardList, Heart, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import { JSX, useState } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/TextArea';
import { maskDateBR, pickerDateToStoredBirth, storedBirthToPickerDate } from '../../utils/dateOfBirth';
import { IPatient } from '../../utils/types/types';
import { PossibleDuplicatesNotice, usePossibleDuplicates } from '../../components/patients/PossibleDuplicatesNotice';

type PatientFormData = z.infer<typeof any>;

interface PatientFormProps {
  onSuccess?: (data: PatientFormData) => void;
  patient?: IPatient;
  isLoading?: boolean;
  onCancel?: () => void;
}

// Fora do componente: definido dentro, cada re-render (o aviso de duplicado observa os
// campos) recriava o tipo e remontava os inputs, tirando o foco a cada tecla.
const Section = ({ title, icon: Icon, children, fold = false, filled = false, hint }: { title: string; icon: any; children: JSX.Element | JSX.Element[]; fold?: boolean; filled?: boolean; hint?: string }) => {
  if (fold) {
    // Recolhida não desmonta os campos: continuam no formulário e vão no salvar.
    return (
      <details open={filled || undefined} className="group rounded-xl border border-gray-200">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 [&::-webkit-details-marker]:hidden">
          <Icon className="h-4 w-4 text-emerald-600" aria-hidden />
          {title}
          {hint && <span className="font-normal text-gray-500">{hint}</span>}
          <ChevronDown size={16} className="ml-auto text-gray-500 transition-transform duration-quick group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-gray-100 p-4">{children}</div>
      </details>
    );
  }
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700" aria-hidden><Icon className="h-4 w-4" /></span>
        {title}
      </h3>
      {children}
    </section>
  );
};

const PatientForm = ({ patient, isLoading, onSuccess, onCancel }: PatientFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<PatientFormData>({
    defaultValues: {
      ...(patient || {}),
      dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined
    }
  });

  // Aviso de possível duplicado (03/11/2026): só no cadastro novo.
  const existingId = patient?._id || (patient as any)?.patientId || (patient as any)?.id;
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);
  const [showDupError, setShowDupError] = useState(false);
  const { candidates } = usePossibleDuplicates({
    fullName: watch('fullName'),
    dateOfBirth: watch('dateOfBirth'),
    phone: watch('phone'),
    cpf: watch('cpf'),
  }, !existingId);

  const onSubmit = (data: PatientFormData) => {
    const id = existingId;
    if (!id && candidates.length && !confirmedDistinct) {
      setShowDupError(true);
      document.getElementById('patient-duplicates-notice')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const fullData = {
      ...(id ? { _id: id } : {}),
      ...data,
      ...(!id && candidates.length && confirmedDistinct ? { confirmNotDuplicate: true } : {}),
    };
    onSuccess?.(fullData as PatientFormData);
  };


  const renderField = (label: string, field: JSX.Element, error?: string) => (
    <div className="space-y-1 w-full">
      <Label className="text-gray-700 text-sm">{label}</Label>
      {field}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Dados Pessoais */}
      <Section title="Dados pessoais" icon={User}>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-9">
            {renderField('Nome completo', <Input {...register('fullName')} placeholder="Digite o nome completo" />, errors.fullName?.message)}
          </div>
          <div className="col-span-12 md:col-span-3">
            {renderField(
              'Data de nascimento',
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field }) => (
                  <DatePicker
                    placeholderText="dd/mm/aaaa"
                    selected={storedBirthToPickerDate(field.value as any)}
                    onChange={(date) => field.onChange(pickerDateToStoredBirth(date))}
                    // Máscara dd/mm/aaaa: digitar 14101985 já vira 14/10/1985 (barras automáticas).
                    onChangeRaw={(e) => { if (e?.target) (e.target as HTMLInputElement).value = maskDateBR((e.target as HTMLInputElement).value); }}
                    strictParsing
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    minDate={new Date(1900, 0, 1)}
                    maxDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    locale={ptBR}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                )}
              />,
              errors.dateOfBirth?.message
            )}
          </div>
        </div>

        {!existingId && candidates.length > 0 ? (
          <div id="patient-duplicates-notice" className="mt-4">
            <PossibleDuplicatesNotice
              candidates={candidates}
              confirmedDistinct={confirmedDistinct}
              onConfirmedDistinctChange={setConfirmedDistinct}
              showError={showDupError}
            />
          </div>
        ) : <></>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {renderField(
            'Gênero',
            <Select {...register('gender')}>
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </Select>,
            errors.gender?.message
          )}
          {renderField(
            'Estado civil',
            <Select {...register('maritalStatus')}>
              <option value="">Selecione</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </Select>,
            errors.maritalStatus?.message
          )}
          {renderField('Profissão', <Input {...register('profession')} placeholder='Ex: Analista de Sistemas' />, errors.profession?.message)}
          {renderField('Naturalidade', <Input {...register('placeOfBirth')} placeholder='Brasileira' />, errors.placeOfBirth?.message)}
        </div>
      </Section>

      {/* Documentos e Contato */}
      <Section title="Documentos e contato" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('CPF', <Input {...register('cpf')} placeholder="000.000.000-00" />, errors.cpf?.message)}
          {renderField('RG', <Input {...register('rg')} placeholder="Digite o RG" />, errors.rg?.message)}
          {renderField('Certidão Nascimento', <Input {...register('birthCertificate')} placeholder="Digite o número da certidão" />, errors.birthCertificate?.message)}
          {renderField('Telefone', <Input {...register('phone')} placeholder="(00) 00000-0000" />, errors.phone?.message)}
          {renderField('E-mail', <Input type="email" {...register('email')} placeholder="exemplo@email.com" />, errors.email?.message)}
          {renderField(
            'CNPJ (tomador PJ, opcional)',
            <Input {...register('cnpj')} placeholder="00.000.000/0000-00" />,
            (errors as any).cnpj?.message
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Preencha o CNPJ apenas se a nota fiscal desse paciente deve sair no nome de um convênio/empresa, em vez do CPF.
        </p>
      </Section>

      {/* Endereço */}
      <Section title="Endereço" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Rua', <Input {...register('address.street')} placeholder="Avenida Minas Gerais" />, errors.address?.street?.message)}
          {renderField('Número', <Input {...register('address.number')} placeholder="325" />, errors.address?.number?.message)}
          {renderField('Bairro', <Input {...register('address.district')} placeholder="Jundiai" />, errors.address?.district?.message)}
          {renderField('Cidade', <Input {...register('address.city')} placeholder="Anápolis" />, errors.address?.city?.message)}
          {renderField('Estado', <Input {...register('address.state')} placeholder="Goias" />, errors.address?.state?.message)}
          {renderField('CEP', <Input {...register('address.zipCode')} placeholder="00.000-000" />, errors.address?.zipCode?.message)}
        </div>
      </Section>

      {/* Informações Clínicas */}
      <Section title="Informações clínicas" icon={Heart} fold filled={Boolean(patient && [patient.mainComplaint, patient.clinicalHistory, patient.medications, patient.allergies, patient.familyHistory].some(Boolean))}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Queixa principal', <Textarea {...register('mainComplaint')} />, errors.mainComplaint?.message)}
          {renderField('Histórico clínico', <Textarea {...register('clinicalHistory')} />, errors.clinicalHistory?.message)}
          {renderField('Medicações', <Textarea {...register('medications')} />, errors.medications?.message)}
          {renderField('Alergias', <Textarea {...register('allergies')} />, errors.allergies?.message)}
          {renderField('Histórico familiar', <Textarea {...register('familyHistory')} />, errors.familyHistory?.message)}
        </div>
      </Section>

      {/* Plano de Saúde e Responsável */}
      <Section title="Plano de saúde e responsável" icon={ShieldCheck} fold filled={Boolean(patient && (patient.healthPlan?.name || patient.healthPlan?.policyNumber || patient.legalGuardian))}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('Convênio', <Input {...register('healthPlan.name')} />, errors.healthPlan?.name?.message)}
          {renderField('Nº da apólice', <Input {...register('healthPlan.policyNumber')} />, errors.healthPlan?.policyNumber?.message)}
          {renderField('Responsável legal', <Input {...register('legalGuardian')} />, errors.legalGuardian?.message)}
        </div>
      </Section>

      {/* Contato de Emergência */}
      <Section title="Contato de emergência" icon={Phone} fold filled={Boolean(patient && (patient.emergencyContact?.name || patient.emergencyContact?.phone))}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('Nome', <Input {...register('emergencyContact.name')} />, errors.emergencyContact?.name?.message)}
          {renderField('Contato', <Input {...register('emergencyContact.phone')} />, errors.emergencyContact?.phone?.message)}
          {renderField('Parentesco', <Input {...register('emergencyContact.relationship')} />, errors.emergencyContact?.relationship?.message)}
        </div>
      </Section>

      {/* Rodapé fixo: o salvar fica sempre à vista */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isLoading} className="min-h-11 rounded-xl px-4 text-sm font-medium text-gray-600 transition-colors duration-quick hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">
            Cancelar
          </button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="min-h-11 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-quick hover:bg-emerald-700"
        >
          {isLoading ? (
            <span className="flex items-center">
              <LoadingSpinner size="small" color="border-white" className="mr-2" />
              Salvando...
            </span>
          ) : (
            'Salvar paciente'
          )}
        </Button>
      </div>
    </form>
  );
};

export default PatientForm;
