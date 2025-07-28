import { Package as PackageIcon } from 'lucide-react';
import { useState } from 'react';
import packagesService from '../../services/packageService';
import { IDoctor, IPatient, ITherapyPackage } from '../../utils/types/types';
import TherapyPackageFormModal from './TherapyPackageFormModal';
import TherapyPackageTable from './TherapyPackageTable';

type Props = {
    packages: ITherapyPackage[];
    patient: IPatient;
    doctors: IDoctor;
    totalPages: number;
    onRefresh: () => void;
};

export default function TherapyPackageManager({ packages, patient, doctors, totalPages, onRefresh }: Props) {
    const [selected, setSelected] = useState<ITherapyPackage | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        page: 1,
        limit: 10
    });
    const [loading, setLoading] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este pacote?')) return;
        setLoading(true);

        try {
            await packagesService.deletePackage(id);
            onRefresh();
        } catch (err) {
            console.error('Erro ao excluir:', err);
            alert('Erro ao excluir pacote.');
        } finally {
            setLoading(false);
        }
    };
    console.error('packageDatassss:', packages);

    const handleEdit = (pkg: ITherapyPackage) => {
        setSelected(pkg);
        setModalOpen(true);
    };

    const handleNew = () => {
        setSelected(null);
        setModalOpen(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <PackageIcon /> Gerenciador de Pacotes
                </h2>
                <button
                    onClick={handleNew}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Novo Pacote
                </button>
            </div>

            <TherapyPackageTable
                packages={packages}
                onEdit={handleEdit}
                onDelete={handleDelete}
                currentPage={filters.page}
                totalPages={totalPages}
                onPageChange={(newPage) => setFilters(prev => ({ ...prev, page: newPage }))}
            />

            {modalOpen && (
                <TherapyPackageFormModal
                    initialData={selected}
                    patient={patient}
                    doctors={doctors}
                    onClose={() => setModalOpen(false)}
                    onSubmit={onRefresh}
                />
            )}

            {packages.length === 0 && !loading && (
                <div className="text-center py-12">
                    <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pacote encontrado</h3>
                    <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros de busca</p>
                </div>
            )}
        </div>
    );
}
