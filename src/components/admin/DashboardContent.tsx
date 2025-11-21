import { Activity, ChevronDown, ChevronUp, Clock, Stethoscope, UserPlus, Users } from 'lucide-react';
import React, { useState } from 'react';
import BirthdayCard from '../patients/BirthdayCard';
import PatientTable from '../patients/PatientTable';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

interface DashboardContentProps {
    patients: any[];
    totalPatients: number;
    totalDoctors: number;
    hospitalCapacity: number;
    doctorOverview: any[];
    upcomingAppointments: any[];
    handleAddProfessional: () => void;
    handleAddPatient: () => void;
    setPatientToEdit: (patient: any) => void;
    setIsModalOpen: (isOpen: boolean) => void;
    setShowAdvancedPayment: (show: boolean) => void;
    setSelectedPatient: (patient: any) => void;
    setPaymentContext: (context: any) => void;
    setPaymentModalOpen: (isOpen: boolean) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
    patients,
    totalPatients,
    totalDoctors,
    hospitalCapacity,
    doctorOverview,
    upcomingAppointments,
    handleAddProfessional,
    handleAddPatient,
    setPatientToEdit,
    setIsModalOpen,
    setShowAdvancedPayment,
    setSelectedPatient,
    setPaymentContext,
    setPaymentModalOpen
}) => {
    const occupancyRate = ((totalPatients / hospitalCapacity) * 100).toFixed(2);
    const [showDoctors, setShowDoctors] = React.useState(false);

    // Estados para controlar os accordions
    const [birthdaySectionOpen, setBirthdaySectionOpen] = useState(true);
    const [patientsTableOpen, setPatientsTableOpen] = useState(true);
    const [metricsSectionOpen, setMetricsSectionOpen] = useState(true);
    const [overviewSectionOpen, setOverviewSectionOpen] = useState(true);

    return (
        <>
            {/* 🔹 SEÇÃO ANIVERSARIANTES COM ACCORDION */}
            <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${birthdaySectionOpen
                        ? 'bg-pink-50 text-pink-800 border-b border-pink-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => setBirthdaySectionOpen(!birthdaySectionOpen)}
                >
                    <h3 className="flex items-center gap-2 text-lg font-bold text-pink-700">
                        🎂 Aniversariantes do Mês
                    </h3>
                    {birthdaySectionOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {birthdaySectionOpen && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <BirthdayCard patients={patients} />
                    </div>
                )}
            </div>

            {/* 🔹 SEÇÃO LISTA DE PACIENTES COM ACCORDION */}
            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${patientsTableOpen
                        ? 'bg-blue-50 text-blue-800 border-b border-blue-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => setPatientsTableOpen(!patientsTableOpen)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">👥 Lista de Pacientes</span>
                    </div>
                    {patientsTableOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {patientsTableOpen && (
                    <div className="p-4 bg-white">
                        <PatientTable
                            patients={patients}
                            onEditPatient={(patient) => {
                                setPatientToEdit(patient);
                                setIsModalOpen(true);
                            }}
                            onPaymentAdvancedSuccess={(patient) => {
                                setShowAdvancedPayment(true);
                                setSelectedPatient(patient);
                            }}
                            onRegisterPayment={(patient) => {
                                setPaymentContext({
                                    mode: 'create',
                                    patient
                                });
                                setPaymentModalOpen(true);
                            }}
                        />
                    </div>
                )}
            </div>

            <hr className='m-5' />

            {/* 🔹 SEÇÃO MÉTRICAS COM ACCORDION */}
            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${metricsSectionOpen
                        ? 'bg-green-50 text-green-800 border-b border-green-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => setMetricsSectionOpen(!metricsSectionOpen)}
                >
                    <span className="text-lg font-bold">📊 Métricas do Hospital</span>
                    {metricsSectionOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {metricsSectionOpen && (
                    <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-pink-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center space-x-2">
                                        <Stethoscope className="h-5 w-5 text-pink-500" />
                                        <CardTitle className="text-pink-500">
                                            Total Profissionais
                                        </CardTitle>
                                    </div>
                                    <div
                                        onClick={handleAddProfessional}
                                        className='flex justify-end items-center text-pink-700 cursor-pointer hover:text-blue-900 bg-white p-1 rounded'
                                    >
                                        <UserPlus />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-pink-500 text-3xl font-bold">{totalDoctors}</div>
                                    <p className="text-xs text-pink-500 mt-1">Equipe médica ativa</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-amber-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-5 w-5 text-amber-500" />
                                        <CardTitle className="text-amber-500">
                                            Total Pacientes
                                        </CardTitle>
                                    </div>
                                    <div onClick={handleAddPatient}
                                        className='flex justify-end items-center text-amber-700 cursor-pointer hover:text-amber-900 bg-white p-1 rounded'
                                    >
                                        <UserPlus />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-amber-500 text-3xl font-bold">{totalPatients}</div>
                                    <p className="text-xs text-amber-500 mt-1">Atualmente admitidos</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-purple-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center space-x-2">
                                        <Activity className="h-5 w-5 text-purple-500" />
                                        <CardTitle className="text-purple-500">
                                            Ocupação
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-purple-500 text-3xl font-bold">{occupancyRate}%</div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${occupancyRate}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-purple-500 mt-1">Taxa de ocupação</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* 🔹 SEÇÃO VISÃO GERAL COM ACCORDION */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${overviewSectionOpen
                        ? 'bg-purple-50 text-purple-800 border-b border-purple-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => setOverviewSectionOpen(!overviewSectionOpen)}
                >
                    <span className="text-lg font-bold">👁️ Visão Geral</span>
                    {overviewSectionOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {overviewSectionOpen && (
                    <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border border-gray-200 rounded-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">
                                        Visão Geral dos Profissionais
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {doctorOverview.slice(0, showDoctors ? doctorOverview.length : 3).map((doctor, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <Stethoscope className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{doctor.name}</p>
                                                        <p className="text-sm text-gray-500">{doctor.specialty}</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {doctor.patients} pacientes
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t px-6 py-3">
                                    <Button
                                        variant="ghost"
                                        className="text-blue-600 hover:bg-blue-50"
                                        onClick={() => setShowDoctors(!showDoctors)}
                                    >
                                        {showDoctors ? 'Mostrar menos' : 'Ver todos'}
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card className="border border-gray-200 rounded-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">
                                        Próximas Consultas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {upcomingAppointments.length > 0 ? (
                                        <ul className="space-y-3">
                                            {upcomingAppointments.slice(0, 3).map((appointment, index) => (
                                                <li key={index} className="p-3 hover:bg-gray-50 rounded">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <p className="font-medium">{appointment.patient?.fullName}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {appointment.doctor?.fullName} • {appointment.reason}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium">
                                                                {new Date(appointment.date).toLocaleDateString()}
                                                            </p>
                                                            <p className="text-sm text-gray-500">{appointment.time}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center py-6">
                                            <Clock className="mx-auto h-8 w-8 text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-500">
                                                Nenhuma consulta agendada
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* 🔹 BOTÕES DE CONTROLE DOS ACCORDIONS */}
            <div className="flex gap-3 justify-center mt-6">
                <Button
                    variant="outlined"
                    startIcon={<ChevronUp size={18} />}
                    onClick={() => {
                        setBirthdaySectionOpen(true);
                        setPatientsTableOpen(true);
                        setMetricsSectionOpen(true);
                        setOverviewSectionOpen(true);
                    }}
                    className="rounded-lg"
                >
                    Expandir Todos
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<ChevronDown size={18} />}
                    onClick={() => {
                        setBirthdaySectionOpen(false);
                        setPatientsTableOpen(false);
                        setMetricsSectionOpen(false);
                        setOverviewSectionOpen(false);
                    }}
                    className="rounded-lg"
                >
                    Recolher Todos
                </Button>
            </div>
        </>
    );
};

export default DashboardContent;