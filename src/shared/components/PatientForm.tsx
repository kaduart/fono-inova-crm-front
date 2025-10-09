import { JSX } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import DatePicker from "react-datepicker";
import { ptBR } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { Button } from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/TextArea';
import { IPatient } from '../../utils/types/types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card, CardContent } from '../../components/ui/Card';
import { User, ClipboardList, MapPin, Phone, ShieldCheck, Heart } from 'lucide-react';

type PatientFormData = z.infer<typeof any>;

interface PatientFormProps {
  onSuccess?: (data: PatientFormData) => void;
  patient?: IPatient;
  isLoading?: boolean;
}

const PatientForm = ({ patient, isLoading, onSuccess }: PatientFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<PatientFormData>({
    defaultValues: {
      ...(patient || {}),
      dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined
    }
  });

  const onSubmit = (data: PatientFormData) => {
    const fullData = { ...(patient?._id ? { _id: patient._id } : {}), ...data };
    onSuccess?.(fullData as PatientFormData);
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: JSX.Element | JSX.Element[] }) => (
    <Card className="border border-gray-200 shadow-sm rounded-xl mb-6 transition-all hover:shadow-md">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-50 to-white border-b border-gray-100 rounded-t-xl">
        <Icon className="text-green-600 w-5 h-5" />
        <h3 className="text-gray-700 font-medium">{title}</h3>
      </div>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );

  const renderField = (label: string, field: JSX.Element, error?: string) => (
    <div className="space-y-1 w-full">
      <Label className="text-gray-700 text-sm">{label}</Label>
      {field}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fadeIn">
      {/* Dados Pessoais */}
      <Section title="Dados Pessoais" icon={User}>
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
                    placeholderText="Selecionar data"
                    selected={field.value ? new Date(field.value) : null}
                    onChange={(date) => field.onChange(date)}
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
          {renderField('Profissão', <Input {...register('profession')} />, errors.profession?.message)}
          {renderField('Naturalidade', <Input {...register('placeOfBirth')} />, errors.placeOfBirth?.message)}
        </div>
      </Section>

      {/* Documentos e Contato */}
      <Section title="Documentos e Contato" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('CPF', <Input {...register('cpf')} placeholder="000.000.000-00" />, errors.cpf?.message)}
          {renderField('RG', <Input {...register('rg')} placeholder="Digite o RG" />, errors.rg?.message)}
          {renderField('Telefone', <Input {...register('phone')} placeholder="(00) 00000-0000" />, errors.phone?.message)}
          {renderField('E-mail', <Input type="email" {...register('email')} placeholder="exemplo@email.com" />, errors.email?.message)}
        </div>
      </Section>

      {/* Endereço */}
      <Section title="Endereço" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Rua', <Input {...register('address.street')} />, errors.address?.street?.message)}
          {renderField('Número', <Input {...register('address.number')} />, errors.address?.number?.message)}
          {renderField('Bairro', <Input {...register('address.district')} />, errors.address?.district?.message)}
          {renderField('Cidade', <Input {...register('address.city')} />, errors.address?.city?.message)}
          {renderField('Estado', <Input {...register('address.state')} />, errors.address?.state?.message)}
          {renderField('CEP', <Input {...register('address.zipCode')} placeholder="00.000-000" />, errors.address?.zipCode?.message)}
        </div>
      </Section>

      {/* Informações Clínicas */}
      <Section title="Informações Clínicas" icon={Heart}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Queixa principal', <Textarea {...register('mainComplaint')} />, errors.mainComplaint?.message)}
          {renderField('Histórico clínico', <Textarea {...register('clinicalHistory')} />, errors.clinicalHistory?.message)}
          {renderField('Medicações', <Textarea {...register('medications')} />, errors.medications?.message)}
          {renderField('Alergias', <Textarea {...register('allergies')} />, errors.allergies?.message)}
          {renderField('Histórico familiar', <Textarea {...register('familyHistory')} />, errors.familyHistory?.message)}
        </div>
      </Section>

      {/* Plano de Saúde e Responsável */}
      <Section title="Plano de Saúde e Responsável" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('Convênio', <Input {...register('healthPlan.name')} />, errors.healthPlan?.name?.message)}
          {renderField('Nº da apólice', <Input {...register('healthPlan.policyNumber')} />, errors.healthPlan?.policyNumber?.message)}
          {renderField('Responsável legal', <Input {...register('legalGuardian')} />, errors.legalGuardian?.message)}
        </div>
      </Section>

      {/* Contato de Emergência */}
      <Section title="Contato de Emergência" icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('Nome', <Input {...register('emergencyContact.name')} />, errors.emergencyContact?.name?.message)}
          {renderField('Contato', <Input {...register('emergencyContact.phone')} />, errors.emergencyContact?.phone?.message)}
          {renderField('Parentesco', <Input {...register('emergencyContact.relationship')} />, errors.emergencyContact?.relationship?.message)}
        </div>
      </Section>

      {/* Botão */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          {isLoading ? (
            <span className="flex items-center">
              <LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            'Salvar Paciente'
          )}
        </Button>
      </div>
    </form>
  );
};

export default PatientForm;
