import { Info, Plus, Package, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import packagesService, { packageService, UseSessionParams, validatePayment } from '../../services/packageService';
import { IDoctors, IPatient, ITherapyPackage } from '../../utils/types/types';
import TherapyPackageCard from './TherapyPackageCard';
import TherapyPackageDetails from './TherapyPackageDetails';
import TherapyPackageDetailsModal from './TherapyPackageDetailsModal';
import TherapyPackageManager from './TherapyPackageManager';

type TherapyPackagesSummaryProps = {
    patient: IPatient;
    doctors: IDoctors[];
};

export default function TherapyPackagesSummary({ patient, doctors }: TherapyPackagesSummaryProps) {
    const [packages, setPackages] = useState<ITherapyPackage[]>([]);
    const [showManager, setShowManager] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<ITherapyPackage | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Carregar os pacotes na inicialização do componente
    useEffect(() => {
        fetchBasicPackages();
    }, [patient._id]); // Adicionei patient._id como dependência

    // Função para buscar pacotes atualizados
    const fetchBasicPackages = async () => {
        setLoading(true);
        try {
            const params = {
                page: 1,
                limit: 10,
                status: "active",
                patientId: patient._id,
            };

            const res = await packagesService.listPackages(params);

            const responseData = res?.data || {};
            const packageData = (
                Array.isArray(responseData)
                    ? responseData
                    : responseData.data || []
            ).filter(pkg => pkg);
            
            setPackages(packageData);

            if (packageData.length > 0) {
                toast.success(`${packageData.length} pacote${packageData.length > 1 ? 's' : ''} carregado${packageData.length > 1 ? 's' : ''}`);
            } else {
                toast.info('Nenhum pacote contratado para este paciente', {
                    icon: <Info className="text-blue-500" />,
                });
            }

        } catch (error: any) {
            console.error('Erro na requisição:', {
                error,
                message: error.response?.data?.message || 'Erro desconhecido'
            });

            toast.error('Erro ao carregar pacotes');
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUseSession = async (packId: string, sessionData: UseSessionParams, modalAction: string) => {
        try {
            validatePayment(sessionData.paymentAmount, selectedPackage?.balance);
            const payload = {
                patientId: sessionData.patient,
                doctorId: sessionData.doctorId,
                date: sessionData.date,
                time: sessionData.time,
                status: sessionData.status,
                notes: sessionData.notes,
                package: sessionData.package,
                sessionType: sessionData.sessionType,
                serviceType: sessionData.serviceType,
                specialty: sessionData.sessionType,
                sessionId: sessionData._id,
                confirmedAbsence: sessionData.confirmedAbsence,
                payment: {
                    amount: Number(sessionData.paymentAmount) || 0,
                    method: sessionData.paymentMethod || 'dinheiro'
                },
            };

            await packageService.updateSession(packId, payload);

            toast.success(modalAction === 'edit' ? "Sessão atualizada!" : "Sessão registrada!");
            fetchBasicPackages();

        } catch (err) {
            console.error('Erro:', err);
            toast.error(`Falha ao ${modalAction === 'edit' ? 'atualizar' : 'registrar'} sessão`);
        }
    }

    // Função para registrar pagamento de pacote
    const handleRegisterPayment = (id: string) => {
        setSelectedPackage(prev =>
            prev && prev._id === id
                ? {
                    ...prev,
                    payments: [
                        ...prev.payments,
                        {
                            amount: 0,
                            date: new Date().toISOString(),
                            coveredSessions: [null],
                            paymentMethod: 'dinheiro',
                            notes: '',
                            _id: `payment-${Date.now()}`
                        },
                    ],
                }
                : prev
        );
    };

    // Função para atualizar um pacote após edição
    const handleUpdatePackage = (updated: ITherapyPackage) => {
        setSelectedPackage(updated);
        fetchBasicPackages();
    };

    // Resetar estados quando fechar detalhes
    const handleCloseDetails = () => {
        setSelectedPackage(null);
        setEditing(false);
    };

    return (
        <div className="space-y-6">
            {/* Header com Estatísticas */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Package className="w-8 h-8 text-emerald-600" />
                            Pacotes de Terapia
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Gerencie os pacotes de {patient.fullName}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Estatísticas */}
                        <div className="bg-white rounded-xl p-4 border border-emerald-200 min-w-[120px] text-center">
                            <div className="text-2xl font-bold text-emerald-600">{packages.length}</div>
                            <div className="text-sm text-gray-600">Pacotes</div>
                        </div>
                        
                        <button
                            onClick={() => setShowManager(true)}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Pacote
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            )}

            {/* Grid de Pacotes */}
            {!loading && (
                <>
                    {packages.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {packages.map(pkg => (
                                <TherapyPackageCard
                                    key={pkg._id}
                                    pack={pkg}
                                    patient={patient}
                                    doctors={doctors}
                                    onUseSession={handleUseSession}
                                    onRegisterPayment={handleRegisterPayment}
                                    onCardClick={setSelectedPackage}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Nenhum pacote encontrado
                            </h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                {patient.fullName} não possui pacotes de terapia ativos no momento.
                            </p>
                            <button
                                onClick={() => setShowManager(true)}
                                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium flex items-center gap-2 mx-auto"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Primeiro Pacote
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modais */}
            {selectedPackage && !editing && (
                <TherapyPackageDetails
                    pack={selectedPackage}
                    onClose={handleCloseDetails}
                    onEdit={() => setEditing(true)}
                />
            )}

            {showManager && (
                <TherapyPackageManager
                    onClose={() => setShowManager(false)}
                    onSave={() => {
                        fetchBasicPackages();
                        setShowManager(false);
                    }}
                    packages={packages}
                    onRefresh={fetchBasicPackages}
                    doctors={doctors}
                    patient={patient}
                />
            )}

            {selectedPackage && editing && (
                <TherapyPackageDetailsModal
                    pack={selectedPackage}
                    onClose={handleCloseDetails}
                    onUpdate={(updated) => {
                        handleUpdatePackage(updated);
                        handleCloseDetails();
                    }}
                />
            )}
        </div>
    );
}