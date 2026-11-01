import { Package, Plus, ChevronDown, Settings2 } from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
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
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [showLegacy, setShowLegacy] = useState(false);
    const [gridRef] = useAutoAnimate<HTMLDivElement>();

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
        } catch (error: any) {
            console.error('Erro na requisição:', { error, message: extractErrorMessage(error, 'Erro desconhecido') });
            toast.error('Erro ao carregar pacotes');
            setPackages([]);
        } finally {
            setLoading(false);
            setLoadedOnce(true);
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



    const handleEditPackage = () => {
        setShowEditModal(true);
    };

    const openManager = () => setShowManager(true);
    const closeManager = () => setShowManager(false);

    const isLegacy = (pkg: ITherapyPackage) => (pkg as { type?: string }).type === 'convenio';
    const legacyPackages = packages.filter(isLegacy);
    const currentPackages = packages.filter(pkg => !isLegacy(pkg));
    const activePackages = currentPackages.filter(pkg => pkg.status === 'active');
    const inactivePackages = currentPackages.filter(pkg => pkg.status !== 'active');
    const displayedPackages = activeTab === 'active' ? activePackages : inactivePackages;

    const renderCard = (pkg: ITherapyPackage) => (
        <TherapyPackageCard
            key={pkg._id}
            pack={pkg}
            patient={patient}
            doctors={doctors}
            onUseSession={handleUseSession}
            onRegisterPayment={handleRegisterPayment}
            onCardClick={handleViewPackage}
            onRefresh={fetchBasicPackages}
            onRenew={() => setShowFormModal(true)}
        />
    );

    const segBtn = (tab: 'active' | 'inactive', label: string, count: number) => (
        <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === tab
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
            {label} <span className="tabular-nums text-slate-400">{count}</span>
        </button>
    );

    return (
        <div className="space-y-4 text-left">
            {/* Barra de ferramentas */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        <Package className="h-5 w-5 text-emerald-600" />
                        Pacotes
                    </h2>
                    {currentPackages.length > 0 && !showManager && (
                        <div role="tablist" aria-label="Filtrar pacotes" className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                            {segBtn('active', 'Ativos', activePackages.length)}
                            {segBtn('inactive', 'Inativos', inactivePackages.length)}
                        </div>
                    )}
                    {loading && loadedOnce && <span className="text-xs text-slate-400">atualizando…</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={showManager ? closeManager : openManager} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Settings2 className="h-4 w-4" />{showManager ? 'Voltar aos cards' : 'Gerenciar'}
                    </button>
                    <button type="button" onClick={() => setShowFormModal(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                        <Plus className="h-4 w-4" />Novo pacote
                    </button>
                </div>
            </div>

            {!loadedOnce && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map(i => <div key={i} className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
                </div>
            )}

            {loadedOnce && !showManager && currentPackages.length > 0 && (
                displayedPackages.length > 0 ? (
                    <div ref={gridRef} className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {displayedPackages.map(renderCard)}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
                        Nenhum pacote {activeTab === 'active' ? 'ativo' : 'inativo'}.
                        {activeTab === 'active' && inactivePackages.length > 0 && (
                            <button type="button" onClick={() => setActiveTab('inactive')} className="ml-1 font-medium text-emerald-700 hover:underline dark:text-emerald-300">Ver inativos</button>
                        )}
                    </div>
                )
            )}

            {/* Estado vazio */}
            {loadedOnce && !showManager && currentPackages.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                    <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Nenhum pacote particular</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{patient.fullName} ainda não tem pacote. Pacote fixa o valor por sessão e ajuda a manter a frequência.</p>
                    <button type="button" onClick={() => setShowFormModal(true)} className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />Criar primeiro pacote</button>
                </div>
            )}

            {/* Pacotes de convênio do modelo antigo: guias agora ficam na aba Convênios */}
            {loadedOnce && !showManager && legacyPackages.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => setShowLegacy(v => !v)} aria-expanded={showLegacy} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-600 dark:text-slate-300">
                        <span>Pacotes de convênio do modelo antigo <span className="tabular-nums text-slate-400">({legacyPackages.length})</span> · hoje o convênio fica na aba Convênios</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showLegacy ? 'rotate-180' : ''}`} />
                    </button>
                    {showLegacy && (
                        <div className="grid grid-cols-1 items-start gap-4 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-700">
                            {legacyPackages.map(renderCard)}
                        </div>
                    )}
                </div>
            )}

            {/* Gerenciador de Pacotes */}
            {showManager && (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="p-4">
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
