// src/pages/doctor/components/DashboardHeader.tsx
import { Calendar, Circle, User } from 'lucide-react';
import DoctorHeader from '../DoctorHeader';

interface DashboardHeaderProps {
    doctorData: any;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout?: () => void;
}

export default function DashboardHeader({
    doctorData,
    activeTab,
    onTabChange,
    onLogout
}: DashboardHeaderProps) {
    return (
        <div className="space-y-4">
            {/* 🔹 HEADER DE NAVEGAÇÃO */}
            <DoctorHeader
                doctorInfo={doctorData}
                activeTab={activeTab}
                onTabChange={onTabChange}
                onLogout={onLogout}
            />

            {/* 🔹 CARD DE BOAS-VINDAS (apenas na tab overview) */}
            {activeTab === 'overview' && (
                <>
                    <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
                        {/* Barra superior gradiente */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>

                        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                            {/* 🔹 INFORMAÇÕES DO DOUTOR */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center justify-center rounded-2xl border border-green-200 bg-white p-3 shadow-sm">
                                    <User className="h-8 w-8 text-green-600" />
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">
                                        Bem-vindo(a),{' '}
                                        <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                            Dr(a). {doctorData?.name || doctorData?.fullName || 'Médico'}
                                        </span>
                                    </h1>

                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="h-5 w-5 text-gray-500" />
                                        <p className="text-base font-medium">
                                            {new Date().toLocaleDateString('pt-BR', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 🔹 STATUS ONLINE */}
                            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-white px-4 py-3 shadow-xs transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md">
                                <div className="relative">
                                    <Circle
                                        size={14}
                                        className="fill-green-500 text-green-500"
                                    />
                                    <div className="absolute left-0 top-0 h-3 w-3 animate-ping rounded-full bg-green-500 opacity-40"></div>
                                </div>
                                <span className="text-base font-semibold text-gray-700">
                                    Online agora
                                </span>
                            </div>
                        </div>

                        {/* 🔹 INDICADOR DE PROGRESSO */}
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-100 bg-white/80 p-3">
                            <div className="flex-1">
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">Progresso do Dia</span>
                                    <span className="font-semibold text-green-600">65%</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-200">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                                        style={{ width: '65%' }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🔹 INDICADOR VISUAL DAS ABAS */}
                    <div className="h-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-sm"></div>
                </>
            )}
        </div>
    );
}