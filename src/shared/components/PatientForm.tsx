// PatientForm.tsx (refatorado com validação Zod, estilizado com Card, CardHeader e CardContent)

import { JSX } from 'react';
import { z } from 'zod';
import { Card, CardContent } from '../../components/ui/Card';

import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/TextArea';
import { IPatient } from '../../utils/types/types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const BR_STATES = [
    { value: '', label: 'Selecione' },
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' },
];

const professions = [
    { value: "", label: "Selecione" },
    { value: "outros", label: "Outros" },
    { value: "medico", label: "Médico" },
    { value: "enfermeiro", label: "Enfermeiro" },
    { value: "fisioterapeuta", label: "Fisioterapeuta" },
    { value: "psicologo", label: "Psicólogo" },
];

const maritalStatusOptions = [
    { value: '', label: 'Selecione' },
    { value: 'solteiro', label: 'Solteiro(a)' },
    { value: 'casado', label: 'Casado(a)' },
    { value: 'divorciado', label: 'Divorciado(a)' },
    { value: 'viuvo', label: 'Viúvo(a)' },
];


type PatientFormData = z.infer<typeof any>;

interface PatientFormProps {
    onSuccess?: (data: PatientFormData) => void;
    patient?: IPatient;
    patients?: IPatient[];
    isLoading?: boolean;
}


const initialPatientState: IPatient = {
    _id: '',
    fullName: '',
    dateOfBirth: '',
    birthCertificate: '',
    gender: '',
    maritalStatus: '',
    profession: '',
    placeOfBirth: '',
    address: {
        street: '',
        number: '',
        district: '',
        city: '',
        state: '',
        zipCode: ''
    },
    phone: '',
    email: '',
    cpf: '',
    rg: '',
    specialties: [],
    mainComplaint: '',
    clinicalHistory: '',
    medications: '',
    allergies: '',
    familyHistory: '',
    healthPlan: {
        name: '',
        policyNumber: ''
    },
    legalGuardian: '',
    emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
    },
    appointments: [],
    imageAuthorization: false
};

