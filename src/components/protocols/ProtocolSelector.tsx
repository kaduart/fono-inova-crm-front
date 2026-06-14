import React, { useEffect, useState } from 'react';
import API from '../services/api';

interface Protocol {
    code: string;
    name: string;
    specialty: string;
    description: string;
    applicableAreas: string[];
    keyTechniques: string[];
    measurableGoals: string[];
    typicalDuration: string;
}

interface ProtocolSelectorProps {
    specialty?: string;
    value?: string; // protocol code
    onChange: (protocol: Protocol | null) => void;
    disabled?: boolean;
}

const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
    specialty,
    value,
    onChange,
    disabled = false
}) => {
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);

    useEffect(() => {
        fetchProtocols();
    }, [specialty]);

    useEffect(() => {
        if (value && protocols.length > 0) {
            const protocol = protocols.find(p => p.code === value);
            setSelectedProtocol(protocol || null);
        }
    }, [value, protocols]);

    const fetchProtocols = async () => {
        try {
            setLoading(true);
            const params = specialty ? `?specialty=${specialty}` : '';
            const response = await API.get(`/protocols${params}`);
            setProtocols(response.data);
        } catch (error) {
            console.error('Erro ao buscar protocolos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (code: string) => {
        if (code === '') {
            setSelectedProtocol(null);
            onChange(null);
            setShowDetails(false);
            return;
        }

        const protocol = protocols.find(p => p.code === code);
        setSelectedProtocol(protocol || null);
        onChange(protocol || null);
        setShowDetails(true);
    };

    const areaLabels: Record<string, string> = {
        language: 'Linguagem',
        motor: 'Motor',
        cognitive: 'Cognitivo',
        behavior: 'Comportamento',
        social: 'Social'
    };

    return (
        <div className="space-y-4">
            {/* Selector */}
            <div>
                <label className="form-label">
                    Protocolo Terapêutico
                </label>
                <select
                    value={selectedProtocol?.code || ''}
                    onChange={(e) => handleSelect(e.target.value)}
                    disabled={disabled || loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <option value="">Selecione um protocolo...</option>
                    {protocols.map((protocol) => (
                        <option key={protocol.code} value={protocol.code}>
                            {protocol.code} - {protocol.name}
                        </option>
                    ))}
                </select>
                {loading && (
                    <p className="text-sm text-gray-500 mt-1">Carregando protocolos...</p>
                )}
            </div>

            {/* Details Card */}
            {showDetails && selectedProtocol && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900">
                                {selectedProtocol.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                                {selectedProtocol.description}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDetails(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Metadata */}
                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="font-medium text-gray-700">Duração típica:</span>
                            <span className="text-gray-600 ml-1">{selectedProtocol.typicalDuration}</span>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">Áreas:</span>
                            <span className="text-gray-600 ml-1">
                                {selectedProtocol.applicableAreas.map(a => areaLabels[a] || a).join(', ')}
                            </span>
                        </div>
                    </div>

                    {/* Key Techniques */}
                    {selectedProtocol.keyTechniques.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Técnicas principais:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {selectedProtocol.keyTechniques.slice(0, 3).map((technique, idx) => (
                                    <li key={idx}>{technique}</li>
                                ))}
                                {selectedProtocol.keyTechniques.length > 3 && (
                                    <li className="text-gray-500">
                                        +{selectedProtocol.keyTechniques.length - 3} técnicas
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Measurable Goals */}
                    {selectedProtocol.measurableGoals.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Metas mensuráveis:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {selectedProtocol.measurableGoals.slice(0, 3).map((goal, idx) => (
                                    <li key={idx}>{goal}</li>
                                ))}
                                {selectedProtocol.measurableGoals.length > 3 && (
                                    <li className="text-gray-500">
                                        +{selectedProtocol.measurableGoals.length - 3} metas
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProtocolSelector;