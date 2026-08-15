import { Info, Package, Plus, ChevronDown, Scale } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAppointmentsContext } from '../../contexts/AppointmentsContext';
import { packageService, UseSessionParams, validatePayment } from '../../services/packageService';
import appointmentService from '../../services/appointmentService';
import { IDoctors, IPatient, ITherapyPackage } from '../../utils/types/types';
import TherapyPackageCard from './TherapyPackageCard';
import TherapyPackageDetails from './TherapyPackageDetails';
import TherapyPackageFormModal from './TherapyPackageFormModal';
import TherapyPackageManager from './TherapyPackageManager';
import { extractErrorMessage } from '../../utils/errorUtils';

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

    const [creditModal, setCreditModal] = useState<{ open: boolean; packageId: string; specialty: string }>({ open: false, packageId: '', specialty: '' });
    const [creditAmount, setCreditAmount] = useState('');
    const [creditReason, setCreditReason] = useState('');
    const [creditLoading, setCreditLoading] = useState(false);

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
        return () => {
            window.removeEventListener('session:completed', handler);
            window.removeEventListener('appointment:cancelled', handler);
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
            setPackages(packageData);
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

    const liminarBySpecialty = activePackages
        .filter(pkg => pkg.type === 'liminar')
        .reduce<Record<string, { balance: number; totalCredit: number; sessionValue: number; count: number; packageId: string }>>((acc, pkg) => {
            const key = pkg.specialty || pkg.sessionType || 'Geral';
            if (!acc[key]) {
                acc[key] = { balance: 0, totalCredit: 0, sessionValue: pkg.sessionValue || 0, count: 0, packageId: pkg.packageId || pkg._id };
            }
            acc[key].balance += pkg.liminarCreditBalance ?? 0;
            acc[key].totalCredit += pkg.liminarTotalCredit ?? 0;
            acc[key].count += 1;
            return acc;
        }, {});

    const handleAddLiminarCredit = async () => {
        const amount = parseFloat(creditAmount.replace(',', '.'));
        if (!amount || amount <= 0) {
            toast.error('Informe um valor válido');
            return;
        }
        setCreditLoading(true);
        try {
            await packageService.addLiminarCredit(creditModal.packageId, amount, creditReason || 'Recarga de crédito liminar');
            toast.success(`Crédito de R$ ${amount.toFixed(2)} adicionado ao pacote de ${creditModal.specialty}!`);
            setCreditModal({ open: false, packageId: '', specialty: '' });
            setCreditAmount('');
            setCreditReason('');
            await fetchBasicPackages();
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Erro ao adicionar crédito');
        } finally {
            setCreditLoading(false);
        }
    };

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

            {/* Saldo Liminar */}
            {Object.keys(liminarBySpecialty).length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Scale className="w-6 h-6 text-amber-600" />
                        <h3 className="text-lg font-bold text-gray-900">Saldo Liminar</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(liminarBySpecialty).map(([specialty, data]) => {
                            const sessoesPossiveis = data.sessionValue > 0 ? Math.floor(data.balance / data.sessionValue) : null;
                            const pctUsado = data.totalCredit > 0 ? Math.round(((data.totalCredit - data.balance) / data.totalCredit) * 100) : 0;
                            const corBarra = data.balance <= 0 ? 'bg-red-500' : pctUsado >= 75 ? 'bg-orange-400' : 'bg-amber-500';
                            return (
                                <div key={specialty} className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-700 capitalize">{specialty}</span>
                                        <div className="flex items-center gap-2">
                                            {data.count > 1 && (
                                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{data.count} pacotes</span>
                                            )}
                                            <button onClick={() => setCreditModal({ open: true, packageId: data.packageId, specialty })} className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors" title="Adicionar crédito">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">R$ {data.balance.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500 mb-3">
                                        de R$ {data.totalCredit.toFixed(2)} total
                                        {sessoesPossiveis !== null && <span className="ml-2 text-amber-600 font-medium">· ~{sessoesPossiveis} {sessoesPossiveis === 1 ? 'sessão' : 'sessões'}</span>}
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full transition-all ${corBarra}`} style={{ width: `${Math.min(100 - pctUsado, 100)}%` }} />
                                    </div>
                                    {data.balance <= 0 && <p className="text-xs text-red-600 mt-2 font-medium">Saldo esgotado — adicione crédito para continuar.</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal recarga liminar */}
            {creditModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreditModal({ open: false, packageId: '', specialty: '' })}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <Scale className="w-5 h-5 text-amber-600" />
                            <h4 className="text-lg font-bold text-gray-900">Adicionar Crédito</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 capitalize">Especialidade: <span className="font-semibold">{creditModal.specialty}</span></p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label>
                                <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                                <input type="text" value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Ex: Recarga mensal" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => { setCreditModal({ open: false, packageId: '', specialty: '' }); setCreditAmount(''); setCreditReason(''); }} className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" disabled={creditLoading}>Cancelar</button>
                            <button onClick={handleAddLiminarCredit} disabled={creditLoading || !creditAmount} className="flex-1 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors disabled:opacity-50">{creditLoading ? 'Salvando...' : 'Confirmar'}</button>
                        </div>
                    </div>
                </div>
            )}

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
                                <div className="grid gap-5 sm:gap-6 items-start [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
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