const PatientForm = ({ patient, patients, isLoading, onSuccess }: PatientFormProps) => {
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<PatientFormData>({
        defaultValues: {
            ...(patient || initialPatientState),
            dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined
        }
    });

    const dateOfBirth = new Date("2023-09-22T00:00:00.000Z");
    const formattedDate = dateOfBirth.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');

    const onSubmit = (data: PatientFormData) => {
        const fullData = {
            ...(patient?._id ? { _id: patient._id } : {}),
            ...data
        };

        onSuccess?.(fullData as PatientFormData); // Delega ao AdminDashboard com _id se tiver
    };

    const renderField = (label: string, field: JSX.Element, error?: string) => (
        <div className="space-y-1">
            <Label>{label}</Label>
            {field}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );

    return (
        <Card className="">

            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-6">

                    {/* Dados Pessoais */}
                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Dados Pessoais</legend>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 md:col-span-9">
                                        {renderField('Nome completo',
                                            <Input {...register('fullName')} />,
                                            errors.fullName?.message)}
                                    </div>
                                    <div className="col-span-12 md:col-span-3 mt-2">
                                        {renderField(
                                            'Data de nascimento',
                                            <Controller
                                                control={control}
                                                name="dateOfBirth"
                                                render={({ field }) => (
                                                    <DatePicker
                                                        placeholderText="Selecione a data"
                                                        selected={field.value ? new Date(field.value) : null}
                                                        onChange={(date) => field.onChange(date)}
                                                        dateFormat="dd/MM/yyyy"
                                                        locale={ptBR}
                                                        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    />
                                                )}
                                            />,
                                            errors.dateOfBirth?.message
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 mt-2">

                                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        {renderField(
                                            'Gênero',
                                            <Select
                                                {...register('gender')}

                                            >
                                                <option value="">Selecione</option>
                                                <option value="masculino">Masculino</option>
                                                <option value="feminino">Feminino</option>
                                                <option value="outro">Outro</option>
                                            </Select>,
                                            errors.gender?.message
                                        )}
                                    </div>

                                    <div>
                                        {renderField(
                                            'Estado civil',
                                            <Select
                                                {...register('maritalStatus')}

                                            >
                                                {maritalStatusOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </Select>,
                                            errors.maritalStatus?.message
                                        )}
                                    </div>

                                    <div>
                                        {renderField(
                                            'Profissão',
                                            <Select
                                                {...register('profession')}

                                            >
                                                {professions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </Select>,
                                            errors.profession?.message
                                        )}
                                    </div>
                                </div>
                                <div className="w-full md:w-1/4">
                                    {renderField('Naturalidade', <Input {...register('placeOfBirth')} />, errors.placeOfBirth?.message)}
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    {/* Documentos & Contato */}
                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Documentos & Contato</legend>
                            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div >
                                    {renderField(
                                        'CPF',
                                        <Controller
                                            control={control}
                                            name="cpf"
                                            render={({ field }) => (
                                                <Input
                                                    mask="999.999.999-99"
                                                    className="max-w-xs"
                                                    {...field}
                                                />
                                            )}
                                        />,
                                        errors.phone?.message
                                    )}
                                </div>
                                <div >
                                    {renderField('RG',
                                        <Input {...register('rg')}
                                            className="max-w-xs"
                                        />, errors.rg?.message)}
                                </div>
                                <div>
                                    {renderField('Certidão de Nascimento',
                                        <Controller
                                            control={control}
                                            name="birthCertificate"
                                            render={({ field }) => (
                                                <Input
                                                    className="max-w-xs"
                                                    {...field}
                                                />
                                            )}
                                        />,
                                        errors.birthCertificate?.message)}
                                </div>
                                <div>
                                    {renderField('Telefone',
                                        <Controller
                                            control={control}
                                            name="phone"
                                            render={({ field }) => (
                                                <Input
                                                    mask="(99) 99999-9999"

                                                    className="max-w-xs"
                                                    {...field}
                                                />
                                            )}
                                        />,
                                        errors.cpf?.message)}
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 mt-3">
                                {renderField('E-mail', <Input type="email" {...register('email')} />, errors.email?.message)}
                            </div>
                        </fieldset>
                    </div>

                    {/* Endereço */}
                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Endereço</legend>
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-10">
                                    {renderField(
                                        'Rua',
                                        <Input {...register('address.street')} />,
                                        errors.address?.street?.message
                                    )}
                                </div>

                                <div className="col-span-12 md:col-span-2">
                                    {renderField(
                                        'Número',
                                        <Input
                                            {...register('address.number')}
                                        />,
                                        errors.address?.number?.message
                                    )}
                                </div>

                            </div>

                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-3">
                                    {renderField(
                                        'Bairro',
                                        <Input {...register('address.district')} />,
                                        errors.address?.district?.message
                                    )}
                                </div>

                                <div className="col-span-12 md:col-span-3">
                                    {renderField('Cidade', <Input {...register('address.city')} />, errors.address?.city?.message)}
                                </div>
                                <div className='mt-1 col-span-6 md:col-span-3'>
                                    {renderField(
                                        'Estado',
                                        <Select
                                            {...register('address.state')}
                                        >
                                            {BR_STATES.map((st) => (
                                                <option key={st.value} value={st.value}>
                                                    {st.label}
                                                </option>
                                            ))}
                                        </Select>,
                                        errors.address?.state?.message
                                    )}
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                    {renderField('CEP',
                                        <Controller
                                            control={control}
                                            name="address.zipCode"
                                            render={({ field }) => (
                                                <Input
                                                    mask="99.999-999"
                                                    className="max-w-xs"
                                                    {...field}
                                                />
                                            )}
                                        />,
                                        errors.address?.zipCode?.message

                                    )}
                                </div>

                            </div>
                        </fieldset>
                    </div>

                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Informações Clínicas</legend>
                            <div className="grid grid-cols-1 gap-4 mt-2">
                                <div>
                                    {renderField(
                                        'Queixa principal',
                                        <Textarea {...register('mainComplaint')} />,
                                        errors.mainComplaint?.message
                                    )}
                                </div>

                                <div>
                                    {renderField(
                                        'Histórico clínico',
                                        <Textarea {...register('clinicalHistory')} />,
                                        errors.clinicalHistory?.message
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        {renderField(
                                            'Medicações',
                                            <Textarea {...register('medications')} />,
                                            errors.medications?.message
                                        )}
                                    </div>
                                    <div>
                                        {renderField(
                                            'Alergias',
                                            <Textarea {...register('allergies')} />,
                                            errors.allergies?.message
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {renderField(
                                        'Histórico familiar',
                                        <Textarea {...register('familyHistory')} />,
                                        errors.familyHistory?.message
                                    )}
                                </div>
                            </div>

                        </fieldset>
                    </div>

                    {/* Plano de Saúde & Responsável */}
                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Plano de Saúde & Responsável</legend>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="w-full md:w-1/4">
                                    {renderField('Convênio', <Input {...register('healthPlan.name')} />, errors.healthPlan?.name?.message)}
                                </div>
                                <div className="w-full md:w-1/4">
                                    {renderField('Nº da apólice', <Input {...register('healthPlan.policyNumber')} className="max-w-xs" />, errors.healthPlan?.policyNumber?.message)}
                                </div>
                                <div className="w-full md:flex-1">
                                    {renderField('Responsável legal', <Input {...register('legalGuardian')} />, errors.legalGuardian?.message)}
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    {/* Contato de Emergência */}
                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Contato de Emergência</legend>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="w-full md:flex-1">
                                    {renderField('Nome', <Input {...register('emergencyContact.name')} />, errors.emergencyContact?.name?.message)}
                                </div>
                                <div className="w-full md:w-1/4">
                                    {renderField('Contato', <Input {...register('emergencyContact.phone')} />, errors.emergencyContact?.phone?.message)}
                                </div>
                                <div className="w-full md:w-1/4">
                                    {renderField('Parentesco', <Input {...register('emergencyContact.relationship')} />, errors.emergencyContact?.relationship?.message)}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="w-full">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="px-2 font-medium text-gray-700">Autorização</legend>
                            <div className="w-full flex items-center space-x-2">
                                <input type="checkbox" {...register('imageAuthorization')} />
                                <Label>Autorizo o uso de imagem para postagens em redes sociais.</Label>
                            </div>
                        </fieldset>
                    </div>
                    <div className="w-full">
                        <Button type="submit" disabled={isLoading}>
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

            </CardContent>
        </Card>
    );
};

export default PatientForm;
