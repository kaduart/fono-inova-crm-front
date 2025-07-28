import { TherapyPackage } from "./TherapyPackageCard";

type Props = {
    pack: TherapyPackage;
    onClose: () => void;
    onEdit: () => void;
};

export default function TherapyPackageDetails({ pack, onClose, onEdit }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
                <h2 className="text-xl font-bold mb-4">Detalhes do Pacote</h2>

                <p><strong>Tipo:</strong> {pack.type}</p>
                <p><strong>Total de Sessões:</strong> {pack.total}</p>
                <p><strong>Realizadas:</strong> {pack.sessions.length}</p>
                <p><strong>Status:</strong> {pack.payments.length > 0 ? 'Pago' : 'Pendente'}</p>

                <div className="text-right space-x-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={onEdit}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Editar
                    </button>
                </div>
            </div>
        </div>
    );
}
