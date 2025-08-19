import { Info } from 'lucide-react';
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

    // Carregar os pacotes na inicialização do componente
    useEffect(() => {
        fetchBasicPackages();
    }, []);

    // Função para buscar pacotes atualizados
    const fetchBasicPackages = async () => {
        try {
            // 1. Parâmetros padrão para evitar chamadas sem parâmetros obrigatórios
            const params = {
                page: 1,
                limit: 10,
                status: "active",
                patientId: patient._id,
            };

            // 2. Chamada à API com tratamento de erro implícito
            const res = await packagesService.listPackages(params);


            // 4. Extração de dados com destructuring e fallback
            const responseData = res?.data || {};
            const packageData = (
                Array.isArray(responseData)
                    ? responseData
                    : responseData.data || []
            ).filter(pkg => pkg); // Filtra entradas null/undefined
            setPackages(packageData);

            // 6. Feedback condicional baseado nos dados
            packageData.length
                ? toast.success(`${packageData.length} pacotes carregados.`)
                : toast('Nenhum pacote contratado.', {
                    icon: <Info className="text-blue-500" />,
                });

        } catch (error) {
            // 7. Tratamento de erro detalhado
            console.error('Erro na requisição:', {
                error,
                message: error.response?.data?.message || 'Erro desconhecido'
            });

            setPackages([]); // Estado claro em caso de falha
        }
    };

    /* const handleUpdateSession = async (packageId: string, sessionData: UseSessionParams) => {
        try {
            const updatedPackage = await packageService.updateSession(
                packageId, 
                sessionData._id, 
                sessionData
            );
            setPackages(prev => prev.map(p => 
                p._id === packageId ? updatedPackage : p
            ));
            toast.success("Sessão atualizada com sucesso!");
        } catch (err) {
            console.error('Erro ao atualizar sessão:', err);
            toast.error("Erro ao atualizar sessão");
        }
    };
     */
    const handleAddPackage = () => {
        fetchBasicPackages();
        setShowManager(false);
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
            toast.error(`Falha ao ${modalAction === 'edit' ? 'atualizar' : 'registrar uso'} sessão`);
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

    return (
        <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map(pkg => (
                    <TherapyPackageCard
                        key={pkg._id}
                        pack={pkg}
                        patient={patient}
                        doctors={doctors}
                        onUseSession={handleUseSession}
                        onRegisterPayment={handleRegisterPayment}
                        onCardClick={() => setSelectedPackage(pkg)}
                    />
                ))}
            </div>

            <div className="mt-6 flex justify-center">
                <button
                    onClick={() => setShowManager(true)}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    Gerenciar Pacote
                </button>

                {selectedPackage && !editing && (
                    <TherapyPackageDetails
                        pack={selectedPackage}
                        onClose={() => setSelectedPackage(null)}
                        onEdit={() => setEditing(true)}
                    />
                )}
            </div>

            {showManager && (
                <TherapyPackageManager
                    onClose={() => setShowManager(false)}
                    onSave={handleAddPackage}
                    packages={packages}
                    onRefresh={fetchBasicPackages}
                    doctors={doctors}
                    patient={patient}
                />
            )}

            {selectedPackage && editing && (
                <TherapyPackageDetailsModal
                    pack={selectedPackage}
                    onClose={() => setEditing(false)}
                    onUpdate={(updated) => {
                        handleUpdatePackage(updated);
                        setEditing(false);
                        setSelectedPackage(null);
                    }}
                />
            )}
        </div>
    );
}
