// components/reports/AnamnesisModal.tsx
import {
    ArrowLeft,
    ArrowRight,
    Brain,
    CheckCircle,
    Eye,
    FileText,
    Heart,
    LucideIcon,
    Save,
    School,
    Stethoscope,
    User,
    X
} from 'lucide-react';
import { useState } from 'react';
import { useReportDraft } from './useReportDraft';

interface AnamnesisModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
    /** Relatório salvo, quando é edição (abre já preenchido). */
    initialData?: any;
}

type Step = {
    label: string;
    icon: LucideIcon;          // obrigatório
    textColor: string;         // ex: "text-blue-600"
    bgColor: string;           // ex: "bg-blue-50"
};

const steps: Step[] = [
    { label: "Identificação", icon: User, textColor: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "Histórico Médico", icon: Stethoscope, textColor: "text-green-600", bgColor: "bg-green-50" },
    { label: "Histórico Familiar", icon: Heart, textColor: "text-red-600", bgColor: "bg-red-50" },
    { label: "Desenvolvimento", icon: Brain, textColor: "text-purple-600", bgColor: "bg-purple-50" },
    { label: "Hábitos", icon: CheckCircle, textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
    { label: "Aspectos Escolares", icon: School, textColor: "text-indigo-600", bgColor: "bg-indigo-50" },
    { label: "Observações", icon: Eye, textColor: "text-cyan-600", bgColor: "bg-cyan-50" },
    { label: "Conclusões", icon: FileText, textColor: "text-gray-600", bgColor: "bg-gray-50" },
];

// ─── Etapas 3 a 7 (antes "Em breve") ─────────────────────────────────────
// Campos descritos por configuração; as sugestões preenchem com um toque e tudo continua
// editável. `single`: a sugestão substitui o valor; sem ele, acrescenta (separado por "; ").
type FieldDef = {
    path: string[];
    label: string;
    placeholder?: string;
    rows?: number;
    full?: boolean;
    chips?: string[];
    single?: boolean;
    kind?: 'text' | 'yesno';
};
type StepDef = { title: string; hint?: string; fields: FieldDef[] };

const EXTRA_STEPS: Record<number, StepDef> = {
    2: {
        title: 'Histórico Familiar',
        fields: [
            { path: ['familyHistory', 'parents', 'mother', 'age'], label: 'Mãe: idade', placeholder: 'Ex: 34' },
            { path: ['familyHistory', 'parents', 'mother', 'occupation'], label: 'Mãe: profissão', placeholder: 'Ex: professora' },
            { path: ['familyHistory', 'parents', 'mother', 'education'], label: 'Mãe: escolaridade', chips: ['Fundamental', 'Médio', 'Superior'], single: true },
            { path: ['familyHistory', 'parents', 'mother', 'health'], label: 'Mãe: saúde', chips: ['Sem queixas'] },
            { path: ['familyHistory', 'parents', 'father', 'age'], label: 'Pai: idade', placeholder: 'Ex: 36' },
            { path: ['familyHistory', 'parents', 'father', 'occupation'], label: 'Pai: profissão', placeholder: 'Ex: motorista' },
            { path: ['familyHistory', 'parents', 'father', 'education'], label: 'Pai: escolaridade', chips: ['Fundamental', 'Médio', 'Superior'], single: true },
            { path: ['familyHistory', 'parents', 'father', 'health'], label: 'Pai: saúde', chips: ['Sem queixas'] },
            { path: ['familyHistory', 'siblingsInfo'], label: 'Irmãos', placeholder: 'Idade, saúde e desenvolvimento de cada irmão', rows: 2, full: true, chips: ['Filho único', 'Irmãos sem queixas'] },
            { path: ['familyHistory', 'familyDiseases'], label: 'Doenças ou queixas na família', rows: 2, full: true, chips: ['Atraso de fala', 'TEA', 'TDAH', 'Perda auditiva', 'Dislexia', 'Nenhuma conhecida'] },
            { path: ['familyHistory', 'geneticConditions'], label: 'Condições genéticas', full: true, chips: ['Nenhuma conhecida'] },
        ],
    },
    3: {
        title: 'Desenvolvimento',
        fields: [
            { path: ['development', 'gestationalAge'], label: 'Idade gestacional', placeholder: 'Ex: 39 semanas', chips: ['A termo', 'Prematuro'], single: true },
            { path: ['development', 'deliveryType'], label: 'Tipo de parto', chips: ['Normal', 'Cesárea', 'Fórceps'], single: true },
            { path: ['development', 'prenatalCare'], label: 'Pré-natal', chips: ['Completo', 'Incompleto', 'Não fez'], single: true },
            { path: ['development', 'apgarScore'], label: 'Apgar', placeholder: 'Ex: 9/10' },
            { path: ['development', 'firstWordsAge'], label: 'Primeiras palavras (idade)', placeholder: 'Ex: 1 ano e 2 meses' },
            { path: ['development', 'phraseFormationAge'], label: 'Primeiras frases (idade)', placeholder: 'Ex: 2 anos', chips: ['Ainda não forma frases'], single: true },
            { path: ['development', 'currentSpeech'], label: 'Como fala hoje', rows: 2, full: true, chips: ['Palavras isoladas', 'Frases curtas', 'Frases completas', 'Ecolalia', 'Não verbal', 'Aponta para pedir'] },
            { path: ['development', 'socialInteraction'], label: 'Interação social', rows: 2, full: true, chips: ['Interage bem', 'Pouco contato visual', 'Prefere adultos', 'Evita outras crianças'] },
            { path: ['development', 'playHabits'], label: 'Brincar', rows: 2, full: true, chips: ['Brinca junto', 'Brinca sozinho', 'Faz de conta', 'Enfileira objetos', 'Uso repetitivo de brinquedos'] },
        ],
    },
    4: {
        title: 'Hábitos',
        fields: [
            { path: ['habits', 'feeding'], label: 'Alimentação', rows: 2, chips: ['Come bem', 'Seletivo', 'Só pastosos', 'Engasga'] },
            { path: ['habits', 'sleep'], label: 'Sono', rows: 2, chips: ['Dorme bem', 'Acorda à noite', 'Demora a dormir', 'Dorme com os pais'] },
            { path: ['habits', 'elimination'], label: 'Controle esfincteriano', chips: ['Desfralde completo', 'Em desfralde', 'Usa fralda', 'Fralda só à noite'], single: true },
            { path: ['habits', 'oralHabits'], label: 'Hábitos orais', chips: ['Chupeta', 'Mamadeira', 'Chupa dedo', 'Rói unhas', 'Nenhum'] },
            { path: ['habits', 'screenTime'], label: 'Tempo de tela por dia', full: true, chips: ['Até 1 h', '1 a 3 h', 'Mais de 3 h'], single: true },
        ],
    },
    5: {
        title: 'Aspectos Escolares',
        fields: [
            { path: ['school', 'attendsSchool'], label: 'Frequenta escola?', kind: 'yesno' },
            { path: ['school', 'schoolName'], label: 'Escola', placeholder: 'Nome da escola' },
            { path: ['school', 'grade'], label: 'Série / turma', placeholder: 'Ex: Maternal II' },
            { path: ['school', 'teacher'], label: 'Professor(a)' },
            { path: ['school', 'performance'], label: 'Desempenho', rows: 2, full: true, chips: ['Adequado para a idade', 'Abaixo do esperado', 'Professora relata dificuldade'] },
            { path: ['school', 'difficulties'], label: 'Dificuldades', rows: 2, full: true, chips: ['Comunicação', 'Atenção', 'Leitura e escrita', 'Coordenação motora', 'Comportamento'] },
            { path: ['school', 'relationshipPeers'], label: 'Relação com colegas', rows: 2, chips: ['Boa', 'Prefere brincar sozinho', 'Conflitos frequentes'] },
            { path: ['school', 'relationshipTeachers'], label: 'Relação com professores', rows: 2, chips: ['Boa', 'Aceita com apoio', 'Resiste a comandos'] },
            { path: ['school', 'adaptations'], label: 'Adaptações na escola', full: true, chips: ['Nenhuma', 'Mediador', 'Rotina visual', 'Atividade adaptada'] },
        ],
    },
    6: {
        title: 'Observações Comportamentais',
        hint: 'O que você observou durante a entrevista e a avaliação.',
        fields: [
            { path: ['behavior', 'generalAppearance'], label: 'Aparência geral', chips: ['Bem cuidado', 'Ativo', 'Agitado', 'Apático'] },
            { path: ['behavior', 'emotionalState'], label: 'Estado emocional', chips: ['Tranquilo', 'Ansioso', 'Irritado', 'Choroso'] },
            { path: ['behavior', 'attention'], label: 'Atenção', chips: ['Adequada', 'Curta', 'Dispersa'], single: true },
            { path: ['behavior', 'concentration'], label: 'Concentração', chips: ['Adequada', 'Precisa de apoio', 'Muito breve'], single: true },
            { path: ['behavior', 'cooperation'], label: 'Colaboração', chips: ['Colaborativo', 'Com apoio', 'Recusou atividades'], single: true },
            { path: ['behavior', 'behaviorDuringAssessment'], label: 'Comportamento na avaliação', rows: 3, full: true, placeholder: 'Como reagiu, o que chamou atenção, como foi a separação dos pais...' },
        ],
    },
};

type Tree = Record<string, unknown>;
const getAt = (obj: unknown, path: string[]): unknown =>
    path.reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Tree)[k] : undefined), obj);
