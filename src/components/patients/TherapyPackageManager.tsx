import { Package as PackageIcon, Plus, Filter, Search, Users, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import packagesService from '../../services/packageService';
import { IDoctor, IPatient, ITherapyPackage } from '../../utils/types/types';
import TherapyPackageFormModal from './TherapyPackageFormModal';
import TherapyPackageTable from './TherapyPackageTable';

type Props = {
    packages: ITherapyPackage[];
    patient: IPatient;
    doctors: IDoctor[];
    totalPages: number;
    onRefresh: () => void;
    onPackageCreated?: () => void;
    onSave?: (newPackageId?: string) => void; // 🔥 Novo callback opcional
};

export default function TherapyPackageManager({ packages, patient, doctors, totalPages, onRefresh, onPackageCreated, onSave }: Props) {
    const [selected, setSelected] = useState<ITherapyPackage | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        page: 1,
        limit: 10
    });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleEdit = (pkg: ITherapyPackage) => {
        setSelected(pkg);
        setModalOpen(true);
    };

    const handleNew = () => {
        setSelected(null);
        setModalOpen(true);
    };

    // Estatísticas para o header
    const stats = {
        total: packages.length,
        active: packages.filter(p => p.status === 'active').length,
        completed: packages.filter(p => p.status === 'completed').length,
        pending: packages.filter(p => p.status === 'pending').length
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header com Gradiente */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl shadow-xl p-8 text-white mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                                    <PackageIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">Gerenciador de Pacotes</h1>
                                    <p className="text-emerald-100 mt-1">
                                        Gerenciando pacotes de terapia para {patient.fullName}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Estatísticas */}
                            <div className="flex gap-6 mt-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{stats.total}</div>
                                    <div className="text-emerald-100 text-sm">Total</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{stats.active}</div>
                                    <div className="text-emerald-100 text-sm">Ativos</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{stats.completed}</div>
                                    <div className="text-emerald-100 text-sm">Completos</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{stats.pending}</div>
                                    <div className="text-emerald-100 text-sm">Pendentes</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleNew}
                            className="bg-white text-emerald-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Pacote
                        </button>
                    </div>
                </div>

                {/* Barra de Ferramentas */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                        {/* Barra de Pesquisa */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar pacotes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                        </div>

                        {/* Filtros */}
                        <div className="flex gap-3 flex-wrap">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            >
                                <option value="">Todos os status</option>
                                <option value="active">Ativo</option>
                                <option value="pending">Pendente</option>
                                <option value="completed">Completo</option>
                            </select>

                            <select
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            >
                                <option value="">Todos os tipos</option>
                                <option value="fonoaudiologia">Fonoaudiologia</option>
                                <option value="psicologia">Psicologia</option>
                                <option value="terapia_ocupacional">Terapia Ocupacional</option>
                                <option value="fisioterapia">Fisioterapia</option>
                                <option value="psicomotricidade">Psicomotricidade</option>
                                <option value="musicoterapia">Musicoterapia</option>
                                <option value="psicopedagogia">Psicopedagogia</option>
                            </select>

                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="px-4 py-3 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {packages.length > 0 ? (
                        <TherapyPackageTable
                            packages={packages}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            currentPage={filters.page}
                            totalPages={totalPages}
                            onPageChange={(newPage) => setFilters(prev => ({ ...prev, page: newPage }))}
                        />
                    ) : (
                        <div className="text-center py-16">
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                <PackageIcon className="w-12 h-12 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Nenhum pacote encontrado
                            </h3>
                            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                {searchTerm || filters.status || filters.type 
                                    ? 'Tente ajustar os filtros de busca para encontrar pacotes.'
                                    : `${patient.fullName} não possui pacotes de terapia cadastrados.`
                                }
                            </p>
                            <button
                                onClick={handleNew}
                                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-semibold flex items-center gap-2 mx-auto"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Primeiro Pacote
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {modalOpen && (
                    <TherapyPackageFormModal
                        initialData={selected}
                        patient={patient}
                        doctors={doctors}
                        onClose={() => setModalOpen(false)}
                        onSubmit={(newPackageId?: string) => {
                            onRefresh();
                            onPackageCreated?.();
                            onSave?.(newPackageId); // 🔥 Chama onSave com o ID do novo pacote
                            setModalOpen(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
}