import { Info, Package, Plus, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAppointmentsContext } from '../../contexts/AppointmentsContext';
import packagesService, { packageService, UseSessionParams, validatePayment } from '../../services/packageService';
import { IDoctors, IPatient, ITherapyPackage } from '../../utils/types/types';
import TherapyPackageCard from './TherapyPackageCard';
import TherapyPackageDetails from './TherapyPackageDetails';
import TherapyPackageDetailsModal from './TherapyPackageDetailsModal';
import TherapyPackageManager from './TherapyPackageManager';
import { extractErrorMessage } from '../../utils/errorUtils';

type TherapyPackagesSummaryProps = {
    patient: IPatient;
    doctors: IDoctors[];
};

export default function TherapyPackagesSummary({ patient, doctors }: TherapyPackagesSummaryProps) {
    const { fetchAppointments } = useAppointmentsContext();
    const [packages, setPackages] = useState<ITherapyPackage[]>([]);
    const [showManager, setShowManager] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<ITherapyPackage | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
    
    // 🔥 Controla qual pacote está expandido
    const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
    
    // 🔥 NOVO: Accordion principal para mostrar/ocultar todos os pacotes
    const [isAccordionOpen, setIsAccordionOpen] = useState(true);

    useEffect(() => {
        fetchBasicPackages();
    }, [patient._id]);



    // Função para buscar pacotes atualizados - SEM TOAST de sucesso
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
                    : Array.isArray(responseData.data)
                        ? responseData.data
                        : responseData.data?.packages || []
            ).filter(pkg => pkg);

            setPackages(packageData);

            // REMOVIDO: Toast de sucesso ao carregar
            // Mantém apenas quando não há pacotes (primeira vez)
            if (packageData.length === 0 && !loading) {
                toast.info('Nenhum pacote contratado para este paciente', {
                    icon: <Info className="text-blue-500" />,
                });
            }

        } catch (error: any) {
            console.error('Erro na requisição:', {
                error,
                message: extractErrorMessage(error, 'Erro desconhecido')
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

            // Fecha o modal e reseta estados ANTES de recarregar
            setSelectedPackage(null);
            setViewMode('view');
            setEditing(false);

            // Recarrega os pacotes
            await fetchBasicPackages();

        } catch (err) {
            console.error('Erro:', err);
            toast.error(`Falha ao ${modalAction === 'edit' ? 'atualizar' : 'registrar'} sessão`);
        }
    }

    // Nova função para adicionar sessão ao pacote
    const handleAddSession = async (sessionData: any) => {
        try {
            if (!selectedPackage) {
                throw new Error('Nenhum pacote selecionado');
            }

            const response = await packageService.addSession(selectedPackage._id, sessionData);

            if (response?.success) {
                toast.success("Nova sessão adicionada ao pacote!");
                setSelectedPackage(null);
                await fetchBasicPackages();
            } else {
                throw new Error(response?.message || 'Erro ao adicionar sessão');
            }

        } catch (err: any) {
            console.error('Erro ao adicionar sessão:', err);
            if (err.response?.status === 409) {
                toast.error('Conflito: Já existe uma sessão agendada neste horário');
            } else if (err.response?.data?.message) {
                toast.error(err.response.data.message);
            } else {
                toast.error(err.message || 'Falha ao adicionar sessão');
            }
        }
    };


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

    const handleUpdatePackage = (updated: ITherapyPackage) => {
        setSelectedPackage(updated);
        fetchBasicPackages();
    };

    // Resetar estados quando fechar detalhes
    const handleCloseDetails = () => {
        setSelectedPackage(null);
        setEditing(false);
        setViewMode('view');
    };

    // Nova função para abrir visualização (não edição)
    const handleViewPackage = (pkg: ITherapyPackage) => {
        setSelectedPackage(pkg);
        setViewMode('view');
        setEditing(false);
    };

    // Função para iniciar edição do pacote
    const handleEditPackage = () => {
        setViewMode('edit');
        setEditing(true);
    };

    // Função para adicionar nova sessão
    const handleOpenAddSession = () => {
        setViewMode('add-session');
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
                        <div className="bg-white rounded-xl p-4 border border-emerald-200 min-w-[120px] text-center">
                            <div className="text-2xl font-bold text-emerald-600">{packages.length}</div>
                            <div className="text-sm text-gray-600">Pacotes</div>
                        </div>

                        <button
                            onClick={() => {
                                setExpandedPackageId(null); // 🔥 Fecha accordion interno
                                setIsAccordionOpen(false);  // 🔥 Fecha accordion principal
                                setShowManager(true);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5" />
                            Criar Pacotes
                        </button>
                    </div>
                </div>
            </div>


            {/* 🔥 Accordion Principal - Todos os Pacotes */}
            {!loading && packages.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header do Accordion */}
                    <button
                        onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-emerald-600" />
                            <span className="font-semibold text-gray-900">Pacotes do Paciente</span>
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-sm font-medium">
                                {packages.length}
                            </span>
                        </div>
                        <div className={`transform transition-transform duration-300 ${isAccordionOpen ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5 text-emerald-600" />
                        </div>
                    </button>

                    {/* Conteúdo do Accordion */}
                    {isAccordionOpen && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {packages.map(pkg => (
                                <TherapyPackageCard
                                    key={pkg._id}
                                    pack={pkg}
                                    patient={patient}
                                    doctors={doctors}
                                    onUseSession={handleUseSession}
                                    onRegisterPayment={handleRegisterPayment}
                                    onCardClick={handleViewPackage}
                                    isExpanded={expandedPackageId === pkg._id} // 🔥 Controla expansão
                                    onToggleExpand={(expanded) => {
                                        // 🔥 Fecha outros e abre o clicado
                                        setExpandedPackageId(expanded ? pkg._id : null);
                                    }}
                                    onRefresh={fetchBasicPackages} // 🔥 NOVO: Para recarregar após cancelamento em lote
                                />
                            ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Estado vazio - sem pacotes */}
            {!loading && packages.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum pacote encontrado
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        {patient.fullName} não possui pacotes de terapia ativos no momento.
                    </p>
                    <button
                        onClick={() => {
                            setExpandedPackageId(null); // 🔥 Fecha accordion
                            setShowManager(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-5 h-5" />
                        Criar Primeiro Pacote
                    </button>
                </div>
            )}

            {/* MODAIS CONDICIONAIS */}
            {selectedPackage && viewMode === 'view' && (
                <TherapyPackageDetails
                    pack={selectedPackage}
                    onClose={handleCloseDetails}
                    onEdit={handleEditPackage}
                    onAddSession={handleAddSession} // Passa a função diretamente
                    patient={patient}
                    doctors={doctors}
                />
            )}

            {/* Modal de Gerenciamento (novo pacote) */}
            {showManager && (
                <TherapyPackageManager
                    onClose={() => setShowManager(false)}
                    onSave={(newPackageId?: string) => {
                        fetchBasicPackages();
                        setShowManager(false);
                        setIsAccordionOpen(true); // 🔥 Abre accordion principal ao criar
                        // 🔥 Abre o accordion do novo pacote se tiver ID
                        if (newPackageId) {
                            setExpandedPackageId(newPackageId);
                        }
                    }}
                    packages={packages}
                    totalPages={1} // 🔥 Valor padrão
                    onRefresh={fetchBasicPackages}
                    onPackageCreated={() => {
                        // Atualiza a lista de agendamentos no contexto global
                        fetchAppointments();
                    }}
                    doctors={doctors}
                    patient={patient}
                />
            )}

            {/* Modal de Edição do Pacote */}
            {selectedPackage && viewMode === 'edit' && (
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