import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDateForInput, toLocalDate } from '../../utils/dateHelper';
import { Button } from '../ui/Button';

// ============================================
// TIPOS
// ============================================
type MetricType = {
    id: string;
    name: string;
    description: string;
    minValue: number;
    maxValue: number;
    unit: string;
};

type AreaType = {
    id: string;
    name: string;
};

export type NewEvaluationForm = {
    date: string; // yyyy-MM-dd
    time: string;
    content: string;
    metrics: Record<string, number>;
    areaScores: Record<string, number>;
};

type NewEvaluationModalProps = {
    open: boolean;
    onClose: () => void;
    onSave: (data: NewEvaluationForm) => Promise<void> | void;
    currentPlan?: any | null;
    objectives?: any[];
    protocols?: any[];
    selectedProtocolCode?: string | null;
    onSelectProtocol?: (code: string) => void;
    protocolsLoading?: boolean;
    protocolsError?: string | null;
    // NOVO: permite recarregar protocolos quando muda especialidade
    onSpecialtyChange?: (specialty: string) => void;
    doctorSpecialty?: string;
    // Última evolução do paciente (para pré-preencher continuidade)
    lastEvolution?: any | null;
};

// ============================================
// TEMPLATES POR ESPECIALIDADE
// ============================================
const SPECIALTY_TEMPLATES: Record<string, { metrics: MetricType[]; areas: AreaType[] }> = {
    fonoaudiologia: {
        metrics: [
            { id: 'articulacao', name: 'Articulação', description: 'Capacidade de articulação de fonemas', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'fluencia', name: 'Fluência', description: 'Fluência na fala', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'compreensao', name: 'Compreensão', description: 'Compreensão de comandos verbais', minValue: 0, maxValue: 10, unit: 'pts' }
        ],
        areas: [
            { id: 'linguagem_expressiva', name: 'Linguagem Expressiva' },
            { id: 'linguagem_receptiva', name: 'Linguagem Receptiva' },
            { id: 'pragmatica', name: 'Pragmática' },
            { id: 'voz', name: 'Voz' },
            { id: 'motricidade_orofacial', name: 'Motricidade Orofacial' }
        ]
    },
    psicologia: {
        metrics: [
            { id: 'regulacao_emocional', name: 'Regulação Emocional', description: 'Capacidade de gerenciar emoções', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'atencao', name: 'Atenção Sustentada', description: 'Tempo de foco em atividades', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'flexibilidade', name: 'Flexibilidade Cognitiva', description: 'Adaptação a mudanças', minValue: 0, maxValue: 10, unit: 'pts' }
        ],
        areas: [
            { id: 'comportamento', name: 'Comportamento' },
            { id: 'social', name: 'Interação Social' },
            { id: 'cognitivo', name: 'Cognitivo' },
            { id: 'emocional', name: 'Emocional' },
            { id: 'autonomia', name: 'Autonomia' }
        ]
    },
    terapia_ocupacional: {
        metrics: [
            { id: 'coord_motora_fina', name: 'Coord. Motora Fina', description: 'Precisão de movimentos finos', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'coord_motora_grossa', name: 'Coord. Motora Grossa', description: 'Movimentos amplos', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'integracao_sensorial', name: 'Integração Sensorial', description: 'Processamento sensorial', minValue: 0, maxValue: 10, unit: 'pts' }
        ],
        areas: [
            { id: 'motor', name: 'Motor' },
            { id: 'sensorial', name: 'Sensorial' },
            { id: 'avds', name: 'AVDs (Atividades de Vida Diária)' },
            { id: 'praxia', name: 'Praxia' },
            { id: 'grafomotor', name: 'Grafomotor' }
        ]
    },
    fisioterapia: {
        metrics: [
            { id: 'forca_muscular', name: 'Força Muscular', description: 'Avaliação de força', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'equilibrio', name: 'Equilíbrio', description: 'Controle postural', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'amplitude', name: 'Amplitude de Movimento', description: 'ADM articular', minValue: 0, maxValue: 10, unit: 'pts' }
        ],
        areas: [
            { id: 'postural', name: 'Controle Postural' },
            { id: 'marcha', name: 'Marcha' },
            { id: 'respiratorio', name: 'Respiratório' },
            { id: 'neuromotor', name: 'Neuromotor' }
        ]
    },
    neuropsicologia: {
        metrics: [
            { id: 'memoria_trabalho', name: 'Memória de Trabalho', description: 'Retenção temporária', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'funcoes_executivas', name: 'Funções Executivas', description: 'Planejamento e organização', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'velocidade_processamento', name: 'Velocidade de Processamento', description: 'Rapidez cognitiva', minValue: 0, maxValue: 10, unit: 'pts' }
        ],
        areas: [
            { id: 'atencao', name: 'Atenção' },
            { id: 'memoria', name: 'Memória' },
            { id: 'linguagem', name: 'Linguagem' },
            { id: 'visuoespacial', name: 'Visuoespacial' },
            { id: 'executivo', name: 'Executivo' }
        ]
    },
    musicoterapia: {
        metrics: [
            { id: 'expressao_musical', name: 'Expressão Musical', description: 'Capacidade expressiva através da música', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'ritmo', name: 'Percepção Rítmica', description: 'Acompanhamento de ritmos', minValue: 0, maxValue: 10, unit: 'pts' },
            { id: 'interacao_musical', name: 'Interação Musical', description: 'Engajamento em atividades musicais', minValue: 0, maxValue: 10, unit: 'pts' }
        ],
        areas: [
            { id: 'comunicacao', name: 'Comunicação' },
            { id: 'expressao_emocional', name: 'Expressão Emocional' },
            { id: 'socializacao', name: 'Socialização' },
            { id: 'motor_musical', name: 'Motor (via música)' }
        ]
    }
};

