// src/components/TherapyPackageDetailsModal.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { TherapyPackageData } from './TherapyPackageCard';

type Props = {
    pack: TherapyPackageData;
    onClose: () => void;
    onUpdate: (updated: TherapyPackageData) => void;
};

export default function TherapyPackageDetailsModal({ pack, onClose, onUpdate }: Props) {
    const [type, setType] = useState(pack.type);
    const [total, setTotal] = useState(pack.total);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!type || total <= 0) {
            toast.error('Preencha todos os campos corretamente');
            return;
        }
        setLoading(true);
        try {
            const updatedPackage = { ...pack, type, totalSessions: total };
            await onUpdate(updatedPackage);
            toast.success('Pacote atualizado!');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
                <h2 className="text-xl font-semibold mb-4">Editar Pacote</h2>

                <label className="block mb-2 text-sm">Tipo de Terapia</label>
                <input
                    className="w-full border rounded p-2 mb-4"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                />

                <label className="block mb-2 text-sm">Total de Sessões</label>
                <input
                    type="number"
                    className="w-full border rounded p-2 mb-4"
                    value={total}
                    onChange={(e) => setTotal(Number(e.target.value))}
                />

                <div className="text-right space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}  