function setAt<T>(obj: T, path: string[], value: unknown): T {
    const [head, ...rest] = path;
    const node = (obj && typeof obj === 'object' ? obj : {}) as Tree;
    return { ...node, [head]: rest.length ? setAt(node[head], rest, value) : value } as T;
}
/** Acrescenta a sugestão ao texto (sem repetir) ou, em `single`, substitui. */
function applyChip(current: string, chip: string, single?: boolean): string {
    if (single) return current === chip ? '' : chip;
    const parts = current.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.some(p => p.toLowerCase() === chip.toLowerCase())) return parts.filter(p => p.toLowerCase() !== chip.toLowerCase()).join('; ');
    return [...parts, chip].join('; ');
}
const chipOn = (current: string, chip: string) =>
    current.split(';').map(p => p.trim().toLowerCase()).includes(chip.toLowerCase());

export default function AnamnesisModal({ open, onClose, onSave, patient, loading = false, initialData }: AnamnesisModalProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState<{ [k: number]: boolean }>({});

    const [formData, setFormData] = useState({
        identification: {
            interviewDate: new Date().toISOString().split('T')[0],
            interviewer: '',
            mainComplaint: '',
            complaintDuration: '',
            complaintEvolution: ''
        },
        medicalHistory: {
            pregnancy: '',
            birth: '',
            birthWeight: '',
            birthHeight: '',
            motorDevelopment: '',
            languageDevelopment: '',
            medicalConditions: '',
            hospitalizations: '',
            surgeries: '',
            allergies: '',
            medications: '',
            complementaryExams: ''
        },
        familyHistory: {
            parents: {
                mother: { age: '', education: '', occupation: '', health: '' },
                father: { age: '', education: '', occupation: '', health: '' }
            },
            siblings: [],
            /** Irmãos em texto livre (idade, saúde, desenvolvimento). */
            siblingsInfo: '',
            familyDiseases: '',
            geneticConditions: ''
        },
        development: {
            gestationalAge: '',
            prenatalCare: '',
            deliveryType: '',
            apgarScore: '',
            firstWordsAge: '',
            phraseFormationAge: '',
            currentSpeech: '',
            socialInteraction: '',
            playHabits: ''
        },
        habits: {
            feeding: '',
            sleep: '',
            elimination: '',
            oralHabits: '',
            screenTime: ''
        },
        school: {
            attendsSchool: true,
            schoolName: '',
            grade: '',
            teacher: '',
            performance: '',
            difficulties: '',
            relationshipPeers: '',
            relationshipTeachers: '',
            adaptations: ''
        },
        behavior: {
            generalAppearance: '',
            attention: '',
            concentration: '',
            behaviorDuringAssessment: '',
            cooperation: '',
            emotionalState: ''
        },
        conclusions: {
            diagnosticHypotheses: '',
            recommendations: '',
            referrals: '',
            observations: '',
            nextAppointment: ''
        }
    });

    const { requestClose, isEdit } = useReportDraft({
        open, onClose, formData, setFormData: setFormData as any, editData: initialData,
        draftKey: `fono-report-draft:anamnesis:${patient?._id || 'sem-paciente'}`,
        onOpen: () => { setActiveStep(0); setCompleted({}); },
    });

    const handleNext = () => {
        setCompleted({ ...completed, [activeStep]: true });
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleSave = () => {
        const anamnesisData = {
            type: 'anamnesis',
            title: `Anamnese - ${patient.fullName} - ${new Date().toLocaleDateString('pt-BR')}`,
            patientId: patient._id,
            patientName: patient.fullName,
            date: formData.identification.interviewDate,
            content: formData,
            status: 'completed'
        };
        onSave(anamnesisData);
    };

    const updateFormData = (section: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [field]: value
            }
        }));
    };

    const totalSteps = steps.length;
    const completedSteps = Object.keys(completed).length;
    const progress = (completedSteps / totalSteps) * 100;

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Identificação e Queixa Principal</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">
                                    Data da Entrevista
                                </label>
                                <input
                                    type="date"
                                    value={formData.identification.interviewDate}
                                    onChange={(e) => updateFormData('identification', 'interviewDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Entrevistador
                                </label>
                                <input
                                    type="text"
                                    value={formData.identification.interviewer}
                                    onChange={(e) => updateFormData('identification', 'interviewer', e.target.value)}
                                    placeholder="Seu nome"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Queixa Principal
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.identification.mainComplaint}
                                    onChange={(e) => updateFormData('identification', 'mainComplaint', e.target.value)}
                                    placeholder="Descreva detalhadamente a queixa que trouxe o paciente à terapia..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <p className="mt-1 text-sm text-gray-500">Seja específico e detalhado sobre os sintomas e preocupações</p>
                            </div>

                            <div>
                                <label className="form-label">
                                    Tempo de Duração
                                </label>
                                <input
                                    type="text"
                                    value={formData.identification.complaintDuration}
                                    onChange={(e) => updateFormData('identification', 'complaintDuration', e.target.value)}
                                    placeholder="Ex: 1 ano, 6 meses..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Evolução da Queixa
                                </label>
                                <select
                                    value={formData.identification.complaintEvolution}
                                    onChange={(e) => updateFormData('identification', 'complaintEvolution', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="piorou">Piorou Progressivamente</option>
                                    <option value="melhorou">Melhorou</option>
                                    <option value="estavel">Estável</option>
                                    <option value="flutuante">Flutuante</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Stethoscope className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Histórico Médico</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Gestação
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.pregnancy}
                                    onChange={(e) => updateFormData('medicalHistory', 'pregnancy', e.target.value)}
                                    placeholder="Complicações, medicações, saúde materna..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Nascimento
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.birth}
                                    onChange={(e) => updateFormData('medicalHistory', 'birth', e.target.value)}
                                    placeholder="Tipo de parto, complicações, peso/altura..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Desenvolvimento Motor
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.motorDevelopment}
                                    onChange={(e) => updateFormData('medicalHistory', 'motorDevelopment', e.target.value)}
                                    placeholder="Idade que sentou, engatinhou, andou..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Desenvolvimento de Linguagem
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.medicalHistory.languageDevelopment}
                                    onChange={(e) => updateFormData('medicalHistory', 'languageDevelopment', e.target.value)}
                                    placeholder="Primeiras palavras, formação de frases..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="form-label">
                                    Histórico Médico
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.medicalHistory.medicalConditions}
                                    onChange={(e) => updateFormData('medicalHistory', 'medicalConditions', e.target.value)}
                                    placeholder="Doenças, internações, cirurgias, alergias..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 7:
                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Conclusões e Encaminhamentos</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="form-label">
                                    Hipóteses Diagnósticas
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.conclusions.diagnosticHypotheses}
                                    onChange={(e) => updateFormData('conclusions', 'diagnosticHypotheses', e.target.value)}
                                    placeholder="Suas impressões e hipóteses iniciais..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Recomendações
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.conclusions.recommendations}
                                    onChange={(e) => updateFormData('conclusions', 'recommendations', e.target.value)}
                                    placeholder="Orientações e recomendações iniciais..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">
                                        Encaminhamentos
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.conclusions.referrals}
                                        onChange={(e) => updateFormData('conclusions', 'referrals', e.target.value)}
                                        placeholder="Outros profissionais necessários..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">
                                        Próxima Consulta
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.conclusions.nextAppointment}
                                        onChange={(e) => updateFormData('conclusions', 'nextAppointment', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default: {
                const current = steps[step];
                const Icon = current.icon;
                const def = EXTRA_STEPS[step];
                if (!def) return null;
                const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

                return (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 ${current.bgColor} rounded-lg`}>
                                <Icon className={`w-5 h-5 ${current.textColor}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{def.title}</h3>
                        </div>
                        <p className="mb-5 text-sm text-gray-600">{def.hint || 'Toque nas sugestões para preencher mais rápido. Tudo continua editável.'}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {def.fields.map(f => {
                                const id = `anm-${f.path.join('-')}`;
                                const raw = getAt(formData, f.path);
                                if (f.kind === 'yesno') {
                                    const yes = raw !== false;
                                    return (
                                        <div key={id} className={f.full ? 'md:col-span-2' : ''}>
                                            <span className="form-label">{f.label}</span>
                                            <div className="flex gap-2" role="group" aria-label={f.label}>
                                                {[true, false].map(v => (
                                                    <button key={String(v)} type="button" aria-pressed={yes === v}
                                                        onClick={() => setFormData(prev => setAt(prev, f.path, v))}
                                                        className={`min-h-10 rounded-lg border px-4 text-sm font-semibold transition-colors ${yes === v ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                                        {v ? 'Sim' : 'Não'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
                                const setValue = (v: string) => setFormData(prev => setAt(prev, f.path, v));
                                return (
                                    <div key={id} className={f.full ? 'md:col-span-2' : ''}>
                                        <label htmlFor={id} className="form-label">{f.label}</label>
                                        {f.rows ? (
                                            <textarea id={id} rows={f.rows} value={value} placeholder={f.placeholder}
                                                onChange={(e) => setValue(e.target.value)} className={inputCls} />
                                        ) : (
                                            <input id={id} type="text" value={value} placeholder={f.placeholder}
                                                onChange={(e) => setValue(e.target.value)} className={inputCls} />
                                        )}
                                        {f.chips && (
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {f.chips.map(c => {
                                                    const on = f.single ? value === c : chipOn(value, c);
                                                    return (
                                                        <button key={c} type="button" aria-pressed={on}
                                                            onClick={() => setValue(applyChip(value, c, f.single))}
                                                            className={`min-h-7 rounded-full border px-2.5 text-xs font-semibold transition-colors ${on ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                                                            {on ? '✓ ' : '+ '}{c}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={requestClose}></div>

                {/* Modal panel */}
                <div className="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {isEdit ? 'Editar Anamnese' : 'Nova Anamnese'}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {patient.fullName} • {new Date().toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <button
                                onClick={requestClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    Progresso: {completedSteps}/{totalSteps}
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:h-[600px]">
                        {/* Sidebar - Steps */}
                        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 p-3 md:p-4 overflow-x-auto md:overflow-x-visible md:overflow-y-auto flex-shrink-0">
                            <div className="flex gap-2 md:flex-col md:space-y-2 md:gap-0">
                                {steps.map((step, index) => {
                                    const isActive = index === activeStep;
                                    const isCompleted = completed[index];
                                    const Icon = step.icon;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setActiveStep(index)}
                                            className={`flex-shrink-0 min-w-[130px] md:min-w-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-3 rounded-lg text-left transition-all ${isActive
                                                ? 'bg-white shadow-sm border border-blue-200 text-blue-700'
                                                : isCompleted
                                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${isActive
                                                ? 'bg-blue-100'
                                                : isCompleted
                                                    ? 'bg-green-100'
                                                    : 'bg-gray-100'
                                                }`}>
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : step.bgColor
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs md:text-sm font-medium truncate">{step.label}</div>
                                                <div className={`text-xs hidden md:block ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                    {isCompleted ? 'Concluído' : isActive ? 'Atual' : 'Pendente'}
                                                </div>
                                            </div>
                                            {isCompleted && (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {renderStepContent(activeStep)}

                            {/* Navigation buttons */}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={handleBack}
                                    disabled={activeStep === 0}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeStep === 0
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={requestClose}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>

                                    {activeStep === steps.length - 1 ? (
                                        <button
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Salvar Anamnese
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleNext}
                                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Continuar
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
