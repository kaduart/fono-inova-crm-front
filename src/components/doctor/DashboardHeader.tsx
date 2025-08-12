// src/pages/doctor/components/DashboardHeader.tsx
import { Calendar, User } from 'lucide-react';
import { Header } from '../Header';

export default function DashboardHeader({ doctorData }: { doctorData: any }) {
    return (
        <div className="mb-8">
            <Header />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-full shadow-md border border-gray-200">
                        <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            Olá, Dr(a). <span className="text-blue-600">{doctorData?.fullName}</span>
                        </h1>
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <p className="text-sm md:text-base">
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

                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-xs border border-gray-200">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">
                        Online agora
                    </span>
                </div>
            </div>

            {/* Indicador visual das abas */}
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-4 shadow-sm"></div>
        </div>
    );
}