// Valores padrão (vazio para começar do zero)
const DEFAULT_METRICS: MetricType[] = [];
const DEFAULT_AREAS: AreaType[] = [];

// ============================================
// MODAL: ADICIONAR MÉTRICA
// ============================================
function AddMetricModal({
    open,
    onClose,
    onAdd
}: {
    open: boolean;
    onClose: () => void;
    onAdd: (metric: MetricType) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [minValue, setMinValue] = useState(0);
    const [maxValue, setMaxValue] = useState(10);
    const [unit, setUnit] = useState('pts');

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Preencha o nome da métrica');
            return;
        }

        onAdd({
            id: name.toLowerCase().replace(/\s+/g, '_'),
            name: name.trim(),
            description: description.trim(),
            minValue: Number(minValue),
            maxValue: Number(maxValue),
            unit: unit.trim()
        });

        // Reset form
        setName('');
        setDescription('');
        setMinValue(0);
        setMaxValue(10);
        setUnit('pts');
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
                <div className="bg-gradient-to-r from-green-600 to-cyan-500 p-6 rounded-t-2xl">
                    <h3 className="font-bold text-xl text-white">Adicionar Nova Métrica</h3>
                    <p className="text-green-50 text-sm mt-1">Configure uma nova métrica de avaliação</p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Nome da Métrica *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Coordenação Motora"
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Descrição</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o que esta métrica avalia..."
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 h-20 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Valor Mínimo</label>
                            <input
                                type="number"
                                value={minValue}
                                onChange={(e) => setMinValue(Number(e.target.value))}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Valor Máximo</label>
                            <input
                                type="number"
                                value={maxValue}
                                onChange={(e) => setMaxValue(Number(e.target.value))}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Unidade</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="Ex: pts, %, cm"
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="px-6 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-cyan-500 text-white rounded-xl"
                    >
                        Adicionar
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MODAL: ADICIONAR ÁREA
// ============================================
function AddAreaModal({
    open,
    onClose,
    onAdd
}: {
    open: boolean;
    onClose: () => void;
    onAdd: (area: AreaType) => void;
}) {
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Preencha o nome da área');
            return;
        }

        onAdd({
            id: name.toLowerCase().replace(/\s+/g, '_'),
            name: name.trim()
        });

        setName('');
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-300">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-500 p-6 rounded-t-2xl">
                    <h3 className="font-bold text-xl text-white">Adicionar Nova Área</h3>
                    <p className="text-cyan-50 text-sm mt-1">Crie uma nova área de desenvolvimento</p>
                </div>

                <div className="p-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Nome da Área *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Coordenação Motora"
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="px-6 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-500 text-white rounded-xl"
                    >
                        Adicionar
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function NewEvaluationModal({
    open,
    onClose,
    onSave,
    currentPlan,
    objectives = [],
    protocols = [],
    selectedProtocolCode,
    protocolsLoading,
    protocolsError,
    onSelectProtocol,
    lastEvolution
}: NewEvaluationModalProps) {
    const [metrics, setMetrics] = useState<Record<string, number>>({});
    const [areaScores, setAreaScores] = useState<Record<string, number>>({});
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState<string>('10:00');
    const [content, setContent] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Estados para modais
    const [showAddMetricModal, setShowAddMetricModal] = useState(false);
    const [showAddAreaModal, setShowAddAreaModal] = useState(false);

    // Estados para métricas e áreas dinâmicas
    const [dynamicMetrics, setDynamicMetrics] = useState<MetricType[]>(DEFAULT_METRICS);
    const [dynamicAreas, setDynamicAreas] = useState<AreaType[]>(DEFAULT_AREAS);

    // Especialidade selecionada
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

    // Inicializa sliders quando métricas/áreas mudam
    useEffect(() => {
        if (!open) return;

        const initialMetrics: Record<string, number> = {};
        dynamicMetrics.forEach(m => {
            initialMetrics[m.name] = 0;
        });

        const initialAreas: Record<string, number> = {};
        dynamicAreas.forEach(t => {
            initialAreas[t.id] = 0;
        });

        setMetrics(initialMetrics);
        setAreaScores(initialAreas);
    }, [open, dynamicMetrics, dynamicAreas]);

    // Reset / pré-preenchimento quando abre
    useEffect(() => {
        if (!open) return;

        setDate(format(new Date(), 'yyyy-MM-dd'));
        setTime('10:00');

        // Sempre começa limpo — sem cards pré-carregados
        setContent('');
        setDynamicMetrics([]);
        setDynamicAreas([]);
        setSelectedSpecialty('');
        setMetrics({});
        setAreaScores({});
    }, [open, lastEvolution]);

    // Handler para carregar template de especialidade - AGORA SÓ ADICIONA AO CATALOGO
    const handleLoadTemplate = (specialty: string) => {
        setSelectedSpecialty(specialty);
        
        // NOVO: Notifica o componente pai para recarregar protocolos da especialidade
        if (onSpecialtyChange && specialty) {
            onSpecialtyChange(specialty);
        }
        
        // ALTERADO: Nao pre-preenche mais automaticamente
        // Agora so limpa para o medico adicionar manualmente do catalogo
        setDynamicMetrics([]);
        setDynamicAreas([]);
    };
    
    // NOVO: Funcao para adicionar TODAS as metricas do template (se o medico quiser)
    const handleLoadAllMetricsFromTemplate = () => {
        if (selectedSpecialty && SPECIALTY_TEMPLATES[selectedSpecialty]) {
            const template = SPECIALTY_TEMPLATES[selectedSpecialty];
            setDynamicMetrics([...template.metrics]);
            setDynamicAreas([...template.areas]);
        }
    };
    
    // NOVO: Funcao para adicionar metrica especifica do template
    const handleAddMetricFromTemplate = (metricId: string) => {
        if (selectedSpecialty && SPECIALTY_TEMPLATES[selectedSpecialty]) {
            const template = SPECIALTY_TEMPLATES[selectedSpecialty];
            const metric = template.metrics.find(m => m.id === metricId);
            if (metric && !dynamicMetrics.find(m => m.id === metricId)) {
                setDynamicMetrics(prev => [...prev, metric]);
            }
        }
    };
    
    // NOVO: Funcao para adicionar area especifica do template
    const handleAddAreaFromTemplate = (areaId: string) => {
        if (selectedSpecialty && SPECIALTY_TEMPLATES[selectedSpecialty]) {
            const template = SPECIALTY_TEMPLATES[selectedSpecialty];
            const area = template.areas.find(a => a.id === areaId);
            if (area && !dynamicAreas.find(a => a.id === areaId)) {
                setDynamicAreas(prev => [...prev, area]);
            }
        }
    };

    const handleMetricChange = (metricName: string, value: string | number) => {
        setMetrics(prev => ({
            ...prev,
            [metricName]: Number(value)
        }));
    };

    const handleAreaScoreChange = (areaId: string, value: string | number) => {
        const v = Math.max(0, Math.min(10, Number(value || 0)));
        setAreaScores(prev => ({
            ...prev,
            [areaId]: v
        }));
    };

    const handleRemoveMetric = (metricId: string) => {
        setDynamicMetrics(prev => prev.filter(m => m.id !== metricId));
    };

    const handleRemoveArea = (areaId: string) => {
        setDynamicAreas(prev => prev.filter(a => a.id !== areaId));
    };

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert('Preencha o relatório clínico antes de salvar.');
            return;
        }

        try {
            setSaving(true);
            await onSave({
                date,
                time,
                content: content.trim(),
                metrics,
                areaScores
            });
        } finally {
            setSaving(false);
        }
    };

    // Funções para adicionar métricas e áreas
    const handleAddMetric = (newMetric: MetricType) => {
        setDynamicMetrics(prev => [...prev, newMetric]);
    };

    const handleAddArea = (newArea: AreaType) => {
        setDynamicAreas(prev => [...prev, newArea]);
    };

    if (!open) return null;

    return (
        <>
            <AddMetricModal
                open={showAddMetricModal}
                onClose={() => setShowAddMetricModal(false)}
                onAdd={handleAddMetric}
            />
            <AddAreaModal
                open={showAddAreaModal}
                onClose={() => setShowAddAreaModal(false)}
                onAdd={handleAddArea}
            />

            <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300">
                    {/* HEADER */}
                    <div className="bg-gradient-to-br from-green-600 via-green-500 to-cyan-500 p-4 sm:p-8 rounded-t-3xl shrink-0">
                        <h3 className="font-bold text-xl sm:text-3xl text-white drop-shadow-lg">Nova Avaliação</h3>
                        <p className="text-green-50 text-sm sm:text-base mt-1 sm:mt-2 font-light">
                            Preencha os dados da avaliação do paciente com atenção
                        </p>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-8 bg-gradient-to-br from-gray-50 to-white">

                        {/* ⚡ SELETOR DE ESPECIALIDADE / TEMPLATE */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚡</span>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">Selecionar Especialidade</h4>
                                    <p className="text-sm text-gray-600">Escolha a especialidade para carregar o catálogo de métricas e protocolos específicos</p>
                                </div>
                            </div>
                            <select
                                value={selectedSpecialty}
                                onChange={(e) => handleLoadTemplate(e.target.value)}
                                className="w-full p-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 bg-white font-medium"
                            >
                                <option value="">-- Selecione uma especialidade --</option>
                                <option value="fonoaudiologia">🗣️ Fonoaudiologia</option>
                                <option value="psicologia">🧠 Psicologia</option>
                                <option value="terapia_ocupacional">✋ Terapia Ocupacional</option>
                                <option value="fisioterapia">🏃 Fisioterapia</option>
                                <option value="neuropsicologia">🔬 Neuropsicologia</option>
                                <option value="musicoterapia">🎵 Musicoterapia</option>
                                <option value="psicomotricidade">🤸 Psicomotricidade</option>
                                <option value="psicopedagogia">📚 Psicopedagogia</option>
                            </select>
                            
                            {selectedSpecialty && (
                                <div className="space-y-2">
                                    <p className="text-xs text-amber-700 bg-amber-100 rounded-lg p-2">
                                        📋 Catálogo de <strong>{selectedSpecialty}</strong> disponível. Adicione as métricas e áreas que foram avaliadas.
                                    </p>
                                    
                                    {/* Botão para carregar tudo (se o medico quiser) */}
                                    <button
                                        onClick={handleLoadAllMetricsFromTemplate}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                                    >
                                        📝 Ou clique aqui para carregar TODAS as métricas de {selectedSpecialty}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Catalogo de Métricas da Especialidade Selecionada */}
                        {selectedSpecialty && SPECIALTY_TEMPLATES[selectedSpecialty] && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 space-y-4">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <span>📚</span> Catálogo de {selectedSpecialty}
                                </h4>
                                <p className="text-sm text-gray-600">
                                    Clique nos itens abaixo para adicionar à avaliação:
                                </p>
                                
                                {/* Métricas disponíveis */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Métricas disponíveis:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {SPECIALTY_TEMPLATES[selectedSpecialty].metrics.map((metric) => {
                                            const isAdded = dynamicMetrics.find(m => m.id === metric.id);
                                            return (
                                                <button
                                                    key={metric.id}
                                                    onClick={() => handleAddMetricFromTemplate(metric.id)}
                                                    disabled={!!isAdded}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                                        isAdded 
                                                            ? 'bg-green-100 text-green-700 cursor-default' 
                                                            : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'
                                                    }`}
                                                >
                                                    {isAdded ? '✓ ' : '+ '}{metric.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                {/* Áreas disponíveis */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Áreas disponíveis:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {SPECIALTY_TEMPLATES[selectedSpecialty].areas.map((area) => {
                                            const isAdded = dynamicAreas.find(a => a.id === area.id);
                                            return (
                                                <button
                                                    key={area.id}
                                                    onClick={() => handleAddAreaFromTemplate(area.id)}
                                                    disabled={!!isAdded}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                                        isAdded 
                                                            ? 'bg-green-100 text-green-700 cursor-default' 
                                                            : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-100'
                                                    }`}
                                                >
                                                    {isAdded ? '✓ ' : '+ '}{area.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🎯 Plano terapêutico / Protocolo */}
                        <div className="border-2 border-gray-200 rounded-2xl bg-white shadow-lg p-6 space-y-4">
                            <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <span className="text-xl">🎯</span>
                                Plano terapêutico / Protocolo
                            </h4>

                            {/* Protocolo atual */}
                            {currentPlan?.protocol && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm font-semibold text-gray-700">
                                        ✓ Protocolo atual: {currentPlan.protocol.name}
                                        {currentPlan.protocol.code && ` (${currentPlan.protocol.code})`}
                                    </p>
                                </div>
                            )}

                            {/* SELECT SEMPRE VISÍVEL SE TEM ARRAY */}
                            {Array.isArray(protocols) && protocols.length > 0 ? (
                                <div className="space-y-2 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-gray-900">
                                            ✨ Selecionar Protocolo
                                        </label>
                                        <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-3 py-1 rounded-full">
                                            {protocols.length} disponíveis
                                        </span>
                                    </div>

                                    <select
                                        value={selectedProtocolCode ?? ''}
                                        onChange={(e) => {
                                            console.log('🎯 PROTOCOLO SELECIONADO:', e.target.value);
                                            onSelectProtocol?.(e.target.value || '');
                                        }}
                                        className="w-full p-4 text-base font-medium border-2 border-emerald-400 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 bg-white"
                                    >
                                        <option value="">-- Escolha um protocolo --</option>
                                        {protocols.map((p: any) => (
                                            <option key={p.code} value={p.code} className="text-base">
                                                {p.code} - {p.name}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedProtocolCode && (
                                        <p className="text-xs text-green-700 bg-green-100 rounded p-2 mt-2">
                                            ✓ Protocolo "{selectedProtocolCode}" será vinculado a esta avaliação
                                        </p>
                                    )}

                                    {/* Detalhes do protocolo selecionado */}
                                    {selectedProtocolCode && (() => {
                                        const selectedProtocol = protocols.find((p: any) => p.code === selectedProtocolCode);
                                        if (!selectedProtocol) return null;

                                        return (
                                            <div className="mt-4 bg-gradient-to-br from-green-50 to-cyan-50 border-2 border-green-300 rounded-xl p-5 space-y-4">
                                                {/* Header */}
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h5 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                            <span className="text-xl">📋</span>
                                                            {selectedProtocol.name}
                                                        </h5>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Código: {selectedProtocol.code}
                                                        </p>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                                        {selectedProtocol.specialty}
                                                    </span>
                                                </div>

                                                {/* Descrição */}
                                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {selectedProtocol.description}
                                                    </p>
                                                </div>

                                                {/* Duração e Áreas */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white rounded-lg p-3 border border-green-200">
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">
                                                            ⏱️ Duração Típica
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {selectedProtocol.typicalDuration}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border border-green-200">
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">
                                                            🎯 Áreas Aplicáveis
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedProtocol.applicableAreas?.map((area: string) => (
                                                                <span
                                                                    key={area}
                                                                    className="px-2 py-0.5 bg-cyan-100 text-cyan-800 text-xs rounded-full font-medium"
                                                                >
                                                                    {area}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Técnicas Principais */}
                                                {selectedProtocol.keyTechniques && selectedProtocol.keyTechniques.length > 0 && (
                                                    <div className="bg-white rounded-lg p-4 border border-green-200">
                                                        <p className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                                                            <span>🔧</span>
                                                            Técnicas Principais
                                                        </p>
                                                        <ul className="space-y-1">
                                                            {selectedProtocol.keyTechniques.slice(0, 4).map((technique: string, idx: number) => (
                                                                <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                                                    <span className="text-green-500 mt-0.5">•</span>
                                                                    <span>{technique}</span>
                                                                </li>
                                                            ))}
                                                            {selectedProtocol.keyTechniques.length > 4 && (
                                                                <li className="text-xs text-gray-500 italic">
                                                                    +{selectedProtocol.keyTechniques.length - 4} técnicas adicionais
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Metas Mensuráveis */}
                                                {selectedProtocol.measurableGoals && selectedProtocol.measurableGoals.length > 0 && (
                                                    <div className="bg-white rounded-lg p-4 border border-green-200">
                                                        <p className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                                                            <span>🎯</span>
                                                            Metas Mensuráveis
                                                        </p>
                                                        <ul className="space-y-1">
                                                            {selectedProtocol.measurableGoals.slice(0, 4).map((goal: string, idx: number) => (
                                                                <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                                                    <span className="text-cyan-500 mt-0.5">✓</span>
                                                                    <span>{goal}</span>
                                                                </li>
                                                            ))}
                                                            {selectedProtocol.measurableGoals.length > 4 && (
                                                                <li className="text-xs text-gray-500 italic">
                                                                    +{selectedProtocol.measurableGoals.length - 4} metas adicionais
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Referências */}
                                                {selectedProtocol.references && selectedProtocol.references.length > 0 && (
                                                    <div className="bg-white rounded-lg p-3 border border-green-200">
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">
                                                            📚 Referências
                                                        </p>
                                                        {selectedProtocol.references.map((ref: any, idx: number) => (
                                                            <p key={idx} className="text-xs text-gray-600">
                                                                • {ref.title}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800">
                                        💡 Nenhum protocolo disponível ({protocols?.length ?? 0} no array)
                                    </p>
                                </div>
                            )}

                            {/* Objetivos */}
                            {objectives && objectives.length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    <p className="text-xs font-semibold text-blue-900 mb-2">
                                        📋 Objetivos atuais:
                                    </p>
                                    {objectives.map((obj: any, idx: number) => (
                                        <div key={idx} className="text-xs text-blue-800 bg-white rounded p-2 mb-1">
                                            <span className="font-semibold">{obj.area}:</span> {obj.description}
                                            <span className="text-blue-600 ml-1">({obj.current}/{obj.target})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Data e hora */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-sm font-semibold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">
                                    📅 Data da Avaliação
                                </label>
                                <DatePicker
                                    selected={date ? toLocalDate(date) : null}
                                    onChange={(d) => {
                                        if (!d) return;
                                        setDate(formatDateForInput(d));
                                    }}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/MM/yyyy"
                                    className="w-full py-4 px-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-sm font-semibold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">
                                    🕐 Horário
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all shadow-sm hover:shadow-md"
                                />
                            </div>
                        </div>

                        {/* Relatório clínico */}
                        <div className="group">
                            <label className="block text-sm font-semibold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">
                                📝 Relatório Clínico Detalhado
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Descreva detalhadamente a evolução do paciente, observações relevantes e próximos passos..."
                                className="w-full p-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all h-36 resize-none shadow-sm hover:shadow-md font-light"
                            />
                        </div>

                        {/* Métricas */}
                        <div className="space-y-6">
                            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                                <div className="bg-gradient-to-r from-green-50 to-cyan-50 p-6 border-b-2 border-green-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                            <span className="text-2xl">📊</span>
                                            Métricas de Avaliação
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {dynamicMetrics.length === 0
                                                ? 'Selecione uma especialidade ou adicione métricas manualmente'
                                                : `${dynamicMetrics.length} métricas configuradas`
                                            }
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setShowAddMetricModal(true)}
                                        className="bg-gradient-to-r from-green-600 to-cyan-500 text-white px-4 py-2 rounded-xl font-semibold hover:scale-105 transition-transform flex items-center gap-2"
                                        title="Adicionar nova métrica"
                                    >
                                        <span>➕</span>
                                        <span className="hidden sm:inline">Adicionar</span>
                                    </Button>
                                </div>
                                <div className="p-6 space-y-6 bg-white">
                                    {dynamicMetrics.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-4xl mb-3">📊</p>
                                            <p className="font-medium">Nenhuma métrica configurada</p>
                                            <p className="text-sm mt-1">Selecione uma especialidade acima ou adicione manualmente</p>
                                        </div>
                                    ) : (
                                        dynamicMetrics.map(metric => (
                                            <div
                                                key={metric.id}
                                                className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all relative group"
                                            >
                                                {/* Botão remover */}
                                                <button
                                                    onClick={() => handleRemoveMetric(metric.id)}
                                                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remover métrica"
                                                >
                                                    ✕
                                                </button>

                                                <div className="flex items-center justify-between pr-10">
                                                    <div>
                                                        <label className="block text-base font-semibold text-gray-800">
                                                            {metric.name}
                                                        </label>
                                                        {metric.description && (
                                                            <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-2xl font-bold text-green-600 bg-green-100 px-5 py-2 rounded-full shadow-sm min-w-[70px] text-center">
                                                        {metrics[metric.name] ?? metric.minValue}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={metric.minValue}
                                                    max={metric.maxValue}
                                                    value={metrics[metric.name] ?? metric.minValue}
                                                    onChange={(e) => handleMetricChange(metric.name, e.target.value)}
                                                    className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer shadow-inner slider-thumb"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                    <span>{metric.minValue} - Baixo</span>
                                                    <span>{metric.maxValue} - Excelente</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Áreas de desenvolvimento */}
                            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                                <div className="bg-gradient-to-r from-cyan-50 to-green-50 p-6 border-b-2 border-cyan-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                            <span className="text-2xl">🎯</span>
                                            Áreas de Desenvolvimento
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {dynamicAreas.length === 0
                                                ? 'Selecione uma especialidade ou adicione áreas manualmente'
                                                : `${dynamicAreas.length} áreas configuradas`
                                            }
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setShowAddAreaModal(true)}
                                        className="bg-gradient-to-r from-cyan-600 to-blue-500 text-white px-4 py-2 rounded-xl font-semibold hover:scale-105 transition-transform flex items-center gap-2"
                                        title="Adicionar nova área"
                                    >
                                        <span>➕</span>
                                        <span className="hidden sm:inline">Adicionar</span>
                                    </Button>
                                </div>
                                <div className="p-6 bg-white">
                                    {dynamicAreas.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-4xl mb-3">🎯</p>
                                            <p className="font-medium">Nenhuma área configurada</p>
                                            <p className="text-sm mt-1">Selecione uma especialidade acima ou adicione manualmente</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {dynamicAreas.map(type => {
                                                const value = areaScores[type.id] ?? 0;
                                                return (
                                                    <div
                                                        key={type.id}
                                                        className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all relative group"
                                                    >
                                                        {/* Botão remover */}
                                                        <button
                                                            onClick={() => handleRemoveArea(type.id)}
                                                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remover área"
                                                        >
                                                            ✕
                                                        </button>

                                                        <div className="flex items-center justify-between pr-10">
                                                            <label className="block text-base font-semibold text-gray-800">
                                                                {type.name}
                                                            </label>
                                                            <span className="text-2xl font-bold text-cyan-600 bg-cyan-100 px-5 py-2 rounded-full shadow-sm min-w-[70px] text-center">
                                                                {value}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={10}
                                                            step={1}
                                                            value={value}
                                                            onChange={(e) => handleAreaScoreChange(type.id, e.target.value)}
                                                            className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer shadow-inner slider-thumb"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                            <span>0 - Ausente</span>
                                                            <span>10 - Excelente</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="shrink-0 border-t-2 border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-white rounded-b-3xl">
                        <div className="flex justify-end gap-4">
                            <Button
                                variant="outline"
                                disabled={saving}
                                onClick={onClose}
                                className="px-8 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-all hover:scale-105"
                            >
                                Cancelar
                            </Button>
                            <Button
                                disabled={saving}
                                onClick={handleSubmit}
                                className="px-8 py-3 bg-gradient-to-r from-green-600 to-cyan-500 hover:from-green-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl font-semibold transition-all hover:scale-105"
                            >
                                {saving ? 'Salvando...' : '✓ Salvar Avaliação'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .slider-thumb::-webkit-slider-thumb {
                    appearance: none;
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                    transition: all 0.3s ease;
                }

                .slider-thumb::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
                }

                .slider-thumb::-moz-range-thumb {
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                }

                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes zoom-in {
                    from { transform: scale(0.95); }
                    to { transform: scale(1); }
                }

                .animate-in {
                    animation: fade-in 0.3s ease-out, zoom-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
}

// ============================================
// EXPORTS (ambos formatos para compatibilidade)
// ============================================
export default NewEvaluationModal;
