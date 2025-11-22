import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDateForInput, toLocalDate } from '../../utils/dateHelper';
import { Button } from '../ui/Button';

const EVALUATION_TYPES = [
    { id: 'language', name: 'Linguagem' },
    { id: 'motor', name: 'Motor' },
    { id: 'cognitive', name: 'Cognitivo' },
    { id: 'behavior', name: 'Comportamento' },
    { id: 'social', name: 'Social' }
];

const SPEECH_METRICS = [
    {
        id: 'articulacao',
        name: 'Articulação',
        description: 'Capacidade de articulação de fonemas',
        minValue: 0,
        maxValue: 10,
        unit: 'pts'
    },
    {
        id: 'fluencia',
        name: 'Fluência',
        description: 'Fluência na fala',
        minValue: 0,
        maxValue: 10,
        unit: 'pts'
    },
    {
        id: 'compreensao',
        name: 'Compreensão',
        description: 'Compreensão de comandos verbais',
        minValue: 0,
        maxValue: 10,
        unit: 'pts'
    }
];

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
};

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
    onSelectProtocol
}: NewEvaluationModalProps) {
    const [metrics, setMetrics] = useState<Record<string, number>>({});
    const [areaScores, setAreaScores] = useState<Record<string, number>>({});
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState<string>('10:00');
    const [content, setContent] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // inicializa sliders
    useEffect(() => {
        if (!open) return;

        const initialMetrics: Record<string, number> = {};
        SPEECH_METRICS.forEach(m => {
            initialMetrics[m.name] = 5;
        });

        const initialAreas: Record<string, number> = {};
        EVALUATION_TYPES.forEach(t => {
            initialAreas[t.id] = 3;
        });

        setMetrics(initialMetrics);
        setAreaScores(initialAreas);
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setTime('10:00');
        setContent('');
    }, [open]);

    const handleMetricChange = (metricName: string, value: string | number) => {
        setMetrics(prev => ({
            ...prev,
            [metricName]: Number(value)
        }));
    };

    console.log('📊 MODAL PROPS:', {
        protocols,
        'protocols.length': protocols?.length,
        protocolsLoading,
        protocolsError,
        'protocols existe?': !!protocols,
        'protocols é array?': Array.isArray(protocols),
        'primeiro protocolo': protocols?.[0]
    });
    const handleAreaScoreChange = (areaId: string, value: string | number) => {
        const v = Math.max(0, Math.min(10, Number(value || 0)));
        setAreaScores(prev => ({
            ...prev,
            [areaId]: v
        }));
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

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300">
                {/* HEADER */}
                <div className="bg-gradient-to-br from-green-600 via-green-500 to-cyan-500 p-8 rounded-t-3xl shrink-0">
                    <h3 className="font-bold text-3xl text-white drop-shadow-lg">Nova Avaliação</h3>
                    <p className="text-green-50 text-base mt-2 font-light">
                        Preencha os dados da avaliação do paciente com atenção
                    </p>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gradient-to-br from-gray-50 to-white">
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
                                    className="w-full p-4 text-base font-medium border-2 border-blue-400 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
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

                                {/* ✅ ADICIONE ESTE BLOCO AQUI */}
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
                            <div className="bg-gradient-to-r from-green-50 to-cyan-50 p-6 border-b-2 border-green-100">
                                <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                    <span className="text-2xl">📊</span>
                                    Métricas de Avaliação
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">Avalie cada aspecto de 0 a 10</p>
                            </div>
                            <div className="p-6 space-y-6 bg-white">
                                {SPEECH_METRICS.map(metric => (
                                    <div
                                        key={metric.id}
                                        className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all slider-thumb"
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="block text-base font-semibold text-gray-800">
                                                {metric.name}
                                            </label>
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
                                            className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer shadow-inner"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                                            <span>{metric.minValue} - Baixo</span>
                                            <span>{metric.maxValue} - Excelente</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Áreas de desenvolvimento */}
                        <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                            <div className="bg-gradient-to-r from-cyan-50 to-green-50 p-6 border-b-2 border-cyan-100">
                                <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                                    <span className="text-2xl">🎯</span>
                                    Áreas de Desenvolvimento
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">Pontue cada área de 0 a 10</p>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                                {EVALUATION_TYPES.map(type => {
                                    const value = areaScores[type.id] ?? 0;
                                    return (
                                        <div
                                            key={type.id}
                                            className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all slider-thumb"
                                        >
                                            <div className="flex items-center justify-between">
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
                                                className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer shadow-inner"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                <span>0 - Ausente</span>
                                                <span>10 - Excelente</span>
                                            </div>
                                        </div>
                                    );
                                })}
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoom-in {
          from {
            transform: scale(0.95);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-in {
          animation: fade-in 0.3s ease-out, zoom-in 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}