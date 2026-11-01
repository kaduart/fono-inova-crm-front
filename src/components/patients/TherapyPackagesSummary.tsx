import { Info, Package, Plus, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../../utils/toast';
import { useAppointmentsContext } from '../../contexts/AppointmentsContext';
import { packageService, UseSessionParams, validatePayment } from '../../services/packageService';
import appointmentService from '../../services/appointmentService';
import { IDoctors, IPatient, ITherapyPackage } from '../../utils/types/types';
import TherapyPackageCard from './TherapyPackageCard';
import TherapyPackageDetails from './TherapyPackageDetails';
import TherapyPackageFormModal from './TherapyPackageFormModal';
import TherapyPackageManager from './TherapyPackageManager';
import { extractErrorMessage } from '../../utils/errorUtils';
import { subscribeToCacheInvalidation } from '../../utils/cacheManager';

type TherapyPackagesSummaryProps = {
    patient: IPatient;
    doctors: IDoctors[];
};

export default function TherapyPackagesSummary({ patient, doctors }: TherapyPackagesSummaryProps) {
    const { fetchAppointments } = useAppointmentsContext();
    const [packages, setPackages] = useState<ITherapyPackage[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showManager, setShowManager] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<ITherapyPackage | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(true);

    const realPatientId = patient?.patientId || patient?._id;
    const hasFetchedInitialRef = useRef<string | null>(null);


    useEffect(() => {
        if (realPatientId && hasFetchedInitialRef.current !== realPatientId) {
            hasFetchedInitialRef.current = realPatientId;
            fetchBasicPackages();
        }
    }, [realPatientId]);

    // Recarrega pacotes quando um appointment é completado ou cancelado em qualquer parte do app
    useEffect(() => {
        const handler = () => { if (realPatientId) fetchBasicPackages(); };
        window.addEventListener('session:completed', handler);
        window.addEventListener('appointment:cancelled', handler);
        const unsubscribePayments = subscribeToCacheInvalidation('payments', handler);
        return () => {
            window.removeEventListener('session:completed', handler);
            window.removeEventListener('appointment:cancelled', handler);
            unsubscribePayments();
        };
    }, [realPatientId]);

    const fetchBasicPackages = async () => {
        setLoading(true);
        try {
            const params = { page: 1, limit: 100, patientId: realPatientId };
            const res = await packageService.listPackages(params);
            const responseData = res || {};
            const packageData = (
                Array.isArray(responseData)
                    ? responseData
                    : Array.isArray(responseData.packages)
                        ? responseData.packages
                        : responseData.data?.packages || []
            ).filter(pkg => pkg);
            // Pacote do tipo liminar é modelo antigo: todos foram migrados para
            // LiminarContract (aba Liminar). O saldo que sobrou nele é histórico e
            // enganava; o paciente vê o liminar só na aba Liminar.
            setPackages((packageData || []).filter((pkg: ITherapyPackage) => pkg.type !== 'liminar'));
            if (packageData.length === 0 && !loading) {
                toast.info('Nenhum pacote contratado para este paciente', { icon: <Info className="text-blue-500" /> });
            }
        } catch (error: any) {
            console.error('Erro na requisição:', { error, message: extractErrorMessage(error, 'Erro desconhecido') });
            toast.error('Erro ao carregar pacotes');
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUseSession = async (packId: string, sessionData: UseSessionParams & { appointmentId?: string }, modalAction: string) => {
        try {
            if (modalAction === 'use' && sessionData.paymentAmount && sessionData.paymentAmount > 0) {
                validatePayment(sessionData.paymentAmount, selectedPackage?.balance);
            }
            if (!sessionData.appointmentId) {
                // Sessão nova: ainda não existe Appointment — cria via POST /v2/appointments
                // (backend valida capacidade do pacote e conflito antes de escrever).
                // Nunca passar por updateSession aqui: ela exige appointmentId.
                await packageService.createSession(packId, {
                    patientId: sessionData.patientId,
                    doctorId: sessionData.doctorId,
                    date: sessionData.date as any,
                    time: sessionData.time,
                    sessionType: sessionData.sessionType as any,
                    value: sessionData.paymentAmount || 0,
                    notes: sessionData.notes,
                });
                toast.success("Sessão registrada!");
                setSelectedPackage(null);
                await fetchBasicPackages();
                return;
            }
            const payload = {
                patientId: sessionData.patientId,
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
                appointmentId: sessionData.appointmentId,
                confirmedAbsence: sessionData.confirmedAbsence,
                cancelRequester: sessionData.cancelRequester,
                cancelRequestedAt: sessionData.cancelRequestedAt,
                payment: { amount: Number(sessionData.paymentAmount) || 0, method: sessionData.paymentMethod || '' },
                professionalPaymentStatus: sessionData.professionalPaymentStatus,
                professionalPaymentOverride: sessionData.professionalPaymentOverride,
            };
            await packageService.updateSession(packId, payload);
            const isCompleting = modalAction === 'use' && sessionData.status === 'completed';
            if (isCompleting && sessionData.appointmentId) {
                try {
                    await appointmentService.update(sessionData.appointmentId, { operationalStatus: 'completed', clinicalStatus: 'completed' } as any);
                } catch (e) {
                    console.warn('[handleUseSession] Falha ao atualizar status do appointment:', e);
                }
            }
            toast.success(modalAction === 'edit' ? "Sessão atualizada!" : "Sessão registrada!");
            setSelectedPackage(null);
            await fetchBasicPackages();
        } catch (err: any) {
            console.error('Erro:', err);
            // Não mostra toast aqui: TherapyPackageCard.handleSessionSubmit já
            // trata o erro relançado (inclusive mensagens de conflito de agenda).
            throw err;
        }
    };

    const handleUseSessionInDetails = async (packId: string, sessionData: UseSessionParams & { appointmentId?: string }, modalAction: string) => {
        try {
            if (modalAction === 'use' && sessionData.paymentAmount && sessionData.paymentAmount > 0) {
                validatePayment(sessionData.paymentAmount, selectedPackage?.balance);
            }
            if (!sessionData.appointmentId) {
                // Sessão nova ("Nova Sessão" em TherapyPackageDetails): idem handleUseSession.
                await packageService.createSession(packId, {
                    patientId: sessionData.patientId,
                    doctorId: sessionData.doctorId,
                    date: sessionData.date as any,
                    time: sessionData.time,
                    sessionType: sessionData.sessionType as any,
                    value: sessionData.paymentAmount || 0,
                    notes: sessionData.notes,
                });
                toast.success("Sessão registrada!");
                await fetchBasicPackages();
                return;
            }
            const payload = {
                patientId: sessionData.patientId,
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
                appointmentId: sessionData.appointmentId,
                confirmedAbsence: sessionData.confirmedAbsence,
                cancelRequester: sessionData.cancelRequester,
                cancelRequestedAt: sessionData.cancelRequestedAt,
                payment: { amount: Number(sessionData.paymentAmount) || 0, method: sessionData.paymentMethod || '' },
                professionalPaymentStatus: sessionData.professionalPaymentStatus,
                professionalPaymentOverride: sessionData.professionalPaymentOverride,
            };
            await packageService.updateSession(packId, payload);
            const isCompleting = modalAction === 'use' && sessionData.status === 'completed';
            if (isCompleting && sessionData.appointmentId) {
                try {
                    await appointmentService.update(sessionData.appointmentId, { operationalStatus: 'completed', clinicalStatus: 'completed' } as any);
                } catch (e) {
                    console.warn('[handleUseSessionInDetails] Falha ao atualizar status do appointment:', e);
                }
            }
            toast.success(modalAction === 'edit' ? "Sessão atualizada!" : "Sessão registrada!");
            await fetchBasicPackages();
        } catch (err: any) {
            console.error('Erro:', err);
            throw err;
        }
    };

    const handleRegisterPayment = (id: string) => {
        setSelectedPackage(prev =>
            prev && prev._id === id
                ? {
                    ...prev,
                    payments: [
                        ...prev.payments,
                        { amount: 0, date: new Date().toISOString(), coveredSessions: [null], paymentMethod: 'dinheiro', notes: '', _id: `payment-${Date.now()}` },
                    ],
                }
                : prev
        );
    };

    const handleCloseDetails = () => {
        setSelectedPackage(null);
        setShowEditModal(false);
    };

    const handleViewPackage = (pkg: ITherapyPackage) => {
        setSelectedPackage(pkg);
    };

    const activePackages = packages.filter(pkg => pkg.status === 'active');
    const inactivePackages = packages.filter(pkg => pkg.status !== 'active');
    const displayedPackages = activeTab === 'active' ? activePackages : inactivePackages;



    const handleEditPackage = () => {
        setShowEditModal(true);
    };

    const openManager = () => {
        setIsAccordionOpen(false);
        setShowManager(true);
    };

    const closeManager = () => {
        setShowManager(false);
        setIsAccordionOpen(true);
    };

    const toggleAccordion = () => {
        if (showManager) {
            closeManager();
        } else {
            setIsAccordionOpen(prev => !prev);
        }
    };

    return (
        <div className="space-y-6">
            {/* Card topo */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Package className="w-8 h-8 text-emerald-600" />
                            Pacotes de Terapia
                        </h2>
                        <p className="text-gray-600 mt-1">Gerencie os pacotes de {patient.fullName}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-emerald-200 min-w-[120px] text-center">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setIsAccordionOpen(true); setShowFormModal(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" />Novo Pacote</button>
                            <button onClick={openManager} className="px-4 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium flex items-center gap-2"><Package className="w-4 h-4" />Gerenciar</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accordion Pacotes do Paciente */}
            {!loading && packages.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50">
                        <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-emerald-600" />
                            <span className="font-semibold text-gray-900">Pacotes do Paciente</span>
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-sm font-medium">{packages.length}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <button onClick={toggleAccordion} className={`transform transition-transform duration-300 ${isAccordionOpen && !showManager ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-5 h-5 text-emerald-600" />
                            </button>
                        </div>
                    </div>

                    {isAccordionOpen && !showManager && (
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Ativos ({activePackages.length})</button>
                                <button onClick={() => setActiveTab('inactive')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inactive' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Inativos ({inactivePackages.length})</button>
                            </div>
                            {displayedPackages.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                    {displayedPackages.map(pkg => (
                                        <TherapyPackageCard
                                            key={pkg._id}
                                            pack={pkg}
                                            patient={patient}
                                            doctors={doctors}
                                            onUseSession={handleUseSession}
                                            onRegisterPayment={handleRegisterPayment}
                                            onCardClick={handleViewPackage}
                                            onRefresh={fetchBasicPackages}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">Nenhum pacote {activeTab === 'active' ? 'ativo' : 'inativo'} encontrado.</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Estado vazio */}
            {!loading && packages.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum pacote encontrado</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">{patient.fullName} não possui pacotes de terapia no momento.</p>
                    <button onClick={() => setShowFormModal(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium flex items-center gap-2 mx-auto"><Plus className="w-5 h-5" />Criar Primeiro Pacote</button>
                </div>
            )}

            {/* Gerenciador de Pacotes */}
            {showManager && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-slate-600" />
                            <span className="font-semibold text-gray-900">Gerenciador de Pacotes</span>
                        </div>
                        <button onClick={closeManager} className="px-4 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium flex items-center gap-2">✕ Fechar</button>
                    </div>
                    <div className="p-6">
                        <TherapyPackageManager
                            onClose={closeManager}
                            onSave={() => {
                                fetchBasicPackages();
                                closeManager();
                            }}
                            packages={packages}
                            totalPages={1}
                            onRefresh={fetchBasicPackages}
                            onPackageCreated={fetchAppointments}
                            doctors={doctors}
                            patient={patient}
                        />
                    </div>
                </div>
            )}

            {/* Modais */}
            {selectedPackage && (
                <TherapyPackageDetails pack={selectedPackage} onClose={handleCloseDetails} onEdit={handleEditPackage} onUseSession={handleUseSessionInDetails} onRefresh={fetchBasicPackages} patient={patient} doctors={doctors} />
            )}

            {showFormModal && (
                <TherapyPackageFormModal
                    initialData={null}
                    patient={patient}
                    doctors={doctors}
                    onClose={() => setShowFormModal(false)}
                    onSubmit={() => {
                        fetchBasicPackages();
                        fetchAppointments();
                        setShowFormModal(false);
                        setIsAccordionOpen(true);
                    }}
                />
            )}

            {showEditModal && selectedPackage && (
                <TherapyPackageFormModal
                    initialData={selectedPackage}
                    patient={patient}
                    doctors={doctors}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedPackage(null);
                    }}
                    onSubmit={() => {
                        fetchBasicPackages();
                        fetchAppointments();
                        setShowEditModal(false);
                        setSelectedPackage(null);
                    }}
                />
            )}
        </div>
    );
}
